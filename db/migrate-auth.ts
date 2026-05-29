import { pool } from "./pool";

export async function migrateAuthSchema(): Promise<void> {
  const { rows: orgTable } = await pool.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizations'
  `);

  if (orgTable.length === 0) {
    await pool.query(`
      CREATE TABLE organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  const { rows: empCol } = await pool.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'organization_id'
  `);

  if (empCol.length === 0) {
    await pool.query(`ALTER TABLE employees ADD COLUMN organization_id UUID`);
    await pool.query(`ALTER TABLE employees ADD COLUMN user_id UUID UNIQUE`);

    const { rows: demoOrg } = await pool.query<{ id: string }>(
      `INSERT INTO organizations (slug, name)
       VALUES ('demo', 'Demo Organization')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const orgId = demoOrg[0]?.id;
    if (orgId) {
      await pool.query(`UPDATE employees SET organization_id = $1 WHERE organization_id IS NULL`, [orgId]);
      await pool.query(
        `ALTER TABLE employees ALTER COLUMN organization_id SET NOT NULL`
      );
      await pool.query(
        `ALTER TABLE employees ADD CONSTRAINT employees_organization_id_fkey
         FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE`
      ).catch(() => {});
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_employees_organization_id ON employees(organization_id)`
      );
    }
  }

  const { rows: ticketCol } = await pool.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'organization_id'
  `);

  if (ticketCol.length === 0) {
    await pool.query(`ALTER TABLE tickets ADD COLUMN organization_id UUID`);
    await pool.query(`ALTER TABLE tickets ADD COLUMN requester_user_id UUID`);

    const { rows: org } = await pool.query<{ id: string }>(
      `SELECT id FROM organizations WHERE slug = 'demo' LIMIT 1`
    );
    const orgId = org[0]?.id;
    if (orgId) {
      await pool.query(`UPDATE tickets SET organization_id = $1 WHERE organization_id IS NULL`, [orgId]);
      await pool.query(
        `ALTER TABLE tickets ALTER COLUMN organization_id SET NOT NULL`
      );
      await pool.query(
        `ALTER TABLE tickets ADD CONSTRAINT tickets_organization_id_fkey
         FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE`
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_tickets_organization_id ON tickets(organization_id)`
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_tickets_requester_user_id ON tickets(requester_user_id)`
      ).catch(() => {});
    }
  }

  const { rows: usersTable } = await pool.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  `);

  if (usersTable.length === 0) {
    await pool.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('employee', 'it_agent', 'org_admin')),
        employee_id UUID UNIQUE REFERENCES employees(id) ON DELETE SET NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      ALTER TABLE employees
      ADD CONSTRAINT employees_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    `).catch(() => {});
  }

  const { rows: sessionTable } = await pool.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'session'
  `);

  if (sessionTable.length === 0) {
    await pool.query(`
      CREATE TABLE session (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMPTZ(6) NOT NULL,
        CONSTRAINT session_pkey PRIMARY KEY (sid)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire)`);
  }
}
