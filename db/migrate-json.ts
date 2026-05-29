import fs from "fs";
import path from "path";
import { pool } from "./pool";

interface JsonEmployee {
  id: string;
  department: string;
  fullName: string;
  mobile?: string;
}

interface JsonComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

interface JsonTicket {
  id: string;
  department: string;
  requesterName: string;
  contactInfo?: {
    phone?: string;
    mobile?: string;
    email?: string;
    preferred?: string;
  };
  location?: string;
  problemType: string;
  title: string;
  description: string;
  createdAt: string;
  priority: string;
  remoteAccess?: boolean;
  inventoryNumber?: string;
  os?: string;
  softwareName?: string;
  files?: string[];
  status: string;
  assignee?: string;
  deadline?: string;
  resolution?: string;
  internalComments?: JsonComment[];
}

export async function migrateFromJsonIfNeeded(): Promise<void> {
  const dataDir = path.join(process.cwd(), "data");
  const employeesFile = path.join(dataDir, "employees.json");
  const ticketsFile = path.join(dataDir, "tickets.json");

  const { rows: employeeCount } = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM employees"
  );
  const { rows: ticketCount } = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM tickets"
  );

  const { rows: demoOrgRows } = await pool.query<{ id: string }>(
    `SELECT id FROM organizations WHERE slug = 'demo' LIMIT 1`
  );
  const demoOrgId = demoOrgRows[0]?.id;

  if (Number(employeeCount[0].count) === 0 && fs.existsSync(employeesFile) && demoOrgId) {
    const raw = JSON.parse(fs.readFileSync(employeesFile, "utf-8")) as JsonEmployee[];
    for (const row of raw) {
      await pool.query(
        `INSERT INTO employees (id, organization_id, department, full_name, mobile, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [row.id, demoOrgId, row.department, row.fullName, row.mobile ?? ""]
      );
    }
    if (raw.length > 0) {
      console.log(`Migrated ${raw.length} employee(s) from employees.json`);
    }
  }

  if (Number(ticketCount[0].count) === 0 && fs.existsSync(ticketsFile) && demoOrgId) {
    const raw = JSON.parse(fs.readFileSync(ticketsFile, "utf-8")) as JsonTicket[];
    for (const t of raw) {
      const ci = t.contactInfo ?? {};
      await pool.query(
        `INSERT INTO tickets (
          id, organization_id, department, requester_name, phone, mobile, email, preferred, location,
          problem_type, title, description, created_at, priority, remote_access,
          inventory_number, os, software_name, files, status, assignee, deadline, resolution
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19::jsonb, $20, $21, $22, $23
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          t.id,
          demoOrgId,
          t.department,
          t.requesterName,
          ci.phone ?? "",
          ci.mobile ?? "",
          ci.email ?? "",
          ci.preferred ?? "",
          t.location ?? "",
          t.problemType,
          t.title,
          t.description,
          t.createdAt,
          t.priority,
          Boolean(t.remoteAccess),
          t.inventoryNumber ?? null,
          t.os ?? null,
          t.softwareName ?? null,
          JSON.stringify(t.files ?? []),
          t.status,
          t.assignee ?? null,
          t.deadline ?? null,
          t.resolution ?? null,
        ]
      );

      for (const c of t.internalComments ?? []) {
        await pool.query(
          `INSERT INTO ticket_comments (id, ticket_id, author, text, created_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [c.id, t.id, c.author, c.text, c.timestamp]
        );
      }
    }
    if (raw.length > 0) {
      console.log(`Migrated ${raw.length} ticket(s) from tickets.json`);
    }
  }
}
