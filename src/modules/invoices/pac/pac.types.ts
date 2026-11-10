/**
 * Abstracción de PAC (Proveedor Autorizado de Certificación) para CFDI 4.0.
 *
 * Dejamos la interfaz lista para conectar el PAC que elijas al final
 * (Facturama, FiscalAPI, Facturapi, Finkok, SW...). Mientras tanto se usa
 * el adaptador MOCK, que simula el timbrado sin consumir timbres reales.
 */

export interface CfdiEmisor {
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  codigoPostal: string;
}

export interface CfdiReceptor {
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  codigoPostal: string;
  usoCfdi: string;
}

export interface CfdiConcepto {
  claveProdServ: string;
  claveUnidad: string;
  cantidad: number;
  unidad: string;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  ivaTasa: number;
  importeIva: number;
}

export interface CfdiRequest {
  serie: string;
  folio: number;
  fecha: string;
  moneda: string;
  metodoPago: string;
  formaPago: string;
  emisor: CfdiEmisor;
  receptor: CfdiReceptor;
  conceptos: CfdiConcepto[];
  subtotal: number;
  descuento: number;
  iva: number;
  ieps: number;
  total: number;
}

export interface PacCredentials {
  usuario?: string;
  password?: string;
  certificadoPath?: string;
  llavePath?: string;
  llavePassword?: string;
}

export interface TimbreResultado {
  uuid: string;
  fechaTimbrado: string;
  noCertificadoSat?: string;
  selloSat?: string;
  selloCfd?: string;
  cadenaOriginal?: string;
  /** XML timbrado (texto). */
  xml: string;
  respuesta: Record<string, unknown>;
}

export interface CancelacionResultado {
  uuid: string;
  estatus: string;
  acuse?: string;
  respuesta: Record<string, unknown>;
}

export interface PacAdapter {
  nombre: string;
  timbrar(cfdi: CfdiRequest, creds: PacCredentials): Promise<TimbreResultado>;
  cancelar(uuid: string, motivo: string, sustituto: string | null, creds: PacCredentials): Promise<CancelacionResultado>;
}
