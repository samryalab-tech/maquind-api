import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { ApiError } from '../../utils/ApiError';
import { decrypt } from '../../utils/crypto';
import { round2, toNum } from '../../utils/money';
import { getPacAdapter } from './pac/pac.factory';
import type { CfdiConcepto, PacCredentials } from './pac/pac.types';
import { generateFacturaPdf } from '../pdf/pdf.builders';
import { ensureDir } from '../pdf/pdf.service';
import path from 'node:path';
import fs from 'node:fs';
import { env } from '../../config/env';

/** Construye los conceptos del CFDI a partir de los trabajos del cobro. */
async function buildConceptos(cobroId: number): Promise<{ conceptos: CfdiConcepto[]; trabajoIds: number[] }> {
  const cobro = await prisma.cobro.findUnique({
    where: { id: cobroId },
    include: { trabajos: { include: { trabajo: { include: { items: { include: { producto: true }, orderBy: { orden: 'asc' } } } } } } },
  });
  if (!cobro) throw ApiError.notFound('Cobro no encontrado');

  // Los conceptos idénticos se agrupan: si hay 3 "rectificado de pieza" al
  // mismo precio, la factura debe llevar una sola línea con cantidad 3.
  const agrupados = new Map<string, CfdiConcepto>();
  const trabajoIds: number[] = [];

  for (const ct of cobro.trabajos) {
    trabajoIds.push(ct.trabajoId);
    const items = ct.trabajo.items;
    if (!items.length) {
      throw ApiError.badRequest(
        `El trabajo ${ct.trabajo.folio} no tiene conceptos capturados. Corrige el trabajo antes de facturar.`,
      );
    }
    for (const it of items) {
      const claveProdServ = it.producto?.claveProdServ ?? '01010101';
      const claveUnidad = it.producto?.claveUnidad ?? 'E48';
      const descripcion = it.descripcion.trim().replace(/\s+/g, ' ');
      const valorUnitario = toNum(it.precioUnitario);
      const ivaTasa = toNum(it.ivaTasa);
      const clave = [claveProdServ, claveUnidad, it.unidad.toLowerCase(), descripcion.toLowerCase(), valorUnitario.toFixed(2), ivaTasa.toFixed(2)].join('|');

      const previo = agrupados.get(clave);
      if (previo) {
        previo.cantidad = round2(previo.cantidad + toNum(it.cantidad));
        previo.importe = round2(previo.importe + toNum(it.importe));
        previo.importeIva = round2(previo.importeIva + toNum(it.importeIva));
      } else {
        agrupados.set(clave, {
          claveProdServ,
          claveUnidad,
          cantidad: toNum(it.cantidad),
          unidad: it.unidad,
          descripcion,
          valorUnitario,
          importe: toNum(it.importe),
          ivaTasa,
          importeIva: toNum(it.importeIva),
        });
      }
    }
  }

  return { conceptos: [...agrupados.values()], trabajoIds };
}

/** Crea una factura en BORRADOR a partir de un cobro. */
export async function crearFacturaDesdeCobro(cobroId: number, empresaId?: number, usuarioId?: number) {
  const cobro = await prisma.cobro.findFirst({
    where: { id: cobroId, ...(empresaId ? { empresaId } : {}) },
    include: { cliente: true, empresa: true, trabajos: true },
  });
  if (!cobro) throw ApiError.notFound('Cobro no encontrado');
  if (!cobro.trabajos.length) throw ApiError.badRequest('El cobro no tiene trabajos asociados');

  const facturaExistente = await prisma.factura.findFirst({
    where: { cobroId: cobro.id, estado: { not: 'CANCELADA' } },
    select: { id: true, serie: true, folio: true },
  });
  if (facturaExistente) {
    throw ApiError.conflict(
      `Este cobro ya tiene la factura ${facturaExistente.serie}-${facturaExistente.folio}. Cancélala antes de generar otra.`,
    );
  }

  const { conceptos } = await buildConceptos(cobroId);
  // Los totales se toman de los conceptos (ya agrupados) para que la factura
  // cuadre exactamente con lo que se muestra en el desglose.
  const importeNeto = round2(conceptos.reduce((acc, c) => acc + c.importe, 0));
  const bruto = round2(conceptos.reduce((acc, c) => acc + c.cantidad * c.valorUnitario, 0));
  const totales = {
    subtotal: bruto,
    descuento: Math.max(0, round2(bruto - importeNeto)),
    iva: round2(conceptos.reduce((acc, c) => acc + c.importeIva, 0)),
    ieps: 0,
    total: round2(importeNeto + conceptos.reduce((acc, c) => acc + c.importeIva, 0)),
  };

  const empresa = cobro.empresa;
  const serie = empresa.serieFactura;
  const folio = await nextFolioFactura(empresa.id, empresa.folioFacturaActual);

  const factura = await prisma.factura.create({
    data: {
      empresaId: cobro.empresaId,
      cobroId: cobro.id,
      clienteId: cobro.clienteId,
      usuarioId: usuarioId ?? null,
      serie,
      folio,
      estado: 'BORRADOR',
      fecha: new Date(),
      moneda: cobro.moneda,
      subtotal: totales.subtotal,
      descuento: totales.descuento,
      iva: totales.iva,
      ieps: totales.ieps,
      total: totales.total,
      metodoPago: cobro.metodoPago,
      formaPago: cobro.formaPago,
      usoCfdi: cobro.usoCfdi,
      regimenFiscalReceptor: cobro.cliente.regimenFiscal,
      codigoPostalReceptor: cobro.cliente.codigoPostalFiscal,
      conceptos: {
        create: conceptos.map((c) => ({
          descripcion: c.descripcion,
          claveProdServ: c.claveProdServ,
          claveUnidad: c.claveUnidad,
          unidad: c.unidad,
          cantidad: c.cantidad,
          valorUnitario: c.valorUnitario,
          importe: c.importe,
          ivaTasa: c.ivaTasa,
          base: c.importe,
          importeIva: c.importeIva,
        })),
      },
    },
    include: { conceptos: true, cliente: true },
  });

  return factura;
}

