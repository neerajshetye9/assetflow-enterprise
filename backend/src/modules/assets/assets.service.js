const { query, getClient } = require('../../config/db');
const { logActivity } = require('../../shared/activityLogger');

// ─── LIST ASSETS ─────────────────────────────────────────────
const listAssets = async (organizationId, filters = {}) => {
  const { status, categoryId, locationId, search } = filters;
  let sql = `
    SELECT a.id, a.asset_tag, a.name, a.serial_number, a.condition, a.status,
           a.acquisition_date, a.acquisition_cost, a.is_shared, a.is_bookable,
           ac.name AS category_name, l.name AS location_name,
           u.full_name AS created_by_name
    FROM assets a
    JOIN asset_categories ac ON ac.id = a.category_id
    LEFT JOIN locations l ON l.id = a.location_id
    LEFT JOIN organization_memberships om ON om.id = a.created_by
    LEFT JOIN users u ON u.id = om.user_id
    WHERE a.organization_id = $1`;
  const params = [organizationId];
  if (status) { params.push(status); sql += ` AND a.status = $${params.length}`; }
  if (categoryId) { params.push(categoryId); sql += ` AND a.category_id = $${params.length}`; }
  if (locationId) { params.push(locationId); sql += ` AND a.location_id = $${params.length}`; }
  if (search) { params.push(`%${search}%`); sql += ` AND (a.name ILIKE $${params.length} OR a.asset_tag ILIKE $${params.length} OR a.serial_number ILIKE $${params.length})`; }
  sql += ' ORDER BY a.created_at DESC';
  const { rows } = await query(sql, params);
  return rows;
};

// ─── GET SINGLE ASSET ─────────────────────────────────────────
const getAsset = async (organizationId, assetId) => {
  const { rows: [asset] } = await query(
    `SELECT a.*, ac.name AS category_name, l.name AS location_name
     FROM assets a
     JOIN asset_categories ac ON ac.id = a.category_id
     LEFT JOIN locations l ON l.id = a.location_id
     WHERE a.id = $1 AND a.organization_id = $2`,
    [assetId, organizationId]
  );
  if (!asset) throw Object.assign(new Error('Asset not found'), { status: 404 });

  const { rows: history } = await query(
    `SELECT ash.old_status, ash.new_status, ash.reason, ash.event_type, ash.created_at,
            u.full_name AS changed_by_name
     FROM asset_status_history ash
     LEFT JOIN organization_memberships om ON om.id = ash.changed_by
     LEFT JOIN users u ON u.id = om.user_id
     WHERE ash.asset_id = $1 ORDER BY ash.created_at DESC`,
    [assetId]
  );

  const { rows: [allocation] } = await query(
    `SELECT aa.id, aa.allocated_at, aa.expected_return_at, aa.status,
            u.full_name AS employee_name, d.name AS department_name
     FROM asset_allocations aa
     LEFT JOIN organization_memberships em ON em.id = aa.employee_id
     LEFT JOIN users u ON u.id = em.user_id
     LEFT JOIN departments d ON d.id = aa.department_id
     WHERE aa.asset_id = $1 AND aa.status = 'ACTIVE'`,
    [assetId]
  );

  return { ...asset, statusHistory: history, currentAllocation: allocation || null };
};

// ─── CREATE ASSET ─────────────────────────────────────────────
const createAsset = async (organizationId, actorMembershipId, body) => {
  const { categoryId, locationId, assetTag, name, serialNumber, description, acquisitionDate, acquisitionCost, condition, isShared, isBookable, customAttributes } = body;
  const { rows: [asset] } = await query(
    `INSERT INTO assets (organization_id, category_id, location_id, asset_tag, name, serial_number,
       description, acquisition_date, acquisition_cost, condition, is_shared, is_bookable,
       custom_attributes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [organizationId, categoryId, locationId || null, assetTag, name, serialNumber || null,
     description || null, acquisitionDate || null, acquisitionCost || null,
     condition || 'GOOD', isShared || false, isBookable || false,
     customAttributes ? JSON.stringify(customAttributes) : '{}', actorMembershipId]
  );

  // Log initial status
  await query(
    `INSERT INTO asset_status_history (organization_id, asset_id, new_status, reason, changed_by, event_type)
     VALUES ($1, $2, 'AVAILABLE', 'Asset registered', $3, 'REGISTERED')`,
    [organizationId, asset.id, actorMembershipId]
  );
  await logActivity({ organizationId, actorMembershipId, action: 'ASSET_REGISTERED', entityType: 'asset', entityId: asset.id, newValues: { name, assetTag } });
  return asset;
};

// ─── UPDATE ASSET ─────────────────────────────────────────────
const updateAsset = async (organizationId, actorMembershipId, assetId, body) => {
  const { name, description, locationId, condition, isShared, isBookable } = body;
  const { rows: [asset] } = await query(
    `UPDATE assets SET
       name = COALESCE($1, name), description = COALESCE($2, description),
       location_id = COALESCE($3, location_id), condition = COALESCE($4, condition),
       is_shared = COALESCE($5, is_shared), is_bookable = COALESCE($6, is_bookable),
       updated_at = NOW()
     WHERE id = $7 AND organization_id = $8 RETURNING *`,
    [name, description, locationId, condition, isShared, isBookable, assetId, organizationId]
  );
  if (!asset) throw Object.assign(new Error('Asset not found'), { status: 404 });
  return asset;
};

// ─── STATUS HISTORY ───────────────────────────────────────────
const getAssetHistory = async (organizationId, assetId) => {
  const { rows } = await query(
    `SELECT ash.*, u.full_name AS changed_by_name
     FROM asset_status_history ash
     LEFT JOIN organization_memberships om ON om.id = ash.changed_by
     LEFT JOIN users u ON u.id = om.user_id
     WHERE ash.asset_id = $1 AND ash.organization_id = $2
     ORDER BY ash.created_at DESC`,
    [assetId, organizationId]
  );
  return rows;
};

module.exports = { listAssets, getAsset, createAsset, updateAsset, getAssetHistory };
