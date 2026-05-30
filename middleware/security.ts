import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

/**
 * Глобальный лимит запросов — защита от перебора и базового DoS.
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Жёсткий лимит для эндпоинтов аутентификации — защита от brute-force паролей.
 * Считаем только неуспешные попытки, чтобы не блокировать активных пользователей.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Слишком много попыток входа. Попробуйте позже." },
});

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Проверка совпадения Origin/Referer с хостом запроса для мутаций.
 * Защита от CSRF в дополнение к sameSite-cookie. Работает для same-origin
 * деплоя (фронт и API на одном домене).
 */
export function verifyOrigin(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.get("origin");
  const referer = req.get("referer");
  const source = origin || referer;

  // Нет Origin/Referer (например, server-to-server без браузера) — пропускаем,
  // т.к. CSRF возможна только из браузера, который всегда шлёт эти заголовки.
  if (!source) {
    return next();
  }

  let sourceHost: string;
  try {
    sourceHost = new URL(source).host;
  } catch {
    return res.status(403).json({ error: "Invalid origin" });
  }

  const expectedHost = req.get("host");
  if (expectedHost && sourceHost === expectedHost) {
    return next();
  }

  return res.status(403).json({ error: "Cross-origin request blocked" });
}
