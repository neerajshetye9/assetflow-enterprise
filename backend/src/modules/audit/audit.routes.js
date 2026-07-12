const { Router } = require('express');
const c = require('./audit.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = Router();
router.use(authenticate);

router.get('/cycles',                        c.getCycles);
router.post('/cycles',                       requireRole('ADMIN','ASSET_MANAGER'), c.createCycle);
router.put('/cycles/:id',                    requireRole('ADMIN','ASSET_MANAGER'), c.updateCycleStatus);
router.post('/cycles/:id/assignments',       requireRole('ADMIN','ASSET_MANAGER'), c.assignAuditor);
router.get('/cycles/:id/items',              c.getCycleItems);
router.put('/items/:id/verify',              c.verifyItem);
router.post('/items/:id/discrepancies',      c.createDiscrepancy);
router.put('/discrepancies/:id',             requireRole('ADMIN','ASSET_MANAGER'), c.resolveDiscrepancy);

module.exports = router;
