import { z } from 'zod';

export const clienteSchema = z.object({
  empresaId: z.number().int().positive().optional(),
  codigo: z.string().max(30).optional().nullable(),
  razonSocial: z.string().min(2).max(255),
  nombreComercial: z.string().max(255).optional().nullable(),
  rfc: z.string().min(12).max(13),
  regimenFiscal: z.string().length(3),
  codigoPostalFiscal: z.string().length(5),
  usoCfdi: z.string().length(4).default('G03'),
  formaPago: z.string().max(3).optional().nullable(),
  metodoPago: z.string().max(3).optional().nullable(),
  email: z.string().email().optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  contacto: z.string().max(200).optional().nullable(),
  calle: z.string().max(255).optional().nullable(),
  colonia: z.string().max(255).optional().nullable(),
  municipio: z.string().max(255).optional().nullable(),
  estado: z.string().max(255).optional().nullable(),
  pais: z.string().max(100).optional(),
  diasCredito: z.number().int().min(0).default(0),
  notas: z.string().optional().nullable(),
  activo: z.boolean().default(true),
});

export const productoSchema = z.object({
  empresaId: z.number().int().positive().optional(),
  codigo: z.string().min(1).max(30),
  nombre: z.string().min(2).max(255),
  descripcion: z.string().optional().nullable(),
  categoria: z.string().max(100).optional().nullable(),
  unidad: z.string().max(50).default('Servicio'),
  precio: z.coerce.number().min(0),
  moneda: z.string().length(3).default('MXN'),
  ivaTasa: z.coerce.number().min(0).max(100).default(16),
  iepsTasa: z.coerce.number().min(0).max(100).default(0),
  claveProdServ: z.string().max(20).optional().nullable(),
  claveUnidad: z.string().max(20).optional().nullable(),
  objetoImpuesto: z.string().length(2).default('02'),
  esServicio: z.boolean().default(true),
  activo: z.boolean().default(true),
});

export const clienteUpdateSchema = clienteSchema.partial();
export const productoUpdateSchema = productoSchema.partial();
