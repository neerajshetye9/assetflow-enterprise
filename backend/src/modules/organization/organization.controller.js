const svc = require('./organization.service');

const wrap = (fn) => async (req, res, next) => {
  try { res.json(await fn(req, res)); }
  catch (err) { next(err); }
};

module.exports = {
  getDepartments:   wrap((req) => svc.getDepartments(req.user.organizationId)),
  createDepartment: wrap((req) => svc.createDepartment(req.user.organizationId, req.user.membershipId, req.body)),
  updateDepartment: wrap((req) => svc.updateDepartment(req.user.organizationId, req.user.membershipId, req.params.id, req.body)),
  getLocations:     wrap((req) => svc.getLocations(req.user.organizationId)),
  createLocation:   wrap((req) => svc.createLocation(req.user.organizationId, req.user.membershipId, req.body)),
  getCategories:    wrap((req) => svc.getCategories(req.user.organizationId)),
  createCategory:   wrap((req) => svc.createCategory(req.user.organizationId, req.user.membershipId, req.body)),
  getEmployees:     wrap((req) => svc.getEmployees(req.user.organizationId)),
  createEmployee:   wrap((req) => svc.createEmployee(req.user.organizationId, req.user.membershipId, req.body)),
  promoteEmployee:  wrap((req) => svc.promoteEmployee(req.user.organizationId, req.user.membershipId, req.params.id, req.body.roleCode)),
};
