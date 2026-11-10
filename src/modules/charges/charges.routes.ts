import { Router } from 'express';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../lib/prisma';
import { buildPaginated, getOrderBy, getPagination, ok } from '../../utils/http';
import { ApiError } from '../../utils/ApiError';
import { FOLIOS, nextFolio } from '../../utils/folio';
import { calcularTotales, toNum } from '../../utils/money';
import type { PrismaTx } from '../../lib/prisma';

const router = Router();

router.get(
  '/',
  authMiddleware,
  requirePermission('cobros', 'ver'),
  asyncHandler(async (req, res) => {
    const p = getPagination(req);
    const orderBy = getOrderBy(req, ['folio', 'fecha', 'total', 'estado'], { fecha: 'desc' });
    const where: any = req.empresaId ? { empresaId: req.empresaId } : {};
    if (req.query.clienteId) where.clienteId = Number(req.query.clienteId);
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.tipo) where.tipo = req.query.tipo;
    const [items, total] = await Promise.all([
      prisma.cobro.findMany({ where, skip: p.skip, take: p.take, orderBy, include: { cliente: true, trabajos: { include: { trabajo: true } }, facturas: true } }),
      prisma.cobro.count({ where }),
    ]);
    return res.json({ success: true, data: buildPaginated(items, total, p) });
  }),
);

router.get(
  '/:id',
  authMiddleware,
  requirePermission('cobros', 'ver'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const c = await prisma.cobro.findFirst({
      where: { id, ...(req.empresaId ? { empresaId: req.empresaId } : {}) },
      include: {
        cliente: true,
        trabajos: { include: { trabajo: true } },
        facturas: true,
        pagos: true,
      },
    });
    if (!c) throw ApiError.notFound();
    return ok(res, c);
  }),
);

router.post(
  '/',
  authMiddleware,
  requirePermission('cobros', 'crear'),
  asyncHandler(async (req, res) => {
    const empresaId = req.empresaId!;
    const { clienteId, tipo = 'FISCAL', trabajos = [], periodoDesde, periodoHasta } = req.body;
    if (!trabajos.length) throw ApiError.badRequest('Selecciona al menos un trabajo para generar el cobro');
    const trabajoIds = trabajos.map((t: any) => t.trabajoId).filter(Boolean);
    const trabajosDb = await prisma.trabajo.findMany({ where: { id: { in: trabajoIds }, empresaId, clienteId } });
    if (trabajosDb.length !== trabajoIds.length) throw ApiError.badRequest('Hay trabajos inválidos o no corresponden al cliente');

    const tot = trabajosDb.reduce((acc, t) => acc + toNum(t.total), 0);
    const cobro = await prisma.$transaction(async (tx: PrismaTx) => {
      const folio = await nextFolio({ tipo: 'COB', prefix: 'COB', pad: 4 }, empresaId, tx);
      const c = await tx.cobro.create({
        data: {
          empresaId,
          clienteId,
          usuarioId: req.user!.id,
          folio,
          tipo: tipo === 'NO_FISCAL' ? 'NO_FISCAL' : 'FISCAL',
          estado: 'PENDIENTE',
          fecha: new Date(),
          periodoDesde: periodoDesde ? new Date(periodoDesde) : null,
          periodoHasta: periodoHasta ? new Date(periodoHasta) : null,
          moneda: 'MXN',
          subtotal: tot,
          iva: 0,
          ieps: 0,
          total: tot,
          saldo: tot,
          formaPago: req.body.formaPago || '99',
          metodoPago: req.body.metodoPago || 'PUE',
          usoCfdi: req.body.usoCfdi || 'G03',
          observaciones: req.body.observaciones,
        },
      });
      await tx.cobroTrabajo.createMany({
        data: trabajosDb.map((t) => ({ cobroId: c.id, trabajoId: t.id, importe: toNum(t.total) })),
      });
      return c;
    });
    return ok(res, cobro);
  }),
);

export default router;
