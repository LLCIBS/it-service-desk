CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(100) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('employee', 'it_agent', 'org_admin', 'super_admin')),
  employee_id UUID UNIQUE REFERENCES employees(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requester_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department VARCHAR(255) NOT NULL,
  requester_name VARCHAR(255) NOT NULL,
  phone VARCHAR(100) NOT NULL DEFAULT '',
  mobile VARCHAR(100) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL DEFAULT '',
  preferred VARCHAR(50) NOT NULL DEFAULT '',
  location VARCHAR(255) NOT NULL DEFAULT '',
  problem_type VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  priority VARCHAR(20) NOT NULL,
  remote_access BOOLEAN NOT NULL DEFAULT FALSE,
  inventory_number VARCHAR(100),
  os VARCHAR(50),
  software_name VARCHAR(255),
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  assignee VARCHAR(255),
  deadline TIMESTAMPTZ,
  resolution TEXT
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);
CREATE INDEX IF NOT EXISTS idx_employees_organization_id ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_organization_id ON tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_requester_user_id ON tickets(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('computer', 'peripheral', 'network', 'other')),
  subtype VARCHAR(100),
  inventory_number VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255) DEFAULT '',
  model VARCHAR(255) DEFAULT '',
  serial_number VARCHAR(255) DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT 'in_use'
    CHECK (status IN ('in_use', 'spare', 'repair', 'decommissioned')),
  location VARCHAR(255) DEFAULT '',
  department VARCHAR(255) DEFAULT '',
  responsible_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  parent_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  purchase_date DATE,
  warranty_until DATE,
  notes TEXT DEFAULT '',
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_org_inventory
  ON assets(organization_id, inventory_number)
  WHERE inventory_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_parent_asset_id ON assets(parent_asset_id);

CREATE TABLE IF NOT EXISTS asset_hardware_specs (
  asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  cpu VARCHAR(255) DEFAULT '',
  ram_gb INTEGER,
  storage VARCHAR(255) DEFAULT '',
  os_name VARCHAR(255) DEFAULT '',
  os_version VARCHAR(100) DEFAULT '',
  ip_address VARCHAR(100) DEFAULT '',
  mac_address VARCHAR(100) DEFAULT '',
  hostname VARCHAR(255) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS asset_software (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(100) DEFAULT '',
  license_key_encrypted TEXT,
  installed_at DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_software_asset_id ON asset_software(asset_id);

CREATE TABLE IF NOT EXISTS asset_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  credential_type VARCHAR(50) NOT NULL DEFAULT 'other'
    CHECK (credential_type IN ('local', 'domain', 'wifi', 'vpn', 'service', 'other')),
  username VARCHAR(255) DEFAULT '',
  password_encrypted TEXT NOT NULL,
  url VARCHAR(500) DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_credentials_organization_id ON asset_credentials(organization_id);
CREATE INDEX IF NOT EXISTS idx_asset_credentials_asset_id ON asset_credentials(asset_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'asset_id'
  ) THEN
    ALTER TABLE tickets ADD COLUMN asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tickets_asset_id ON tickets(asset_id);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_organization_id ON departments(organization_id);
