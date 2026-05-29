import type { Response, NextFunction } from "express";
import type { UserRole } from "../db/auth-types";
import type { AuthedRequest } from "./requireAuth";

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
