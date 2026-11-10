import { prisma, type PrismaTx } from '../lib/prisma';

export interface FolioDef {
  tipo: string; // COT, TRB, COB
  prefix: string;
  pad?: number;
}

export const FOLIOS = {
  cotizacion: { tipo: 'COT', prefix: 'COT', pad: 4 } as FolioDef,
  trabajo: { tipo: 'TRB', prefix: 'TRB', pad: 4 } as FolioDef,
  cobro: { tipo: 'COB', prefix: 'COB', pad: 4 } as FolioDef,
};

/**
 * Genera el siguiente folio de forma atómica usando un contador por empresa.
 * Debe llamarse dentro de una transacción cuando el folio acompaña una inserción.
 */
export async function nextFolio(
  def: FolioDef,
  empresaId: number,
  db: PrismaTx | typeof prisma = prisma,
): Promise<string> {
  // Reintenta en caso de carrera al crear el contador por primera vez.
  for (let intento = 0; intento < 5; intento++) {
    try {
      const counter = await db.folioCounter.upsert({
        where: { empresaId_tipo: { empresaId, tipo: def.tipo } },
        update: { ultimo: { increment: 1 } },
        create: { empresaId, tipo: def.tipo, ultimo: 1 },
      });
      const n = counter.ultimo;
      return `${def.prefix}-${String(n).padStart(def.pad ?? 4, '0')}`;
    } catch {
      // colisión al crear; reintenta
    }
  }
  throw new Error('No se pudo generar el folio');
}
