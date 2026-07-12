CREATE TABLE IF NOT EXISTS asset_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES organization_memberships(id),
  event_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_status_history_asset ON asset_status_history(asset_id);
