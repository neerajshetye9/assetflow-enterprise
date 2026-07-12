const { query } = require('../../config/db');
const { logActivity } = require('../../shared/activityLogger');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ─── DEPARTMENTS ──────────────────────────────────────────────
const getDepartments = async (organizationId) => {
  const { rows } = await query(
    `SELECT d.id, d.name, d.code, d.description, d.status,
            d.parent_department_id,
            pd.name AS parent_name,
            m.id AS head_membership_id,
            u.full_name AS head_name
     FROM departments d
     LEFT JOIN departments pd ON pd.id = d.parent_department_id
     LEFT JOIN organization_memberships m ON m.id = d.head_membership_id
     LEFT JOIN users u ON u.id = m.user_id
     WHERE d.organization_id = $1
     ORDER BY d.name`,
    [organizationId]
  );
  return rows;
};

const createDepartment = async (organizationId, actorMembershipId, body) => {
  const { name, code, description, parentDepartmentId } = body;
  const { rows: [dept] } = await query(
    `INSERT INTO departments (organization_id, name, code, description, parent_department_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [organizationId, name, code.toUpperCase(), description || null, parentDepartmentId || null]
  );
  await logActivity({ organizationId, actorMembershipId, action: 'DEPARTMENT_CREATED', entityType: 'department', entityId: dept.id, newValues: dept });
  return dept;
};

const updateDepartment = async (organizationId, actorMembershipId, deptId, body) => {
  const { name, code, description, status, headMembershipId, parentDepartmentId } = body;
  const { rows: [dept] } = await query(
    `UPDATE departments SET
       name = COALESCE($1, name),
       code = COALESCE($2, code),
       description = COALESCE($3, description),
       status = COALESCE($4, status),
       head_membership_id = COALESCE($5, head_membership_id),
       parent_department_id = COALESCE($6, parent_department_id),
       updated_at = NOW()
     WHERE id = $7 AND organization_id = $8 RETURNING *`,
    [name, code ? code.toUpperCase() : null, description, status, headMembershipId, parentDepartmentId, deptId, organizationId]
  );
  if (!dept) throw Object.assign(new Error('Department not found'), { status: 404 });
  await logActivity({ organizationId, actorMembershipId, action: 'DEPARTMENT_UPDATED', entityType: 'department', entityId: dept.id, newValues: dept });
  return dept;
};

// ─── LOCATIONS ────────────────────────────────────────────────
const getLocations = async (organizationId) => {
  const { rows } = await query(
    `SELECT id, name, location_type, address, floor, status FROM locations
     WHERE organization_id = $1 ORDER BY name`,
    [organizationId]
  );
  return rows;
};

const createLocation = async (organizationId, actorMembershipId, body) => {
  const { name, locationType, address, floor } = body;
  const { rows: [loc] } = await query(
    `INSERT INTO locations (organization_id, name, location_type, address, floor)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [organizationId, name, locationType || null, address || null, floor || null]
  );
  await logActivity({ organizationId, actorMembershipId, action: 'LOCATION_CREATED', entityType: 'location', entityId: loc.id, newValues: loc });
  return loc;
};

// ─── ASSET CATEGORIES ────────────────────────────────────────
const getCategories = async (organizationId) => {
  const { rows } = await query(
    `SELECT ac.id, ac.name, ac.code, ac.description, ac.status,
            COUNT(a.id) AS asset_count
     FROM asset_categories ac
     LEFT JOIN assets a ON a.category_id = ac.id
     WHERE ac.organization_id = $1
     GROUP BY ac.id ORDER BY ac.name`,
    [organizationId]
  );
  return rows;
};

const createCategory = async (organizationId, actorMembershipId, body) => {
  const { name, code, description } = body;
  const { rows: [cat] } = await query(
    `INSERT INTO asset_categories (organization_id, name, code, description)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [organizationId, name, code.toUpperCase(), description || null]
  );
  await logActivity({ organizationId, actorMembershipId, action: 'CATEGORY_CREATED', entityType: 'asset_category', entityId: cat.id, newValues: cat });
  return cat;
};

// ─── EMPLOYEES ────────────────────────────────────────────────
const getEmployees = async (organizationId) => {
  const { rows } = await query(
    `SELECT om.id AS membership_id, om.employee_code, om.job_title, om.joining_date, om.employment_status,
            u.id AS user_id, u.full_name, u.email, u.account_status,
            d.name AS department_name, d.id AS department_id,
            ARRAY_AGG(r.code) FILTER (WHERE r.code IS NOT NULL) AS roles
     FROM organization_memberships om
     JOIN users u ON u.id = om.user_id
     LEFT JOIN departments d ON d.id = om.department_id
     LEFT JOIN membership_roles mr ON mr.membership_id = om.id AND mr.revoked_at IS NULL
     LEFT JOIN roles r ON r.id = mr.role_id
     WHERE om.organization_id = $1
     GROUP BY om.id, u.id, d.id
     ORDER BY u.full_name`,
    [organizationId]
  );
  return rows;
};

const createEmployee = async (organizationId, actorMembershipId, body) => {
  const { fullName, email, employeeCode, jobTitle, departmentId, joiningDate } = body;
  const tempPassword = crypto.randomBytes(8).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const { rows: [existing] } = await query(`SELECT id FROM users WHERE email = $1`, [email]);
  let userId;
  if (existing) {
    userId = existing.id;
  } else {
    const { rows: [user] } = await query(
      `INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
      [fullName, email, passwordHash]
    );
    userId = user.id;
  }

  const { rows: [membership] } = await query(
    `INSERT INTO organization_memberships (organization_id, user_id, employee_code, job_title, department_id, joining_date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [organizationId, userId, employeeCode || null, jobTitle || null, departmentId || null, joiningDate || null]
  );

  const { rows: [empRole] } = await query(`SELECT id FROM roles WHERE code = 'EMPLOYEE'`);
  await query(
    `INSERT INTO membership_roles (membership_id, role_id, assigned_by) VALUES ($1, $2, $3)`,
    [membership.id, empRole.id, actorMembershipId]
  );

  await logActivity({ organizationId, actorMembershipId, action: 'EMPLOYEE_CREATED', entityType: 'membership', entityId: membership.id });
  return { membershipId: membership.id, email, tempPassword };
};

const promoteEmployee = async (organizationId, actorMembershipId, targetMembershipId, roleCode) => {
  const { rows: [role] } = await query(`SELECT id FROM roles WHERE code = $1`, [roleCode]);
  if (!role) throw Object.assign(new Error(`Role ${roleCode} not found`), { status: 400 });

  await query(
    `INSERT INTO membership_roles (membership_id, role_id, assigned_by)
     VALUES ($1, $2, $3) ON CONFLICT (membership_id, role_id) DO NOTHING`,
    [targetMembershipId, role.id, actorMembershipId]
  );
  await logActivity({ organizationId, actorMembershipId, action: 'ROLE_ASSIGNED', entityType: 'membership', entityId: targetMembershipId, newValues: { roleCode } });
  return { message: `Role ${roleCode} assigned` };
};

module.exports = {
  getDepartments, createDepartment, updateDepartment,
  getLocations, createLocation,
  getCategories, createCategory,
  getEmployees, createEmployee, promoteEmployee,
};
