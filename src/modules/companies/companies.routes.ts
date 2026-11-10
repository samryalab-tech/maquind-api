import { Router } from 'express';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../lib/prisma';
import { buildPaginated, getPagination, ok } from '../../utils/http';
import { ApiError } from '../../utils/ApiError';
import { empresaSchema } from '../users/common.schema';

const router = Router();

router.get(
  '/',
  authMiddleware,
  requirePermission('empresas', 'ver'),
  asyncHandler(async (req, res) => {
    const p = getPagination(req);
    const where: any = req.user!.esSuperadmin || req.user!.perfilEsAdmin ? {} : { id: { in: req.user!.empresaIds } };
    const [items, total] = await Promise.all([
      prisma.empresa.findMany({ where, skip: p.skip, take: p.take, orderBy: { razonSocial: 'asc' } }),
      prisma.empresa.count({ where }),
    ]);
    res.json({ success: true, data: buildPaginated(items, total, p) });
  }),
);

router.get(
  '/actual',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const empresa = req.empresaId
      ? await prisma.empresa.findUnique({ where: { id: req.empresaId } })
      : await prisma.empresa.findFirst();
    ok(res, empresa);
  }),
);

router.put(
  '/:id',
  authMiddleware,
  requirePermission('empresas', 'editar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parsed = empresaSchema.partial().safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest('Datos inválidos', parsed.error.flatten());
    const empresa = await prisma.empresa.update({ where: { id }, data: parsed.data });
    ok(res, empresa, 'Empresa actualizada');
  }),
);

export default router;
