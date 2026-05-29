import "dotenv/config";
import { pool } from "../db/pool";
import { initDb } from "../db/init";
import { getPlatformOrganization } from "../db/organizations";
import { createSuperAdmin, findSuperAdminByEmail } from "../db/users";

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
  const email = args.email;
  const password = args.password;
  const name = args.name || "Platform Admin";

  if (!email || !password) {
    console.error(`
Usage:
  npm run seed:platform -- --email admin@platform.local --password "YourPassword123" [--name "Platform Admin"]
`);
    process.exit(1);
  }

  await initDb();
  const platformOrg = await getPlatformOrganization();

  const existing = await findSuperAdminByEmail(email);
  if (existing) {
    console.log(`Super admin ${email} already exists.`);
  } else {
    await createSuperAdmin({
      email,
      password,
      fullName: name,
      platformOrganizationId: platformOrg.id,
    });
    console.log(`Created super_admin: ${email}`);
  }

  console.log(`Platform login: http://localhost:3000/platform/login`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
