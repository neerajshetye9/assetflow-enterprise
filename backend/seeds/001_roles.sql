-- Seed: Roles
INSERT INTO roles (id, code, name, description) VALUES
  (gen_random_uuid(), 'ADMIN', 'Administrator', 'Full access to all modules'),
  (gen_random_uuid(), 'ASSET_MANAGER', 'Asset Manager', 'Manages assets, allocations, maintenance'),
  (gen_random_uuid(), 'DEPARTMENT_HEAD', 'Department Head', 'Approves requests for their department'),
  (gen_random_uuid(), 'EMPLOYEE', 'Employee', 'Standard employee access')
ON CONFLICT (code) DO NOTHING;
