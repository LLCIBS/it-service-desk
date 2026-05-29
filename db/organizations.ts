import { pool } from "./pool";
import type { AuthOrganization } from "./auth-types";

interface OrgRow {
  id: string;
  slug: string;
  name: string;
}

function mapOrg(row: OrgRow): AuthOrganization {
  return { id: row.id, slug: row.slug, name: row.name };
}

export async function getOrganizationBySlug(slug: string): Promise<AuthOrganization | null> {
  const { rows } = await pool.query<OrgRow>(
    `SELECT id, slug, name FROM organizations WHERE slug = $1`,
    [slug]
  );
  return rows[0] ? mapOrg(rows[0]) : null;
}

export async function getOrganizationById(id: string): Promise<AuthOrganization | null> {
  const { rows } = await pool.query<OrgRow>(
    `SELECT id, slug, name FROM organizations WHERE id = $1`,
    [id]
  );
  return rows[0] ? mapOrg(rows[0]) : null;
}

export async function createOrganization(slug: string, name: string): Promise<AuthOrganization> {
  const { rows } = await pool.query<OrgRow>(
    `INSERT INTO organizations (slug, name) VALUES ($1, $2)
     RETURNING id, slug, name`,
    [slug, name]
  );
  return mapOrg(rows[0]);
}
