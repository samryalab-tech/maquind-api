import { Router } from 'express';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../lib/prisma';
import { ok } from '../../utils/http';
import { toNum } from '../../utils/money';

const router = Router();

router.get(
  '/',
  authMiddleware,
  requirePermission('dashboard', 'ver'),
  asyncHandler(async (req, res) => {
    const empresaId = req.empresaId;
    const where = empresaId ? { empresaId } : {};

    const [cotizaciones, trabajos, cobros, facturas, pagos] = await Promise.all([
      prisma.cotizacion.groupBy({ by: ['estado'], where, _count: true, _sum: { total: true } }),
      prisma.trabajo.groupBy({ by: ['estado'], where, _count: true, _sum: { total: true } }),
      prisma.cobro.groupBy({ by: ['tipo', 'estado'], where, _count: true, _sum: { total: true } }),
      prisma.factura.groupBy({ by: ['estado'], where, _count: true, _sum: { total: true } }),
      prisma.pago.groupBy({ by: ['conciliado'], where, _count: true, _sum: { monto: true } }),
    ]);

    // Ventas (trabajos) de los últimos 6 meses
    const desde = new Date();
    desde.setMonth(desde.getMonth() - 5);
    desde.setDate(1);
    desde.setHours(0, 0, 0, 0);
    const trabajosRecientes = await prisma.trabajo.findMany({
      where: { ...where, fecha: { gte: desde } },
      select: { fecha: true, total: true },
    });
    const meses: { mes: string; total: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(desde);
      d.setMonth(desde.getMonth() + i);
      meses.push({ mes: d.toLocaleDateString('es-MX', { month: 'short' }), total: 0 });
    }
    for (const t of trabajosRecientes) {
      const idx =
        (t.fecha.getFullYear() - desde.getFullYear()) * 12 + (t.fecha.getMonth() - desde.getMonth());
      if (idx >= 0 && idx < 6) meses[idx].total += toNum(t.total);
    }

    const topClientes = await prisma.trabajo.groupBy({
      by: ['clienteId'],
      where,
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    });
    const clientes = await prisma.cliente.findMany({
      where: { id: { in: topClientes.map((c) => c.clienteId) } },
      select: { id: true, razonSocial: true },
    });
    const nombreCliente = new Map(clientes.map((c) => [c.id, c.razonSocial]));

    const totalTrabajos = trabajos.reduce((a, t) => a + t._count, 0);
    const totalCotizaciones = cotizaciones.reduce((a, c) => a + c._count, 0);

    ok(res, {
      resumen: {
        cotizaciones: totalCotizaciones,
        trabajos: totalTrabajos,
        facturasTimbradas: facturas.find((f) => f.estado === 'TIMBRADA')?._count ?? 0,
        porCobrar: toNum(cobros.filter((c) => c.estado !== 'PAGADO' && c.estado !== 'CANCELADO').reduce((a, c) => a + toNum(c._sum.total), 0)),
        cobrado: toNum(pagos.find((p) => p.conciliado)?._sum.monto ?? 0),
      },
      cotizacionesPorEstado: cotizaciones.map((c) => ({ estado: c.estado, cantidad: c._count, total: toNum(c._sum.total) })),
      trabajosPorEstado: trabajos.map((t) => ({ estado: t.estado, cantidad: t._count, total: toNum(t._sum.total) })),
      cobros: cobros.map((c) => ({ tipo: c.tipo, estado: c.estado, cantidad: c._count, total: toNum(c._sum.total) })),
      facturas: facturas.map((f) => ({ estado: f.estado, cantidad: f._count, total: toNum(f._sum.total) })),
      pagos: pagos.map((p) => ({ conciliado: p.conciliado, cantidad: p._count, total: toNum(p._sum.monto) })),
      ventasPorMes: meses,
      topClientes: topClientes.map((c) => ({
        cliente: nombreCliente.get(c.clienteId) ?? '—',
        total: toNum(c._sum.total),
        trabajos: c._count,
      })),
    });
  }),
);

export default router;
