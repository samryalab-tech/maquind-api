import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

/**
 * Cliente Prisma único (singleton).
 * Prisma usa consultas parametrizadas, lo que neutraliza la inyección SQL.
 */
export const prisma = new PrismaClient({
  log: env.isProd ? ['error'] : ['warn', 'error'],
});

export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
