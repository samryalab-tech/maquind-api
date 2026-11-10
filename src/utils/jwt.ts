import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: number;
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: number;
  jti: string;
  type: 'refresh';
}

export function signAccessToken(payload: { sub: number; email: string }): string {
  return jwt.sign({ ...payload, type: 'access' }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: { sub: number; jti: string }): string {
  return jwt.sign({ ...payload, type: 'refresh' }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as unknown as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as unknown as RefreshTokenPayload;
}

export function refreshTokenExpiry(): Date {
  // Interpreta el TTL (p.ej. "30d") para calcular la expiración en BD.
  const match = /^(\d+)([smhd])$/.exec(env.jwt.refreshTtl);
  const now = new Date();
  if (!match) {
    now.setDate(now.getDate() + 30);
    return now;
  }
  const value = Number.parseInt(match[1], 10);
  const unit = match[2];
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit] ?? 86400000;
  return new Date(now.getTime() + value * ms);
}
