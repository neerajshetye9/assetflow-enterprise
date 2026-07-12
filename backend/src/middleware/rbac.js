/**
 * RBAC middleware — checks if the logged-in user has required role(s)
 * Usage: requireRole('ADMIN') or requireRole(['ADMIN', 'ASSET_MANAGER'])
 */
const requireRole = (...allowedRoles) => {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    const hasRole = req.user.roles.some((r) => roles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Requires one of: ${roles.join(', ')}`,
      });
    }
    next();
  };
};

/**
 * Permission-level middleware
 * Usage: requirePermission('asset.allocate')
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing permission: ${permission}`,
      });
    }
    next();
  };
};

module.exports = { requireRole, requirePermission };
