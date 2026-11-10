import { Router } from 'express';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../lib/prisma';
import { buildPaginated, getOrderBy, getPagination, ok } from '../../utils/http';
import { ApiError } from '../../utils/ApiError';
import { FOLIOS, nextFolio } from '../../utils/folio';
import { calcularLinea, calcularTotales, toNum } from '../../utils/money';
import type { PrismaTx } from '../../lib/prisma';

const router = Router();

router.get(
  '/',
  authMiddleware,
  requirePermission('trabajos', 'ver'),
  asyncHandler(async (req, res) => {
    const p = getPagination(req);
    const orderBy = getOrderBy(req, ['folio', 'fecha', 'total', 'estado'], { fecha: 'desc' });
    const where: any = req.empresaId ? { empresaId: req.empresaId } : {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.clienteId) where.clienteId = Number(req.query.clienteId);
    if (p.search) where.OR = [{ folio: { contains: p.search } }, { cliente: { razonSocial: { contains: p.search } } }];
    const [items, total] = await Promise.all([
      prisma.trabajo.findMany({ where, skip: p.skip, take: p.take, orderBy, include: { cliente: true, cotizacion: true, items: true } }),
      prisma.trabajo.count({ where }),
    ]);
    return res.json({ success: true, data: buildPaginated(items, total, p) });
  }),
);

router.get(
  '/:id',
  authMiddleware,
  requirePermission('trabajos', 'ver'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const t = await prisma.trabajo.findFirst({
      where: { id, ...(req.empresaId ? { empresaId: req.empresaId } : {}) },
      include: {
        cliente: true,
        cotizacion: true,
        usuario: true,
        items: { orderBy: { orden: 'asc' } },
      },
    });
    if (!t) throw ApiError.notFound();
    return ok(res, t);
  }),
);

router.post(
  '/',
  authMiddleware,
  requirePermission('trabajos', 'crear'),
  asyncHandler(async (req, res) => {
    const empresaId = req.empresaId!;
    const data = req.body as any;
    const items = (data.items || []).map((i: any) => calcularLinea(i));
    const itemsData = (data.items || []).map((i: any, idx: number) => ({ ...calcularLinea(i), ...i, orden: idx }));
    const t = calcularTotales(data.items || []);
    const trabajo = await prisma.$transaction(async (tx: PrismaTx) => {
      const folio = await nextFolio(FOLIOS.trabajo, empresaId, tx);
      return tx.trabajo.create({
        data: {
          empresaId,
          clienteId: data.clienteId,
          usuarioId: req.user!.id,
          folio,
          fecha: new Date(),
          estado: 'PENDIENTE',
          descripcion: data.descripcion,
          moneda: data.moneda || 'MXN',
          subtotal: t.subtotal,
          descuento: t.descuento,
          iva: t.iva,
          ieps: t.ieps,
          total: t.total,
          facturable: data.facturable ?? true,
          items: { create: itemsData.map((i: any) => ({
            productoId: i.productoId ?? null,
            orden: i.orden,
            descripcion: i.descripcion,
            unidad: i.unidad ?? 'Servicio',
            cantidad: toNum(i.cantidad),
            precioUnitario: toNum(i.precioUnitario),
            descuentoPct: toNum(i.descuentoPct),
            ivaTasa: toNum(i.ivaTasa),
            iepsTasa: toNum(i.iepsTasa),
            importe: i.importe,
            importeIva: i.importeIva,
            importeIeps: i.importeIeps,
            total: i.total,
          })) },
        },
      });
    });
    return ok(res, trabajo);
  }),
);

router.put(
  '/:id',
  authMiddleware,
  requirePermission('trabajos', 'editar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const empresaId = req.empresaId;
    const t = await prisma.trabajo.findFirst({ where: { id, ...(empresaId ? { empresaId } : {}) } });
    if (!t) throw ApiError.notFound();
    if (t.cotizacionId) throw ApiError.conflict('Este trabajo proviene de una cotización. Debes editarlo desde la cotización.');
    const data = req.body as any;
    const updated = await prisma.trabajo.update({
      where: { id },
      data: {
        descripcion: data.descripcion ?? t.descripcion,
        estado: data.estado ?? t.estado,
      },
    });
    return ok(res, updated);
  }),
);

export default router;
