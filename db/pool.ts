import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const DEFAULT_URL = "postgresql://postgres:postgres@localhost:5432/vet";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || DEFAULT_URL,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});
