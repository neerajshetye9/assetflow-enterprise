const svc = require('./resources.service');
const wrap = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
module.exports = {
  listResources:      wrap((req) => svc.listResources(req.user.organizationId, req.query)),
  createResource:     wrap((req) => svc.createResource(req.user.organizationId, req.user.membershipId, req.body)),
  updateResource:     wrap((req) => svc.updateResource(req.user.organizationId, req.user.membershipId, req.params.id, req.body)),
  listBookings:       wrap((req) => svc.listBookings(req.user.organizationId, req.query)),
  myBookings:         wrap((req) => svc.listBookings(req.user.organizationId, { membershipId: req.user.membershipId })),
  createBooking:      wrap((req) => svc.createBooking(req.user.organizationId, req.user.membershipId, req.body)),
  cancelBooking:      wrap((req) => svc.cancelBooking(req.user.organizationId, req.user.membershipId, req.params.id, req.body.reason)),
  getAvailability:    wrap((req) => svc.getResourceAvailability(req.user.organizationId, req.params.id, req.query.date)),
};
