import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../lib/prisma';
import { ok } from '../../utils/http';
import { encrypt } from '../../utils/crypto';

const router = Router();

const itemSchema = z.object({
  grupo: z.string().max(50).default('general'),
  clave: z.string().min(1).max(100),
  valor: z.string().nullable().optional(),
  tipo: z.string().max(20).default('string'),
  descripcion: z.string().max(255).optional().nullable(),
});

const bulkSchema = z.object({
  grupo: z.string().max(50),
  items: z.array(itemSchema),
});

/** Lista toda la configuración de la empresa (agrupable en el front). */
router.get(
  '/',
  authMiddleware,
  requirePermission('configuracion', 'ver'),
  asyncHandler(async (req, res) => {
    const empresaId = req.empresaId ?? 0;
    const rows = await prisma.configuracion.findMany({
      where: { empresaId },
      orderBy: [{ grupo: 'asc' }, { clave: 'asc' }],
    });
    // No exponer secretos
    const safe = rows.map((r) => ({
      ...r,
      valor: /password|secret/i.test(r.clave) && r.valor ? '********' : r.valor,
    }));
    ok(res, safe);
  }),
);

/** Obtiene un grupo específico. */
router.get(
  '/grupo/:grupo',
  authMiddleware,
  requirePermission('configuracion', 'ver'),
  asyncHandler(async (req, res) => {
    const empresaId = req.empresaId ?? 0;
    const rows = await prisma.configuracion.findMany({
      where: { empresaId, grupo: req.params.grupo },
      orderBy: { clave: 'asc' },
    });
    const safe = rows.map((r) => ({
      ...r,
      valor: /password|secret/i.test(r.clave) && r.valor ? '********' : r.valor,
    }));
    ok(res, safe);
  }),
);

/** Guarda (upsert) un conjunto de configuraciones de un grupo. */
router.put(
  '/bulk',
  authMiddleware,
  requirePermission('configuracion', 'editar'),
  validate(bulkSchema, 'body'),
  asyncHandler(async (req, res) => {
    const empresaId = req.empresaId ?? 0;
    const { items } = req.body as z.infer<typeof bulkSchema>;
    const results = [];
    for (const item of items) {
      let valor = item.valor ?? null;
      // Cifrar secretos; si viene enmascarado, no sobrescribir
      if (/password|secret/i.test(item.clave) && valor) {
        if (valor === '********') {
          continue;
        }
        valor = encrypt(valor);
      }
      const saved = await prisma.configuracion.upsert({
        where: { empresaId_clave: { empresaId, clave: item.clave } },
        update: { valor, tipo: item.tipo, descripcion: item.descripcion, grupo: item.grupo },
        create: {
          empresaId,
          grupo: item.grupo,
          clave: item.clave,
          valor,
          tipo: item.tipo,
          descripcion: item.descripcion,
        },
      });
      results.push(saved);
    }
    ok(res, results, 'Configuración guardada');
  }),
);

export default router;
