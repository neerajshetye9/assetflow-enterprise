const svc = require('./dashboard.service');
const wrap = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
module.exports = {
  getDashboard:       wrap((req) => svc.getDashboard(req.user.organizationId)),
  getAssetsByCategory:wrap((req) => svc.getAssetsByCategory(req.user.organizationId)),
  getAssetsByStatus:  wrap((req) => svc.getAssetsByStatus(req.user.organizationId)),
  getMaintenanceTrend:wrap((req) => svc.getMaintenanceTrend(req.user.organizationId)),
};
