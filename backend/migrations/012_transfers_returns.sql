CREATE TABLE IF NOT EXISTS asset_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  current_allocation_id UUID REFERENCES asset_allocations(id),
  requested_by UUID NOT NULL REFERENCES organization_memberships(id),
  target_employee_id UUID REFERENCES organization_memberships(id),
  target_department_id UUID REFERENCES departments(id),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','APPROVED','REJECTED','COMPLETED','CANCELLED')),
  reviewed_by UUID REFERENCES organization_memberships(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  allocation_id UUID NOT NULL REFERENCES asset_allocations(id),
  requested_by UUID NOT NULL REFERENCES organization_memberships(id),
  request_notes TEXT,
  condition_at_request VARCHAR(20) CHECK (condition_at_request IN ('GOOD','FAIR','POOR','DAMAGED')),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED')),
  reviewed_by UUID REFERENCES organization_memberships(id),
  reviewed_at TIMESTAMP,
  checkin_condition VARCHAR(20) CHECK (checkin_condition IN ('GOOD','FAIR','POOR','DAMAGED')),
  checkin_notes TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
