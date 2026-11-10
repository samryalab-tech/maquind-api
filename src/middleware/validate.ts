import type { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';

export function validate<T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = (req as any)[source];
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return next(
        ApiError.badRequest(
          'Datos inválidos',
          parsed.error.flatten(),
        ),
      );
    }
    (req as any)[source] = parsed.data;
    next();
  };
}
