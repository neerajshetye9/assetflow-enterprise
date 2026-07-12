CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_code VARCHAR(50),
  department_id UUID REFERENCES departments(id),
  job_title VARCHAR(255),
  joining_date DATE,
  employment_status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (employment_status IN ('ACTIVE','INACTIVE','TERMINATED')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT memberships_org_user_unique UNIQUE (organization_id, user_id)
);

-- Now add the FK for department head (deferred to avoid circular dependency)
ALTER TABLE departments
  ADD CONSTRAINT fk_dept_head
  FOREIGN KEY (head_membership_id)
  REFERENCES organization_memberships(id)
  ON DELETE SET NULL;
