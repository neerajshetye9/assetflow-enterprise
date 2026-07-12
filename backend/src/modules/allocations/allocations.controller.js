const svc = require('./allocations.service');
const wrap = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
module.exports = {
  listRequests:   wrap((req) => svc.listRequests(req.user.organizationId)),
  createRequest:  wrap((req) => svc.createRequest(req.user.organizationId, req.user.membershipId, req.body)),
  approveRequest: wrap((req) => svc.approveRequest(req.user.organizationId, req.user.membershipId, req.params.id)),
  rejectRequest:  wrap((req) => svc.rejectRequest(req.user.organizationId, req.user.membershipId, req.params.id, req.body.rejectionReason)),
  listActive:     wrap((req) => svc.listActiveAllocations(req.user.organizationId)),
};
