import path from 'node:path';
import fs from 'node:fs';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { renderPdf } from './pdf.service';
import { env } from '../../config/env';

/** Convierte una posible ruta relativa de logo en una URL usable por Puppeteer. */
function resolveLogo(logoUrl: string | null | undefined): string | undefined {
  if (!logoUrl) return undefined;
  if (/^https?:\/\//i.test(logoUrl) || logoUrl.startsWith('data:')) return logoUrl;
  const abs = path.isAbsolute(logoUrl) ? logoUrl : path.join(process.cwd(), logoUrl);
  if (fs.existsSync(abs)) return `file://${abs}`;
  const inStorage = path.join(env.storageDir, logoUrl.replace(/^\/?storage\//, ''));
  if (fs.existsSync(inStorage)) return `file://${inStorage}`;
  return undefined;
}

export async function buildCotizacionPdfData(cotizacionId: number, empresaId?: number) {
  const cotizacion = await prisma.cotizacion.findFirst({
    where: { id: cotizacionId, ...(empresaId ? { empresaId } : {}) },
    include: {
      cliente: true,
      usuario: { select: { nombre: true, apellido: true } },
      items: { orderBy: { orden: 'asc' } },
      empresa: true,
    },
  });
  if (!cotizacion) throw ApiError.notFound('Cotización no encontrada');
  const empresa = { ...cotizacion.empresa, logoUrl: resolveLogo(cotizacion.empresa.logoUrl) };
  return { empresa, cotizacion, items: cotizacion.items };
}

export async function generateCotizacionPdf(cotizacionId: number, empresaId?: number) {
  const data = await buildCotizacionPdfData(cotizacionId, empresaId);
  const relativePath = `pdfs/cotizaciones/${data.cotizacion.folio}.pdf`;
  await renderPdf({ template: 'cotizacion', data: data as any, outputRelativePath: relativePath });
  return { relativePath, data };
}

export async function buildFacturaPdfData(facturaId: number, empresaId?: number) {
  const factura = await prisma.factura.findFirst({
    where: { id: facturaId, ...(empresaId ? { empresaId } : {}) },
    include: { cliente: true, conceptos: true, empresa: true, cobro: { include: { trabajos: { include: { trabajo: true } } } } },
  });
  if (!factura) throw ApiError.notFound('Factura no encontrada');
  const empresa = { ...factura.empresa, logoUrl: resolveLogo(factura.empresa.logoUrl) };
  // El template usa `cotizacion.cliente` para el receptor; lo mapeamos.
  return { empresa, factura, conceptos: factura.conceptos, cotizacion: { cliente: factura.cliente } };
}

export async function generateFacturaPdf(facturaId: number, empresaId?: number) {
  const data = await buildFacturaPdfData(facturaId, empresaId);
  const relativePath = `pdfs/facturas/${data.factura.serie}-${data.factura.folio}.pdf`;
  await renderPdf({ template: 'factura', data: data as any, outputRelativePath: relativePath });
  return { relativePath, data };
}
