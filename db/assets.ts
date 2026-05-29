import { v4 as uuidv4 } from "uuid";
import { pool } from "./pool";
import { encryptSecret } from "./crypto";
import {
  mapAssetRow,
  mapAssetSummary,
  type AssetRow,
  type CredentialRow,
  type HardwareSpecsRow,
  type SoftwareRow,
} from "./asset-mappers";
import type {
  Asset,
  AssetHardwareSpecs,
  AssetStatus,
  AssetSummary,
  AssetType,
  TicketSummary,
} from "../src/types";

const ASSET_SELECT = `
  SELECT a.id, a.organization_id, a.asset_type, a.subtype, a.inventory_number, a.name,
         a.manufacturer, a.model, a.serial_number, a.status, a.location, a.department,
         a.responsible_employee_id, a.assigned_employee_id, a.parent_asset_id,
         a.purchase_date, a.warranty_until, a.notes, a.created_by_user_id,
         a.created_at, a.updated_at,
         er.full_name AS responsible_name,
         ea.full_name AS assigned_name,
         pa.name AS parent_name
  FROM assets a
  LEFT JOIN employees er ON er.id = a.responsible_employee_id
  LEFT JOIN employees ea ON ea.id = a.assigned_employee_id
  LEFT JOIN assets pa ON pa.id = a.parent_asset_id`;

export interface AssetListFilters {
  type?: AssetType;
  status?: AssetStatus;
  q?: string;
  department?: string;
}

