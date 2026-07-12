const svc = require('./audit.service');

const wrap = (fn) => async (req, res, next) => {
  try { res.json(await fn(req)); } catch (err) { next(err); }
};

module.exports = {
  getCycles:           wrap((req) => svc.getCycles(req.user.organizationId)),
  createCycle:         wrap((req) => svc.createCycle(req.user.organizationId, req.user.membershipId, req.body)),
  updateCycleStatus:   wrap((req) => svc.updateCycleStatus(req.user.organizationId, req.user.membershipId, req.params.id, req.body.status)),
  assignAuditor:       wrap((req) => svc.assignAuditor(req.user.organizationId, req.user.membershipId, req.params.id, req.body.auditorMembershipId)),
  getCycleItems:       wrap((req) => svc.getCycleItems(req.params.id, req.user.organizationId)),
  verifyItem:          wrap((req) => svc.verifyItem(req.user.organizationId, req.user.membershipId, req.params.id, req.body)),
  createDiscrepancy:   wrap((req) => svc.createDiscrepancy(req.user.organizationId, req.user.membershipId, req.params.id, req.body)),
  resolveDiscrepancy:  wrap((req) => svc.resolveDiscrepancy(req.user.organizationId, req.user.membershipId, req.params.id, req.body)),
};
