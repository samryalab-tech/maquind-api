import { Router } from 'express';
import { createCrudRouter } from '../../factories/createCrudRouter';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../lib/prisma';
import { ok } from '../../utils/http';
import { hashPassword } from '../../utils/password';
import { ApiError } from '../../utils/ApiError';
import { userSchema, userUpdateSchema } from '../users/common.schema';

const router = Router();

// CRUD genérico base
router.use(
  '/',
  createCrudRouter({
    model: 'usuario',
    basePath: '/api/usuarios',
    modulo: 'usuarios',
    searchable: ['nombre', 'apellido', 'email'],
    orderBy: { createdAt: 'desc' },
    orderByAllowed: ['nombre', 'email', 'createdAt', 'ultimoAcceso', 'activo'],
    include: { perfil: true, empresas: { include: { empresa: true } } },
    createSchema: userSchema,
    updateSchema: userUpdateSchema,
    transformCreate: async (data, _req) => {
      const { password, empresaIds, ...rest } = data;
      if (!password) throw ApiError.badRequest('El password es obligatorio al crear usuario');
      return {
        ...rest,
        passwordHash: await hashPassword(password),
        empresas: empresaIds?.length
          ? {
              create: empresaIds.map((id: number, idx: number) => ({
                empresaId: id,
                esDefault: idx === 0,
              })),
            }
          : undefined,
      };
    },
    transformUpdate: async (data, _req) => {
      const { empresaIds, password, ...rest } = data;
      // password no se actualiza por este endpoint; usar /auth/password
      const d: any = { ...rest };
      if (Array.isArray(empresaIds)) {
        // sincronizar empresas
        // haremos sincronización fuera en transacción en onUpdate para simplificar
        d.__empresaIds = empresaIds;
      }
      return d;
    },
    onUpdate: async (id, data, _req, tx) => {
      const empresaIds: number[] | undefined = (data as any).__empresaIds;
      if (Array.isArray(empresaIds)) {
        await (tx as any).usuarioEmpresa.deleteMany({ where: { usuarioId: id } });
        if (empresaIds.length) {
          await (tx as any).usuarioEmpresa.createMany({
            data: empresaIds.map((eid, idx) => ({ usuarioId: id, empresaId: eid, esDefault: idx === 0 })),
          });
        }
      }
    },
    empresaScoped: false, // usuarios pueden pertenecer a varias empresas
  }),
);

// Endpoint para resetear contraseña
router.post(
  '/:id/password',
  authMiddleware,
  requirePermission('usuarios', 'editar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { password } = req.body;
    if (!password || password.length < 8) throw ApiError.badRequest('Contraseña inválida');
    await prisma.usuario.update({ where: { id }, data: { passwordHash: await hashPassword(password), intentosFallidos: 0, bloqueadoHasta: null } });
    return ok(res, { id });
  }),
);

export default router;
