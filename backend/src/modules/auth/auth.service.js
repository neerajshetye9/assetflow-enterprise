const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query, getClient } = require('../../config/db');
const env = require('../../config/env');

// ─── Token Helpers ────────────────────────────────────────────
const signAccessToken = (payload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });

const signRefreshToken = (payload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });

const buildTokenPayload = async (userId, membershipId, organizationId) => {
  const { rows } = await query(
    `SELECT r.code FROM membership_roles mr
     JOIN roles r ON r.id = mr.role_id
     WHERE mr.membership_id = $1 AND mr.revoked_at IS NULL`,
    [membershipId]
  );
  const roles = rows.map((r) => r.code);

  const { rows: permRows } = await query(
    `SELECT DISTINCT p.code FROM membership_roles mr
     JOIN roles r ON r.id = mr.role_id
     JOIN role_permissions rp ON rp.role_id = r.id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE mr.membership_id = $1 AND mr.revoked_at IS NULL`,
    [membershipId]
  );
  const permissions = permRows.map((p) => p.code);

  return { userId, membershipId, organizationId, roles, permissions };
};

// ─── Signup ───────────────────────────────────────────────────
const signup = async ({ fullName, email, password, organizationName, organizationCode, industry, timezone }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Check email uniqueness
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) throw Object.assign(new Error('Email already registered'), { status: 409 });

    // Create user
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows: [user] } = await client.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, full_name, email`,
      [fullName, email, passwordHash]
    );

    // Create organization
    const { rows: [org] } = await client.query(
      `INSERT INTO organizations (name, code, industry, timezone)
       VALUES ($1, $2, $3, $4) RETURNING id, name, code`,
      [organizationName, organizationCode.toUpperCase(), industry || null, timezone || 'UTC']
    );

    // Create membership
    const { rows: [membership] } = await client.query(
      `INSERT INTO organization_memberships (organization_id, user_id, employee_code, employment_status)
       VALUES ($1, $2, $3, 'ACTIVE') RETURNING id`,
      [org.id, user.id, `${organizationCode.toUpperCase()}-001`]
    );

    // Assign ADMIN role
    const { rows: [adminRole] } = await client.query(`SELECT id FROM roles WHERE code = 'ADMIN'`);
    await client.query(
      `INSERT INTO membership_roles (membership_id, role_id, assigned_by)
       VALUES ($1, $2, $1)`,
      [membership.id, adminRole.id]
    );

    await client.query('COMMIT');

    const payload = await buildTokenPayload(user.id, membership.id, org.id);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ userId: user.id });
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO auth_sessions (user_id, organization_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, org.id, refreshHash, expiresAt]
    );

    return { user: { id: user.id, fullName: user.full_name, email: user.email }, organization: org, membership: { id: membership.id }, accessToken, refreshToken };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─── Login ────────────────────────────────────────────────────
const login = async ({ email, password }, { ip, userAgent } = {}) => {
  const { rows: [user] } = await query(
    `SELECT id, full_name, email, password_hash, account_status FROM users WHERE email = $1`,
    [email]
  );
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  if (user.account_status !== 'ACTIVE') throw Object.assign(new Error('Account is not active'), { status: 403 });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  // Get membership (single-org: take the first active one)
  const { rows: [membership] } = await query(
    `SELECT om.id, om.organization_id, om.employee_code, om.job_title,
            o.name AS org_name, o.code AS org_code
     FROM organization_memberships om
     JOIN organizations o ON o.id = om.organization_id
     WHERE om.user_id = $1 AND om.employment_status = 'ACTIVE'
     ORDER BY om.created_at ASC LIMIT 1`,
    [user.id]
  );
  if (!membership) throw Object.assign(new Error('No active organization membership found'), { status: 403 });

  await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

  const payload = await buildTokenPayload(user.id, membership.id, membership.organization_id);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ userId: user.id });
  const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO auth_sessions (user_id, organization_id, refresh_token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [user.id, membership.organization_id, refreshHash, expiresAt, ip || null, userAgent || null]
  );

  return {
    user: { id: user.id, fullName: user.full_name, email: user.email },
    membership: { id: membership.id, employeeCode: membership.employee_code, jobTitle: membership.job_title, organization: { id: membership.organization_id, name: membership.org_name, code: membership.org_code } },
    accessToken,
    refreshToken,
  };
};

// ─── Refresh ──────────────────────────────────────────────────
const refresh = async (refreshToken) => {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const { rows: [session] } = await query(
    `SELECT id, user_id, organization_id FROM auth_sessions
     WHERE user_id = $1 AND refresh_token_hash = $2
       AND revoked_at IS NULL AND expires_at > NOW()`,
    [decoded.userId, hash]
  );
  if (!session) throw Object.assign(new Error('Session expired or revoked'), { status: 401 });

  const { rows: [membership] } = await query(
    `SELECT id FROM organization_memberships
     WHERE user_id = $1 AND organization_id = $2 AND employment_status = 'ACTIVE'`,
    [session.user_id, session.organization_id]
  );
  if (!membership) throw Object.assign(new Error('Membership not found'), { status: 401 });

  const payload = await buildTokenPayload(session.user_id, membership.id, session.organization_id);
  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken({ userId: session.user_id });
  const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

  await query(`UPDATE auth_sessions SET refresh_token_hash = $1, expires_at = $2 WHERE id = $3`,
    [newHash, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), session.id]);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// ─── Logout ───────────────────────────────────────────────────
const logout = async (refreshToken) => {
  if (!refreshToken) return;
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await query(`UPDATE auth_sessions SET revoked_at = NOW() WHERE refresh_token_hash = $1`, [hash]);
};

// ─── Forgot Password ──────────────────────────────────────────
const forgotPassword = async (email) => {
  const { rows: [user] } = await query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (!user) return null; // Don't reveal if email exists

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  // In production: send email. For dev: return token directly.
  return rawToken;
};

// ─── Reset Password ───────────────────────────────────────────
const resetPassword = async (rawToken, newPassword) => {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const { rows: [record] } = await query(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );
  if (!record) throw Object.assign(new Error('Token is invalid or expired'), { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [passwordHash, record.user_id]);
  await query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [record.id]);
  await query(`UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [record.user_id]);
};

// ─── Get Me ───────────────────────────────────────────────────
const getMe = async (userId, membershipId) => {
  const { rows: [user] } = await query(
    `SELECT u.id, u.full_name, u.email, u.account_status, u.last_login_at,
            om.id AS membership_id, om.employee_code, om.job_title, om.joining_date,
            o.id AS org_id, o.name AS org_name, o.code AS org_code, o.industry
     FROM users u
     JOIN organization_memberships om ON om.id = $2
     JOIN organizations o ON o.id = om.organization_id
     WHERE u.id = $1`,
    [userId, membershipId]
  );
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const { rows: roles } = await query(
    `SELECT r.code, r.name FROM membership_roles mr
     JOIN roles r ON r.id = mr.role_id
     WHERE mr.membership_id = $1 AND mr.revoked_at IS NULL`,
    [membershipId]
  );

  return {
    id: user.id, fullName: user.full_name, email: user.email,
    accountStatus: user.account_status, lastLoginAt: user.last_login_at,
    membership: {
      id: user.membership_id, employeeCode: user.employee_code,
      jobTitle: user.job_title, joiningDate: user.joining_date,
    },
    organization: { id: user.org_id, name: user.org_name, code: user.org_code, industry: user.industry },
    roles: roles.map((r) => ({ code: r.code, name: r.name })),
  };
};

module.exports = { signup, login, refresh, logout, forgotPassword, resetPassword, getMe };
