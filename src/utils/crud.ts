import type { Request, Response } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/http';

export function getEmpresaScopedWhere(req: Request, extra?: any) {
  const w: any = extra ?? {};
  if (req.empresaId) w.empresaId = req.empresaId;
  return w;
}
