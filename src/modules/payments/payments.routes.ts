import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma, type PrismaTx } from '../../lib/prisma';
import { buildPaginated, getOrderBy, getPagination, ok } from '../../utils/http';
import { ApiError } from '../../utils/ApiError';
import { round2, toNum } from '../../utils/money';

const router = Router();

const pagoSchema = z.object({
  clienteId: z.number().int().positive(),
  cobroId: z.number().int().positive().nullable().optional(),
  fecha: z.string().optional(),
  monto: z.coerce.number().positive(),
  moneda: z.string().length(3).default('MXN'),
  formaPago: z.string().max(3).default('03'),
  referencia: z.string().max(150).optional().nullable(),
  conciliado: z.boolean().default(false),
  comprobantePath: z.string().max(500).optional().nullable(),
  notas: z.string().optional().nullable(),
});

/** Recalcula el saldo y estado de un cobro a partir de sus pagos conciliados. */
async function recomputeCobro(cobroId: number, tx: PrismaTx | typeof prisma = prisma) {
  const cobro = await tx.cobro.findUnique({ where: { id: cobroId }, include: { pagos: true } });
  if (!cobro) return;
  const pagado = round2(
    cobro.pagos.filter((p) => p.conciliado).reduce((acc, p) => acc + toNum(p.monto), 0),
  );
  const total = toNum(cobro.total);
  const saldo = round2(Math.max(0, total - pagado));
  let estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'CANCELADO' = 'PENDIENTE';
  if (cobro.estado === 'CANCELADO') estado = 'CANCELADO';
  else if (saldo <= 0 && pagado > 0) estado = 'PAGADO';
  else if (pagado > 0) estado = 'PARCIAL';
  await tx.cobro.update({ where: { id: cobroId }, data: { saldo, estado } });
}

router.get(
  '/',
  authMiddleware,
  requirePermission('pagos', 'ver'),
  asyncHandler(async (req, res) => {
    const p = getPagination(req);
    const orderBy = getOrderBy(req, ['fecha', 'monto'], { fecha: 'desc' });
    const where: any = req.empresaId ? { empresaId: req.empresaId } : {};
    if (req.query.conciliado !== undefined) where.conciliado = req.query.conciliado === 'true';
    if (req.query.clienteId) where.clienteId = Number(req.query.clienteId);
    if (req.query.desde || req.query.hasta) {
      where.fecha = {};
      if (req.query.desde) where.fecha.gte = new Date(String(req.query.desde));
      if (req.query.hasta) where.fecha.lte = new Date(String(req.query.hasta));
    }
    if (p.search) where.OR = [{ referencia: { contains: p.search } }, { cliente: { razonSocial: { contains: p.search } } }];
    const [items, total] = await Promise.all([
      prisma.pago.findMany({ where, skip: p.skip, take: p.take, orderBy, include: { cliente: true, cobro: true } }),
      prisma.pago.count({ where }),
    ]);
    res.json({ success: true, data: buildPaginated(items, total, p) });
  }),
);

router.post(
  '/',
  authMiddleware,
  requirePermission('pagos', 'crear'),
  validate(pagoSchema, 'body'),
  asyncHandler(async (req, res) => {
    const empresaId = req.empresaId!;
    const data = req.body as any;
    const pago = await prisma.$transaction(async (tx) => {
      const p = await tx.pago.create({
        data: {
          empresaId,
          clienteId: data.clienteId,
          cobroId: data.cobroId ?? null,
          usuarioId: req.user!.id,
          fecha: data.fecha ? new Date(data.fecha) : new Date(),
          monto: data.monto,
          moneda: data.moneda,
          formaPago: data.formaPago,
          referencia: data.referencia,
          conciliado: data.conciliado,
          fechaConciliacion: data.conciliado ? new Date() : null,
          comprobantePath: data.comprobantePath,
          notas: data.notas,
        },
      });
      if (p.cobroId) await recomputeCobro(p.cobroId, tx);
      return p;
    });
    res.status(201).json({ success: true, data: pago, message: 'Pago registrado' });
  }),
);

router.put(
  '/:id',
  authMiddleware,
  requirePermission('pagos', 'editar'),
  validate(pagoSchema.partial(), 'body'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existente = await prisma.pago.findFirst({ where: { id, ...(req.empresaId ? { empresaId: req.empresaId } : {}) } });
    if (!existente) throw ApiError.notFound();
    const data = req.body as any;
    const pago = await prisma.$transaction(async (tx) => {
      const p = await tx.pago.update({
        where: { id },
        data: {
          ...data,
          fecha: data.fecha ? new Date(data.fecha) : undefined,
          fechaConciliacion: data.conciliado === true ? new Date() : data.conciliado === false ? null : undefined,
        },
      });
      if (p.cobroId) await recomputeCobro(p.cobroId, tx);
      if (existente.cobroId && existente.cobroId !== p.cobroId) await recomputeCobro(existente.cobroId, tx);
      return p;
    });
    res.json({ success: true, data: pago });
  }),
);

router.post(
  '/:id/conciliar',
  authMiddleware,
  requirePermission('pagos', 'conciliar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { conciliado = true } = req.body as any;
    const pago = await prisma.$transaction(async (tx) => {
      const p = await tx.pago.update({
        where: { id },
        data: { conciliado, fechaConciliacion: conciliado ? new Date() : null },
      });
      if (p.cobroId) await recomputeCobro(p.cobroId, tx);
      return p;
    });
    res.json({ success: true, data: pago, message: conciliado ? 'Pago conciliado' : 'Conciliación revertida' });
  }),
);

router.delete(
  '/:id',
  authMiddleware,
  requirePermission('pagos', 'eliminar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existente = await prisma.pago.findFirst({ where: { id, ...(req.empresaId ? { empresaId: req.empresaId } : {}) } });
    if (!existente) throw ApiError.notFound();
    await prisma.$transaction(async (tx) => {
      await tx.pago.delete({ where: { id } });
      if (existente.cobroId) await recomputeCobro(existente.cobroId, tx);
    });
    res.json({ success: true, message: 'Pago eliminado' });
  }),
);

export default router;
