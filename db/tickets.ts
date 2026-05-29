import { v4 as uuidv4 } from "uuid";
import { pool } from "./pool";
import { mapCommentRow, mapTicketRow, type CommentRow, type TicketRow } from "./mappers";
import type { Comment, Ticket } from "../src/types";
import type { UserRole } from "./auth-types";
import { findUserById } from "./users";

async function loadCommentsByTicketIds(ticketIds: string[]): Promise<Map<string, CommentRow[]>> {
  const map = new Map<string, CommentRow[]>();
  if (ticketIds.length === 0) return map;

  const { rows } = await pool.query<CommentRow>(
    `SELECT id, ticket_id, author, text, created_at
     FROM ticket_comments
     WHERE ticket_id = ANY($1::uuid[])
     ORDER BY created_at ASC`,
    [ticketIds]
  );

  for (const row of rows) {
    const list = map.get(row.ticket_id) ?? [];
    list.push(row);
    map.set(row.ticket_id, list);
  }
  return map;
}

const TICKET_SELECT = `
  SELECT id, department, requester_name, phone, mobile, email, preferred, location,
         problem_type, title, description, created_at, priority, remote_access,
         inventory_number, os, software_name, files, status, assignee, deadline, resolution
  FROM tickets`;

export async function getAllTickets(
  organizationId: string,
  role: UserRole,
  userId: string
): Promise<Ticket[]> {
  let query = `${TICKET_SELECT} WHERE organization_id = $1`;
  const params: unknown[] = [organizationId];

  if (role === "employee") {
    query += ` AND requester_user_id = $2`;
    params.push(userId);
  }

  query += ` ORDER BY created_at DESC`;

  const { rows } = await pool.query<TicketRow>(query, params);
  const commentsMap = await loadCommentsByTicketIds(rows.map((r) => r.id));
  return rows.map((row) => mapTicketRow(row, commentsMap.get(row.id) ?? []));
}

export async function getTicketById(
  id: string,
  organizationId: string
): Promise<Ticket | null> {
  const { rows } = await pool.query<TicketRow>(
    `${TICKET_SELECT} WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  if (!rows[0]) return null;
  const commentsMap = await loadCommentsByTicketIds([id]);
  return mapTicketRow(rows[0], commentsMap.get(id) ?? []);
}

export async function canAccessTicket(
  ticketId: string,
  organizationId: string,
  role: UserRole,
  userId: string
): Promise<boolean> {
  const ticket = await getTicketById(ticketId, organizationId);
  if (!ticket) return false;
  if (role === "employee") {
    const { rows } = await pool.query<{ requester_user_id: string | null }>(
      `SELECT requester_user_id FROM tickets WHERE id = $1`,
      [ticketId]
    );
    return rows[0]?.requester_user_id === userId;
  }
  return true;
}

export async function createTicket(
  organizationId: string,
  userId: string,
  payload: Record<string, unknown>,
  fileNames: string[]
): Promise<Ticket> {
  const user = await findUserById(userId);
  if (!user?.employee) {
    throw new Error("Employee profile required to create ticket");
  }

  const emp = user.employee;
  const id = uuidv4();

  await pool.query(
    `INSERT INTO tickets (
      id, organization_id, requester_user_id,
      department, requester_name, phone, mobile, email, preferred, location,
      problem_type, title, description, priority, remote_access,
      inventory_number, os, software_name, files, status
    ) VALUES (
      $1, $2, $3,
      $4, $5, '', $6, $7, '', '',
      $8, $9, $10, $11, $12,
      NULL, NULL, NULL, $13::jsonb, 'new'
    )`,
    [
      id,
      organizationId,
      userId,
      emp.department,
      emp.fullName,
      emp.mobile,
      user.email,
      String(payload.problemType ?? ""),
      String(payload.title ?? ""),
      String(payload.description ?? ""),
      String(payload.priority ?? "medium"),
      Boolean(payload.remoteAccess),
      JSON.stringify(fileNames),
    ]
  );

  const ticket = await getTicketById(id, organizationId);
  if (!ticket) throw new Error("Failed to load created ticket");
  return ticket;
}

const TICKET_PATCH_MAP: Record<string, string> = {
  problemType: "problem_type",
  title: "title",
  description: "description",
  priority: "priority",
  remoteAccess: "remote_access",
  status: "status",
  assignee: "assignee",
  deadline: "deadline",
  resolution: "resolution",
};

export async function updateTicket(
  id: string,
  organizationId: string,
  updates: Record<string, unknown>
): Promise<Ticket | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, column] of Object.entries(TICKET_PATCH_MAP)) {
    if (updates[key] !== undefined) {
      fields.push(`${column} = $${idx++}`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) return getTicketById(id, organizationId);

  values.push(id, organizationId);
  const { rowCount } = await pool.query(
    `UPDATE tickets SET ${fields.join(", ")} WHERE id = $${idx++} AND organization_id = $${idx}`,
    values
  );
  if ((rowCount ?? 0) === 0) return null;
  return getTicketById(id, organizationId);
}

export async function addTicketComment(
  ticketId: string,
  organizationId: string,
  author: string,
  text: string
): Promise<Comment | null> {
  const ticket = await getTicketById(ticketId, organizationId);
  if (!ticket) return null;

  const { rows } = await pool.query<CommentRow>(
    `INSERT INTO ticket_comments (ticket_id, author, text)
     VALUES ($1, $2, $3)
     RETURNING id, ticket_id, author, text, created_at`,
    [ticketId, author, text]
  );
  return mapCommentRow(rows[0]);
}

export async function getTicketFileNames(
  ticketId: string,
  organizationId: string
): Promise<string[]> {
  const { rows } = await pool.query<{ files: string[] }>(
    `SELECT files FROM tickets WHERE id = $1 AND organization_id = $2`,
    [ticketId, organizationId]
  );
  const files = rows[0]?.files;
  return Array.isArray(files) ? files : [];
}
