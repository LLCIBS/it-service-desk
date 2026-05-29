/** Запись справочника сотрудников (заполняет администратор) */
export interface DirectoryEmployee {
  id: string;
  department: string;
  fullName: string;
  mobile: string;
}

export type UserRole = 'employee' | 'it_agent' | 'org_admin';

export interface DirectoryEmployeeAdmin extends DirectoryEmployee {
  email?: string;
  role?: UserRole;
  hasLogin: boolean;
}

export interface AuthEmployee {
  id: string;
  department: string;
  fullName: string;
  mobile: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  employee: AuthEmployee | null;
}

export interface AuthOrganization {
  id: string;
  slug: string;
  name: string;
}

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'new' | 'in-progress' | 'waiting-for-info' | 'waiting-for-resources' | 'resolved' | 'closed' | 'cancelled';

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export type AssetType = 'computer' | 'peripheral' | 'network' | 'other';
export type AssetStatus = 'in_use' | 'spare' | 'repair' | 'decommissioned';
export type CredentialType = 'local' | 'domain' | 'wifi' | 'vpn' | 'service' | 'other';

export interface LinkedAsset {
  id: string;
  name: string;
  assetType: AssetType;
  inventoryNumber?: string;
}

export interface TicketSummary {
  id: string;
  title: string;
  status: TicketStatus;
  createdAt: string;
  requesterName: string;
}

export interface AssetHardwareSpecs {
  cpu?: string;
  ramGb?: number;
  storage?: string;
  osName?: string;
  osVersion?: string;
  ipAddress?: string;
  macAddress?: string;
  hostname?: string;
}

export interface AssetSoftware {
  id: string;
  assetId: string;
  name: string;
  version?: string;
  hasLicenseKey?: boolean;
  installedAt?: string;
  notes?: string;
}

export interface AssetCredential {
  id: string;
  organizationId: string;
  assetId?: string;
  assetName?: string;
  title: string;
  credentialType: CredentialType;
  username?: string;
  hasPassword: boolean;
  url?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetSummary {
  id: string;
  assetType: AssetType;
  subtype?: string;
  inventoryNumber?: string;
  name: string;
  manufacturer?: string;
  model?: string;
  status: AssetStatus;
  location?: string;
  department?: string;
  assignedEmployeeName?: string;
  responsibleEmployeeName?: string;
}

export interface Asset extends AssetSummary {
  serialNumber?: string;
  responsibleEmployeeId?: string;
  assignedEmployeeId?: string;
  parentAssetId?: string;
  parentAssetName?: string;
  purchaseDate?: string;
  warrantyUntil?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  hardwareSpecs?: AssetHardwareSpecs;
  software: AssetSoftware[];
  credentials: AssetCredential[];
  children: AssetSummary[];
  relatedTickets: TicketSummary[];
}

export interface EmployeeLookup {
  id: string;
  fullName: string;
  department: string;
  email?: string;
  role?: UserRole;
}

export interface Ticket {
  id: string;
  department: string;
  requesterName: string;
  contactInfo: {
    phone: string;
    mobile: string;
    email: string;
    preferred: string;
  };
  location: string;
  problemType: string;
  title: string;
  description: string;
  createdAt: string;
  priority: Priority;
  remoteAccess: boolean;
  inventoryNumber?: string;
  os?: string;
  softwareName?: string;
  files: string[];
  status: TicketStatus;
  assignee?: string;
  deadline?: string;
  internalComments: Comment[];
  resolution?: string;
  linkedAsset?: LinkedAsset;
}
