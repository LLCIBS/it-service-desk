import { Router } from "express";
import {
  findSuperAdminByEmail,
  verifyPassword,
} from "../db/users";
import {
  listOrganizations,
  createOrganizationWithAdmin,
  getOrganizationById,
  getPlatformOrganization,
} from "../db/organizations";
import { requirePlatformAuth, type AuthedRequest } from "../middleware/requireAuth";
import { PLATFORM_ORG_SLUG } from "../db/migrate-platform";

const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const platformRouter = Router();

platformRouter.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await findSuperAdminByEmail(String(email));
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await verifyPassword(String(password), user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const platformOrg = await getPlatformOrganization();
    req.session.userId = user.id;
    req.session.homeOrganizationId = platformOrg.id;
    req.session.organizationId = null;

    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Session error" });
      }
      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          employee: null,
        },
        organization: platformOrg,
        inTenantContext: false,
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

platformRouter.post("/auth/logout", requirePlatformAuth, (req: AuthedRequest, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.status(204).send();
  });
});

platformRouter.get("/auth/me", requirePlatformAuth, (req: AuthedRequest, res) => {
  const user = req.user!;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      employee: user.employee,
    },
    organization: user.organization,
    inTenantContext: Boolean(user.inTenantContext),
  });
});

platformRouter.get("/organizations", requirePlatformAuth, async (req: AuthedRequest, res) => {
  try {
    if (req.user!.inTenantContext) {
      return res.status(400).json({ error: "Exit organization context first" });
    }
    const data = await listOrganizations();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load organizations" });
  }
});

platformRouter.post("/organizations", requirePlatformAuth, async (req: AuthedRequest, res) => {
  try {
    if (req.user!.inTenantContext) {
      return res.status(400).json({ error: "Exit organization context first" });
    }

    const { slug, name, adminEmail, adminPassword, adminName, department } = req.body || {};
    if (!slug || !name || !adminEmail || !adminPassword || !adminName) {
      return res.status(400).json({
        error: "slug, name, adminEmail, adminPassword, adminName are required",
      });
    }

    const slugStr = String(slug).trim().toLowerCase();
    if (slugStr === PLATFORM_ORG_SLUG || !SLUG_RE.test(slugStr)) {
      return res.status(400).json({
        error: "Invalid slug: use lowercase letters, numbers, hyphens",
      });
    }

    const result = await createOrganizationWithAdmin({
      slug: slugStr,
      name: String(name).trim(),
      adminEmail: String(adminEmail),
      adminPassword: String(adminPassword),
      adminName: String(adminName).trim(),
      department: department ? String(department) : undefined,
    });

    res.status(201).json(result);
  } catch (err: unknown) {
    console.error(err);
    if (err && typeof err === "object" && "code" in err) {
      if (err.code === "SLUG_EXISTS" || err.code === "23505") {
        return res.status(409).json({ error: "Slug or email already exists" });
      }
    }
    res.status(500).json({ error: "Failed to create organization" });
  }
});

platformRouter.post("/switch-org/:orgId", requirePlatformAuth, async (req: AuthedRequest, res) => {
  try {
    const org = await getOrganizationById(req.params.orgId);
    if (!org || org.slug === PLATFORM_ORG_SLUG) {
      return res.status(404).json({ error: "Organization not found" });
    }

    req.session.organizationId = org.id;
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Session error" });
      }
      res.json({
        organization: org,
        inTenantContext: true,
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to switch organization" });
  }
});

platformRouter.post("/exit-org", requirePlatformAuth, async (req: AuthedRequest, res) => {
  try {
    const platformOrg = await getPlatformOrganization();
    req.session.organizationId = null;
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Session error" });
      }
      res.json({
        organization: platformOrg,
        inTenantContext: false,
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to exit organization" });
  }
});
