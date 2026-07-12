const { getClient } = require('./backend/src/config/db');
const { createBooking } = require('./backend/src/modules/resources/resources.service');
const { listNotifications } = require('./backend/src/modules/notifications/notifications.service');

(async () => {
  const client = await getClient();
  try {
    const orgId = '689afe88-ff85-41e6-b3e4-e76fb27952fd';
    const memId = '24411421-a44b-4714-b156-0a9cf5ef298a';
    const resId = 'e9ce2421-5522-417b-b617-14577143ddf2';
    
    console.log('Testing booking creation for Vignesh...');
    
    const startTime = new Date(Date.now() + 120 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 180 * 60 * 1000).toISOString();
    
    const booking = await createBooking(orgId, memId, {
      resourceId: resId,
      startTime: startTime,
      endTime: endTime,
      title: 'Vignesh 30-min Booking Test',
      purpose: 'Testing notification workflow'
    });
    
    console.log('Booking created:', booking.id);
    
    const notifs = await listNotifications(memId, { unreadOnly: true });
    console.log('Unread Notifications:', notifs.length);
    if (notifs.length > 0) {
      console.log('Latest Notification Message:', notifs[0].message);
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
})();
