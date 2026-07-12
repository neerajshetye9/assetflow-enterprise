const { Router } = require('express');
const c = require('./resources.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const router = Router();
router.use(authenticate);
// Resources
router.get('/',                        c.listResources);
router.post('/',                       requireRole('ADMIN','ASSET_MANAGER'), c.createResource);
router.put('/:id',                     requireRole('ADMIN','ASSET_MANAGER'), c.updateResource);
router.get('/:id/availability',        c.getAvailability);
// Bookings (scoped to /resources for brevity; also mounted at /bookings below)
module.exports = router;
