CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) CHECK (notification_type IN (
    'ASSET_ASSIGNED','TRANSFER_APPROVED','TRANSFER_REJECTED','RETURN_OVERDUE',
    'BOOKING_CONFIRMED','BOOKING_REMINDER','BOOKING_CANCELLED',
    'MAINTENANCE_APPROVED','MAINTENANCE_REJECTED','AUDIT_DISCREPANCY'
  )),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','READ','FAILED')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_membership_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_membership_id UUID REFERENCES organization_memberships(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_org ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES organization_memberships(id),
  report_type VARCHAR(50) CHECK (report_type IN (
    'ASSET_UTILIZATION','MAINTENANCE_FREQUENCY','DEPARTMENT_ALLOCATION',
    'BOOKING_HEATMAP','ASSET_RETIREMENT','AUDIT_DISCREPANCY'
  )),
  filters JSONB DEFAULT '{}',
  format VARCHAR(10) DEFAULT 'CSV' CHECK (format IN ('CSV','PDF','XLSX')),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
  file_id UUID REFERENCES files(id),
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