async function nextFolioFactura(empresaId: number, actual: number): Promise<number> {
  await prisma.empresa.update({ where: { id: empresaId }, data: { folioFacturaActual: actual + 1 } });
  return actual;
}

function getCreds(empresa: any): PacCredentials {
  return {
    usuario: empresa.pacUsuario ?? undefined,
    password: empresa.pacPasswordCifrada ? decrypt(empresa.pacPasswordCifrada) : undefined,
    certificadoPath: empresa.certificadoPath ?? undefined,
    llavePath: empresa.llavePath ?? undefined,
    llavePassword: empresa.llavePasswordCifrada ? decrypt(empresa.llavePasswordCifrada) : undefined,
  };
}

/** Timbra una factura con el PAC configurado (MOCK por defecto). */
export async function timbrarFactura(facturaId: number, empresaId?: number) {
  const factura = await prisma.factura.findFirst({
    where: { id: facturaId, ...(empresaId ? { empresaId } : {}) },
    include: { conceptos: true, cliente: true, empresa: true },
  });
  if (!factura) throw ApiError.notFound('Factura no encontrada');
  if (factura.estado === 'TIMBRADA') throw ApiError.conflict('La factura ya está timbrada');

  const empresa = factura.empresa;
  const adapter = getPacAdapter(empresa.pacProveedor);
  const creds = getCreds(empresa);

  const resultado = await adapter.timbrar(
    {
      serie: factura.serie,
      folio: factura.folio,
      fecha: factura.fecha.toISOString(),
      moneda: factura.moneda,
      metodoPago: factura.metodoPago,
      formaPago: factura.formaPago,
      emisor: {
        rfc: empresa.rfc,
        razonSocial: empresa.razonSocial,
        regimenFiscal: empresa.regimenFiscal,
        codigoPostal: empresa.codigoPostal,
      },
      receptor: {
        rfc: factura.cliente.rfc,
        razonSocial: factura.cliente.razonSocial,
        regimenFiscal: factura.regimenFiscalReceptor,
        codigoPostal: factura.codigoPostalReceptor,
        usoCfdi: factura.usoCfdi,
      },
      conceptos: factura.conceptos.map((c) => ({
        claveProdServ: c.claveProdServ ?? '01010101',
        claveUnidad: c.claveUnidad ?? 'E48',
        cantidad: toNum(c.cantidad),
        unidad: c.unidad,
        descripcion: c.descripcion,
        valorUnitario: toNum(c.valorUnitario),
        importe: toNum(c.importe),
        ivaTasa: toNum(c.ivaTasa),
        importeIva: toNum(c.importeIva),
      })),
      subtotal: toNum(factura.subtotal),
      descuento: toNum(factura.descuento),
      iva: toNum(factura.iva),
      ieps: toNum(factura.ieps),
      total: toNum(factura.total),
    },
    creds,
  );

  // Guardar XML
  const xmlRel = `xml/${factura.serie}-${factura.folio}.xml`;
  const xmlAbs = path.join(env.storageDir, xmlRel);
  ensureDir(path.dirname(xmlAbs));
  fs.writeFileSync(xmlAbs, resultado.xml, 'utf8');

  const actualizada = await prisma.factura.update({
    where: { id: factura.id },
    data: {
      estado: 'TIMBRADA',
      uuid: resultado.uuid,
      timbreFecha: new Date(resultado.fechaTimbrado),
      xmlPath: xmlRel,
      pacProveedor: adapter.nombre,
      pacRespuesta: resultado.respuesta as any,
    },
    include: { conceptos: true, cliente: true },
  });

  // Generar PDF de la factura. Si falla (p. ej. no hay Chrome instalado),
  // NO se debe marcar el timbrado como fallido: el CFDI ya quedó timbrado.
  let pdfPath: string | null = null;
  try {
    const { relativePath } = await generateFacturaPdf(actualizada.id, empresaId);
    await prisma.factura.update({ where: { id: actualizada.id }, data: { pdfPath: relativePath } });
    pdfPath = relativePath;
  } catch (err) {
    logger.error({ err }, 'No se pudo generar el PDF de la factura tras timbrar (el timbre sí se guardó)');
  }

  return { ...actualizada, pdfPath };
}

/** Cancela un CFDI. */
export async function cancelarFactura(facturaId: number, motivo: string, sustituto: string | null, empresaId?: number) {
  const factura = await prisma.factura.findFirst({
    where: { id: facturaId, ...(empresaId ? { empresaId } : {}) },
    include: { empresa: true },
  });
  if (!factura) throw ApiError.notFound('Factura no encontrada');
  if (factura.estado !== 'TIMBRADA' || !factura.uuid) throw ApiError.conflict('Solo se pueden cancelar facturas timbradas');

  const adapter = getPacAdapter(factura.empresa.pacProveedor);
  const res = await adapter.cancelar(factura.uuid, motivo, sustituto, getCreds(factura.empresa));

  return prisma.factura.update({
    where: { id: factura.id },
    data: {
      estado: 'CANCELADA',
      cancelacionMotivo: motivo,
      cancelacionSustituto: sustituto,
      pacRespuesta: res.respuesta as any,
    },
  });
}
