-- Seed: Permissions
INSERT INTO permissions (id, code, module, action, description) VALUES
  (gen_random_uuid(), 'department.create', 'department', 'create', 'Create departments'),
  (gen_random_uuid(), 'department.update', 'department', 'update', 'Update departments'),
  (gen_random_uuid(), 'asset.register', 'asset', 'register', 'Register new assets'),
  (gen_random_uuid(), 'asset.update', 'asset', 'update', 'Update asset details'),
  (gen_random_uuid(), 'asset.view', 'asset', 'view', 'View assets'),
  (gen_random_uuid(), 'asset.allocate', 'asset', 'allocate', 'Allocate assets'),
  (gen_random_uuid(), 'transfer.approve', 'transfer', 'approve', 'Approve transfer requests'),
  (gen_random_uuid(), 'return.approve', 'return', 'approve', 'Approve return requests'),
  (gen_random_uuid(), 'maintenance.approve', 'maintenance', 'approve', 'Approve maintenance'),
  (gen_random_uuid(), 'booking.create', 'booking', 'create', 'Create bookings'),
  (gen_random_uuid(), 'audit.create', 'audit', 'create', 'Create audit cycles'),
  (gen_random_uuid(), 'audit.assign', 'audit', 'assign', 'Assign auditors'),
  (gen_random_uuid(), 'report.export', 'report', 'export', 'Export reports'),
  (gen_random_uuid(), 'employee.promote', 'employee', 'promote', 'Promote employee roles')
ON CONFLICT (code) DO NOTHING;
