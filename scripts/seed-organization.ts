import "dotenv/config";
import { pool } from "../db/pool";
import { initDb } from "../db/init";
import { createOrganization } from "../db/organizations";
import { createUserWithEmployee } from "../db/users";

function parseArgs() {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1] ?? "";
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const slug = args.slug;
  const name = args.name;
  const adminEmail = args["admin-email"];
  const adminPassword = args["admin-password"];
  const adminName = args["admin-name"];
  const department = args.department || "ИТ";
  const employeeEmail = args["employee-email"];
  const employeePassword = args["employee-password"];
  const employeeName = args["employee-name"];
  const employeeDept = args["employee-department"] || "Бухгалтерия";

  if (!slug || !name || !adminEmail || !adminPassword || !adminName) {
    console.error(`
Usage:
  npx tsx scripts/seed-organization.ts \\
    --slug acme \\
    --name "Acme Corp" \\
    --admin-email admin@acme.ru \\
    --admin-password "YourPassword123" \\
    --admin-name "Иванов Иван Иванович" \\
    [--department "ИТ"] \\
    [--employee-email user@acme.ru --employee-password "Pass123" --employee-name "Петров П.П." --employee-department "Бухгалтерия"]
`);
    process.exit(1);
  }

  await initDb();

  let org = await pool.query<{ id: string }>(
    `SELECT id FROM organizations WHERE slug = $1`,
    [slug]
  );
  let orgId = org.rows[0]?.id;

  if (!orgId) {
    const created = await createOrganization(slug, name);
    orgId = created.id;
    console.log(`Created organization: ${name} (${slug})`);
  } else {
    console.log(`Organization already exists: ${slug}`);
  }

  const existing = await pool.query(
    `SELECT id FROM users WHERE email = $1`,
    [adminEmail.toLowerCase().trim()]
  );
  if (existing.rows.length > 0) {
    console.log(`User ${adminEmail} already exists, skipping.`);
  } else {
    await createUserWithEmployee({
      organizationId: orgId,
      email: adminEmail,
      password: adminPassword,
      role: "org_admin",
      department,
      fullName: adminName,
      mobile: "",
    });
    console.log(`Created org_admin: ${adminEmail}`);
  }

  if (employeeEmail && employeePassword && employeeName) {
    const empExists = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [employeeEmail.toLowerCase().trim()]
    );
    if (empExists.rows.length > 0) {
      console.log(`User ${employeeEmail} already exists, skipping.`);
    } else {
      await createUserWithEmployee({
        organizationId: orgId,
        email: employeeEmail,
        password: employeePassword,
        role: "employee",
        department: employeeDept,
        fullName: employeeName,
        mobile: "",
      });
      console.log(`Created employee: ${employeeEmail}`);
    }
  }

  console.log(`Login URL: http://localhost:3000/o/${slug}/login`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
