import type { Comment, DirectoryEmployee, LinkedAsset, Ticket } from "../src/types";
import { mapLinkedAsset } from "./asset-mappers";

export interface EmployeeRow {
  id: string;
  department: string;
  full_name: string;
  mobile: string;
}

export interface TicketRow {
  id: string;
  department: string;
  requester_name: string;
  phone: string;
  mobile: string;
  email: string;
  preferred: string;
  location: string;
  problem_type: string;
  title: string;
  description: string;
  created_at: Date;
  priority: string;
  remote_access: boolean;
  inventory_number: string | null;
  os: string | null;
  software_name: string | null;
  files: string[];
  status: string;
  assignee: string | null;
  deadline: Date | null;
  resolution: string | null;
  asset_id?: string | null;
  linked_asset_id?: string | null;
  linked_asset_name?: string | null;
  linked_asset_type?: string | null;
  linked_inventory_number?: string | null;
}

export interface CommentRow {
  id: string;
  ticket_id: string;
  author: string;
  text: string;
  created_at: Date;
}

export function mapEmployeeRow(row: EmployeeRow): DirectoryEmployee {
  return {
    id: row.id,
    department: row.department,
    fullName: row.full_name,
    mobile: row.mobile || "",
  };
}

export function mapCommentRow(row: CommentRow): Comment {
  return {
    id: row.id,
    author: row.author,
    text: row.text,
    timestamp: row.created_at.toISOString(),
  };
}

function mapLinkedFromTicketRow(row: TicketRow): LinkedAsset | undefined {
  const id = row.linked_asset_id ?? row.asset_id;
  if (!id || !row.linked_asset_name) return undefined;
  return mapLinkedAsset({
    asset_id: id,
    asset_name: row.linked_asset_name,
    asset_type: row.linked_asset_type ?? "other",
    inventory_number: row.linked_inventory_number ?? row.inventory_number,
  });
}

export function mapTicketRow(row: TicketRow, comments: CommentRow[] = []): Ticket {
  return {
    id: row.id,
    department: row.department,
    requesterName: row.requester_name,
    contactInfo: {
      phone: row.phone || "",
      mobile: row.mobile || "",
      email: row.email || "",
      preferred: row.preferred || "",
    },
    location: row.location || "",
    problemType: row.problem_type,
    title: row.title,
    description: row.description,
    createdAt: row.created_at.toISOString(),
    priority: row.priority as Ticket["priority"],
    remoteAccess: row.remote_access,
    inventoryNumber: row.inventory_number || undefined,
    os: row.os || undefined,
    softwareName: row.software_name || undefined,
    files: Array.isArray(row.files) ? row.files : [],
    status: row.status as Ticket["status"],
    assignee: row.assignee || undefined,
    deadline: row.deadline ? row.deadline.toISOString() : undefined,
    resolution: row.resolution || undefined,
    internalComments: comments.map(mapCommentRow),
    linkedAsset: mapLinkedFromTicketRow(row),
  };
}