export async function listAssets(
  organizationId: string,
  filters: AssetListFilters = {}
): Promise<AssetSummary[]> {
  const conditions = ["a.organization_id = $1"];
  const params: unknown[] = [organizationId];
  let idx = 2;

  if (filters.type) {
    conditions.push(`a.asset_type = $${idx++}`);
    params.push(filters.type);
  }
  if (filters.status) {
    conditions.push(`a.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.department) {
    conditions.push(`a.department = $${idx++}`);
    params.push(filters.department);
  }
  if (filters.q?.trim()) {
    const q = `%${filters.q.trim().toLowerCase()}%`;
    conditions.push(`(
      LOWER(a.name) LIKE $${idx} OR
      LOWER(COALESCE(a.inventory_number, '')) LIKE $${idx} OR
      LOWER(COALESCE(a.serial_number, '')) LIKE $${idx} OR
      LOWER(COALESCE(ea.full_name, '')) LIKE $${idx}
    )`);
    params.push(q);
    idx++;
  }

  const { rows } = await pool.query<AssetRow>(
    `${ASSET_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY a.name ASC`,
    params
  );
  return rows.map(mapAssetSummary);
}

export async function lookupAssets(
  organizationId: string,
  q: string,
  limit = 20
): Promise<AssetSummary[]> {
  const term = `%${q.trim().toLowerCase()}%`;
  const { rows } = await pool.query<AssetRow>(
    `${ASSET_SELECT}
     WHERE a.organization_id = $1
       AND (
         LOWER(a.name) LIKE $2 OR
         LOWER(COALESCE(a.inventory_number, '')) LIKE $2 OR
         LOWER(COALESCE(a.serial_number, '')) LIKE $2
       )
     ORDER BY a.name ASC
     LIMIT $3`,
    [organizationId, term, limit]
  );
  return rows.map(mapAssetSummary);
}

async function loadHardwareSpecs(assetId: string): Promise<HardwareSpecsRow | undefined> {
  const { rows } = await pool.query<HardwareSpecsRow>(
    `SELECT asset_id, cpu, ram_gb, storage, os_name, os_version, ip_address, mac_address, hostname
     FROM asset_hardware_specs WHERE asset_id = $1`,
    [assetId]
  );
  return rows[0];
}

async function loadSoftware(assetId: string): Promise<SoftwareRow[]> {
  const { rows } = await pool.query<SoftwareRow>(
    `SELECT id, asset_id, name, version, license_key_encrypted, installed_at, notes, created_at
     FROM asset_software WHERE asset_id = $1 ORDER BY name ASC`,
    [assetId]
  );
  return rows;
}

async function loadCredentialsForAsset(assetId: string, organizationId: string): Promise<CredentialRow[]> {
  const { rows } = await pool.query<CredentialRow>(
    `SELECT id, organization_id, asset_id, title, credential_type, username,
            password_encrypted, url, notes, created_at, updated_at
     FROM asset_credentials
     WHERE asset_id = $1 AND organization_id = $2
     ORDER BY title ASC`,
    [assetId, organizationId]
  );
  return rows;
}

async function loadChildren(parentId: string, organizationId: string): Promise<AssetRow[]> {
  const { rows } = await pool.query<AssetRow>(
    `${ASSET_SELECT}
     WHERE a.parent_asset_id = $1 AND a.organization_id = $2
     ORDER BY a.name ASC`,
    [parentId, organizationId]
  );
  return rows;
}

export async function getRelatedTickets(
  assetId: string,
  organizationId: string
): Promise<TicketSummary[]> {
  const { rows } = await pool.query<{
    id: string;
    title: string;
    status: string;
    created_at: Date;
    requester_name: string;
  }>(
    `SELECT id, title, status, created_at, requester_name
     FROM tickets
     WHERE asset_id = $1 AND organization_id = $2
     ORDER BY created_at DESC`,
    [assetId, organizationId]
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status as TicketSummary["status"],
    createdAt: r.created_at.toISOString(),
    requesterName: r.requester_name,
  }));
}

export async function getAssetById(
  id: string,
  organizationId: string
): Promise<Asset | null> {
  const { rows } = await pool.query<AssetRow>(
    `${ASSET_SELECT} WHERE a.id = $1 AND a.organization_id = $2`,
    [id, organizationId]
  );
  if (!rows[0]) return null;

  const [specs, software, credentials, children, relatedTickets] = await Promise.all([
    loadHardwareSpecs(id),
    loadSoftware(id),
    loadCredentialsForAsset(id, organizationId),
    loadChildren(id, organizationId),
    getRelatedTickets(id, organizationId),
  ]);

  return mapAssetRow(rows[0], specs, software, credentials, children, relatedTickets);
}

export async function getAssetInventoryNumber(
  id: string,
  organizationId: string
): Promise<string | null> {
  const { rows } = await pool.query<{ inventory_number: string | null }>(
    `SELECT inventory_number FROM assets WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  return rows[0]?.inventory_number ?? null;
}

export interface CreateAssetInput {
  assetType: AssetType;
  subtype?: string;
  inventoryNumber?: string;
  name: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  status?: AssetStatus;
  location?: string;
  department?: string;
  responsibleEmployeeId?: string;
  assignedEmployeeId?: string;
  parentAssetId?: string;
  purchaseDate?: string;
  warrantyUntil?: string;
  notes?: string;
  hardwareSpecs?: AssetHardwareSpecs;
}

export async function createAsset(
  organizationId: string,
  userId: string,
  input: CreateAssetInput
): Promise<Asset> {
  const id = uuidv4();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO assets (
        id, organization_id, asset_type, subtype, inventory_number, name,
        manufacturer, model, serial_number, status, location, department,
        responsible_employee_id, assigned_employee_id, parent_asset_id,
        purchase_date, warranty_until, notes, created_by_user_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19
      )`,
      [
        id,
        organizationId,
        input.assetType,
        input.subtype ?? null,
        input.inventoryNumber ?? null,
        input.name,
        input.manufacturer ?? "",
        input.model ?? "",
        input.serialNumber ?? "",
        input.status ?? "in_use",
        input.location ?? "",
        input.department ?? "",
        input.responsibleEmployeeId ?? null,
        input.assignedEmployeeId ?? null,
        input.parentAssetId ?? null,
        input.purchaseDate || null,
        input.warrantyUntil || null,
        input.notes ?? "",
        userId,
      ]
    );

    if (input.hardwareSpecs) {
      await upsertHardwareSpecs(client, id, input.hardwareSpecs);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const asset = await getAssetById(id, organizationId);
  if (!asset) throw new Error("Failed to load created asset");
  return asset;
}

async function upsertHardwareSpecs(
  client: { query: typeof pool.query },
  assetId: string,
  specs: AssetHardwareSpecs
) {
  await client.query(
    `INSERT INTO asset_hardware_specs (
      asset_id, cpu, ram_gb, storage, os_name, os_version, ip_address, mac_address, hostname
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (asset_id) DO UPDATE SET
      cpu = EXCLUDED.cpu,
      ram_gb = EXCLUDED.ram_gb,
      storage = EXCLUDED.storage,
      os_name = EXCLUDED.os_name,
      os_version = EXCLUDED.os_version,
      ip_address = EXCLUDED.ip_address,
      mac_address = EXCLUDED.mac_address,
      hostname = EXCLUDED.hostname`,
    [
      assetId,
      specs.cpu ?? "",
      specs.ramGb ?? null,
      specs.storage ?? "",
      specs.osName ?? "",
      specs.osVersion ?? "",
      specs.ipAddress ?? "",
      specs.macAddress ?? "",
      specs.hostname ?? "",
    ]
  );
}

export async function updateAsset(
  id: string,
  organizationId: string,
  input: Partial<CreateAssetInput>
): Promise<Asset | null> {
  const fieldMap: Record<string, string> = {
    assetType: "asset_type",
    subtype: "subtype",
    inventoryNumber: "inventory_number",
    name: "name",
    manufacturer: "manufacturer",
    model: "model",
    serialNumber: "serial_number",
    status: "status",
    location: "location",
    department: "department",
    responsibleEmployeeId: "responsible_employee_id",
    assignedEmployeeId: "assigned_employee_id",
    parentAssetId: "parent_asset_id",
    purchaseDate: "purchase_date",
    warrantyUntil: "warranty_until",
    notes: "notes",
  };

  const fields: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, column] of Object.entries(fieldMap)) {
    const val = input[key as keyof CreateAssetInput];
    if (val !== undefined) {
      fields.push(`${column} = $${idx++}`);
      values.push(val === "" ? null : val);
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (fields.length > 1) {
      values.push(id, organizationId);
      const { rowCount } = await client.query(
        `UPDATE assets SET ${fields.join(", ")} WHERE id = $${idx++} AND organization_id = $${idx}`,
        values
      );
      if ((rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return null;
      }
    }

    if (input.hardwareSpecs !== undefined) {
      await upsertHardwareSpecs(client, id, input.hardwareSpecs);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getAssetById(id, organizationId);
}

export async function deleteAsset(id: string, organizationId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM assets WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  return (rowCount ?? 0) > 0;
}

export async function addSoftware(
  assetId: string,
  organizationId: string,
  data: { name: string; version?: string; licenseKey?: string; installedAt?: string; notes?: string }
): Promise<Asset | null> {
  const asset = await getAssetById(assetId, organizationId);
  if (!asset) return null;

  const id = uuidv4();
  await pool.query(
    `INSERT INTO asset_software (id, asset_id, name, version, license_key_encrypted, installed_at, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      assetId,
      data.name,
      data.version ?? "",
      data.licenseKey ? encryptSecret(data.licenseKey) : null,
      data.installedAt || null,
      data.notes ?? "",
    ]
  );
  return getAssetById(assetId, organizationId);
}

export async function updateSoftware(
  softwareId: string,
  assetId: string,
  organizationId: string,
  data: Partial<{ name: string; version: string; licenseKey: string; installedAt: string; notes: string }>
): Promise<Asset | null> {
  const asset = await getAssetById(assetId, organizationId);
  if (!asset) return null;

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(data.name);
  }
  if (data.version !== undefined) {
    fields.push(`version = $${idx++}`);
    values.push(data.version);
  }
  if (data.licenseKey !== undefined) {
    fields.push(`license_key_encrypted = $${idx++}`);
    values.push(data.licenseKey ? encryptSecret(data.licenseKey) : null);
  }
  if (data.installedAt !== undefined) {
    fields.push(`installed_at = $${idx++}`);
    values.push(data.installedAt || null);
  }
  if (data.notes !== undefined) {
    fields.push(`notes = $${idx++}`);
    values.push(data.notes);
  }

  if (fields.length > 0) {
    values.push(softwareId, assetId);
    const idParam = values.length - 1;
    const assetParam = values.length;
    await pool.query(
      `UPDATE asset_software SET ${fields.join(", ")}
       WHERE id = $${idParam} AND asset_id = $${assetParam}`,
      values
    );
  }

  return getAssetById(assetId, organizationId);
}

export async function deleteSoftware(
  softwareId: string,
  assetId: string,
  organizationId: string
): Promise<Asset | null> {
  const asset = await getAssetById(assetId, organizationId);
  if (!asset) return null;

  await pool.query(`DELETE FROM asset_software WHERE id = $1 AND asset_id = $2`, [
    softwareId,
    assetId,
  ]);
  return getAssetById(assetId, organizationId);
}

export async function revealSoftwareLicense(
  softwareId: string,
  assetId: string,
  organizationId: string
): Promise<string | null> {
  const asset = await getAssetById(assetId, organizationId);
  if (!asset) return null;

  const { rows } = await pool.query<{ license_key_encrypted: string | null }>(
    `SELECT license_key_encrypted FROM asset_software WHERE id = $1 AND asset_id = $2`,
    [softwareId, assetId]
  );
  const enc = rows[0]?.license_key_encrypted;
  if (!enc) return null;
  const { decryptSecret } = await import("./crypto");
  return decryptSecret(enc);
}
