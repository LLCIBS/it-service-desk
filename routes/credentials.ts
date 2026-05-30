import { Router } from "express";
import { requireTenantAuth, type AuthedRequest } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import * as credentialsRepo from "../db/credentials";
import { validateBody } from "../validation/middleware";
import { credentialCreateSchema, credentialUpdateSchema } from "../validation/schemas";

export const credentialsRouter = Router();

credentialsRouter.use(requireTenantAuth, requireRole("it_agent", "org_admin"));

credentialsRouter.get("/credentials", async (req: AuthedRequest, res) => {
  try {
    const assetId =
      req.query.assetId === "standalone"
        ? null
        : typeof req.query.assetId === "string"
          ? req.query.assetId
          : undefined;
    const data = await credentialsRepo.listCredentials(req.user!.organizationId, assetId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load credentials" });
  }
});

credentialsRouter.get("/credentials/:id", async (req: AuthedRequest, res) => {
  try {
    const cred = await credentialsRepo.getCredentialById(
      req.params.id,
      req.user!.organizationId
    );
    if (!cred) return res.status(404).json({ error: "Not found" });
    res.json(cred);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load credential" });
  }
});

credentialsRouter.post("/credentials", validateBody(credentialCreateSchema), async (req: AuthedRequest, res) => {
  try {
    const { title, password, assetId, credentialType, username, url, notes } = req.body || {};
    if (!title || !password) {
      return res.status(400).json({ error: "title and password are required" });
    }
    const cred = await credentialsRepo.createCredential(req.user!.organizationId, {
      title: String(title),
      password: String(password),
      assetId: assetId || undefined,
      credentialType,
      username,
      url,
      notes,
    });
    res.status(201).json(cred);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create credential" });
  }
});

credentialsRouter.patch("/credentials/:id", validateBody(credentialUpdateSchema), async (req: AuthedRequest, res) => {
  try {
    const cred = await credentialsRepo.updateCredential(
      req.params.id,
      req.user!.organizationId,
      req.body || {}
    );
    if (!cred) return res.status(404).json({ error: "Not found" });
    res.json(cred);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update credential" });
  }
});

credentialsRouter.delete("/credentials/:id", async (req: AuthedRequest, res) => {
  try {
    const deleted = await credentialsRepo.deleteCredential(
      req.params.id,
      req.user!.organizationId
    );
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete credential" });
  }
});

credentialsRouter.get("/credentials/:id/reveal", async (req: AuthedRequest, res) => {
  try {
    const password = await credentialsRepo.revealCredentialPassword(
      req.params.id,
      req.user!.organizationId
    );
    if (password === null) return res.status(404).json({ error: "Not found" });
    res.json({ password });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reveal password" });
  }
});
