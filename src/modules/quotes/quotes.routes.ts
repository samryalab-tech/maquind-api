import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { created, ok } from '../../utils/http';
import { ApiError } from '../../utils/ApiError';
import { calcularLinea, calcularTotales, toNum } from '../../utils/money';
import { FOLIOS, nextFolio } from '../../utils/folio';
import { cotizacionSchema } from './quotes.schema';
import { EstadoCotizacion } from '@prisma/client';
import type { PrismaTx } from '../../lib/prisma';

function buildQuoteItems(items: any[]) {
  return items.map((i) => {
    const r = calcularLinea(i);
    return {
      productoId: i.productoId ?? null,
      orden: i.orden ?? 0,
      descripcion: i.descripcion,
      unidad: i.unidad ?? 'Servicio',
      cantidad: toNum(i.cantidad),
      precioUnitario: toNum(i.precioUnitario),
      descuentoPct: toNum(i.descuentoPct),
      ivaTasa: toNum(i.ivaTasa),
      iepsTasa: toNum(i.iepsTasa),
      importe: r.importe,
      importeIva: r.importeIva,
      importeIeps: r.importeIeps,
      total: r.total,
    };
  });
}

const router = Router();

router.get(
  '/',
  authMiddleware,
  requirePermission('cotizaciones', 'ver'),
  asyncHandler(async (req, res) => {
    const { getPagination, buildPaginated, getOrderBy } = await import('../../utils/http');
    const p = getPagination(req);
    const orderBy = getOrderBy(req, ['folio', 'fecha', 'total', 'estado'], { fecha: 'desc' });
    const where: any = req.empresaId ? { empresaId: req.empresaId } : {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.clienteId) where.clienteId = Number(req.query.clienteId);
    if (p.search) where.OR = [{ folio: { contains: p.search } }, { cliente: { razonSocial: { contains: p.search } } }];
    const [items, total] = await Promise.all([
      prisma.cotizacion.findMany({ where, skip: p.skip, take: p.take, orderBy, include: { cliente: true, usuario: true, items: true } }),
      prisma.cotizacion.count({ where }),
    ]);
    return res.json({ success: true, data: buildPaginated(items, total, p) });
  }),
);

router.get(
  '/:id',
  authMiddleware,
  requirePermission('cotizaciones', 'ver'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const where: any = { id };
    if (req.empresaId) where.empresaId = req.empresaId;
    const c = await prisma.cotizacion.findFirst({ where, include: { cliente: true, items: true, trabajos: true } });
    if (!c) throw ApiError.notFound();
    return ok(res, c);
  }),
);

router.post(
  '/',
  authMiddleware,
  requirePermission('cotizaciones', 'crear'),
  validate(cotizacionSchema, 'body'),
  asyncHandler(async (req, res) => {
    const empresaId = req.empresaId!;
    const data = req.body as any;
    const itemsData = buildQuoteItems(data.items);
    const t = calcularTotales(data.items);
    const fecha = new Date();
    const fechaVencimiento = new Date(fecha);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + (data.validezDias || 15));

    const c = await prisma.$transaction(async (tx: PrismaTx) => {
      const folio = await nextFolio(FOLIOS.cotizacion, empresaId, tx);
      return tx.cotizacion.create({
        data: {
          empresaId,
          clienteId: data.clienteId,
          usuarioId: req.user!.id,
          folio,
          estado: EstadoCotizacion.BORRADOR,
          fecha,
          validezDias: data.validezDias,
          fechaVencimiento,
          moneda: data.moneda,
          subtotal: t.subtotal,
          descuento: t.descuento,
          iva: t.iva,
          ieps: t.ieps,
          total: t.total,
          condiciones: data.condiciones,
          observaciones: data.observaciones,
          notasInternas: data.notasInternas,
          items: { create: itemsData },
        },
        include: { items: true, cliente: true },
      });
    });
    return created(res, c);
  }),
);

