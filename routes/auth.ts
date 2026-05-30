import { Router } from "express";
import { findUserByEmail, verifyPassword } from "../db/users";
import { resolveOrgFromSlug, type OrgRequest } from "../middleware/resolveOrg";
import { requireTenantAuth, type AuthedRequest } from "../middleware/requireAuth";
import { authLimiter } from "../middleware/security";
import { validateBody } from "../validation/middleware";
import { loginSchema } from "../validation/schemas";

export const authRouter = Router();

authRouter.post(
  "/o/:orgSlug/auth/login",
  authLimiter,
  validateBody(loginSchema),
  resolveOrgFromSlug,
  async (req: OrgRequest, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const org = req.organization!;
    const user = await findUserByEmail(String(email));
    if (!user || user.organizationId !== org.id) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.role === "super_admin") {
      return res.status(403).json({
        error: "Используйте вход на странице платформы: /platform/login",
      });
    }

    const valid = await verifyPassword(String(password), user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Регенерируем сессию, чтобы исключить session fixation.
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error(regenErr);
        return res.status(500).json({ error: "Session error" });
      }
      req.session.userId = user.id;
      req.session.organizationId = org.id;

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
            employee: user.employee,
          },
          organization: org,
        });
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

authRouter.post("/auth/logout", requireTenantAuth, (req: AuthedRequest, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.status(204).send();
  });
});

authRouter.get("/auth/me", requireTenantAuth, (req: AuthedRequest, res) => {
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
