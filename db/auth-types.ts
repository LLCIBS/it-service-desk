export type UserRole = "employee" | "it_agent" | "org_admin" | "super_admin";

/**
 * Роли, которые разрешено назначать через обычное (тенантное) API.
 * super_admin — платформенная роль и НЕ должна назначаться через CRUD сотрудников,
 * иначе возможна эскалация привилегий до доступа ко всем организациям.
 */
export const ASSIGNABLE_TENANT_ROLES: readonly UserRole[] = [
  "employee",
  "it_agent",
  "org_admin",
];

export function isAssignableTenantRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    (ASSIGNABLE_TENANT_ROLES as readonly string[]).includes(value)
  );
}

export interface AuthOrganization {
  id: string;
  slug: string;
  name: string;
}

export interface AuthEmployee {
  id: string;
  department: string;
  fullName: string;
  mobile: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
  employeeId: string | null;
  employee: AuthEmployee | null;
}

export interface SessionUser extends AuthUser {
  organization: AuthOrganization;
  inTenantContext?: boolean;
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    organizationId?: string | null;
    homeOrganizationId?: string;
  }
}
