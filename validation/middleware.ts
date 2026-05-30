import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { firstIssueMessage } from "./common";

/**
 * Возвращает middleware, проверяющий req.body по zod-схеме.
 * При успехе подменяет req.body нормализованными данными.
 *
 * Схемы используют passthrough, поэтому неизвестные поля не отбрасываются —
 * это исключает поломку существующих payload'ов, при этом известные поля
 * строго валидируются (типы, enum, длины, email).
 */
export function validateBody<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return res.status(400).json({ error: firstIssueMessage(result.error) });
    }
    req.body = result.data;
    next();
  };
}
