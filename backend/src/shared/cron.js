const cron = require('node-cron');
const { query } = require('../config/db');
const notifier = require('./notifier');

const startCronJobs = () => {
  console.log('[CRON] Initializing background jobs...');

  // Job 1: Booking Reminders
  // Runs every 5 minutes. Checks for bookings starting in exactly 15 minutes.
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const fifteenMinsFromNow = new Date(now.getTime() + 15 * 60000);
      
      const { rows } = await query(
        `SELECT rb.id, rb.title, rb.start_at, rb.booked_by, r.name as resource_name 
         FROM resource_bookings rb
         JOIN resources r ON r.id = rb.resource_id
         WHERE rb.status = 'UPCOMING'
         AND rb.start_at > $1 AND rb.start_at <= $2`,
        [now, fifteenMinsFromNow]
      );

      for (const booking of rows) {
        await notifier.notify({
          recipientMembershipId: booking.booked_by,
          type: 'REMINDER',
          title: 'Upcoming Booking Reminder',
          message: `Your booking for ${booking.resource_name} (${booking.title}) starts in 15 minutes.`,
          link: '/bookings'
        });
      }
      if (rows.length > 0) console.log(`[CRON] Sent ${rows.length} booking reminders.`);
    } catch (err) {
      console.error('[CRON] Error in Booking Reminder job:', err.message);
    }
  });

  // Job 2: Overdue Auto-Flagging
  // Runs daily at midnight. Checks for active allocations where expected_return_at is in the past.
  cron.schedule('0 0 * * *', async () => {
    try {
      const now = new Date();
      const { rows } = await query(
        `SELECT aa.id, aa.employee_id, aa.allocated_by, a.name as asset_name, a.asset_tag
         FROM asset_allocations aa
         JOIN assets a ON a.id = aa.asset_id
         WHERE aa.status = 'ACTIVE'
         AND aa.expected_return_at < $1`,
        [now]
      );

      for (const alloc of rows) {
        // Notify the holding employee
        await notifier.notify({
          recipientMembershipId: alloc.employee_id,
          type: 'ALERT',
          title: 'Overdue Asset Return',
          message: `Your allocation for ${alloc.asset_name} (${alloc.asset_tag}) is overdue. Please return it or request an extension.`,
          link: '/allocations'
        });

        // Notify the asset manager who allocated it (if any)
        if (alloc.allocated_by) {
          await notifier.notify({
            recipientMembershipId: alloc.allocated_by,
            type: 'ALERT',
            title: 'Overdue Asset Flagged',
            message: `The asset ${alloc.asset_name} (${alloc.asset_tag}) allocated to an employee is currently overdue.`,
            link: '/allocations'
          });
        }
      }
      if (rows.length > 0) console.log(`[CRON] Flagged ${rows.length} overdue allocations.`);
    } catch (err) {
      console.error('[CRON] Error in Overdue Flagging job:', err.message);
    }
  });
};

module.exports = { startCronJobs };
