import { createCrudRouter } from '../../factories/createCrudRouter';
import { perfilSchema, perfilUpdateSchema } from '../users/common.schema';
import { prisma } from '../../lib/prisma';
import { Router } from 'express';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/http';

const router = Router();

router.use(
  '/',
  createCrudRouter({
    model: 'perfil',
  basePath: '/api/perfiles',
  modulo: 'perfiles',
  searchable: ['nombre', 'descripcion'],
  orderBy: { nombre: 'asc' },
  orderByAllowed: ['nombre', 'esAdmin', 'activo', 'createdAt'],
  createSchema: perfilSchema,
  updateSchema: perfilUpdateSchema,
  empresaScoped: false,
  transformCreate: async (data, _req) => {
    const { permisos, ...rest } = data;
    return { ...rest, __permisos: permisos } as any;
  },
  transformUpdate: async (data, _req) => {
    const { permisos, ...rest } = data;
    return { ...rest, __permisos: permisos } as any;
  },
  onCreate: async (id, data, _req, tx) => {
    const permisos: string[] | undefined = (data as any).__permisos;
    if (Array.isArray(permisos) && permisos.length > 0) {
      await (tx as any).perfilPermiso.createMany({
        data: permisos.map((p) => {
          const [modulo, accion] = p.split(':');
          return { perfilId: id, modulo, accion, permitido: true };
        }),
      });
    }
  },
    onUpdate: async (id, data, _req, tx) => {
      const permisos: string[] | undefined = (data as any).__permisos;
      if (Array.isArray(permisos)) {
        await (tx as any).perfilPermiso.deleteMany({ where: { perfilId: id } });
        if (permisos.length) {
          await (tx as any).perfilPermiso.createMany({
            data: permisos.map((p) => {
              const [modulo, accion] = p.split(':');
              return { perfilId: id, modulo, accion, permitido: true };
            }),
          });
        }
      }
    },
  }),
);

// Endpoint para obtener matriz de permisos de un perfil
router.get(
  '/:id/permisos',
  authMiddleware,
  requirePermission('perfiles', 'ver'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const perms = await prisma.perfilPermiso.findMany({ where: { perfilId: id } });
    ok(res, perms);
  }),
);

export default router;
