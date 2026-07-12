const { query } = require('../../config/db');

// Safe wrapper — returns fallback instead of crashing the whole dashboard
const safe = async (fn, fallback) => { try { return await fn(); } catch (e) { console.error('[dashboard] query error:', e.message); return fallback; } };

// ─── DASHBOARD ────────────────────────────────────────────────
const getDashboard = async (organizationId) => {
  const [assetStats, allocStats, maintStats, bookingStats, auditStats, recentActivity] = await Promise.all([
    // Asset statistics
    safe(() => query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS available,
        COUNT(*) FILTER (WHERE status = 'ALLOCATED') AS allocated,
        COUNT(*) FILTER (WHERE status = 'UNDER_MAINTENANCE') AS under_maintenance,
        COUNT(*) FILTER (WHERE status = 'LOST') AS lost,
        SUM(acquisition_cost) AS total_value
      FROM assets WHERE organization_id = $1`, [organizationId]),
      { rows: [{}] }),

    // Allocation requests pending
    safe(() => query(`SELECT COUNT(*) AS pending FROM asset_allocation_requests WHERE organization_id = $1 AND status = 'PENDING'`, [organizationId]),
      { rows: [{ pending: 0 }] }),

    // Maintenance stats
    safe(() => query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
        COUNT(*) FILTER (WHERE status IN ('APPROVED','TECHNICIAN_ASSIGNED','IN_PROGRESS')) AS in_progress,
        COUNT(*) FILTER (WHERE status = 'RESOLVED' AND resolved_at > NOW() - INTERVAL '30 days') AS resolved_last_30d
      FROM maintenance_requests WHERE organization_id = $1`, [organizationId]),
      { rows: [{}] }),

    // Today's bookings
    safe(() => query(`SELECT COUNT(*) AS today FROM resource_bookings
       WHERE organization_id = $1 AND DATE(start_time) = CURRENT_DATE AND status = 'CONFIRMED'`, [organizationId]),
      { rows: [{ today: 0 }] }),

    // Active audit cycle
    safe(() => query(`SELECT id, name, status,
       (SELECT COUNT(*) FROM audit_items WHERE audit_cycle_id = audit_cycles.id) AS total_items,
       (SELECT COUNT(*) FROM audit_items WHERE audit_cycle_id = audit_cycles.id AND verification_status = 'VERIFIED') AS verified_items
       FROM audit_cycles WHERE organization_id = $1 AND status = 'IN_PROGRESS' LIMIT 1`, [organizationId]),
      { rows: [] }),

    // Recent activity logs
    safe(() => query(`
      SELECT al.action, al.entity_type, al.created_at,
             u.full_name AS actor_name
      FROM activity_logs al
      JOIN organization_memberships om ON om.id = al.actor_membership_id
      JOIN users u ON u.id = om.user_id
      WHERE al.organization_id = $1
      ORDER BY al.created_at DESC LIMIT 10`, [organizationId]),
      { rows: [] }),
  ]);

  return {
    assets: assetStats.rows[0],
    pendingAllocations: parseInt(allocStats.rows[0]?.pending || 0),
    maintenance: maintStats.rows[0],
    todayBookings: parseInt(bookingStats.rows[0]?.today || 0),
    activeAudit: auditStats.rows[0] || null,
    recentActivity: recentActivity.rows,
  };
};

const getAssetsByCategory = async (organizationId) => {
  const { rows } = await query(`
    SELECT ac.name AS category, COUNT(a.id) AS count, SUM(a.acquisition_cost) AS value
    FROM asset_categories ac LEFT JOIN assets a ON a.category_id = ac.id
    WHERE ac.organization_id = $1 GROUP BY ac.id ORDER BY count DESC`, [organizationId]);
  return rows;
};

const getAssetsByStatus = async (organizationId) => {
  const { rows } = await query(`
    SELECT status, COUNT(*) AS count FROM assets
    WHERE organization_id = $1 GROUP BY status ORDER BY count DESC`, [organizationId]);
  return rows;
};

const getMaintenanceTrend = async (organizationId) => {
  const { rows } = await query(`
    SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS requests,
           COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved
    FROM maintenance_requests WHERE organization_id = $1
    AND created_at > NOW() - INTERVAL '6 months'
    GROUP BY month ORDER BY month`, [organizationId]);
  return rows;
};

module.exports = { getDashboard, getAssetsByCategory, getAssetsByStatus, getMaintenanceTrend };
