import { pool } from "./pool";
import { ensureOrganizationDepartments } from "./departments";
import { PLATFORM_ORG_SLUG } from "./migrate-platform";

export async function migrateDepartmentsSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (organization_id, name)
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_departments_organization_id ON departments(organization_id)
  `);

  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM organizations WHERE slug != $1`,
    [PLATFORM_ORG_SLUG]
  );
  for (const org of rows) {
    await ensureOrganizationDepartments(org.id);
  }
}
