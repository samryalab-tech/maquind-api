import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

function bool(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return ['1', 'true', 'yes', 'si', 'sí'].includes(v.toLowerCase());
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: (process.env.NODE_ENV ?? 'development') === 'production',
  port: int('PORT', 4000),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  databaseUrl: required('DATABASE_URL'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },

  cookie: {
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure: bool('COOKIE_SECURE', false),
  },

  encryptionKey: process.env.ENCRYPTION_KEY ?? '',

  storageDir: process.env.STORAGE_DIR ?? './storage',

  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,

  smtp: {
    host: process.env.SMTP_HOST ?? 'smtp.hostinger.com',
    port: int('SMTP_PORT', 465),
    secure: bool('SMTP_SECURE', true),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    fromName: process.env.SMTP_FROM_NAME ?? 'Maquind',
    fromEmail: process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER ?? '',
  },
};
