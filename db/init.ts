import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool";
import { migrateFromJsonIfNeeded } from "./migrate-json";
import { migrateAuthSchema } from "./migrate-auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function initDb(): Promise<void> {
  await migrateAuthSchema();
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  await pool.query(schema);
  await migrateFromJsonIfNeeded();
  console.log("PostgreSQL: schema ready");
}

export { pool } from "./pool";
