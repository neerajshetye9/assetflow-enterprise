const { Router } = require('express');
const c = require('./organization.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = Router();
router.use(authenticate);

router.get('/departments',              c.getDepartments);
router.post('/departments',             requireRole('ADMIN','ASSET_MANAGER'), c.createDepartment);
router.put('/departments/:id',          requireRole('ADMIN','ASSET_MANAGER'), c.updateDepartment);

router.get('/locations',                c.getLocations);
router.post('/locations',               requireRole('ADMIN','ASSET_MANAGER'), c.createLocation);

router.get('/categories',               c.getCategories);
router.post('/categories',              requireRole('ADMIN','ASSET_MANAGER'), c.createCategory);

router.get('/employees',                c.getEmployees);
router.post('/employees',               requireRole('ADMIN'), c.createEmployee);
router.put('/employees/:id/promote',    requireRole('ADMIN'), c.promoteEmployee);

module.exports = router;
