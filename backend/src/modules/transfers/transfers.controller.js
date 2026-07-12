const svc = require('./transfers.service');
const wrap = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
module.exports = {
  listRequests:   wrap((req) => svc.listTransferRequests(req.user.organizationId)),
  requestTransfer:wrap((req) => svc.requestTransfer(req.user.organizationId, req.user.membershipId, req.body)),
  approveTransfer:wrap((req) => svc.approveTransfer(req.user.organizationId, req.user.membershipId, req.params.id)),
  rejectTransfer: wrap((req) => svc.rejectTransfer(req.user.organizationId, req.user.membershipId, req.params.id)),
};
