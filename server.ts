import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { initDb, pool } from "./db/init";
import { validateEnv, isProduction } from "./config";
import { authRouter } from "./routes/auth";
import { createTicketsRouter } from "./routes/tickets";
import { employeesRouter } from "./routes/employees";
import { departmentsRouter } from "./routes/departments";
import { assetsRouter } from "./routes/assets";
import { credentialsRouter } from "./routes/credentials";
import { platformRouter } from "./routes/platform";
import type { AuthedRequest } from "./middleware/requireAuth";
import { globalLimiter, verifyOrigin } from "./middleware/security";

const UPLOAD_MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES) || 10 * 1024 * 1024;
const UPLOAD_MAX_FILES = Number(process.env.UPLOAD_MAX_FILES) || 10;

const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp",
  ".pdf", ".txt", ".log", ".csv",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".zip", ".rar", ".7z",
]);

function sanitizeFilename(original: string): string {
  // Берём только базовое имя (защита от path traversal) и чистим спецсимволы.
  const base = path.basename(original).replace(/[^\w.\-]+/g, "_");
  return base.slice(-120) || "file";
}

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
        cb(null, uniqueSuffix + "-" + sanitizeFilename(file.originalname));
      },
    }),
    limits: {
      fileSize: UPLOAD_MAX_BYTES,
      files: UPLOAD_MAX_FILES,
    },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
        return cb(new Error("Тип файла не разрешён"));
      }
      cb(null, true);
    },
  });
}

async function startServer() {
  validateEnv();
  await initDb();

  const app = express();
  const PORT = 3000;
  const PgSession = connectPgSimple(session);

  if (isProduction) {
    // Доверяем reverse-proxy (для secure-cookie и корректного req.protocol).
    app.set("trust proxy", 1);
  }

  // Security-заголовки. CSP отключаем, чтобы не ломать SPA/Vite;
  // включить и настроить можно отдельно при необходимости.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(globalLimiter);
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

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
        secure: process.env.COOKIE_SECURE === "true" || isProduction,
        maxAge: Number(process.env.SESSION_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  // Защита от CSRF для мутаций (в дополнение к sameSite-cookie).
  app.use("/api", verifyOrigin);

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

  app.use(
    (
      err: Error & { code?: string },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "Файл слишком большой" });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(413).json({ error: "Слишком много файлов" });
        }
        return res.status(400).json({ error: "Ошибка загрузки файла" });
      }
      if (err?.message === "Тип файла не разрешён") {
        return res.status(400).json({ error: err.message });
      }
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  );

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
