const { query } = require('../../config/db');

// ─── NOTIFICATIONS ────────────────────────────────────────────
const listNotifications = async (membershipId, { unreadOnly = false, limit = 30 } = {}) => {
  let sql = `SELECT id, title, message, notification_type AS type, status, entity_type, entity_id, created_at
             FROM notifications WHERE recipient_membership_id = $1`;
  if (unreadOnly) sql += " AND status IN ('PENDING', 'SENT')";
  sql += ` ORDER BY created_at DESC LIMIT $2`;
  const { rows } = await query(sql, [membershipId, limit]);
  return rows;
};

const markRead = async (membershipId, notificationId) => {
  await query(`UPDATE notifications SET status = 'READ', read_at = NOW() WHERE id = $1 AND recipient_membership_id = $2`, [notificationId, membershipId]);
  return { success: true };
};

const markAllRead = async (membershipId) => {
  const { rowCount } = await query(`UPDATE notifications SET status = 'READ', read_at = NOW() WHERE recipient_membership_id = $1 AND status != 'READ'`, [membershipId]);
  return { updated: rowCount };
};

const getUnreadCount = async (membershipId) => {
  const { rows: [r] } = await query(`SELECT COUNT(*) AS count FROM notifications WHERE recipient_membership_id = $1 AND status != 'READ'`, [membershipId]);
  return { count: parseInt(r.count) };
};

// ─── ACTIVITY LOGS ────────────────────────────────────────────
const listActivityLogs = async (organizationId, { entityType, action, limit = 50, page = 1 } = {}) => {
  let sql = `SELECT al.id, al.action, al.entity_type, al.entity_id, al.created_at, al.new_values,
             u.full_name AS actor_name
             FROM activity_logs al
             JOIN organization_memberships om ON om.id = al.actor_membership_id
             JOIN users u ON u.id = om.user_id
             WHERE al.organization_id = $1`;
  const params = [organizationId];
  if (entityType) { params.push(entityType); sql += ` AND al.entity_type = $${params.length}`; }
  if (action) { params.push(`%${action}%`); sql += ` AND al.action ILIKE $${params.length}`; }
  const offset = (page - 1) * limit;
  params.push(limit, offset);
  sql += ` ORDER BY al.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  const { rows } = await query(sql, params);

  const { rows: [total] } = await query(`SELECT COUNT(*) FROM activity_logs WHERE organization_id = $1`, [organizationId]);
  return { logs: rows, total: parseInt(total.count), page, limit };
};

// ─── REPORTS ─────────────────────────────────────────────────
const getAssetReport = async (organizationId, { from, to, format } = {}) => {
  const startDate = from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const endDate = to || new Date();
  const { rows: assets } = await query(`
    SELECT a.asset_tag, a.name, a.status, a.condition, a.acquisition_cost,
           a.acquisition_date, ac.name AS category, l.name AS location,
           u.full_name AS allocated_to
    FROM assets a
    JOIN asset_categories ac ON ac.id = a.category_id
    LEFT JOIN locations l ON l.id = a.location_id
    LEFT JOIN asset_allocations aa ON aa.asset_id = a.id AND aa.status = 'ACTIVE'
    LEFT JOIN organization_memberships om ON om.id = aa.employee_id
    LEFT JOIN users u ON u.id = om.user_id
    WHERE a.organization_id = $1
    ORDER BY a.status, ac.name, a.name`, [organizationId]);

  const summary = {
    totalAssets: assets.length,
    totalValue: assets.reduce((s, a) => s + parseFloat(a.acquisition_cost || 0), 0),
    byStatus: assets.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {}),
    byCategory: assets.reduce((acc, a) => { acc[a.category] = (acc[a.category] || 0) + 1; return acc; }, {}),
  };

  return { summary, assets, period: { from: startDate, to: endDate } };
};

const getMaintenanceReport = async (organizationId, { from, to } = {}) => {
  const startDate = from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const endDate = to || new Date();
  const { rows } = await query(`
    SELECT mr.id, mr.status, mr.priority, mr.issue_description, mr.resolution_notes,
           mr.created_at, mr.resolved_at,
           a.asset_tag, a.name AS asset_name, ac.name AS category,
           u.full_name AS requested_by,
           EXTRACT(EPOCH FROM (mr.resolved_at - mr.created_at))/3600 AS resolution_hours
    FROM maintenance_requests mr
    JOIN assets a ON a.id = mr.asset_id
    JOIN asset_categories ac ON ac.id = a.category_id
    JOIN organization_memberships om ON om.id = mr.requested_by JOIN users u ON u.id = om.user_id
    WHERE mr.organization_id = $1 AND mr.created_at BETWEEN $2 AND $3
    ORDER BY mr.created_at DESC`, [organizationId, startDate, endDate]);

  const avgResolution = rows.filter(r => r.resolution_hours).reduce((s, r, _, a) => s + r.resolution_hours / a.length, 0);
  return {
    requests: rows,
    summary: {
      total: rows.length,
      resolved: rows.filter(r => r.status === 'RESOLVED').length,
      avgResolutionHours: Math.round(avgResolution * 10) / 10,
      byPriority: rows.reduce((acc, r) => { acc[r.priority] = (acc[r.priority] || 0) + 1; return acc; }, {}),
    },
    period: { from: startDate, to: endDate },
  };
};

const getAllocationReport = async (organizationId) => {
  const { rows } = await query(`
    SELECT aa.allocated_at, aa.expected_return_at, aa.status,
           a.asset_tag, a.name AS asset_name, ac.name AS category,
           u.full_name AS employee, d.name AS department
    FROM asset_allocations aa
    JOIN assets a ON a.id = aa.asset_id
    JOIN asset_categories ac ON ac.id = a.category_id
    LEFT JOIN organization_memberships em ON em.id = aa.employee_id LEFT JOIN users u ON u.id = em.user_id
    LEFT JOIN departments d ON d.id = aa.department_id
    WHERE aa.organization_id = $1 ORDER BY aa.allocated_at DESC`, [organizationId]);
  return { allocations: rows, total: rows.length };
};

module.exports = { listNotifications, markRead, markAllRead, getUnreadCount, listActivityLogs, getAssetReport, getMaintenanceReport, getAllocationReport };
