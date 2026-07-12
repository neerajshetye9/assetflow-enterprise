const { query, getClient } = require('../../config/db');
const { logActivity } = require('../../shared/activityLogger');
const { sendNotification } = require('../../shared/notifier');

// ─── ALLOCATION REQUESTS ──────────────────────────────────────
const listRequests = async (organizationId) => {
  const { rows } = await query(
    `SELECT aar.id, aar.status, aar.reason, aar.expected_return_at, aar.created_at, aar.reviewed_at, aar.rejection_reason,
            a.asset_tag, a.name AS asset_name,
            u.full_name AS requested_by_name,
            te.full_name AS target_employee_name, d.name AS target_department_name,
            ru.full_name AS reviewed_by_name
     FROM asset_allocation_requests aar
     JOIN assets a ON a.id = aar.asset_id
     JOIN organization_memberships om ON om.id = aar.requested_by JOIN users u ON u.id = om.user_id
     LEFT JOIN organization_memberships tem ON tem.id = aar.target_employee_id LEFT JOIN users te ON te.id = tem.user_id
     LEFT JOIN departments d ON d.id = aar.target_department_id
     LEFT JOIN organization_memberships rom ON rom.id = aar.reviewed_by LEFT JOIN users ru ON ru.id = rom.user_id
     WHERE aar.organization_id = $1 ORDER BY aar.created_at DESC`,
    [organizationId]
  );
  return rows;
};

const createRequest = async (organizationId, actorMembershipId, body) => {
  const { assetId, targetEmployeeId, targetDepartmentId, expectedReturnAt, reason } = body;

  // Verify asset is AVAILABLE
  const { rows: [asset] } = await query(`SELECT id, status FROM assets WHERE id = $1 AND organization_id = $2`, [assetId, organizationId]);
  if (!asset) throw Object.assign(new Error('Asset not found'), { status: 404 });
  if (asset.status !== 'AVAILABLE') throw Object.assign(new Error(`Asset is ${asset.status} and cannot be allocated`), { status: 400 });

  const { rows: [req] } = await query(
    `INSERT INTO asset_allocation_requests (organization_id, asset_id, requested_by, target_employee_id, target_department_id, expected_return_at, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [organizationId, assetId, actorMembershipId, targetEmployeeId || null, targetDepartmentId || null, expectedReturnAt || null, reason || null]
  );
  return req;
};

const approveRequest = async (organizationId, actorMembershipId, requestId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: [req] } = await client.query(
      `SELECT * FROM asset_allocation_requests WHERE id = $1 AND organization_id = $2 AND status = 'PENDING'`,
      [requestId, organizationId]
    );
    if (!req) throw Object.assign(new Error('Request not found or not pending'), { status: 404 });

    // Update request status
    await client.query(`UPDATE asset_allocation_requests SET status='APPROVED', reviewed_by=$1, reviewed_at=NOW() WHERE id=$2`, [actorMembershipId, requestId]);

    // Create allocation
    const { rows: [alloc] } = await client.query(
      `INSERT INTO asset_allocations (organization_id, asset_id, employee_id, department_id, allocated_by, expected_return_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [organizationId, req.asset_id, req.target_employee_id, req.target_department_id, actorMembershipId, req.expected_return_at]
    );

    // Update asset status
    const { rows: [asset] } = await client.query(`SELECT status FROM assets WHERE id = $1`, [req.asset_id]);
    await client.query(`UPDATE assets SET status='ALLOCATED', updated_at=NOW() WHERE id=$1`, [req.asset_id]);
    await client.query(
      `INSERT INTO asset_status_history (organization_id, asset_id, old_status, new_status, reason, changed_by, event_type)
       VALUES ($1,$2,$3,'ALLOCATED','Allocation approved',$4,'ALLOCATED')`,
      [organizationId, req.asset_id, asset.status, actorMembershipId]
    );

    await client.query('COMMIT');
    await logActivity({ organizationId, actorMembershipId, action: 'ALLOCATION_APPROVED', entityType: 'asset', entityId: req.asset_id });
    if (req.target_employee_id) await sendNotification({ organizationId, recipientMembershipId: req.target_employee_id, type: 'ASSET_ASSIGNED', title: 'Asset Allocated', message: 'A new asset has been allocated to you.', entityType: 'asset', entityId: req.asset_id });
    return alloc;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
};

const rejectRequest = async (organizationId, actorMembershipId, requestId, rejectionReason) => {
  const { rows: [req] } = await query(
    `UPDATE asset_allocation_requests SET status='REJECTED', reviewed_by=$1, reviewed_at=NOW(), rejection_reason=$2
     WHERE id=$3 AND organization_id=$4 AND status='PENDING' RETURNING *`,
    [actorMembershipId, rejectionReason, requestId, organizationId]
  );
  if (!req) throw Object.assign(new Error('Request not found or not pending'), { status: 404 });
  return req;
};

// ─── ACTIVE ALLOCATIONS ───────────────────────────────────────
const listActiveAllocations = async (organizationId) => {
  const { rows } = await query(
    `SELECT aa.id, aa.allocated_at, aa.expected_return_at, aa.status,
            a.asset_tag, a.name AS asset_name, a.condition,
            u.full_name AS employee_name, d.name AS department_name,
            au.full_name AS allocated_by_name
     FROM asset_allocations aa
     JOIN assets a ON a.id = aa.asset_id
     LEFT JOIN organization_memberships em ON em.id = aa.employee_id LEFT JOIN users u ON u.id = em.user_id
     LEFT JOIN departments d ON d.id = aa.department_id
     JOIN organization_memberships ab ON ab.id = aa.allocated_by JOIN users au ON au.id = ab.user_id
     WHERE aa.organization_id = $1 AND aa.status = 'ACTIVE'
     ORDER BY aa.allocated_at DESC`,
    [organizationId]
  );
  return rows;
};

module.exports = { listRequests, createRequest, approveRequest, rejectRequest, listActiveAllocations };

