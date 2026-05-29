import { pool } from "./pool";
import type { AuthOrganization } from "./auth-types";
import { createUserWithEmployee } from "./users";
import { seedDefaultDepartments } from "./departments";
import { PLATFORM_ORG_SLUG } from "./migrate-platform";

interface OrgRow {
  id: string;
  slug: string;
  name: string;
  created_at?: Date;
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

export async function getPlatformOrganization(): Promise<AuthOrganization> {
  const org = await getOrganizationBySlug(PLATFORM_ORG_SLUG);
  if (!org) throw new Error("Platform organization not initialized");
  return org;
}

export interface OrganizationListItem extends AuthOrganization {
  createdAt: string;
}

export async function listOrganizations(): Promise<OrganizationListItem[]> {
  const { rows } = await pool.query<OrgRow>(
    `SELECT id, slug, name, created_at FROM organizations
     WHERE slug != $1
     ORDER BY name ASC`,
    [PLATFORM_ORG_SLUG]
  );
  return rows.map((r) => ({
    ...mapOrg(r),
    createdAt: r.created_at ? r.created_at.toISOString() : new Date().toISOString(),
  }));
}

export async function createOrganizationWithAdmin(data: {
  slug: string;
  name: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
  department?: string;
}): Promise<{ organization: AuthOrganization; loginUrl: string }> {
  const existing = await getOrganizationBySlug(data.slug);
  if (existing) {
    throw Object.assign(new Error("Organization slug already exists"), { code: "SLUG_EXISTS" });
  }

  const organization = await createOrganization(data.slug, data.name);
  await seedDefaultDepartments(organization.id);
  await createUserWithEmployee({
    organizationId: organization.id,
    email: data.adminEmail,
    password: data.adminPassword,
    role: "org_admin",
    department: data.department || "ИТ",
    fullName: data.adminName,
    mobile: "",
  });

  return {
    organization,
    loginUrl: `/o/${organization.slug}/login`,
  };
}
