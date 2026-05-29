import { Router } from "express";
import { requireTenantAuth, type AuthedRequest } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import * as departmentsRepo from "../db/departments";

export const departmentsRouter = Router();

departmentsRouter.get("/departments", requireTenantAuth, async (req: AuthedRequest, res) => {
  try {
    const data = await departmentsRepo.listDepartments(req.user!.organizationId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load departments" });
  }
});

departmentsRouter.post(
  "/departments",
  requireTenantAuth,
  requireRole("org_admin"),
  async (req: AuthedRequest, res) => {
    try {
      const { name } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: "name is required" });
      }
      const row = await departmentsRepo.createDepartment(
        req.user!.organizationId,
        String(name)
      );
      res.status(201).json(row);
    } catch (err: unknown) {
      console.error(err);
      if (err && typeof err === "object" && "code" in err) {
        if (err.code === "23505") {
          return res.status(409).json({ error: "Отдел с таким названием уже существует" });
        }
        if (err.code === "INVALID_NAME") {
          return res.status(400).json({ error: "Укажите название отдела" });
        }
      }
      res.status(500).json({ error: "Failed to create department" });
    }
  }
);

departmentsRouter.patch(
  "/departments/:id",
  requireTenantAuth,
  requireRole("org_admin"),
  async (req: AuthedRequest, res) => {
    try {
      const { name } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: "name is required" });
      }
      const row = await departmentsRepo.updateDepartment(
        req.user!.organizationId,
        req.params.id,
        String(name)
      );
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (err: unknown) {
      console.error(err);
      if (err && typeof err === "object" && "code" in err) {
        if (err.code === "23505") {
          return res.status(409).json({ error: "Отдел с таким названием уже существует" });
        }
        if (err.code === "INVALID_NAME") {
          return res.status(400).json({ error: "Укажите название отдела" });
        }
      }
      res.status(500).json({ error: "Failed to update department" });
    }
  }
);

departmentsRouter.delete(
  "/departments/:id",
  requireTenantAuth,
  requireRole("org_admin"),
  async (req: AuthedRequest, res) => {
    try {
      const result = await departmentsRepo.deleteDepartment(
        req.user!.organizationId,
        req.params.id
      );
      if (!result.deleted) {
        if (result.reason) {
          return res.status(409).json({ error: result.reason });
        }
        return res.status(404).json({ error: "Not found" });
      }
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete department" });
    }
  }
);
