import { pool } from "./pool";

export const DEFAULT_DEPARTMENTS = [
  "Бухгалтерия",
  "Отдел кадров",
  "Маркетинг",
  "Продажи",
  "Логистика",
  "ИТ",
  "Юридический отдел",
  "Администрация",
];

export interface Department {
  id: string;
  name: string;
  createdAt: string;
}

interface DepartmentRow {
  id: string;
  name: string;
  created_at: Date;
}

function mapRow(row: DepartmentRow): Department {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listDepartments(organizationId: string): Promise<Department[]> {
  const { rows } = await pool.query<DepartmentRow>(
    `SELECT id, name, created_at FROM departments
     WHERE organization_id = $1
     ORDER BY name ASC`,
    [organizationId]
  );
  return rows.map(mapRow);
}

export async function createDepartment(
  organizationId: string,
  name: string
): Promise<Department> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw Object.assign(new Error("Name is required"), { code: "INVALID_NAME" });
  }
  const { rows } = await pool.query<DepartmentRow>(
    `INSERT INTO departments (organization_id, name)
     VALUES ($1, $2)
     RETURNING id, name, created_at`,
    [organizationId, trimmed]
  );
  return mapRow(rows[0]);
}

export async function updateDepartment(
  organizationId: string,
  id: string,
  name: string
): Promise<Department | null> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw Object.assign(new Error("Name is required"), { code: "INVALID_NAME" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query<{ name: string }>(
      `SELECT name FROM departments WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );
    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const oldName = existing.rows[0].name.trim();
    const newName = trimmed;
    if (oldName === newName) {
      const { rows } = await client.query<DepartmentRow>(
        `SELECT id, name, created_at FROM departments WHERE id = $1`,
        [id]
      );
      await client.query("COMMIT");
      return mapRow(rows[0]);
    }

    const { rows } = await client.query<DepartmentRow>(
      `UPDATE departments SET name = $1
       WHERE id = $2 AND organization_id = $3
       RETURNING id, name, created_at`,
      [newName, id, organizationId]
    );
    if (!rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE employees SET department = $1
       WHERE organization_id = $2 AND TRIM(department) = $3`,
      [newName, organizationId, oldName]
    );
    await client.query(
      `UPDATE assets SET department = $1
       WHERE organization_id = $2 AND TRIM(department) = $3`,
      [newName, organizationId, oldName]
    );
    await client.query(
      `UPDATE tickets SET department = $1
       WHERE organization_id = $2 AND TRIM(department) = $3`,
      [newName, organizationId, oldName]
    );

    await client.query("COMMIT");
    return mapRow(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getDepartmentUsageCount(
  organizationId: string,
  departmentName: string
): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT (
       (SELECT COUNT(*)::int FROM employees WHERE organization_id = $1 AND department = $2) +
       (SELECT COUNT(*)::int FROM assets WHERE organization_id = $1 AND department = $2)
     ) AS count`,
    [organizationId, departmentName]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function deleteDepartment(
  organizationId: string,
  id: string
): Promise<{ deleted: boolean; reason?: string }> {
  const { rows } = await pool.query<{ name: string }>(
    `SELECT name FROM departments WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  if (!rows[0]) return { deleted: false };

  const usage = await getDepartmentUsageCount(organizationId, rows[0].name);
  if (usage > 0) {
    return {
      deleted: false,
      reason: `Отдел используется (${usage} записей в справочнике сотрудников или активах)`,
    };
  }

  const { rowCount } = await pool.query(
    `DELETE FROM departments WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  return { deleted: (rowCount ?? 0) > 0 };
}

export async function seedDefaultDepartments(organizationId: string): Promise<void> {
  for (const name of DEFAULT_DEPARTMENTS) {
    await pool.query(
      `INSERT INTO departments (organization_id, name) VALUES ($1, $2)
       ON CONFLICT (organization_id, name) DO NOTHING`,
      [organizationId, name]
    );
  }
}

async function syncDepartmentsFromUsage(organizationId: string): Promise<void> {
  await pool.query(
    `INSERT INTO departments (organization_id, name)
     SELECT DISTINCT organization_id, department FROM employees
     WHERE organization_id = $1::uuid AND department <> ''
     ON CONFLICT (organization_id, name) DO NOTHING`,
    [organizationId]
  );
  await pool.query(
    `INSERT INTO departments (organization_id, name)
     SELECT DISTINCT organization_id, department FROM assets
     WHERE organization_id = $1::uuid AND department <> ''
     ON CONFLICT (organization_id, name) DO NOTHING`,
    [organizationId]
  );
}

export async function ensureOrganizationDepartments(organizationId: string): Promise<void> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM departments WHERE organization_id = $1`,
    [organizationId]
  );
  if (Number(rows[0]?.count ?? 0) === 0) {
    await seedDefaultDepartments(organizationId);
  }
  await syncDepartmentsFromUsage(organizationId);
}
