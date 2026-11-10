import { Router } from 'express';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../lib/prisma';
import { buildPaginated, getOrderBy, getPagination, ok } from '../../utils/http';
import { ApiError } from '../../utils/ApiError';
import { cancelarFactura, crearFacturaDesdeCobro, timbrarFactura } from './invoices.service';

const router = Router();

router.get(
  '/',
  authMiddleware,
  requirePermission('facturas', 'ver'),
  asyncHandler(async (req, res) => {
    const p = getPagination(req);
    const orderBy = getOrderBy(req, ['fecha', 'total', 'folio', 'estado'], { fecha: 'desc' });
    const where: any = req.empresaId ? { empresaId: req.empresaId } : {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.clienteId) where.clienteId = Number(req.query.clienteId);
    if (p.search) where.OR = [{ uuid: { contains: p.search } }, { cliente: { razonSocial: { contains: p.search } } }];
    const [items, total] = await Promise.all([
      prisma.factura.findMany({ where, skip: p.skip, take: p.take, orderBy, include: { cliente: true, cobro: true } }),
      prisma.factura.count({ where }),
    ]);
    res.json({ success: true, data: buildPaginated(items, total, p) });
  }),
);

router.get(
  '/:id',
  authMiddleware,
  requirePermission('facturas', 'ver'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const f = await prisma.factura.findFirst({
      where: { id, ...(req.empresaId ? { empresaId: req.empresaId } : {}) },
      include: { cliente: true, conceptos: true, empresa: true, cobro: true },
    });
    if (!f) throw ApiError.notFound();
    ok(res, f);
  }),
);

// Crear factura (borrador) desde un cobro
router.post(
  '/desde-cobro/:cobroId',
  authMiddleware,
  requirePermission('facturas', 'crear'),
  asyncHandler(async (req, res) => {
    const cobroId = Number(req.params.cobroId);
    const f = await crearFacturaDesdeCobro(cobroId, req.empresaId, req.user!.id);
    res.status(201).json({ success: true, data: f, message: 'Factura creada en borrador' });
  }),
);

// Timbrar
router.post(
  '/:id/timbrar',
  authMiddleware,
  requirePermission('cobros', 'facturar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const f = await timbrarFactura(id, req.empresaId);
    res.json({ success: true, data: f, message: 'Factura timbrada correctamente' });
  }),
);

// Cancelar
router.post(
  '/:id/cancelar',
  authMiddleware,
  requirePermission('facturas', 'cancelar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { motivo, sustituto } = req.body as any;
    if (!motivo) throw ApiError.badRequest('Indica el motivo de cancelación');
    const f = await cancelarFactura(id, motivo, sustituto ?? null, req.empresaId);
    res.json({ success: true, data: f, message: 'Factura cancelada' });
  }),
);

export default router;
