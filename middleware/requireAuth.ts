import type { Request, Response, NextFunction } from "express";
import { findUserById } from "../db/users";
import { getOrganizationById } from "../db/organizations";
import type { SessionUser } from "../db/auth-types";

export interface AuthedRequest extends Request {
  user?: SessionUser;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  const organizationId = req.session?.organizationId;

  if (!userId || !organizationId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await findUserById(userId);
  if (!user || user.organizationId !== organizationId) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Unauthorized" });
  }

  const organization = await getOrganizationById(organizationId);
  if (!organization) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.user = { ...user, organization };
  next();
}
