import nodemailer, { type Transporter } from 'nodemailer';
import Handlebars from 'handlebars';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { decrypt } from '../../utils/crypto';
import { formatMoney, toNum } from '../../utils/money';
import { ApiError } from '../../utils/ApiError';
import { generateCotizacionPdf, generateFacturaPdf } from '../pdf/pdf.builders';
import path from 'node:path';

/**
 * Correo saliente vía SMTP (Hostinger): smtp.hostinger.com, 465 SSL.
 * La configuración puede vivir en la BD (tabla configuracion, grupo 'smtp')
 * para no tener que tocar el servidor; si no existe, se usa el .env.
 */

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
  const rows = await prisma.configuracion.findMany({ where: { grupo: 'smtp' } });
  const map = new Map(rows.map((r) => [r.clave, r.valor ?? '']));
  const passCifrado = map.get('password') || '';

  return {
    host: map.get('host') || env.smtp.host,
    port: Number.parseInt(map.get('port') || String(env.smtp.port), 10),
    secure: (map.get('secure') ?? String(env.smtp.secure)) === 'true',
    user: map.get('user') || env.smtp.user,
    pass: passCifrado ? decrypt(passCifrado) : env.smtp.pass,
    fromName: map.get('fromName') || env.smtp.fromName,
    fromEmail: map.get('fromEmail') || env.smtp.fromEmail,
  };
}

async function getTransport(): Promise<Transporter> {
  const cfg = await getSmtpConfig();
  if (!cfg.user || !cfg.pass) {
    throw ApiError.badRequest('El correo no está configurado. Revisa Configuración → Correo.');
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

function registerHelpers() {
  if ((Handlebars as any).__maquindMailHelpers) return;
  (Handlebars as any).__maquindMailHelpers = true;
  Handlebars.registerHelper('money', (v: unknown) => formatMoney(v as any));
}

export interface PlantillaContext {
  [key: string]: unknown;
}

/** Carga la plantilla por clave y reemplaza variables. */
export async function renderPlantilla(
  clave: string,
  context: PlantillaContext,
  empresaId = 0,
): Promise<{ asunto: string; html: string }> {
  const plantilla =
    (await prisma.plantillaCorreo.findFirst({ where: { clave, empresaId } })) ??
    (await prisma.plantillaCorreo.findFirst({ where: { clave, empresaId: 0 } }));
  if (!plantilla) {
    throw ApiError.badRequest(`No existe la plantilla de correo "${clave}"`);
  }
  registerHelpers();
  const asunto = Handlebars.compile(plantilla.asunto)(context);
  // El cuerpo es HTML editable; permitimos HTML crudo del diseñador.
  const html = Handlebars.compile(plantilla.cuerpo)(context);
  return { asunto, html };
}

export interface SendMailInput {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  attachments?: { filename: string; path: string }[];
  empresaId?: number;
  plantillaClave?: string;
  entidadTipo?: string;
  entidadId?: number;
  usuarioId?: number;
}

export async function sendMail(input: SendMailInput) {
  const cfg = await getSmtpConfig();
  const transport = await getTransport();
  try {
    await transport.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to: input.to,
      cc: input.cc || undefined,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments,
    });
    await prisma.correoLog.create({
      data: {
        empresaId: input.empresaId ?? 0,
        plantillaClave: input.plantillaClave ?? null,
        destinatario: input.to,
        cc: input.cc ?? null,
        asunto: input.subject,
        cuerpo: input.html,
        entidadTipo: input.entidadTipo ?? null,
        entidadId: input.entidadId ?? null,
        estado: 'ENVIADO',
        usuarioId: input.usuarioId ?? null,
      },
    });
    return { ok: true };
  } catch (err: any) {
    await prisma.correoLog.create({
      data: {
        empresaId: input.empresaId ?? 0,
        plantillaClave: input.plantillaClave ?? null,
        destinatario: input.to,
        cc: input.cc ?? null,
        asunto: input.subject,
        cuerpo: input.html,
        entidadTipo: input.entidadTipo ?? null,
        entidadId: input.entidadId ?? null,
        estado: 'ERROR',
        error: err?.message ?? 'Error desconocido',
        usuarioId: input.usuarioId ?? null,
      },
    });
    logger.error({ err }, 'Error al enviar correo');
    throw ApiError.internal(`No se pudo enviar el correo: ${err?.message ?? ''}`);
  }
}

