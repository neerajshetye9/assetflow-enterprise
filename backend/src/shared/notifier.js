const { query } = require('../config/db');

const sendNotification = async ({ organizationId, recipientMembershipId, type, title, message, entityType, entityId }) => {
  try {
    await query(
      `INSERT INTO notifications (organization_id, recipient_membership_id, notification_type, title, message, entity_type, entity_id, status)
       VALUES (, , , , , , , 'PENDING')`,
      [organizationId, recipientMembershipId, type, title, message, entityType || null, entityId || null]
    );
  } catch (err) {
    console.error('[Notifier] Failed to send notification:', err.message);
  }
};

module.exports = { sendNotification };
