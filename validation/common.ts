import { z } from "zod";

/** Ограниченная по длине строка (по умолчанию под VARCHAR(255)). */
export const boundedString = (max = 255) => z.string().max(max);

/** Длинный текст (TEXT-поля): описание, заметки и т.п. */
export const longText = (max = 10000) => z.string().max(max);

/** Email с нормализацией. Используется при СОЗДАНИИ учётных записей. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(255)
  .email("Некорректный email");

/**
 * Политика паролей: длина >= 10, наличие букв и цифр.
 * Применяется только при установке/смене пароля (существующие не затрагиваются).
 */
export const passwordSchema = z
  .string()
  .min(10, "Пароль должен быть не короче 10 символов")
  .max(128, "Пароль слишком длинный")
  .refine(
    (v) => /[A-Za-zА-Яа-яЁё]/.test(v) && /\d/.test(v),
    "Пароль должен содержать буквы и цифры"
  );

export const uuidSchema = z.string().uuid("Некорректный идентификатор");

export const roleAssignableSchema = z.enum(["employee", "it_agent", "org_admin"]);
export const assetTypeSchema = z.enum(["computer", "peripheral", "network", "other"]);
export const assetStatusSchema = z.enum([
  "in_use",
  "spare",
  "repair",
  "decommissioned",
]);
export const prioritySchema = z.enum(["low", "medium", "high", "critical"]);
export const ticketStatusSchema = z.enum([
  "new",
  "in-progress",
  "waiting-for-info",
  "waiting-for-resources",
  "resolved",
  "closed",
  "cancelled",
]);
export const credentialTypeSchema = z.enum([
  "local",
  "domain",
  "wifi",
  "vpn",
  "service",
  "other",
]);

/** Возвращает первое читаемое сообщение об ошибке валидации. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Некорректные данные запроса";
}
