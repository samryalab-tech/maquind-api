import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { hashPassword, verifyPassword } from '../../utils/password';
import { refreshTokenExpiry, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { sha256 } from '../../utils/crypto';
import { ChangePasswordInput, LoginInput } from './auth.schema';
import { v4 as uuidv4 } from 'uuid';

export async function login(
  input: LoginInput,
  ctx: { ip?: string; userAgent?: string },
) {
  const user = await prisma.usuario.findUnique({ where: { email: input.email }, include: { empresas: true } });
  if (!user) throw ApiError.unauthorized('Credenciales inválidas');
  if (!user.activo) throw ApiError.unauthorized('Cuenta inactiva');
  if (user.bloqueadoHasta && user.bloqueadoHasta > new Date()) {
    throw ApiError.unauthorized('Cuenta bloqueada');
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    await prisma.usuario.update({
      where: { id: user.id },
      data: { intentosFallidos: { increment: 1 } },
    });
    throw ApiError.unauthorized('Credenciales inválidas');
  }

  await prisma.usuario.update({
    where: { id: user.id },
    data: { intentosFallidos: 0, bloqueadoHasta: null, ultimoAcceso: new Date() },
  });

  const jti = uuidv4();
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  await prisma.refreshToken.create({
    data: {
      usuarioId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: refreshTokenExpiry(),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });

  return { accessToken, refreshToken };
}

export async function refresh(refreshToken: string, ctx: { ip?: string; userAgent?: string }) {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = sha256(refreshToken);

  const stored = await prisma.refreshToken.findFirst({
    where: { usuarioId: payload.sub, tokenHash, revoked: false, expiresAt: { gt: new Date() } },
  });
  if (!stored) throw ApiError.unauthorized('Refresh token inválido');

  const user = await prisma.usuario.findUnique({ where: { id: payload.sub } });
  if (!user || !user.activo) throw ApiError.unauthorized();

  // Revoca el refresh usado (rotación)
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

  const jti = uuidv4();
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const newRefresh = signRefreshToken({ sub: user.id, jti });

  await prisma.refreshToken.create({
    data: {
      usuarioId: user.id,
      tokenHash: sha256(newRefresh),
      expiresAt: refreshTokenExpiry(),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });

  return { accessToken, refreshToken: newRefresh };
}

export async function logout(refreshToken: string) {
  const tokenHash = sha256(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revoked: false },
    data: { revoked: true },
  });
}

export async function changePassword(userId: number, input: ChangePasswordInput) {
  const user = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound();
  const ok = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Contraseña actual incorrecta');
  await prisma.usuario.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
}
