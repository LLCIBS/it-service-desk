import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import * as assetsRepo from "../db/assets";
import type { AssetStatus, AssetType } from "../src/types";

export const assetsRouter = Router();

assetsRouter.get("/assets/lookup", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    if (!q.trim()) {
      return res.json([]);
    }
    const data = await assetsRepo.lookupAssets(req.user!.organizationId, q);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to lookup assets" });
  }
});

assetsRouter.use(requireAuth, requireRole("it_agent", "org_admin"));

assetsRouter.get("/assets", async (req: AuthedRequest, res) => {
  try {
    const type = req.query.type as AssetType | undefined;
    const status = req.query.status as AssetStatus | undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const department = typeof req.query.department === "string" ? req.query.department : undefined;
    const data = await assetsRepo.listAssets(req.user!.organizationId, {
      type,
      status,
      q,
      department,
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load assets" });
  }
});

assetsRouter.get("/assets/:id", async (req: AuthedRequest, res) => {
  try {
    const asset = await assetsRepo.getAssetById(req.params.id, req.user!.organizationId);
    if (!asset) return res.status(404).json({ error: "Not found" });
    res.json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load asset" });
  }
});

assetsRouter.post("/assets", async (req: AuthedRequest, res) => {
  try {
    const body = req.body || {};
    if (!body.name || !body.assetType) {
      return res.status(400).json({ error: "name and assetType are required" });
    }
    const asset = await assetsRepo.createAsset(
      req.user!.organizationId,
      req.user!.id,
      body
    );
    res.status(201).json(asset);
  } catch (err: unknown) {
    console.error(err);
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return res.status(409).json({ error: "Inventory number already exists" });
    }
    res.status(500).json({ error: "Failed to create asset" });
  }
});

assetsRouter.patch("/assets/:id", async (req: AuthedRequest, res) => {
  try {
    const asset = await assetsRepo.updateAsset(
      req.params.id,
      req.user!.organizationId,
      req.body || {}
    );
    if (!asset) return res.status(404).json({ error: "Not found" });
    res.json(asset);
  } catch (err: unknown) {
    console.error(err);
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return res.status(409).json({ error: "Inventory number already exists" });
    }
    res.status(500).json({ error: "Failed to update asset" });
  }
});

assetsRouter.delete("/assets/:id", async (req: AuthedRequest, res) => {
  try {
    const deleted = await assetsRepo.deleteAsset(req.params.id, req.user!.organizationId);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

assetsRouter.post("/assets/:id/software", async (req: AuthedRequest, res) => {
  try {
    const { name, version, licenseKey, installedAt, notes } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    const asset = await assetsRepo.addSoftware(req.params.id, req.user!.organizationId, {
      name: String(name),
      version,
      licenseKey,
      installedAt,
      notes,
    });
    if (!asset) return res.status(404).json({ error: "Not found" });
    res.status(201).json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add software" });
  }
});

assetsRouter.patch("/assets/:assetId/software/:softwareId", async (req: AuthedRequest, res) => {
  try {
    const asset = await assetsRepo.updateSoftware(
      req.params.softwareId,
      req.params.assetId,
      req.user!.organizationId,
      req.body || {}
    );
    if (!asset) return res.status(404).json({ error: "Not found" });
    res.json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update software" });
  }
});

assetsRouter.delete("/assets/:assetId/software/:softwareId", async (req: AuthedRequest, res) => {
  try {
    const asset = await assetsRepo.deleteSoftware(
      req.params.softwareId,
      req.params.assetId,
      req.user!.organizationId
    );
    if (!asset) return res.status(404).json({ error: "Not found" });
    res.json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete software" });
  }
});

assetsRouter.get(
  "/assets/:assetId/software/:softwareId/reveal-license",
  async (req: AuthedRequest, res) => {
    try {
      const key = await assetsRepo.revealSoftwareLicense(
        req.params.softwareId,
        req.params.assetId,
        req.user!.organizationId
      );
      if (key === null) return res.status(404).json({ error: "Not found" });
      res.json({ licenseKey: key });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to reveal license" });
    }
  }
);
