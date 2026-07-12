const svc = require('../notifications/notifications.service');
const wrap = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
module.exports = {
  assetReport:       wrap((req) => svc.getAssetReport(req.user.organizationId, req.query)),
  maintenanceReport: wrap((req) => svc.getMaintenanceReport(req.user.organizationId, req.query)),
  allocationReport:  wrap((req) => svc.getAllocationReport(req.user.organizationId, req.query.format)),
  myAllocationReport: wrap((req) => svc.getMyAllocationReport(req.user.membershipId, req.query.format)),
  myMaintenanceReport: wrap((req) => svc.getMyMaintenanceReport(req.user.membershipId, req.query.format)),
  myBookingReport:    wrap((req) => svc.getMyBookingReport(req.user.membershipId, req.query.format)),
};
