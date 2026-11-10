import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Reglas mínimas de contraseña para el sistema. */
export function passwordEsFuerte(password: string): boolean {
  if (password.length < 8) return false;
  const tieneLetra = /[a-zA-Z]/.test(password);
  const tieneNumero = /\d/.test(password);
  return tieneLetra && tieneNumero;
}
