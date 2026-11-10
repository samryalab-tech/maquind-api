import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../lib/prisma';
import { buildPaginated, getPagination, ok } from '../../utils/http';
import { enviarCotizacionPorCorreo, enviarFacturaPorCorreo, renderPlantilla, sendMail } from './email.service';
import { ApiError } from '../../utils/ApiError';

const router = Router();

const plantillaSchema = z.object({
  clave: z.string().min(2).max(50),
  nombre: z.string().min(2).max(150),
  asunto: z.string().min(2).max(255),
  cuerpo: z.string().min(2),
  activo: z.boolean().default(true),
});

// ---- Plantillas ----
router.get(
  '/plantillas',
  authMiddleware,
  requirePermission('correos', 'ver'),
  asyncHandler(async (req, res) => {
    const items = await prisma.plantillaCorreo.findMany({
      where: { empresaId: req.empresaId ?? 0 },
      orderBy: { nombre: 'asc' },
    });
    res.json({ success: true, data: items });
  }),
);

router.post(
  '/plantillas',
  authMiddleware,
  requirePermission('correos', 'crear'),
  validate(plantillaSchema, 'body'),
  asyncHandler(async (req, res) => {
    const item = await prisma.plantillaCorreo.create({
      data: { ...req.body, empresaId: req.empresaId ?? 0 },
    });
    res.status(201).json({ success: true, data: item });
  }),
);

router.put(
  '/plantillas/:id',
  authMiddleware,
  requirePermission('correos', 'editar'),
  validate(plantillaSchema.partial(), 'body'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const item = await prisma.plantillaCorreo.update({ where: { id }, data: req.body });
    res.json({ success: true, data: item });
  }),
);

router.delete(
  '/plantillas/:id',
  authMiddleware,
  requirePermission('correos', 'eliminar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.plantillaCorreo.delete({ where: { id } });
    res.json({ success: true });
  }),
);

// ---- Envíos ----
router.post(
  '/cotizacion/:id',
  authMiddleware,
  requirePermission('cotizaciones', 'enviar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { to, cc, mensaje } = req.body as any;
    if (!to) throw ApiError.badRequest('Indica el correo destinatario');
    const result = await enviarCotizacionPorCorreo(id, { to, cc, mensaje, usuarioId: req.user!.id }, req.empresaId);
    res.json({ success: true, data: result, message: `Cotización enviada a ${result.to}` });
  }),
);

router.post(
  '/factura/:id',
  authMiddleware,
  requirePermission('facturas', 'enviar'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { to, cc, mensaje } = req.body as any;
    if (!to) throw ApiError.badRequest('Indica el correo destinatario');
    const result = await enviarFacturaPorCorreo(id, { to, cc, mensaje, usuarioId: req.user!.id }, req.empresaId);
    res.json({ success: true, data: result, message: `Factura enviada a ${result.to}` });
  }),
);

// Enviar un correo de prueba para validar la configuración SMTP
router.post(
  '/probar',
  authMiddleware,
  requirePermission('configuracion', 'editar'),
  asyncHandler(async (req, res) => {
    const { to } = req.body as any;
    if (!to) throw ApiError.badRequest('Indica un correo de prueba');
    await sendMail({
      to,
      subject: 'Prueba de configuración - Maquind ERP',
      html: '<h3>¡Todo listo!</h3><p>La configuración de correo funciona correctamente.</p>',
      empresaId: req.empresaId ?? 0,
      usuarioId: req.user!.id,
    });
    res.json({ success: true, message: `Correo de prueba enviado a ${to}` });
  }),
);

// ---- Bitácora ----
router.get(
  '/bitacora',
  authMiddleware,
  requirePermission('correos', 'ver'),
  asyncHandler(async (req, res) => {
    const p = getPagination(req, 20);
    const where: any = req.empresaId ? { empresaId: req.empresaId } : {};
    if (req.query.estado) where.estado = req.query.estado;
    const [items, total] = await Promise.all([
      prisma.correoLog.findMany({ where, skip: p.skip, take: p.take, orderBy: { createdAt: 'desc' } }),
      prisma.correoLog.count({ where }),
    ]);
    res.json({ success: true, data: buildPaginated(items, total, p) });
  }),
);

export default router;
