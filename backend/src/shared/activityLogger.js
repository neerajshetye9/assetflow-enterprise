const { query } = require('../config/db');

/**
 * Appends an entry to activity_logs.
 * Call this after successful mutations.
 */
const logActivity = async ({
  organizationId,
  actorMembershipId,
  action,
  entityType,
  entityId,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    await query(
      `INSERT INTO activity_logs
        (id, organization_id, actor_membership_id, action, entity_type, entity_id,
         old_values, new_values, ip_address, user_agent, created_at)
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        organizationId,
        actorMembershipId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent,
      ]
    );
  } catch (err) {
    // Activity logging should never break the main flow
    console.error('[ActivityLogger] Failed to write log:', err.message);
  }
};

module.exports = { logActivity };