router.put(
  '/:id',
  authMiddleware,
  requirePermission('cotizaciones', 'editar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const empresaId = req.empresaId;
    const c = await prisma.cotizacion.findFirst({ where: { id, ...(empresaId ? { empresaId } : {}) } });
    if (!c) throw ApiError.notFound();
    if (c.estado !== EstadoCotizacion.BORRADOR && c.estado !== EstadoCotizacion.ENVIADA) {
      throw ApiError.conflict('Solo se pueden editar cotizaciones en Borrador o Enviada');
    }
    const data = req.body as any;
    const itemsData = data.items ? buildQuoteItems(data.items) : null;
    const t = data.items ? calcularTotales(data.items) : null;

    const updated = await prisma.$transaction(async (tx: PrismaTx) => {
      if (itemsData) {
        await tx.cotizacionItem.deleteMany({ where: { cotizacionId: id } });
      }
      return tx.cotizacion.update({
        where: { id },
        data: {
          clienteId: data.clienteId ?? c.clienteId,
          validezDias: data.validezDias ?? c.validezDias,
          fechaVencimiento: data.validezDias ? new Date(Date.now() + data.validezDias * 86400000) : c.fechaVencimiento,
          condiciones: data.condiciones ?? c.condiciones,
          observaciones: data.observaciones ?? c.observaciones,
          notasInternas: data.notasInternas ?? c.notasInternas,
          ...(t ? { subtotal: t.subtotal, descuento: t.descuento, iva: t.iva, ieps: t.ieps, total: t.total } : {}),
          ...(itemsData ? { items: { create: itemsData } } : {}),
        },
        include: { items: true, cliente: true },
      });
    });
    return ok(res, updated);
  }),
);

router.post(
  '/:id/convertir-a-trabajo',
  authMiddleware,
  requirePermission('cotizaciones', 'aprobar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const empresaId = req.empresaId!;
    const c = await prisma.cotizacion.findFirst({ where: { id, empresaId }, include: { items: true, cliente: true } });
    if (!c) throw ApiError.notFound();
    if (c.estado === EstadoCotizacion.CONVERTIDA) throw ApiError.conflict('La cotización ya fue convertida a trabajo');
    if (c.estado === EstadoCotizacion.CANCELADA || c.estado === EstadoCotizacion.RECHAZADA) throw ApiError.conflict('No se puede convertir esta cotización');

    const trabajo = await prisma.$transaction(async (tx: PrismaTx) => {
      const folio = await nextFolio({ tipo: 'TRB', prefix: 'TRB', pad: 4 }, empresaId, tx);
      const t = await tx.trabajo.create({
        data: {
          empresaId,
          clienteId: c.clienteId,
          cotizacionId: c.id,
          usuarioId: req.user!.id,
          folio,
          estado: 'PENDIENTE',
          fecha: new Date(),
          moneda: c.moneda,
          subtotal: c.subtotal,
          descuento: c.descuento,
          iva: c.iva,
          ieps: c.ieps,
          total: c.total,
          facturable: true,
          items: {
            create: c.items.map((i) => ({
              productoId: i.productoId,
              orden: i.orden,
              descripcion: i.descripcion,
              unidad: i.unidad,
              cantidad: i.cantidad,
              precioUnitario: i.precioUnitario,
              descuentoPct: i.descuentoPct,
              ivaTasa: i.ivaTasa,
              iepsTasa: i.iepsTasa,
              importe: i.importe,
              importeIva: i.importeIva,
              importeIeps: i.importeIeps,
              total: i.total,
            })),
          },
        },
        include: { items: true },
      });
      await tx.cotizacion.update({ where: { id: c.id }, data: { estado: EstadoCotizacion.CONVERTIDA } });
      return t;
    });
    return ok(res, { trabajo }, 'Cotización convertida a trabajo');
  }),
);

router.post(
  '/:id/cambiar-estado',
  authMiddleware,
  requirePermission('cotizaciones', 'editar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { estado } = req.body;
    const allowed = ['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'CONVERTIDA', 'CANCELADA'] as const;
    if (!allowed.includes(estado)) throw ApiError.badRequest('Estado inválido');
    const c = await prisma.cotizacion.update({ where: { id, ...(req.empresaId ? { empresaId: req.empresaId } : {}) }, data: { estado } });
    return ok(res, c);
  }),
);

export default router;
