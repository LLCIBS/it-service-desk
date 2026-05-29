import { pool } from "./pool";
import { mapEmployeeRow, type EmployeeRow } from "./mappers";
import type { DirectoryEmployee } from "../src/types";
import type { UserRole } from "./auth-types";
import {
  createUserWithEmployee,
  createUserForExistingEmployee,
  updateUserCredentials,
  getUserIdByEmployeeId,
} from "./users";

export interface DirectoryEmployeeAdmin extends DirectoryEmployee {
  email?: string;
  role?: UserRole;
  hasLogin: boolean;
}

interface EmployeeAdminRow extends EmployeeRow {
  email: string | null;
  role: UserRole | null;
  user_id: string | null;
}

function mapAdminRow(row: EmployeeAdminRow): DirectoryEmployeeAdmin {
  return {
    id: row.id,
    department: row.department,
    fullName: row.full_name,
    mobile: row.mobile || "",
    email: row.email ?? undefined,
    role: row.role ?? undefined,
    hasLogin: Boolean(row.user_id),
  };
}

const EMPLOYEE_SELECT = `e.id, e.department, e.full_name, e.mobile`;

export async function lookupEmployees(
  organizationId: string
): Promise<
  { id: string; fullName: string; department: string; email?: string; role?: UserRole }[]
> {
  const { rows } = await pool.query<{
    id: string;
    full_name: string;
    department: string;
    email: string | null;
    role: UserRole | null;
  }>(
    `SELECT e.id, e.full_name, e.department, u.email, u.role
     FROM employees e
     LEFT JOIN users u ON u.employee_id = e.id AND u.is_active = TRUE
     WHERE e.organization_id = $1
     ORDER BY e.full_name ASC`,
    [organizationId]
  );
  return rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    department: r.department,
    email: r.email ?? undefined,
    role: r.role ?? undefined,
  }));
}

export async function getAllEmployees(organizationId: string): Promise<DirectoryEmployeeAdmin[]> {
  const { rows } = await pool.query<EmployeeAdminRow>(
    `SELECT ${EMPLOYEE_SELECT}, u.email, u.role, e.user_id
     FROM employees e
     LEFT JOIN users u ON u.employee_id = e.id
     WHERE e.organization_id = $1
     ORDER BY e.full_name ASC`,
    [organizationId]
  );
  return rows.map(mapAdminRow);
}

export async function getEmployeeById(
  id: string,
  organizationId: string
): Promise<DirectoryEmployee | null> {
  const { rows } = await pool.query<EmployeeRow>(
    `SELECT ${EMPLOYEE_SELECT} FROM employees e
     WHERE e.id = $1 AND e.organization_id = $2`,
    [id, organizationId]
  );
  return rows[0] ? mapEmployeeRow(rows[0]) : null;
}

export async function createEmployee(
  organizationId: string,
  data: {
    department: string;
    fullName: string;
    mobile: string;
    email?: string;
    password?: string;
    role?: UserRole;
  }
): Promise<DirectoryEmployeeAdmin> {
  if (data.email && data.password && data.role) {
    const user = await createUserWithEmployee({
      organizationId,
      email: data.email,
      password: data.password,
      role: data.role,
      department: data.department,
      fullName: data.fullName,
      mobile: data.mobile,
    });
    return {
      id: user.employeeId!,
      department: data.department,
      fullName: data.fullName,
      mobile: data.mobile,
      email: data.email,
      role: data.role,
      hasLogin: true,
    };
  }

  const { rows } = await pool.query<EmployeeRow>(
    `INSERT INTO employees (organization_id, department, full_name, mobile)
     VALUES ($1, $2, $3, $4)
     RETURNING id, department, full_name, mobile`,
    [organizationId, data.department, data.fullName, data.mobile]
  );
  const row = rows[0];
  return {
    ...mapEmployeeRow(row),
    hasLogin: false,
  };
}

export async function updateEmployee(
  id: string,
  organizationId: string,
  data: Partial<{
    department: string;
    fullName: string;
    mobile: string;
    email: string;
    password: string;
    role: UserRole;
  }>
): Promise<DirectoryEmployeeAdmin | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.department !== undefined) {
    fields.push(`department = $${idx++}`);
    values.push(data.department);
  }
  if (data.fullName !== undefined) {
    fields.push(`full_name = $${idx++}`);
    values.push(data.fullName);
  }
  if (data.mobile !== undefined) {
    fields.push(`mobile = $${idx++}`);
    values.push(data.mobile);
  }

  if (fields.length > 0) {
    values.push(id, organizationId);
    const { rowCount } = await pool.query(
      `UPDATE employees SET ${fields.join(", ")} WHERE id = $${idx++} AND organization_id = $${idx}`,
      values
    );
    if ((rowCount ?? 0) === 0) return null;
  }

  const userId = await getUserIdByEmployeeId(id, organizationId);
  if (userId) {
    await updateUserCredentials(userId, organizationId, {
      role: data.role,
      password: data.password,
      email: data.email,
    });
  }

  if (data.email && data.password && data.role && !userId) {
    await createUserForExistingEmployee({
      organizationId,
      employeeId: id,
      email: data.email,
      password: data.password,
      role: data.role,
    });
  }

  const list = await getAllEmployees(organizationId);
  return list.find((e) => e.id === id) ?? null;
}

export async function deleteEmployee(id: string, organizationId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userId = await getUserIdByEmployeeId(id, organizationId);
    if (userId) {
      await client.query(`DELETE FROM users WHERE id = $1 AND organization_id = $2`, [
        userId,
        organizationId,
      ]);
    }
    const { rowCount } = await client.query(
      `DELETE FROM employees WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );
    await client.query("COMMIT");
    return (rowCount ?? 0) > 0;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

