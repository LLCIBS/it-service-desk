import { pool } from "./pool";

export const PLATFORM_ORG_SLUG = "_platform";

export async function migratePlatformSchema(): Promise<void> {
  await pool.query(`
    INSERT INTO organizations (slug, name)
    VALUES ($1, 'Platform')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  `, [PLATFORM_ORG_SLUG]);

  const { rows } = await pool.query<{ conname: string }>(
    `SELECT conname FROM pg_constraint
     WHERE conrelid = 'users'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%role%'`
  );

  for (const row of rows) {
    await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ${row.conname}`);
  }

  await pool.query(`
    ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('employee', 'it_agent', 'org_admin', 'super_admin'))
  `).catch(async () => {
    await pool.query(`
      DO $$
      BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check
          CHECK (role IN ('employee', 'it_agent', 'org_admin', 'super_admin'));
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);
  });
}
