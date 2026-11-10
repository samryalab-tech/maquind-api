import crypto from 'node:crypto';
import { env } from '../config/env';

/**
 * Cifrado simétrico AES-256-GCM para credenciales sensibles
 * (contraseñas de PAC, passphrase de la llave CSD).
 */

function getKey(): Buffer {
  const key = env.encryptionKey;
  if (!key || key.length !== 64) {
    // En desarrollo, si no hay clave válida, derivamos una (NO usar en prod).
    return crypto.createHash('sha256').update(key || 'maquind-dev-key').digest();
  }
  return Buffer.from(key, 'hex');
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

export function decrypt(payload: string | null | undefined): string {
  if (!payload) return '';
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) return '';
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
