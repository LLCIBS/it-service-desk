import { v4 as uuidv4 } from "uuid";
import { pool } from "./pool";
import { encryptSecret, decryptSecret } from "./crypto";
import { mapCredentialRow, type CredentialRow } from "./asset-mappers";
import type { AssetCredential, CredentialType } from "../src/types";

const CREDENTIAL_SELECT = `
  SELECT c.id, c.organization_id, c.asset_id, c.title, c.credential_type,
         c.username, c.password_encrypted, c.url, c.notes, c.created_at, c.updated_at,
         a.name AS asset_name
  FROM asset_credentials c
  LEFT JOIN assets a ON a.id = c.asset_id`;

export async function listCredentials(
  organizationId: string,
  assetId?: string | null
): Promise<AssetCredential[]> {
  let query = `${CREDENTIAL_SELECT} WHERE c.organization_id = $1`;
  const params: unknown[] = [organizationId];

  if (assetId === null || assetId === "standalone") {
    query += ` AND c.asset_id IS NULL`;
  } else if (assetId) {
    query += ` AND c.asset_id = $2`;
    params.push(assetId);
  }

  query += ` ORDER BY c.title ASC`;

  const { rows } = await pool.query<CredentialRow>(query, params);
  return rows.map(mapCredentialRow);
}

export async function getCredentialById(
  id: string,
  organizationId: string
): Promise<AssetCredential | null> {
  const { rows } = await pool.query<CredentialRow>(
    `${CREDENTIAL_SELECT} WHERE c.id = $1 AND c.organization_id = $2`,
    [id, organizationId]
  );
  return rows[0] ? mapCredentialRow(rows[0]) : null;
}

export async function createCredential(
  organizationId: string,
  data: {
    assetId?: string;
    title: string;
    credentialType?: CredentialType;
    username?: string;
    password: string;
    url?: string;
    notes?: string;
  }
): Promise<AssetCredential> {
  if (data.assetId) {
    const { rows } = await pool.query(
      `SELECT id FROM assets WHERE id = $1 AND organization_id = $2`,
      [data.assetId, organizationId]
    );
    if (!rows[0]) throw new Error("Asset not found");
  }

  const id = uuidv4();
  const { rows } = await pool.query<CredentialRow>(
    `INSERT INTO asset_credentials (
      id, organization_id, asset_id, title, credential_type, username,
      password_encrypted, url, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, organization_id, asset_id, title, credential_type, username,
              password_encrypted, url, notes, created_at, updated_at`,
    [
      id,
      organizationId,
      data.assetId ?? null,
      data.title,
      data.credentialType ?? "other",
      data.username ?? "",
      encryptSecret(data.password),
      data.url ?? "",
      data.notes ?? "",
    ]
  );
  return mapCredentialRow(rows[0]);
}

export async function updateCredential(
  id: string,
  organizationId: string,
  data: Partial<{
    assetId: string | null;
    title: string;
    credentialType: CredentialType;
    username: string;
    password: string;
    url: string;
    notes: string;
  }>
): Promise<AssetCredential | null> {
  const fields: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [];
  let idx = 1;

  if (data.assetId !== undefined) {
    if (data.assetId) {
      const { rows } = await pool.query(
        `SELECT id FROM assets WHERE id = $1 AND organization_id = $2`,
        [data.assetId, organizationId]
      );
      if (!rows[0]) return null;
    }
    fields.push(`asset_id = $${idx++}`);
    values.push(data.assetId);
  }
  if (data.title !== undefined) {
    fields.push(`title = $${idx++}`);
    values.push(data.title);
  }
  if (data.credentialType !== undefined) {
    fields.push(`credential_type = $${idx++}`);
    values.push(data.credentialType);
  }
  if (data.username !== undefined) {
    fields.push(`username = $${idx++}`);
    values.push(data.username);
  }
  if (data.password !== undefined) {
    fields.push(`password_encrypted = $${idx++}`);
    values.push(encryptSecret(data.password));
  }
  if (data.url !== undefined) {
    fields.push(`url = $${idx++}`);
    values.push(data.url);
  }
  if (data.notes !== undefined) {
    fields.push(`notes = $${idx++}`);
    values.push(data.notes);
  }

  if (fields.length === 1) return getCredentialById(id, organizationId);

  values.push(id, organizationId);
  const { rowCount } = await pool.query(
    `UPDATE asset_credentials SET ${fields.join(", ")} WHERE id = $${idx++} AND organization_id = $${idx}`,
    values
  );
  if ((rowCount ?? 0) === 0) return null;
  return getCredentialById(id, organizationId);
}

export async function deleteCredential(
  id: string,
  organizationId: string
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM asset_credentials WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  return (rowCount ?? 0) > 0;
}

export async function revealCredentialPassword(
  id: string,
  organizationId: string
): Promise<string | null> {
  const { rows } = await pool.query<{ password_encrypted: string }>(
    `SELECT password_encrypted FROM asset_credentials WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  if (!rows[0]) return null;
  return decryptSecret(rows[0].password_encrypted);
}
