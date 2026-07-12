-- Seed: Role-Permission mappings
-- ADMIN gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- ASSET_MANAGER permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
  'asset.register','asset.update','asset.view','asset.allocate',
  'transfer.approve','return.approve','maintenance.approve','report.export'
)
WHERE r.code = 'ASSET_MANAGER'
ON CONFLICT DO NOTHING;

-- DEPARTMENT_HEAD permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
  'asset.view','transfer.approve','booking.create'
)
WHERE r.code = 'DEPARTMENT_HEAD'
ON CONFLICT DO NOTHING;

-- EMPLOYEE permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
  'asset.view','booking.create'
)
WHERE r.code = 'EMPLOYEE'
ON CONFLICT DO NOTHING;
