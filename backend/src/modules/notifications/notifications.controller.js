const svc = require('./notifications.service');
const wrap = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
module.exports = {
  list:         wrap((req) => svc.listNotifications(req.user.membershipId, req.query)),
  markRead:     wrap((req) => svc.markRead(req.user.membershipId, req.params.id)),
  markAllRead:  wrap((req) => svc.markAllRead(req.user.membershipId)),
  unreadCount:  wrap((req) => svc.getUnreadCount(req.user.membershipId)),
};
