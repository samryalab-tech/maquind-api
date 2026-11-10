import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * No contar archivos estáticos (/storage) ni el chequeo de salud (/health):
 * un visor de PDF o un monitor de salud no deben consumir la cuota de la API.
 */
function skipNonApi(req: Request): boolean {
  return req.path === '/health' || req.path.startsWith('/storage');
}

// En desarrollo relajamos los límites porque el frontend hace varias peticiones
// por recarga (HMR) y facilmente agota una cuota pensada para producción.
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: env.isProd ? 500 : 100000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipNonApi,
  message: { success: false, message: 'Demasiadas peticiones, inténtalo más tarde' },
});

export const authRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: env.isProd ? 20 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Espere y vuelva a intentar.' },
});
