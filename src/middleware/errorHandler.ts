import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      code: err.code,
      details: err.details,
    });
  }

  // Errores de Prisma comunes (MySQL)
  const code = (err as any)?.code;
  if (code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Ya existe un registro con esos datos', code: 'DUPLICATE' });
  }
  if (code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Registro no encontrado', code: 'NOT_FOUND' });
  }
  if (code === 'P2003') {
    return res.status(400).json({ success: false, message: 'El registro está relacionado y no puede eliminarse', code: 'FK_CONSTRAINT' });
  }

  const status = (err as any)?.status ?? 500;
  return res.status(status).json({
    success: false,
    message: (err as any)?.message ?? 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
  });
}
