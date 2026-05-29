import type { Request, Response, NextFunction } from "express";
import { findUserById } from "../db/users";
import { getOrganizationById } from "../db/organizations";
import type { SessionUser } from "../db/auth-types";

export interface AuthedRequest extends Request {
  user?: SessionUser;
}

async function loadSessionUser(userId: string): Promise<SessionUser | null> {
  const user = await findUserById(userId);
  if (!user) return null;

  if (user.role === "super_admin") {
    const tenantOrgId = user.organizationId;
    const organization = await getOrganizationById(tenantOrgId);
    if (!organization) return null;
    return {
      ...user,
      organizationId: tenantOrgId,
      organization,
      inTenantContext: true,
    };
  }

  const organization = await getOrganizationById(user.organizationId);
  if (!organization) return null;

  return { ...user, organization, inTenantContext: false };
}

export async function requirePlatformAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await findUserById(userId);
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const homeOrgId = req.session.homeOrganizationId ?? user.organizationId;
  const homeOrg = await getOrganizationById(homeOrgId);
  if (!homeOrg) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const tenantOrgId = req.session.organizationId;
  if (tenantOrgId) {
    const tenantOrg = await getOrganizationById(tenantOrgId);
    if (!tenantOrg) {
      req.session.organizationId = null;
      return res.status(401).json({ error: "Invalid tenant context" });
    }
    req.user = {
      ...user,
      organizationId: tenantOrgId,
      organization: tenantOrg,
      inTenantContext: true,
    };
  } else {
    req.user = {
      ...user,
      organizationId: homeOrg.id,
      organization: homeOrg,
      inTenantContext: false,
    };
  }

  next();
}

export async function requireTenantAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.session?.userId;
  const organizationId = req.session?.organizationId;

  if (!userId || !organizationId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await findUserById(userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (user.role === "super_admin") {
    const organization = await getOrganizationById(organizationId);
    if (!organization) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = {
      ...user,
      organizationId,
      organization,
      inTenantContext: true,
    };
    return next();
  }

  if (user.organizationId !== organizationId) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Unauthorized" });
  }

  const organization = await getOrganizationById(organizationId);
  if (!organization) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.user = { ...user, organization, inTenantContext: false };
  next();
}

/** @deprecated Use requireTenantAuth for tenant APIs */
export const requireAuth = requireTenantAuth;
