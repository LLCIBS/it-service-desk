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
  role VARCHAR(50) NOT NULL CHECK (role IN ('employee', 'it_agent', 'org_admin')),
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
