import { z } from 'zod';

export const cotizacionItemSchema = z.object({
  productoId: z.number().int().positive().nullable().optional(),
  orden: z.number().int().min(0).default(0),
  descripcion: z.string().min(1).max(500),
  unidad: z.string().max(50).default('Servicio'),
  cantidad: z.coerce.number().min(0.0001),
  precioUnitario: z.coerce.number().min(0),
  descuentoPct: z.coerce.number().min(0).max(100).default(0),
  ivaTasa: z.coerce.number().min(0).max(100).default(16),
  iepsTasa: z.coerce.number().min(0).max(100).default(0),
});

export const cotizacionSchema = z.object({
  clienteId: z.number().int().positive(),
  validezDias: z.number().int().min(1).max(60).default(15),
  moneda: z.string().length(3).default('MXN'),
  condiciones: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  notasInternas: z.string().optional().nullable(),
  items: z.array(cotizacionItemSchema).min(1),
});

export const cotizacionUpdateSchema = cotizacionSchema.partial();
