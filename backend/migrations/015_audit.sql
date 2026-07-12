CREATE TABLE IF NOT EXISTS audit_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SCHEDULED','IN_PROGRESS','COMPLETED','CLOSED')),
  created_by UUID NOT NULL REFERENCES organization_memberships(id),
  closed_by UUID REFERENCES organization_memberships(id),
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_scope_departments (
  audit_cycle_id UUID NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (audit_cycle_id, department_id)
);

CREATE TABLE IF NOT EXISTS audit_scope_locations (
  audit_cycle_id UUID NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  PRIMARY KEY (audit_cycle_id, location_id)
);

CREATE TABLE IF NOT EXISTS audit_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_cycle_id UUID NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
  auditor_membership_id UUID NOT NULL REFERENCES organization_memberships(id),
  assigned_by UUID NOT NULL REFERENCES organization_memberships(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED'))
);

CREATE TABLE IF NOT EXISTS audit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_cycle_id UUID NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id),
  expected_location_id UUID REFERENCES locations(id),
  expected_department_id UUID REFERENCES departments(id),
  expected_status VARCHAR(30),
  verification_status VARCHAR(20) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','VERIFIED','MISSING','DAMAGED')),
  actual_location_id UUID REFERENCES locations(id),
  observed_condition VARCHAR(20),
  verification_notes TEXT,
  verified_by UUID REFERENCES organization_memberships(id),
  verified_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_item_id UUID NOT NULL REFERENCES audit_items(id) ON DELETE CASCADE,
  discrepancy_type VARCHAR(30) CHECK (discrepancy_type IN ('MISSING','DAMAGED','WRONG_LOCATION','WRONG_HOLDER','STATUS_MISMATCH')),
  description TEXT,
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN','UNDER_REVIEW','RESOLVED','REJECTED')),
  resolution_action TEXT,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES organization_memberships(id),
  resolved_at TIMESTAMP
);
