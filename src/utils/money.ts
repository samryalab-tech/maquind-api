import { Decimal } from '@prisma/client/runtime/library';

export type NumericInput = number | string | Decimal | null | undefined;

export function toNum(value: NumericInput, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  if (value instanceof Decimal) return value.toNumber();
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Redondeo a 2 decimales estilo "half up" (para importes monetarios). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface LineaCalculo {
  cantidad: NumericInput;
  precioUnitario: NumericInput;
  descuentoPct?: NumericInput;
  ivaTasa?: NumericInput;
  iepsTasa?: NumericInput;
}

export interface LineaResultado {
  importe: number; // base antes de impuestos (cantidad * precio - descuento)
  importeIva: number;
  importeIeps: number;
  total: number;
}

/** Calcula una línea completa (base, IVA, IEPS, total) con redondeo correcto. */
export function calcularLinea(linea: LineaCalculo): LineaResultado {
  const cantidad = toNum(linea.cantidad, 0);
  const precio = toNum(linea.precioUnitario, 0);
  const descPct = toNum(linea.descuentoPct, 0);
  const ivaTasa = toNum(linea.ivaTasa, 0);
  const iepsTasa = toNum(linea.iepsTasa, 0);

  const bruto = cantidad * precio;
  const importe = round2(bruto - (bruto * descPct) / 100);
  const importeIva = round2((importe * ivaTasa) / 100);
  const importeIeps = round2((importe * iepsTasa) / 100);
  const total = round2(importe + importeIva + importeIeps);
  return { importe, importeIva, importeIeps, total };
}

export interface TotalesCalculo {
  subtotal: number;
  descuento: number;
  iva: number;
  ieps: number;
  total: number;
}

/** Totales de un documento a partir de sus líneas. */
export function calcularTotales(lineas: LineaCalculo[]): TotalesCalculo {
  let subtotal = 0;
  let descuento = 0;
  let iva = 0;
  let ieps = 0;
  let total = 0;

  for (const l of lineas) {
    const r = calcularLinea(l);
    const cantidad = toNum(l.cantidad, 0);
    const precio = toNum(l.precioUnitario, 0);
    const descPct = toNum(l.descuentoPct, 0);
    const bruto = cantidad * precio;
    subtotal = round2(subtotal + bruto);
    descuento = round2(descuento + (bruto * descPct) / 100);
    iva = round2(iva + r.importeIva);
    ieps = round2(ieps + r.importeIeps);
    total = round2(total + r.total);
  }

  return { subtotal, descuento, iva, ieps, total };
}

/** Formatea un importe para PDFs y correos. */
export function formatMoney(value: NumericInput, moneda = 'MXN'): string {
  const n = toNum(value, 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(n);
}
