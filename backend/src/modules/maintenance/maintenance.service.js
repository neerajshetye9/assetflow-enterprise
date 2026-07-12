const { query, getClient } = require('../../config/db');
const { logActivity } = require('../../shared/activityLogger');

const listRequests = async (organizationId) => {
  const { rows } = await query(
    `SELECT mr.id, mr.status, mr.priority, mr.issue_description, mr.resolution_notes, mr.created_at,
            mr.approved_at, mr.scheduled_at, mr.started_at, mr.resolved_at,
            a.asset_tag, a.name AS asset_name,
            u.full_name AS requested_by_name,
            tu.full_name AS technician_name, mr.external_technician_name
     FROM maintenance_requests mr
     JOIN assets a ON a.id = mr.asset_id
     JOIN organization_memberships om ON om.id = mr.requested_by JOIN users u ON u.id = om.user_id
     LEFT JOIN organization_memberships tm ON tm.id = mr.technician_id LEFT JOIN users tu ON tu.id = tm.user_id
     WHERE mr.organization_id = $1 ORDER BY mr.created_at DESC`,
    [organizationId]
  );
  return rows;
};

const createRequest = async (organizationId, actorMembershipId, body) => {
  const { assetId, issueDescription, priority } = body;
  const { rows: [req] } = await query(
    `INSERT INTO maintenance_requests (organization_id, asset_id, requested_by, issue_description, priority)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [organizationId, assetId, actorMembershipId, issueDescription, priority || 'MEDIUM']
  );
  await logActivity({ organizationId, actorMembershipId, action: 'MAINTENANCE_REQUESTED', entityType: 'asset', entityId: assetId });
  return req;
};

const updateStatus = async (organizationId, actorMembershipId, requestId, newStatus, extra = {}) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: [req] } = await client.query(
      `SELECT * FROM maintenance_requests WHERE id=$1 AND organization_id=$2`,
      [requestId, organizationId]
    );
    if (!req) throw Object.assign(new Error('Request not found'), { status: 404 });

    // Strict State Machine Validation
    const validTransitions = {
      'PENDING': ['APPROVED', 'REJECTED'],
      'APPROVED': ['TECHNICIAN_ASSIGNED'],
      'TECHNICIAN_ASSIGNED': ['IN_PROGRESS'],
      'IN_PROGRESS': ['RESOLVED'],
      'REJECTED': [],
      'RESOLVED': []
    };

    if (!validTransitions[req.status]?.includes(newStatus)) {
      throw Object.assign(new Error(`Invalid status transition from ${req.status} to ${newStatus}. Must follow the strict workflow.`), { status: 400 });
    }

    let updateSql = `UPDATE maintenance_requests SET status=$1`;
    const params = [newStatus];

    if (newStatus === 'APPROVED') {
      params.push(actorMembershipId, new Date());
      updateSql += `, approved_by=$${params.length - 1}, approved_at=$${params.length}`;
      // Mark asset UNDER_MAINTENANCE
      await client.query(`UPDATE assets SET status='UNDER_MAINTENANCE', updated_at=NOW() WHERE id=$1`, [req.asset_id]);
      await client.query(
        `INSERT INTO asset_status_history (organization_id, asset_id, old_status, new_status, reason, changed_by, event_type)
         VALUES ($1,$2,$3,'UNDER_MAINTENANCE','Maintenance approved',$4,'MAINTENANCE')`,
        [organizationId, req.asset_id, req.status === 'PENDING' ? 'AVAILABLE' : req.status, actorMembershipId]
      );
    }
    if (newStatus === 'REJECTED' && extra.rejectedReason) {
      params.push(extra.rejectedReason);
      updateSql += `, rejected_reason=$${params.length}`;
    }
    if (newStatus === 'TECHNICIAN_ASSIGNED') {
      params.push(extra.technicianId || null, extra.externalTechnicianName || null, extra.scheduledAt || null);
      updateSql += `, technician_id=$${params.length - 2}, external_technician_name=$${params.length - 1}, scheduled_at=$${params.length}`;
    }
    if (newStatus === 'IN_PROGRESS') {
      params.push(new Date());
      updateSql += `, started_at=$${params.length}`;
    }
    if (newStatus === 'RESOLVED') {
      params.push(new Date(), extra.resolutionNotes || null);
      updateSql += `, resolved_at=$${params.length - 1}, resolution_notes=$${params.length}`;
      await client.query(`UPDATE assets SET status='AVAILABLE', updated_at=NOW() WHERE id=$1`, [req.asset_id]);
      await client.query(
        `INSERT INTO asset_status_history (organization_id, asset_id, old_status, new_status, reason, changed_by, event_type)
         VALUES ($1,$2,'UNDER_MAINTENANCE','AVAILABLE','Maintenance resolved',$3,'RESOLVED')`,
        [organizationId, req.asset_id, actorMembershipId]
      );
    }

    params.push(requestId);
    updateSql += ` WHERE id=$${params.length} RETURNING *`;
    const { rows: [updated] } = await client.query(updateSql, params);

    // Log status history
    await client.query(
      `INSERT INTO maintenance_status_history (maintenance_request_id, old_status, new_status, changed_by)
       VALUES ($1,$2,$3,$4)`,
      [requestId, req.status, newStatus, actorMembershipId]
    );

    await client.query('COMMIT');
    await logActivity({ organizationId, actorMembershipId, action: `MAINTENANCE_${newStatus}`, entityType: 'maintenance_request', entityId: requestId });
    return updated;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
};

const getHistory = async (requestId) => {
  const { rows } = await query(
    `SELECT msh.*, u.full_name AS changed_by_name
     FROM maintenance_status_history msh
     LEFT JOIN organization_memberships om ON om.id = msh.changed_by LEFT JOIN users u ON u.id = om.user_id
     WHERE msh.maintenance_request_id=$1 ORDER BY msh.created_at ASC`,
    [requestId]
  );
  return rows;
};

module.exports = { listRequests, createRequest, updateStatus, getHistory };
