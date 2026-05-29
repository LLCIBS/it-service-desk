import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import * as employeesRepo from "../db/employees";

export const employeesRouter = Router();

employeesRouter.use(requireAuth, requireRole("org_admin"));

employeesRouter.get("/employees", async (req: AuthedRequest, res) => {
  try {
    const data = await employeesRepo.getAllEmployees(req.user!.organizationId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load employees" });
  }
});

employeesRouter.post("/employees", async (req: AuthedRequest, res) => {
  try {
    const { department, fullName, mobile, email, password, role } = req.body || {};
    if (!department || !fullName) {
      return res.status(400).json({ error: "department and fullName are required" });
    }
    if (email && (!password || !role)) {
      return res.status(400).json({ error: "password and role required when email is set" });
    }
    const row = await employeesRepo.createEmployee(req.user!.organizationId, {
      department: String(department).trim(),
      fullName: String(fullName).trim(),
      mobile: typeof mobile === "string" ? mobile.trim() : "",
      email: email ? String(email).trim() : undefined,
      password: password ? String(password) : undefined,
      role,
    });
    res.status(201).json(row);
  } catch (err: unknown) {
    console.error(err);
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Failed to create employee" });
  }
});

employeesRouter.patch("/employees/:id", async (req: AuthedRequest, res) => {
  try {
    const { department, fullName, mobile, email, password, role } = req.body || {};
    const updates: Parameters<typeof employeesRepo.updateEmployee>[2] = {};
    if (department !== undefined) updates.department = String(department).trim();
    if (fullName !== undefined) updates.fullName = String(fullName).trim();
    if (mobile !== undefined) updates.mobile = String(mobile).trim();
    if (email !== undefined) updates.email = String(email).trim();
    if (password !== undefined) updates.password = String(password);
    if (role !== undefined) updates.role = role;

    const row = await employeesRepo.updateEmployee(
      req.params.id,
      req.user!.organizationId,
      updates
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update employee" });
  }
});

employeesRouter.delete("/employees/:id", async (req: AuthedRequest, res) => {
  try {
    const deleted = await employeesRepo.deleteEmployee(
      req.params.id,
      req.user!.organizationId
    );
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete employee" });
  }
});
