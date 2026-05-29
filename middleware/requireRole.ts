import type { Response, NextFunction } from "express";
import type { UserRole } from "../db/auth-types";
import type { AuthedRequest } from "./requireAuth";

export function effectiveTenantRole(user: NonNullable<AuthedRequest["user"]>): UserRole {
  if (user.role === "super_admin" && user.inTenantContext) {
    return "org_admin";
  }
  return user.role;
}

export function hasTenantRole(
  user: NonNullable<AuthedRequest["user"]>,
  ...roles: UserRole[]
): boolean {
  if (user.role === "super_admin") {
    if (!user.inTenantContext) return false;
    return roles.includes("org_admin") || roles.includes("it_agent");
  }
  return roles.includes(user.role);
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!hasTenantRole(req.user, ...roles)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
