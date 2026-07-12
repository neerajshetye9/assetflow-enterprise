CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location_type VARCHAR(50) CHECK (location_type IN ('OFFICE','WAREHOUSE','FACTORY','BRANCH','OTHER')),
  address TEXT,
  floor VARCHAR(50),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMP DEFAULT NOW()
);
