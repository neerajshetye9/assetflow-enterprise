const { Router } = require('express');
const c = require('./reports.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const router = Router();
router.use(authenticate);
router.get('/assets',       requireRole('ADMIN','ASSET_MANAGER'), c.assetReport);
router.get('/maintenance',  requireRole('ADMIN','ASSET_MANAGER'), c.maintenanceReport);
router.get('/allocations',  requireRole('ADMIN','ASSET_MANAGER'), c.allocationReport);

// Employee Personal Reports
router.get('/me/allocations', c.myAllocationReport);
router.get('/me/maintenance', c.myMaintenanceReport);
router.get('/me/bookings',    c.myBookingReport);

module.exports = router;
