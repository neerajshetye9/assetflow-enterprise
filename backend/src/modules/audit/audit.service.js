const { query, getClient } = require('../../config/db');
const { logActivity } = require('../../shared/activityLogger');

// ─── AUDIT CYCLES ─────────────────────────────────────────────
const getCycles = async (organizationId) => {
  const { rows } = await query(
    `SELECT ac.id, ac.name, ac.description, ac.start_date, ac.end_date, ac.status,
            ac.created_at, u.full_name AS created_by_name,
            COUNT(ai.id) AS total_items,
            COUNT(ai.id) FILTER (WHERE ai.verification_status = 'VERIFIED') AS verified_items,
            COUNT(ai.id) FILTER (WHERE ai.verification_status = 'PENDING') AS pending_items
     FROM audit_cycles ac
     JOIN organization_memberships om ON om.id = ac.created_by
     JOIN users u ON u.id = om.user_id
     LEFT JOIN audit_items ai ON ai.audit_cycle_id = ac.id
     WHERE ac.organization_id = $1
     GROUP BY ac.id, u.full_name
     ORDER BY ac.created_at DESC`,
    [organizationId]
  );
  return rows;
};

const createCycle = async (organizationId, actorMembershipId, body) => {
  const { name, description, startDate, endDate, departmentIds, locationIds } = body;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: [cycle] } = await client.query(
      `INSERT INTO audit_cycles (organization_id, name, description, start_date, end_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [organizationId, name, description || null, startDate, endDate, actorMembershipId]
    );

    if (departmentIds?.length) {
      for (const deptId of departmentIds) {
        await client.query(
          `INSERT INTO audit_scope_departments (audit_cycle_id, department_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [cycle.id, deptId]
        );
      }
    }
    if (locationIds?.length) {
      for (const locId of locationIds) {
        await client.query(
          `INSERT INTO audit_scope_locations (audit_cycle_id, location_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [cycle.id, locId]
        );
      }
    }

    // Auto-populate audit items from assets in scoped departments/locations
    const { rows: assets } = await client.query(
      `SELECT a.id, a.location_id, a.status,
              om.department_id
       FROM assets a
       LEFT JOIN asset_allocations alloc ON alloc.asset_id = a.id AND alloc.status = 'ACTIVE'
       LEFT JOIN organization_memberships om ON om.id = alloc.employee_id
       WHERE a.organization_id = $1 AND a.status NOT IN ('RETIRED','DISPOSED')`,
      [organizationId]
    );
    for (const asset of assets) {
      await client.query(
        `INSERT INTO audit_items (audit_cycle_id, asset_id, expected_location_id, expected_department_id, expected_status)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        [cycle.id, asset.id, asset.location_id, asset.department_id, asset.status]
      );
    }

    await client.query('COMMIT');
    await logActivity({ organizationId, actorMembershipId, action: 'AUDIT_CYCLE_CREATED', entityType: 'audit_cycle', entityId: cycle.id });
    return cycle;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const updateCycleStatus = async (organizationId, actorMembershipId, cycleId, status) => {
  const { rows: [cycle] } = await query(
    `SELECT id, status FROM audit_cycles WHERE id = $1 AND organization_id = $2`,
    [cycleId, organizationId]
  );
  if (!cycle) throw Object.assign(new Error('Audit cycle not found'), { status: 404 });
  if (cycle.status === 'CLOSED') throw Object.assign(new Error('Closed audit cycles cannot be modified'), { status: 400 });

  const closedAt = status === 'CLOSED' ? new Date() : null;
  const closedBy = status === 'CLOSED' ? actorMembershipId : null;

  const { rows: [updated] } = await query(
    `UPDATE audit_cycles SET status = $1, closed_at = $2, closed_by = $3 WHERE id = $4 RETURNING *`,
    [status, closedAt, closedBy, cycleId]
  );
  return updated;
};

// ─── AUDIT ASSIGNMENTS ────────────────────────────────────────
const assignAuditor = async (organizationId, actorMembershipId, cycleId, auditorMembershipId) => {
  const { rows: [assignment] } = await query(
    `INSERT INTO audit_assignments (audit_cycle_id, auditor_membership_id, assigned_by)
     VALUES ($1, $2, $3) RETURNING *`,
    [cycleId, auditorMembershipId, actorMembershipId]
  );
  await logActivity({ organizationId, actorMembershipId, action: 'AUDITOR_ASSIGNED', entityType: 'audit_cycle', entityId: cycleId });
  return assignment;
};

// ─── AUDIT ITEMS ─────────────────────────────────────────────
const getCycleItems = async (cycleId, organizationId) => {
  const { rows } = await query(
    `SELECT ai.id, ai.verification_status, ai.observed_condition, ai.verification_notes, ai.verified_at,
            a.asset_tag, a.name AS asset_name, a.status AS current_status,
            el.name AS expected_location, al.name AS actual_location,
            u.full_name AS verified_by_name
     FROM audit_items ai
     JOIN assets a ON a.id = ai.asset_id
     LEFT JOIN locations el ON el.id = ai.expected_location_id
     LEFT JOIN locations al ON al.id = ai.actual_location_id
     LEFT JOIN organization_memberships om ON om.id = ai.verified_by
     LEFT JOIN users u ON u.id = om.user_id
     WHERE ai.audit_cycle_id = $1`,
    [cycleId]
  );
  return rows;
};

const verifyItem = async (organizationId, actorMembershipId, itemId, body) => {
  const { verificationStatus, actualLocationId, observedCondition, notes } = body;
  const { rows: [item] } = await query(
    `UPDATE audit_items SET
       verification_status = $1, actual_location_id = $2,
       observed_condition = $3, verification_notes = $4,
       verified_by = $5, verified_at = NOW()
     WHERE id = $6 RETURNING *`,
    [verificationStatus, actualLocationId || null, observedCondition || null, notes || null, actorMembershipId, itemId]
  );
  if (!item) throw Object.assign(new Error('Audit item not found'), { status: 404 });
  return item;
};

// ─── AUDIT DISCREPANCIES ─────────────────────────────────────
const createDiscrepancy = async (organizationId, actorMembershipId, itemId, body) => {
  const { discrepancyType, description } = body;
  const { rows: [disc] } = await query(
    `INSERT INTO audit_discrepancies (audit_item_id, discrepancy_type, description)
     VALUES ($1, $2, $3) RETURNING *`,
    [itemId, discrepancyType, description]
  );
  await logActivity({ organizationId, actorMembershipId, action: 'DISCREPANCY_LOGGED', entityType: 'audit_item', entityId: itemId });
  return disc;
};

const resolveDiscrepancy = async (organizationId, actorMembershipId, discId, body) => {
  const { status, resolutionAction, resolutionNotes } = body;
  const { rows: [disc] } = await query(
    `UPDATE audit_discrepancies SET status = $1, resolution_action = $2, resolution_notes = $3,
       resolved_by = $4, resolved_at = NOW()
     WHERE id = $5 RETURNING *`,
    [status, resolutionAction || null, resolutionNotes || null, actorMembershipId, discId]
  );
  if (!disc) throw Object.assign(new Error('Discrepancy not found'), { status: 404 });

  // If confirmed MISSING → mark asset as LOST
  if (status === 'RESOLVED' && body.markAsLost) {
    const { rows: [item] } = await query(`SELECT asset_id FROM audit_items WHERE id = (SELECT audit_item_id FROM audit_discrepancies WHERE id = $1)`, [discId]);
    if (item) {
      await query(`UPDATE assets SET status = 'LOST', updated_at = NOW() WHERE id = $1`, [item.asset_id]);
      await logActivity({ organizationId, actorMembershipId, action: 'ASSET_MARKED_LOST', entityType: 'asset', entityId: item.asset_id });
    }
  }
  return disc;
};

module.exports = { getCycles, createCycle, updateCycleStatus, assignAuditor, getCycleItems, verifyItem, createDiscrepancy, resolveDiscrepancy };
