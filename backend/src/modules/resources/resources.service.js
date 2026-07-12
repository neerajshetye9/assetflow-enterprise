const { query, getClient } = require('../../config/db');
const { logActivity } = require('../../shared/activityLogger');

// ─── RESOURCES ────────────────────────────────────────────────
const listResources = async (organizationId, filters = {}) => {
  const { resourceType, locationId } = filters;
  let sql = `
    SELECT r.id, r.name, r.resource_type, r.capacity, r.description, r.status,
           l.name AS location_name, l.id AS location_id,
           COUNT(rb.id) FILTER (WHERE rb.status = 'CONFIRMED' AND rb.end_time > NOW()) AS active_bookings
    FROM resources r
    LEFT JOIN locations l ON l.id = r.location_id
    LEFT JOIN resource_bookings rb ON rb.resource_id = r.id
    WHERE r.organization_id = $1`;
  const params = [organizationId];
  if (resourceType) { params.push(resourceType); sql += ` AND r.resource_type = $${params.length}`; }
  if (locationId) { params.push(locationId); sql += ` AND r.location_id = $${params.length}`; }
  sql += ' GROUP BY r.id, l.id ORDER BY r.name';
  const { rows } = await query(sql, params);
  return rows;
};

const createResource = async (organizationId, actorMembershipId, body) => {
  const { name, resourceType, capacity, description, locationId, isBookable, bookingAdvanceDays } = body;
  const { rows: [res] } = await query(
    `INSERT INTO resources (organization_id, name, resource_type, capacity, description, location_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [organizationId, name, resourceType || 'ROOM', capacity || null, description || null, locationId || null]
  );
  await logActivity({ organizationId, actorMembershipId, action: 'RESOURCE_CREATED', entityType: 'resource', entityId: res.id });
  return res;
};

const updateResource = async (organizationId, actorMembershipId, resourceId, body) => {
  const { name, capacity, description, status, isBookable, bookingAdvanceDays } = body;
  const { rows: [res] } = await query(
    `UPDATE resources SET
       name = COALESCE($1, name), capacity = COALESCE($2, capacity),
       description = COALESCE($3, description), status = COALESCE($4, status)
     WHERE id = $5 AND organization_id = $6 RETURNING *`,
    [name, capacity, description, status, resourceId, organizationId]
  );
  if (!res) throw Object.assign(new Error('Resource not found'), { status: 404 });
  return res;
};

// ─── BOOKINGS ─────────────────────────────────────────────────
const listBookings = async (organizationId, filters = {}) => {
  const { resourceId, membershipId, from, to } = filters;
  let sql = `
    SELECT rb.id, rb.start_time, rb.end_time, rb.title, rb.purpose, rb.status, rb.attendee_count, rb.created_at,
           r.name AS resource_name, r.resource_type, r.capacity,
           u.full_name AS booked_by_name, l.name AS location_name
    FROM resource_bookings rb
    JOIN resources r ON r.id = rb.resource_id
    LEFT JOIN locations l ON l.id = r.location_id
    JOIN organization_memberships om ON om.id = rb.booked_by JOIN users u ON u.id = om.user_id
    WHERE rb.organization_id = $1`;
  const params = [organizationId];
  if (resourceId) { params.push(resourceId); sql += ` AND rb.resource_id = $${params.length}`; }
  if (membershipId) { params.push(membershipId); sql += ` AND rb.booked_by = $${params.length}`; }
  if (from) { params.push(from); sql += ` AND rb.end_time >= $${params.length}`; }
  if (to) { params.push(to); sql += ` AND rb.start_time <= $${params.length}`; }
  sql += ' ORDER BY rb.start_time ASC';
  const { rows } = await query(sql, params);
  return rows;
};

const createBooking = async (organizationId, actorMembershipId, body) => {
  const { resourceId, startTime, endTime, title, purpose, attendeeCount } = body;

  // Verify resource is bookable
  const { rows: [resource] } = await query(`SELECT id, status FROM resources WHERE id = $1 AND organization_id = $2`, [resourceId, organizationId]);
  if (!resource) throw Object.assign(new Error('Resource not found'), { status: 404 });
  if (resource.status !== 'AVAILABLE') throw Object.assign(new Error('Resource is not available for booking'), { status: 400 });

  // Check overlap using simple query (btree_gist handles constraint but gives clearer UX with this check)
  const { rows: overlap } = await query(
    `SELECT id FROM resource_bookings
     WHERE resource_id = $1 AND status IN ('CONFIRMED','PENDING')
       AND start_time < $2 AND end_time > $3`,
    [resourceId, endTime, startTime]
  );
  if (overlap.length > 0) throw Object.assign(new Error('Resource is already booked for that time slot'), { status: 409 });

  const { rows: [booking] } = await query(
    `INSERT INTO resource_bookings (organization_id, resource_id, booked_by, start_time, end_time, title, purpose, attendee_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [organizationId, resourceId, actorMembershipId, startTime, endTime, title || null, purpose || null, attendeeCount || null]
  );
  await logActivity({ organizationId, actorMembershipId, action: 'BOOKING_CREATED', entityType: 'resource_booking', entityId: booking.id });
  return booking;
};

const cancelBooking = async (organizationId, actorMembershipId, bookingId, reason) => {
  const { rows: [booking] } = await query(
    `UPDATE resource_bookings SET status = 'CANCELLED', cancellation_reason = $1, cancelled_at = NOW(), cancelled_by = $2
     WHERE id = $3 AND organization_id = $4 AND status IN ('PENDING','CONFIRMED') RETURNING *`,
    [reason || null, actorMembershipId, bookingId, organizationId]
  );
  if (!booking) throw Object.assign(new Error('Booking not found or cannot be cancelled'), { status: 404 });
  return booking;
};

const getResourceAvailability = async (organizationId, resourceId, date) => {
  const dayStart = new Date(date); dayStart.setHours(0,0,0,0);
  const dayEnd = new Date(date); dayEnd.setHours(23,59,59,999);

  const { rows: bookings } = await query(
    `SELECT start_time, end_time, booked_by, title, status
     FROM resource_bookings
     WHERE resource_id = $1 AND organization_id = $2
       AND start_time >= $3 AND end_time <= $4
       AND status IN ('CONFIRMED','PENDING')
     ORDER BY start_time`,
    [resourceId, organizationId, dayStart, dayEnd]
  );
  return bookings;
};

module.exports = { listResources, createResource, updateResource, listBookings, createBooking, cancelBooking, getResourceAvailability };
