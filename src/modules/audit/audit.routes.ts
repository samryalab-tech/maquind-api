import { Router } from 'express';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../lib/prisma';
import { getPagination, buildPaginated } from '../../utils/http';

const router = Router();

router.get(
  '/',
  authMiddleware,
  requirePermission('auditoria', 'ver'),
  asyncHandler(async (req, res) => {
    const p = getPagination(req, 20);
    const where: any = {};
    if (req.empresaId) where.empresaId = req.empresaId;
    if (req.query.modulo) where.modulo = req.query.modulo;
    if (req.query.usuarioId) where.usuarioId = Number(req.query.usuarioId);
    if (req.query.desde || req.query.hasta) {
      where.createdAt = {};
      if (req.query.desde) where.createdAt.gte = new Date(String(req.query.desde));
      if (req.query.hasta) where.createdAt.lte = new Date(String(req.query.hasta));
    }
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({ where, skip: p.skip, take: p.take, orderBy: { createdAt: 'desc' } }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ success: true, data: buildPaginated(items, total, p) });
  }),
);

export default router;
