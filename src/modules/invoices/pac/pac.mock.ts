import { randomUUID } from 'node:crypto';
import type { CancelacionResultado, CfdiRequest, PacAdapter, PacCredentials, TimbreResultado } from './pac.types';
import { logger } from '../../../lib/logger';

/**
 * Adaptador MOCK: genera un UUID y un XML simulados (sin validez fiscal).
 * Permite probar todo el flujo (crear -> timbrar -> PDF -> correo) sin PAC real.
 */
export class MockPacAdapter implements PacAdapter {
  nombre = 'MOCK';

  async timbrar(cfdi: CfdiRequest, _creds: PacCredentials): Promise<TimbreResultado> {
    logger.warn('Timbrado SIMULADO con el adaptador MOCK (sin validez fiscal)');
    const uuid = randomUUID().toUpperCase();
    const fecha = new Date().toISOString();
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<!-- CFDI SIMULADO (MOCK) - SIN VALIDEZ FISCAL -->`,
      `<cfdi:Comprobante Version="4.0" Serie="${cfdi.serie}" Folio="${cfdi.folio}"`,
      `  Fecha="${fecha}" Moneda="${cfdi.moneda}" MetodoPago="${cfdi.metodoPago}" FormaPago="${cfdi.formaPago}"`,
      `  SubTotal="${cfdi.subtotal}" Total="${cfdi.total}"`,
      `  xmlns:cfdi="http://www.sat.gob.mx/cfd/4">`,
      `  <cfdi:Emisor Rfc="${cfdi.emisor.rfc}" Nombre="${cfdi.emisor.razonSocial}" RegimenFiscal="${cfdi.emisor.regimenFiscal}"/>`,
      `  <cfdi:Receptor Rfc="${cfdi.receptor.rfc}" Nombre="${cfdi.receptor.razonSocial}" UsoCFDI="${cfdi.receptor.usoCfdi}" RegimenFiscalReceptor="${cfdi.receptor.regimenFiscal}" DomicilioFiscalReceptor="${cfdi.receptor.codigoPostal}"/>`,
      `  <cfdi:Conceptos>`,
      ...cfdi.conceptos.map(
        (c) =>
          `    <cfdi:Concepto ClaveProdServ="${c.claveProdServ}" ClaveUnidad="${c.claveUnidad}" Cantidad="${c.cantidad}" Unidad="${c.unidad}" Descripcion="${c.descripcion}" ValorUnitario="${c.valorUnitario}" Importe="${c.importe}"/>`,
      ),
      `  </cfdi:Conceptos>`,
      `  <cfdi:Complemento>`,
      `    <tfd:TimbreFiscalDigital UUID="${uuid}" FechaTimbrado="${fecha}" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"/>`,
      `  </cfdi:Complemento>`,
      `</cfdi:Comprobante>`,
    ].join('\n');

    return {
      uuid,
      fechaTimbrado: fecha,
      noCertificadoSat: '00000000000000000000',
      selloSat: 'SIMULADO',
      selloCfd: 'SIMULADO',
      cadenaOriginal: '||SIMULADO||',
      xml,
      respuesta: { mock: true, mensaje: 'Timbrado simulado' },
    };
  }

  async cancelar(uuid: string, motivo: string, _sustituto: string | null, _creds: PacCredentials): Promise<CancelacionResultado> {
    return { uuid, estatus: 'cancelado', acuse: 'SIMULADO', respuesta: { mock: true, motivo } };
  }
}
