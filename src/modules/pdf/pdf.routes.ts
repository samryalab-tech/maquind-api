import { Router } from 'express';
import path from 'node:path';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { generateCotizacionPdf, generateFacturaPdf } from './pdf.builders';

const router = Router();

// Genera (o regenera) el PDF de una cotización y devuelve su URL
router.post(
  '/cotizaciones/:id',
  authMiddleware,
  requirePermission('cotizaciones', 'ver'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { relativePath } = await generateCotizacionPdf(id, req.empresaId);
    res.json({ success: true, data: { url: `/storage/${relativePath}`, path: relativePath } });
  }),
);

// Genera (o regenera) el PDF de una factura y devuelve su URL
router.post(
  '/facturas/:id',
  authMiddleware,
  requirePermission('facturas', 'ver'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { relativePath } = await generateFacturaPdf(id, req.empresaId);
    res.json({ success: true, data: { url: `/storage/${relativePath}`, path: relativePath } });
  }),
);

// Descarga / visualiza un archivo generado (con validación de ruta dentro de storage)
router.get(
  '/archivo',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const rel = String(req.query.path ?? '');
    if (!rel || rel.includes('..')) throw ApiError.badRequest('Ruta inválida');
    const abs = path.resolve(env.storageDir, rel);
    const root = path.resolve(env.storageDir);
    if (!abs.startsWith(root)) throw ApiError.forbidden();
    res.sendFile(abs);
  }),
);

export default router;
