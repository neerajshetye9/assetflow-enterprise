CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  requested_by UUID NOT NULL REFERENCES organization_memberships(id),
  issue_description TEXT NOT NULL,
  priority VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status VARCHAR(25) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','TECHNICIAN_ASSIGNED','IN_PROGRESS','RESOLVED','CANCELLED')),
  approved_by UUID REFERENCES organization_memberships(id),
  approved_at TIMESTAMP,
  rejected_reason TEXT,
  technician_id UUID REFERENCES organization_memberships(id),
  external_technician_name VARCHAR(255),
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  old_status VARCHAR(25),
  new_status VARCHAR(25) NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES organization_memberships(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_files (
  maintenance_request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  file_type VARCHAR(20) DEFAULT 'ISSUE_PHOTO' CHECK (file_type IN ('ISSUE_PHOTO','REPAIR_DOCUMENT','RESOLUTION_PHOTO')),
  PRIMARY KEY (maintenance_request_id, file_id)
);
