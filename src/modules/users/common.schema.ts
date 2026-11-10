import { z } from 'zod';

export const userSchema = z.object({
  nombre: z.string().min(2).max(150),
  apellido: z.string().max(150).optional().nullable(),
  email: z.string().email(),
  telefono: z.string().max(30).optional().nullable(),
  activo: z.boolean().default(true),
  esSuperadmin: z.boolean().optional(),
  perfilId: z.number().int().positive().nullable().optional(),
  password: z.string().min(8).optional(), // sólo al crear
  empresaIds: z.array(z.number().int().positive()).optional(),
});

export const userUpdateSchema = userSchema.partial().omit({ password: true });

export const perfilSchema = z.object({
  nombre: z.string().min(2).max(100),
  descripcion: z.string().max(255).optional().nullable(),
  esAdmin: z.boolean().default(false),
  activo: z.boolean().default(true),
  permisos: z.array(z.string().regex(/^[a-z]+:[a-z]+$/)).optional(),
});

export const perfilUpdateSchema = perfilSchema.partial();

export const empresaSchema = z.object({
  rfc: z.string().min(12).max(13),
  razonSocial: z.string().min(2).max(255),
  nombreComercial: z.string().max(255).optional().nullable(),
  regimenFiscal: z.string().length(3),
  codigoPostal: z.string().length(5),
  calle: z.string().max(255).optional().nullable(),
  colonia: z.string().max(255).optional().nullable(),
  municipio: z.string().max(255).optional().nullable(),
  estado: z.string().max(255).optional().nullable(),
  pais: z.string().max(100).optional(),
  telefono: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  sitioWeb: z.string().url().max(255).optional().nullable(),
  serieFactura: z.string().max(10).optional(),
  folioFacturaActual: z.number().int().min(1).optional(),
  activo: z.boolean().default(true),
});
