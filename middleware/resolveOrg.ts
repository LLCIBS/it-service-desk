import type { Request, Response, NextFunction } from "express";
import { getOrganizationBySlug } from "../db/organizations";

export interface OrgRequest extends Request {
  organization?: { id: string; slug: string; name: string };
}

export async function resolveOrgFromSlug(req: OrgRequest, res: Response, next: NextFunction) {
  const slug = req.params.orgSlug;
  if (!slug) {
    return res.status(400).json({ error: "Organization slug required" });
  }
  const org = await getOrganizationBySlug(slug);
  if (!org) {
    return res.status(404).json({ error: "Organization not found" });
  }
  req.organization = org;
  next();
}
