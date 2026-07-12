const svc = require('../notifications/notifications.service');
const wrap = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
module.exports = {
  list: wrap((req) => svc.listActivityLogs(req.user.organizationId, req.query)),
};
