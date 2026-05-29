export type UserRole = "employee" | "it_agent" | "org_admin" | "super_admin";

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
