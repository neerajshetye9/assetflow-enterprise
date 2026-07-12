const { query, getClient } = require('../../config/db');
const { logActivity } = require('../../shared/activityLogger');
const { sendNotification } = require('../../shared/notifier');

// ─── TRANSFERS ────────────────────────────────────────────────
const listTransferRequests = async (organizationId) => {
  const { rows } = await query(
    `SELECT atr.id, atr.status, atr.reason, atr.created_at, atr.reviewed_at,
            a.asset_tag, a.name AS asset_name,
            u.full_name AS requested_by_name,
            te.full_name AS target_employee_name, d.name AS target_department_name
     FROM asset_transfer_requests atr
     JOIN assets a ON a.id = atr.asset_id
     JOIN organization_memberships om ON om.id = atr.requested_by JOIN users u ON u.id = om.user_id
     LEFT JOIN organization_memberships tem ON tem.id = atr.target_employee_id LEFT JOIN users te ON te.id = tem.user_id
     LEFT JOIN departments d ON d.id = atr.target_department_id
     WHERE atr.organization_id = $1 ORDER BY atr.created_at DESC`,
    [organizationId]
  );
  return rows;
};

const requestTransfer = async (organizationId, actorMembershipId, body) => {
  const { assetId, targetEmployeeId, targetDepartmentId, reason } = body;
  const { rows: [alloc] } = await query(`SELECT id FROM asset_allocations WHERE asset_id=$1 AND status='ACTIVE'`, [assetId]);
  if (!alloc) throw Object.assign(new Error('Asset has no active allocation to transfer'), { status: 400 });

  const { rows: [req] } = await query(
    `INSERT INTO asset_transfer_requests (organization_id, asset_id, current_allocation_id, requested_by, target_employee_id, target_department_id, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [organizationId, assetId, alloc.id, actorMembershipId, targetEmployeeId || null, targetDepartmentId || null, reason || null]
  );
  return req;
};

const approveTransfer = async (organizationId, actorMembershipId, requestId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: [req] } = await client.query(
      `SELECT * FROM asset_transfer_requests WHERE id=$1 AND organization_id=$2 AND status='REQUESTED'`,
      [requestId, organizationId]
    );
    if (!req) throw Object.assign(new Error('Request not found or not in REQUESTED state'), { status: 404 });

    // Close current allocation
    await client.query(`UPDATE asset_allocations SET status='TRANSFERRED' WHERE id=$1`, [req.current_allocation_id]);

    // Create new allocation
    const { rows: [newAlloc] } = await client.query(
      `INSERT INTO asset_allocations (organization_id, asset_id, employee_id, department_id, allocated_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [organizationId, req.asset_id, req.target_employee_id, req.target_department_id, actorMembershipId]
    );

    // Update status history
    await client.query(
      `INSERT INTO asset_status_history (organization_id, asset_id, old_status, new_status, reason, changed_by, event_type)
       VALUES ($1,$2,'ALLOCATED','ALLOCATED','Transfer completed',$3,'TRANSFERRED')`,
      [organizationId, req.asset_id, actorMembershipId]
    );

    // Close transfer request
    await client.query(`UPDATE asset_transfer_requests SET status='COMPLETED', reviewed_by=$1, reviewed_at=NOW() WHERE id=$2`, [actorMembershipId, requestId]);
    await client.query('COMMIT');
    await logActivity({ organizationId, actorMembershipId, action: 'TRANSFER_COMPLETED', entityType: 'asset', entityId: req.asset_id });
    if (req.target_employee_id) await sendNotification({ organizationId, recipientMembershipId: req.target_employee_id, type: 'TRANSFER_APPROVED', title: 'Transfer Complete', message: 'An asset has been transferred to you.', entityType: 'asset', entityId: req.asset_id });
    return newAlloc;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
};

const rejectTransfer = async (organizationId, actorMembershipId, requestId) => {
  const { rows: [req] } = await query(
    `UPDATE asset_transfer_requests SET status='REJECTED', reviewed_by=$1, reviewed_at=NOW()
     WHERE id=$2 AND organization_id=$3 AND status='REQUESTED' RETURNING *`,
    [actorMembershipId, requestId, organizationId]
  );
  if (!req) throw Object.assign(new Error('Request not found'), { status: 404 });
  return req;
};

// ─── RETURNS ──────────────────────────────────────────────────
const listReturnRequests = async (organizationId) => {
  const { rows } = await query(
    `SELECT arr.id, arr.status, arr.request_notes, arr.condition_at_request, arr.checkin_condition,
            arr.checkin_notes, arr.created_at, arr.reviewed_at,
            a.asset_tag, a.name AS asset_name,
            u.full_name AS requested_by_name
     FROM asset_return_requests arr
     JOIN asset_allocations aa ON aa.id = arr.allocation_id
     JOIN assets a ON a.id = aa.asset_id
     JOIN organization_memberships om ON om.id = arr.requested_by JOIN users u ON u.id = om.user_id
     WHERE arr.organization_id = $1 ORDER BY arr.created_at DESC`,
    [organizationId]
  );
  return rows;
};

const requestReturn = async (organizationId, actorMembershipId, body) => {
  const { allocationId, requestNotes, conditionAtRequest } = body;
  const { rows: [req] } = await query(
    `INSERT INTO asset_return_requests (organization_id, allocation_id, requested_by, request_notes, condition_at_request)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [organizationId, allocationId, actorMembershipId, requestNotes || null, conditionAtRequest || null]
  );
  return req;
};

const approveReturn = async (organizationId, actorMembershipId, requestId, body) => {
  const { checkinCondition, checkinNotes } = body;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: [req] } = await client.query(
      `SELECT arr.*, aa.asset_id FROM asset_return_requests arr
       JOIN asset_allocations aa ON aa.id = arr.allocation_id
       WHERE arr.id=$1 AND arr.organization_id=$2 AND arr.status='PENDING'`,
      [requestId, organizationId]
    );
    if (!req) throw Object.assign(new Error('Request not found or not pending'), { status: 404 });

    await client.query(
      `UPDATE asset_return_requests SET status='COMPLETED', reviewed_by=$1, reviewed_at=NOW(), approved_at=NOW(), checkin_condition=$2, checkin_notes=$3 WHERE id=$4`,
      [actorMembershipId, checkinCondition || null, checkinNotes || null, requestId]
    );
    await client.query(`UPDATE asset_allocations SET status='RETURNED', returned_at=NOW() WHERE id=$1`, [req.allocation_id]);
    await client.query(`UPDATE assets SET status='AVAILABLE', condition=COALESCE($1, condition), updated_at=NOW() WHERE id=$2`, [checkinCondition, req.asset_id]);
    await client.query(
      `INSERT INTO asset_status_history (organization_id, asset_id, old_status, new_status, reason, changed_by, event_type)
       VALUES ($1,$2,'ALLOCATED','AVAILABLE','Asset returned',$3,'RETURNED')`,
      [organizationId, req.asset_id, actorMembershipId]
    );

    await client.query('COMMIT');
    await logActivity({ organizationId, actorMembershipId, action: 'RETURN_APPROVED', entityType: 'asset', entityId: req.asset_id });
    return { message: 'Return approved. Asset is now AVAILABLE.' };
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
};

module.exports = { listTransferRequests, requestTransfer, approveTransfer, rejectTransfer, listReturnRequests, requestReturn, approveReturn };