/** Envía la cotización con su PDF adjunto. */
export async function enviarCotizacionPorCorreo(
  cotizacionId: number,
  opts: { to?: string; cc?: string; mensaje?: string; usuarioId?: number },
  empresaId?: number,
) {
  const { relativePath, data } = await generateCotizacionPdf(cotizacionId, empresaId);
  const { cotizacion, empresa } = data as any;
  const destino = opts.to || cotizacion.cliente.email;
  if (!destino) throw ApiError.badRequest('El cliente no tiene correo registrado');

  const ctx = {
    cliente: cotizacion.cliente.razonSocial,
    folio: cotizacion.folio,
    total: formatMoney(cotizacion.total, cotizacion.moneda),
    empresa: empresa.nombreComercial || empresa.razonSocial,
    fecha: new Date(cotizacion.fecha).toLocaleDateString('es-MX'),
    mensaje: opts.mensaje ?? '',
    usuario: cotizacion.usuario?.nombre ?? '',
  };

  const { asunto, html } = await renderPlantilla('cotizacion', ctx, empresaId ?? 0);
  await sendMail({
    to: destino,
    cc: opts.cc,
    subject: asunto,
    html,
    attachments: [
      {
        filename: `${cotizacion.folio}.pdf`,
        path: path.join(process.cwd(), 'storage', relativePath),
      },
    ],
    empresaId: empresaId ?? 0,
    plantillaClave: 'cotizacion',
    entidadTipo: 'cotizacion',
    entidadId: cotizacion.id,
    usuarioId: opts.usuarioId,
  });

  await prisma.cotizacion.update({
    where: { id: cotizacion.id },
    data: {
      emailEnviadoAt: new Date(),
      emailDestinatario: destino,
      estado: cotizacion.estado === 'BORRADOR' ? 'ENVIADA' : cotizacion.estado,
    },
  });

  return { ok: true, to: destino };
}

/** Envía la factura con su PDF adjunto. */
export async function enviarFacturaPorCorreo(
  facturaId: number,
  opts: { to?: string; cc?: string; mensaje?: string; usuarioId?: number },
  empresaId?: number,
) {
  const { relativePath, data } = await generateFacturaPdf(facturaId, empresaId);
  const { factura, empresa, cotizacion } = data as any;
  const destino = opts.to || factura.cliente.email;
  if (!destino) throw ApiError.badRequest('El cliente no tiene correo registrado');

  const ctx = {
    cliente: factura.cliente.razonSocial,
    folio: `${factura.serie}-${factura.folio}`,
    total: formatMoney(factura.total, factura.moneda),
    empresa: empresa.nombreComercial || empresa.razonSocial,
    fecha: new Date(factura.fecha).toLocaleDateString('es-MX'),
    mensaje: opts.mensaje ?? '',
    uuid: factura.uuid ?? '',
  };

  const { asunto, html } = await renderPlantilla('factura', ctx, empresaId ?? 0);
  await sendMail({
    to: destino,
    cc: opts.cc,
    subject: asunto,
    html,
    attachments: [
      { filename: `${factura.serie}-${factura.folio}.pdf`, path: path.join(process.cwd(), 'storage', relativePath) },
    ],
    empresaId: empresaId ?? 0,
    plantillaClave: 'factura',
    entidadTipo: 'factura',
    entidadId: factura.id,
    usuarioId: opts.usuarioId,
  });
  return { ok: true, to: destino };
}
