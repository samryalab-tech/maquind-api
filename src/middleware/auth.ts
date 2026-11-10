import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../lib/prisma';
import { permisoValido } from '../modules/permissions/permissions.catalog';

/**
 * Verifica que la cookie de acceso sea válida y carga el usuario + permisos
 * efectivos (override por usuario > permiso del perfil). Superadmin hace bypass.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.accessToken || req.headers['authorization']?.toString().replace('Bearer ', '');
    if (!token) throw ApiError.unauthorized();

    const payload = verifyAccessToken(token);
    if (payload.type !== 'access') throw ApiError.unauthorized();

    const user = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: {
        perfil: { select: { id: true, nombre: true, esAdmin: true, activo: true } },
        permisos: true,
        empresas: { select: { empresaId: true, esDefault: true } },
      },
    });

    if (!user || !user.activo) throw ApiError.unauthorized('Cuenta inactiva o no válida');
    if (user.bloqueadoHasta && user.bloqueadoHasta > new Date()) {
      throw ApiError.unauthorized('Cuenta bloqueada temporalmente');
    }

    const empresaIds = user.empresas.map((e) => e.empresaId);

    // Resolver permisos efectivos
    const permisos: Record<string, boolean> = {};
    if (user.esSuperadmin || user.perfil?.esAdmin) {
      // Bypass: dar todos los permisos del catálogo (o marcar un flag).
      // Usamos un flag especial; el checkPermission valida también superadmin.
      permisos['__SUPERADMIN__'] = true;
    } else {
      // Permisos del perfil (activados en perfil_permiso)
      const perfilPermisos = await prisma.perfilPermiso.findMany({
        where: { perfilId: user.perfilId!, permitido: true },
        select: { modulo: true, accion: true },
      });
      for (const p of perfilPermisos) permisos[`${p.modulo}:${p.accion}`] = true;

      // Overrides por usuario (gana sobre perfil; si está presente, define el valor)
      for (const up of user.permisos) permisos[`${up.modulo}:${up.accion}`] = up.permitido;
    }

    req.user = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      esSuperadmin: user.esSuperadmin,
      perfilId: user.perfilId ?? null,
      perfilNombre: user.perfil?.nombre ?? null,
      perfilEsAdmin: user.perfil?.esAdmin ?? false,
      empresaIds,
      permisos,
    };

    // Resolver empresa activa (defecto) si no se especifica
    const empresaQuery = req.query.empresaId ?? req.headers['x-empresa-id'];
    if (empresaQuery) {
      const id = Number.parseInt(String(empresaQuery), 10);
      if (!Number.isNaN(id) && empresaIds.includes(id)) {
        req.empresaId = id;
      }
    }
    if (!req.empresaId && empresaIds.length > 0) {
      // tomar la por defecto si existe
      const def = user.empresas.find((e) => e.esDefault)?.empresaId;
      req.empresaId = def ?? empresaIds[0];
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware de permiso a nivel de módulo + acción. */
export function requirePermission(modulo: string, accion: string) {
  if (!permisoValido(modulo, accion)) {
    throw new Error(`Permiso inválido en catálogo: ${modulo}:${accion}`);
  }
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(ApiError.unauthorized());

    // Superadmin bypass
    if (user.esSuperadmin || user.perfilEsAdmin || user.permisos['__SUPERADMIN__']) {
      return next();
    }

    const key = `${modulo}:${accion}`;
    if (user.permisos[key] === true) return next();

    // Negado por defecto
    return next(ApiError.forbidden());
  };
}

/** Requiere autenticación básica. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());
  next();
}
