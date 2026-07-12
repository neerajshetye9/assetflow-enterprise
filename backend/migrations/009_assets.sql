CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES asset_categories(id),
  location_id UUID REFERENCES locations(id),
  asset_tag VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  serial_number VARCHAR(255),
  description TEXT,
  acquisition_date DATE,
  acquisition_cost DECIMAL(12,2),
  condition VARCHAR(20) DEFAULT 'GOOD' CHECK (condition IN ('NEW','GOOD','FAIR','POOR','DAMAGED')),
  status VARCHAR(30) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','ALLOCATED','RESERVED','UNDER_MAINTENANCE','LOST','RETIRED','DISPOSED')),
  is_shared BOOLEAN DEFAULT FALSE,
  is_bookable BOOLEAN DEFAULT FALSE,
  qr_code VARCHAR(255),
  custom_attributes JSONB DEFAULT '{}',
  created_by UUID REFERENCES organization_memberships(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT assets_org_tag_unique UNIQUE (organization_id, asset_tag)
);

CREATE INDEX IF NOT EXISTS idx_assets_org ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  original_filename VARCHAR(500) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  file_size BIGINT,
  checksum VARCHAR(64),
  uploaded_by UUID REFERENCES organization_memberships(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_files (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  file_type VARCHAR(20) DEFAULT 'PHOTO' CHECK (file_type IN ('PHOTO','WARRANTY','MANUAL','INVOICE_REFERENCE','OTHER')),
  PRIMARY KEY (asset_id, file_id)
);
