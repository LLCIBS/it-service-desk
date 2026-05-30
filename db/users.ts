import bcrypt from "bcrypt";
import { pool } from "./pool";
import {
  isAssignableTenantRole,
  type AuthEmployee,
  type AuthUser,
  type UserRole,
} from "./auth-types";

const SALT_ROUNDS = 12;

/**
 * Защита от эскалации привилегий: запрещаем назначать super_admin
 * через обычные (тенантные) операции создания/обновления пользователей.
 */
function assertAssignableRole(role: UserRole): void {
  if (!isAssignableTenantRole(role)) {
    throw Object.assign(new Error("Role not assignable via tenant API"), {
      code: "FORBIDDEN_ROLE",
    });
  }
}

interface UserRow {
  id: string;
  organization_id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  employee_id: string | null;
  is_active: boolean;
}

interface EmployeeJoinRow {
  id: string;
  department: string;
  full_name: string;
  mobile: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function loadEmployee(employeeId: string | null): Promise<AuthEmployee | null> {
  if (!employeeId) return null;
  const { rows } = await pool.query<EmployeeJoinRow>(
    `SELECT id, department, full_name, mobile FROM employees WHERE id = $1`,
    [employeeId]
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    department: rows[0].department,
    fullName: rows[0].full_name,
    mobile: rows[0].mobile || "",
  };
}

function mapUser(row: UserRow, employee: AuthEmployee | null): AuthUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    organizationId: row.organization_id,
    employeeId: row.employee_id,
    employee,
  };
}

export async function findUserByEmail(email: string): Promise<(AuthUser & { passwordHash: string }) | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT id, organization_id, email, password_hash, role, employee_id, is_active
     FROM users WHERE email = $1 AND is_active = TRUE`,
    [email.toLowerCase().trim()]
  );
  if (!rows[0]) return null;
  const employee = await loadEmployee(rows[0].employee_id);
  return { ...mapUser(rows[0], employee), passwordHash: rows[0].password_hash };
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT id, organization_id, email, password_hash, role, employee_id, is_active
     FROM users WHERE id = $1 AND is_active = TRUE`,
    [id]
  );
  if (!rows[0]) return null;
  const employee = await loadEmployee(rows[0].employee_id);
  return mapUser(rows[0], employee);
}

export async function createUserWithEmployee(data: {
  organizationId: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  fullName: string;
  mobile: string;
}): Promise<AuthUser> {
  assertAssignableRole(data.role);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const passwordHash = await hashPassword(data.password);

    const empResult = await client.query<EmployeeJoinRow>(
      `INSERT INTO employees (organization_id, department, full_name, mobile)
       VALUES ($1, $2, $3, $4)
       RETURNING id, department, full_name, mobile`,
      [data.organizationId, data.department, data.fullName, data.mobile]
    );
    const emp = empResult.rows[0];

    const userResult = await client.query<UserRow>(
      `INSERT INTO users (organization_id, email, password_hash, role, employee_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, organization_id, email, password_hash, role, employee_id, is_active`,
      [data.organizationId, data.email.toLowerCase().trim(), passwordHash, data.role, emp.id]
    );
    const user = userResult.rows[0];

    await client.query(`UPDATE employees SET user_id = $1 WHERE id = $2`, [user.id, emp.id]);
    await client.query("COMMIT");

    const employee: AuthEmployee = {
      id: emp.id,
      department: emp.department,
      fullName: emp.full_name,
      mobile: emp.mobile || "",
    };
    return mapUser(user, employee);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateUserCredentials(
  userId: string,
  organizationId: string,
  updates: { role?: UserRole; password?: string; email?: string }
): Promise<void> {
  if (updates.role !== undefined) {
    assertAssignableRole(updates.role);
    await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2 AND organization_id = $3`,
      [updates.role, userId, organizationId]
    );
  }
  if (updates.email !== undefined) {
    await pool.query(
      `UPDATE users SET email = $1 WHERE id = $2 AND organization_id = $3`,
      [updates.email.toLowerCase().trim(), userId, organizationId]
    );
  }
  if (updates.password) {
    const passwordHash = await hashPassword(updates.password);
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2 AND organization_id = $3`,
      [passwordHash, userId, organizationId]
    );
  }
}

export async function getUserIdByEmployeeId(
  employeeId: string,
  organizationId: string
): Promise<string | null> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE employee_id = $1 AND organization_id = $2`,
    [employeeId, organizationId]
  );
  return rows[0]?.id ?? null;
}

export async function createSuperAdmin(data: {
  email: string;
  password: string;
  fullName: string;
  platformOrganizationId: string;
}): Promise<AuthUser> {
  const passwordHash = await hashPassword(data.password);
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (organization_id, email, password_hash, role, employee_id)
     VALUES ($1, $2, $3, 'super_admin', NULL)
     RETURNING id, organization_id, email, password_hash, role, employee_id, is_active`,
    [data.platformOrganizationId, data.email.toLowerCase().trim(), passwordHash]
  );
  return mapUser(rows[0], null);
}

export async function findSuperAdminByEmail(
  email: string
): Promise<(AuthUser & { passwordHash: string }) | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT id, organization_id, email, password_hash, role, employee_id, is_active
     FROM users WHERE email = $1 AND role = 'super_admin' AND is_active = TRUE`,
    [email.toLowerCase().trim()]
  );
  if (!rows[0]) return null;
  return { ...mapUser(rows[0], null), passwordHash: rows[0].password_hash };
}

export async function createUserForExistingEmployee(data: {
  organizationId: string;
  employeeId: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<AuthUser> {
  assertAssignableRole(data.role);
  const passwordHash = await hashPassword(data.password);
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (organization_id, email, password_hash, role, employee_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, organization_id, email, password_hash, role, employee_id, is_active`,
    [
      data.organizationId,
      data.email.toLowerCase().trim(),
      passwordHash,
      data.role,
      data.employeeId,
    ]
  );
  const user = rows[0];
  await pool.query(`UPDATE employees SET user_id = $1 WHERE id = $2`, [user.id, data.employeeId]);
  const employee = await loadEmployee(data.employeeId);
  return mapUser(user, employee);
}
