import { Router } from 'express';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../lib/prisma';
import { ok } from '../../utils/http';
import { MODULOS, PERFILES_BASE } from './permissions.catalog';
import type { Request } from 'express';

const router = Router();

router.get(
  '/catalog',
  authMiddleware,
  requirePermission('perfiles', 'ver'),
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: MODULOS });
  }),
);

router.get(
  '/perfiles-base',
  authMiddleware,
  requirePermission('perfiles', 'ver'),
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: PERFILES_BASE });
  }),
);

export default router;
