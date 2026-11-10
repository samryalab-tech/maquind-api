import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

/** Registra acciones relevantes en audit_log. Debe ir tras auth si se quiere el usuario. */
export function auditMiddleware(
  options: {
    modulo: string;
    entidadTipo?: string;
    getEntidadId?: (req: Request, res: Response) => number | undefined;
    skip?: (req: Request) => boolean;
  },
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (options.skip && options.skip(req)) return next();

      const entidadId = options.getEntidadId ? options.getEntidadId(req, _res as any) : undefined;
      req.audit = { modulo: options.modulo, entidadTipo: options.entidadTipo, entidadId };

      // No bloquear la petición
      next();
      // Registrar de forma asíncrona sin esperar
      setImmediate(async () => {
        try {
          await prisma.auditLog.create({
            data: {
              empresaId: req.empresaId ?? null,
              usuarioId: req.user?.id ?? null,
              accion: req.method, // útil para crud genérico
              modulo: options.modulo,
              entidadTipo: options.entidadTipo ?? null,
              entidadId: entidadId ?? null,
              descripcion: req.originalUrl,
              datos: {
                query: req.query,
                params: req.params,
              },
              ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
              userAgent: (req.headers['user-agent'] as string) || null,
            },
          });
        } catch {
          // No romper el flujo por auditoría
        }
      });
    } catch {
      next();
    }
  };
}
