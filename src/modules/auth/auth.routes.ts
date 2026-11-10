import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimit';
import * as authService from './auth.service';
import { changePasswordSchema, loginSchema } from './auth.schema';

const router = Router();

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema, 'body'),
  asyncHandler(async (req, res) => {
    const tokens = await authService.login(req.body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
    });
    res.json({ success: true, data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const rt = req.cookies?.refreshToken;
    if (!rt) throw new Error('Sin refresh token');
    const tokens = await authService.refresh(rt, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
    });
    res.json({ success: true });
  }),
);

router.post(
  '/logout',
  authMiddleware,
  requireAuth,
  asyncHandler(async (req, res) => {
    const rt = req.cookies?.refreshToken;
    if (rt) await authService.logout(rt);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true });
  }),
);

router.get(
  '/me',
  authMiddleware,
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: req.user });
  }),
);

router.put(
  '/password',
  authMiddleware,
  requireAuth,
  validate(changePasswordSchema, 'body'),
  asyncHandler(async (req, res) => {
    await authService.changePassword(req.user!.id, req.body);
    res.json({ success: true });
  }),
);

export default router;
