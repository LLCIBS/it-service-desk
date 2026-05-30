import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const DEFAULT_URL = "postgresql://postgres:postgres@localhost:5432/vet";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in production");
}

// Включаем TLS для подключения к БД, если задан DATABASE_SSL=true
// (обязательно для удалённой/managed PostgreSQL).
const sslEnabled = process.env.DATABASE_SSL === "true";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || DEFAULT_URL,
  ssl: sslEnabled
    ? { rejectUnauthorized: process.env.DATABASE_SSL_NO_VERIFY !== "true" }
    : undefined,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});
