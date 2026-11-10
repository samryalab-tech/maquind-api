import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Envuelve un handler async y reenvía los errores al middleware de errores. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
