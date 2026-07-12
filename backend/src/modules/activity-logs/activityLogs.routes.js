const { Router } = require('express');
const c = require('./activityLogs.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const router = Router();
router.use(authenticate);
router.get('/', requireRole('ADMIN','ASSET_MANAGER'), c.list);
module.exports = router;
