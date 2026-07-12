const svc = require('./maintenance.service');
const wrap = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
module.exports = {
  listRequests:   wrap((req) => svc.listRequests(req.user.organizationId)),
  createRequest:  wrap((req) => svc.createRequest(req.user.organizationId, req.user.membershipId, req.body)),
  approve:        wrap((req) => svc.updateStatus(req.user.organizationId, req.user.membershipId, req.params.id, 'APPROVED')),
  reject:         wrap((req) => svc.updateStatus(req.user.organizationId, req.user.membershipId, req.params.id, 'REJECTED', { rejectedReason: req.body.rejectedReason })),
  assignTech:     wrap((req) => svc.updateStatus(req.user.organizationId, req.user.membershipId, req.params.id, 'TECHNICIAN_ASSIGNED', req.body)),
  startWork:      wrap((req) => svc.updateStatus(req.user.organizationId, req.user.membershipId, req.params.id, 'IN_PROGRESS')),
  resolve:        wrap((req) => svc.updateStatus(req.user.organizationId, req.user.membershipId, req.params.id, 'RESOLVED', { resolutionNotes: req.body.resolutionNotes })),
  getHistory:     wrap((req) => svc.getHistory(req.params.id)),
};
