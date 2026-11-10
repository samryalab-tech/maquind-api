import type { PacAdapter } from './pac.types';
import { MockPacAdapter } from './pac.mock';

/**
 * Fábrica de adaptadores PAC. Cuando contrates un PAC real, agrega su clase
 * (p. ej. FacturamaAdapter) y regístrala aquí. No hay que tocar el resto.
 */
const adapters: Record<string, () => PacAdapter> = {
  MOCK: () => new MockPacAdapter(),
  // FACTURAMA: () => new FacturamaAdapter(),
  // FISCALAPI: () => new FiscalApiAdapter(),
};

export function getPacAdapter(proveedor?: string | null): PacAdapter {
  const key = (proveedor || 'MOCK').toUpperCase();
  const factory = adapters[key] ?? adapters.MOCK;
  return factory();
}
