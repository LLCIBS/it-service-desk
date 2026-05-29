import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { initDb, pool } from "./db/init";
import { authRouter } from "./routes/auth";
import { createTicketsRouter } from "./routes/tickets";
import { employeesRouter } from "./routes/employees";
import { departmentsRouter } from "./routes/departments";
import { assetsRouter } from "./routes/assets";
import { credentialsRouter } from "./routes/credentials";
import { platformRouter } from "./routes/platform";
import type { AuthedRequest } from "./middleware/requireAuth";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

function orgUploadDir(organizationId: string) {
  const dir = path.join(UPLOAD_DIR, organizationId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function createUpload() {
  return multer({
    storage: multer.diskStorage({
      destination: (req, _file, cb) => {
        const orgId = (req as AuthedRequest).user?.organizationId;
        if (!orgId) {
          return cb(new Error("Unauthorized"), "");
        }
        cb(null, orgUploadDir(orgId));
      },
      filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
      },
    }),
  });
}

async function startServer() {
  await initDb();

  const app = express();
  const PORT = 3000;
  const PgSession = connectPgSimple(session);

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true",
        maxAge: Number(process.env.SESSION_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  const upload = createUpload();

  app.use("/api/platform", platformRouter);
  app.use("/api", authRouter);
  app.use("/api", createTicketsRouter(upload));
  app.use("/api", employeesRouter);
  app.use("/api", departmentsRouter);
  app.use("/api", assetsRouter);
  app.use("/api", credentialsRouter);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
