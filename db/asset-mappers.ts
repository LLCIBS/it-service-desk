import type {
  Asset,
  AssetCredential,
  AssetHardwareSpecs,
  AssetSoftware,
  AssetStatus,
  AssetSummary,
  AssetType,
  CredentialType,
  LinkedAsset,
  TicketSummary,
} from "../src/types";

export interface AssetRow {
  id: string;
  organization_id: string;
  asset_type: string;
  subtype: string | null;
  inventory_number: string | null;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  status: string;
  location: string | null;
  department: string | null;
  responsible_employee_id: string | null;
  assigned_employee_id: string | null;
  parent_asset_id: string | null;
  purchase_date: Date | null;
  warranty_until: Date | null;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
  responsible_name?: string | null;
  assigned_name?: string | null;
  parent_name?: string | null;
}

export interface HardwareSpecsRow {
  asset_id: string;
  cpu: string | null;
  ram_gb: number | null;
  storage: string | null;
  os_name: string | null;
  os_version: string | null;
  ip_address: string | null;
  mac_address: string | null;
  hostname: string | null;
}

export interface SoftwareRow {
  id: string;
  asset_id: string;
  name: string;
  version: string | null;
  license_key_encrypted: string | null;
  installed_at: Date | null;
  notes: string | null;
  created_at: Date;
}

export interface CredentialRow {
  id: string;
  organization_id: string;
  asset_id: string | null;
  title: string;
  credential_type: string;
  username: string | null;
  password_encrypted: string;
  url: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  asset_name?: string | null;
}

export interface LinkedAssetRow {
  asset_id: string;
  asset_name: string;
  asset_type: string;
  inventory_number: string | null;
}

function dateToIso(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d);
}

export function mapHardwareSpecs(row: HardwareSpecsRow | undefined): AssetHardwareSpecs | undefined {
  if (!row) return undefined;
  return {
    cpu: row.cpu || undefined,
    ramGb: row.ram_gb ?? undefined,
    storage: row.storage || undefined,
    osName: row.os_name || undefined,
    osVersion: row.os_version || undefined,
    ipAddress: row.ip_address || undefined,
    macAddress: row.mac_address || undefined,
    hostname: row.hostname || undefined,
  };
}

export function mapSoftwareRow(row: SoftwareRow, hasLicense = false): AssetSoftware {
  return {
    id: row.id,
    assetId: row.asset_id,
    name: row.name,
    version: row.version || undefined,
    hasLicenseKey: hasLicense || Boolean(row.license_key_encrypted),
    installedAt: dateToIso(row.installed_at),
    notes: row.notes || undefined,
  };
}

export function mapCredentialRow(row: CredentialRow): AssetCredential {
  return {
    id: row.id,
    organizationId: row.organization_id,
    assetId: row.asset_id || undefined,
    assetName: row.asset_name || undefined,
    title: row.title,
    credentialType: row.credential_type as CredentialType,
    username: row.username || undefined,
    hasPassword: Boolean(row.password_encrypted),
    url: row.url || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function mapAssetSummary(row: AssetRow): AssetSummary {
  return {
    id: row.id,
    assetType: row.asset_type as AssetType,
    subtype: row.subtype || undefined,
    inventoryNumber: row.inventory_number || undefined,
    name: row.name,
    manufacturer: row.manufacturer || undefined,
    model: row.model || undefined,
    status: row.status as AssetStatus,
    location: row.location || undefined,
    department: row.department || undefined,
    assignedEmployeeName: row.assigned_name || undefined,
    responsibleEmployeeName: row.responsible_name || undefined,
  };
}

export function mapAssetRow(
  row: AssetRow,
  specs?: HardwareSpecsRow,
  software: SoftwareRow[] = [],
  credentials: CredentialRow[] = [],
  children: AssetRow[] = [],
  relatedTickets: TicketSummary[] = []
): Asset {
  return {
    ...mapAssetSummary(row),
    serialNumber: row.serial_number || undefined,
    responsibleEmployeeId: row.responsible_employee_id || undefined,
    assignedEmployeeId: row.assigned_employee_id || undefined,
    parentAssetId: row.parent_asset_id || undefined,
    parentAssetName: row.parent_name || undefined,
    purchaseDate: dateToIso(row.purchase_date),
    warrantyUntil: dateToIso(row.warranty_until),
    notes: row.notes || undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    hardwareSpecs: mapHardwareSpecs(specs),
    software: software.map((s) => mapSoftwareRow(s, Boolean(s.license_key_encrypted))),
    credentials: credentials.map(mapCredentialRow),
    children: children.map(mapAssetSummary),
    relatedTickets,
  };
}

export function mapLinkedAsset(row: LinkedAssetRow): LinkedAsset {
  return {
    id: row.asset_id,
    name: row.asset_name,
    assetType: row.asset_type as AssetType,
    inventoryNumber: row.inventory_number || undefined,
  };
}
