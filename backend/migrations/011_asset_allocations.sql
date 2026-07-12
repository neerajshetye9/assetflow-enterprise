CREATE TABLE IF NOT EXISTS asset_allocation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  requested_by UUID NOT NULL REFERENCES organization_memberships(id),
  target_employee_id UUID REFERENCES organization_memberships(id),
  target_department_id UUID REFERENCES departments(id),
  expected_return_at TIMESTAMP,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  reviewed_by UUID REFERENCES organization_memberships(id),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  employee_id UUID REFERENCES organization_memberships(id),
  department_id UUID REFERENCES departments(id),
  allocated_by UUID NOT NULL REFERENCES organization_memberships(id),
  allocated_at TIMESTAMP DEFAULT NOW(),
  expected_return_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RETURNED','TRANSFERRED','CANCELLED')),
  returned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT allocation_employee_or_dept CHECK (
    (employee_id IS NOT NULL AND department_id IS NULL)
    OR
    (employee_id IS NULL AND department_id IS NOT NULL)
  )
);

-- Prevent double allocation: only one ACTIVE allocation per asset
CREATE UNIQUE INDEX IF NOT EXISTS one_active_allocation_per_asset
  ON asset_allocations(asset_id)
  WHERE status = 'ACTIVE';
