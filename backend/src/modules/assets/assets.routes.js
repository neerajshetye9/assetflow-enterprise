const { Router } = require('express');
const c = require('./assets.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = Router();
router.use(authenticate);

router.get('/',          c.listAssets);
router.post('/',         requireRole('ADMIN','ASSET_MANAGER'), c.createAsset);
router.get('/:id',       c.getAsset);
router.put('/:id',       requireRole('ADMIN','ASSET_MANAGER'), c.updateAsset);
router.get('/:id/history', c.getHistory);

module.exports = router;
