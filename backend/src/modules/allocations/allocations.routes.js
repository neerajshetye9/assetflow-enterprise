const { Router } = require('express');
const c = require('./allocations.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = Router();
router.use(authenticate);
router.get('/requests',               c.listRequests);
router.post('/requests',              c.createRequest);
router.put('/requests/:id/approve',   requireRole('ADMIN','ASSET_MANAGER','DEPARTMENT_HEAD'), c.approveRequest);
router.put('/requests/:id/reject',    requireRole('ADMIN','ASSET_MANAGER','DEPARTMENT_HEAD'), c.rejectRequest);
router.get('/active',                 c.listActive);
module.exports = router;
