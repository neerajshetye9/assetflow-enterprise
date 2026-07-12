CREATE TABLE IF NOT EXISTS asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT asset_categories_org_code_unique UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS asset_category_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES asset_categories(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  data_type VARCHAR(20) DEFAULT 'TEXT' CHECK (data_type IN ('TEXT','NUMBER','DATE','BOOLEAN','SELECT')),
  is_required BOOLEAN DEFAULT FALSE,
  validation_rules JSONB,
  display_order INTEGER DEFAULT 0
);
