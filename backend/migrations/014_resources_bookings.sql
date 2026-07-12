-- Enable btree_gist for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id),
  location_id UUID REFERENCES locations(id),
  name VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50) CHECK (resource_type IN ('ROOM','VEHICLE','EQUIPMENT','PROJECTOR','OTHER')),
  capacity INTEGER,
  description TEXT,
  status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','UNAVAILABLE','MAINTENANCE')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  resource_id UUID NOT NULL REFERENCES resources(id),
  booked_by UUID NOT NULL REFERENCES organization_memberships(id),
  on_behalf_department_id UUID REFERENCES departments(id),
  title VARCHAR(255) NOT NULL,
  purpose TEXT,
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING','ONGOING','COMPLETED','CANCELLED')),
  cancelled_by UUID REFERENCES organization_memberships(id),
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT booking_time_check CHECK (start_at < end_at),
  -- Prevent overlapping bookings for same resource (half-open intervals)
  EXCLUDE USING gist (
    resource_id WITH =,
    tsrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status NOT IN ('CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_resource ON resource_bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start ON resource_bookings(start_at);
