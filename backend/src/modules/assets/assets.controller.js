const svc = require('./assets.service');
const wrap = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
module.exports = {
  listAssets:    wrap((req) => svc.listAssets(req.user.organizationId, req.query)),
  getAsset:      wrap((req) => svc.getAsset(req.user.organizationId, req.params.id)),
  createAsset:   wrap(async (req) => { const r = await svc.createAsset(req.user.organizationId, req.user.membershipId, req.body); return r; }),
  updateAsset:   wrap((req) => svc.updateAsset(req.user.organizationId, req.user.membershipId, req.params.id, req.body)),
  getHistory:    wrap((req) => svc.getAssetHistory(req.user.organizationId, req.params.id)),
};
