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
        trabajos: {
          include: {
            trabajo: { include: { items: { orderBy: { orden: 'asc' } } } },
          },
          orderBy: { id: 'asc' },
        },
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

    // Sin duplicados en la petición
    const trabajoIds = [...new Set<number>(trabajos.map((t: any) => Number(t.trabajoId)).filter(Boolean))];
    if (!trabajoIds.length) throw ApiError.badRequest('Selecciona al menos un trabajo para generar el cobro');

    const trabajosDb = await prisma.trabajo.findMany({ where: { id: { in: trabajoIds }, empresaId, clienteId } });
    if (trabajosDb.length !== trabajoIds.length) throw ApiError.badRequest('Hay trabajos inválidos o no corresponden al cliente');

    const cancelados = trabajosDb.filter((t) => t.estado === 'CANCELADO');
    if (cancelados.length) {
      throw ApiError.badRequest(
        `No se puede cobrar un trabajo cancelado: ${cancelados.map((t) => t.folio).join(', ')}`,
      );
    }

    // Un trabajo se cobra una sola vez: no puede estar en otro cobro vigente.
    const yaCobrados = await prisma.cobroTrabajo.findMany({
      where: { trabajoId: { in: trabajoIds }, cobro: { estado: { not: 'CANCELADO' } } },
      include: { cobro: { select: { folio: true } }, trabajo: { select: { folio: true } } },
    });
    if (yaCobrados.length) {
      const porTrabajo = new Map<string, string[]>();
      for (const c of yaCobrados) {
        const folios = porTrabajo.get(c.trabajo.folio) ?? [];
        if (!folios.includes(c.cobro.folio)) folios.push(c.cobro.folio);
        porTrabajo.set(c.trabajo.folio, folios);
      }
      const detalle = [...porTrabajo].map(([folio, folios]) => `${folio} (cobro ${folios.join(', ')})`).join(', ');
      throw ApiError.conflict(`Estos trabajos ya fueron cobrados y no se pueden volver a cobrar: ${detalle}`);
    }

    const suma = (fn: (t: any) => any) => trabajosDb.reduce((acc, t) => acc + toNum(fn(t)), 0);

    const cobro = await prisma.$transaction(async (tx: PrismaTx) => {
      // Segunda validación dentro de la transacción (evita duplicados por doble clic).
      const repetidos = await tx.cobroTrabajo.findFirst({
        where: { trabajoId: { in: trabajoIds }, cobro: { estado: { not: 'CANCELADO' } } },
      });
      if (repetidos) throw ApiError.conflict('Alguno de los trabajos ya fue agregado a otro cobro. Actualiza la lista.');

      const folio = await nextFolio(FOLIOS.cobro, empresaId, tx);
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
          subtotal: suma((t) => t.subtotal),
          iva: suma((t) => t.iva),
          ieps: suma((t) => t.ieps),
          total: suma((t) => t.total),
          saldo: suma((t) => t.total),
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
