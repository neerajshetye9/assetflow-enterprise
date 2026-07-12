const svc = require('../transfers/transfers.service');
const wrap = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
module.exports = {
  listRequests:  wrap((req) => svc.listReturnRequests(req.user.organizationId)),
  requestReturn: wrap((req) => svc.requestReturn(req.user.organizationId, req.user.membershipId, req.body)),
  approveReturn: wrap((req) => svc.approveReturn(req.user.organizationId, req.user.membershipId, req.params.id, req.body)),
};
