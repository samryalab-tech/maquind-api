export interface AuthUser {
  id: number;
  email: string;
  nombre: string;
  esSuperadmin: boolean;
  perfilId: number | null;
  perfilNombre: string | null;
  perfilEsAdmin: boolean;
  empresaIds: number[];
  /** Permisos efectivos ya resueltos: { "modulo:accion": boolean } */
  permisos: Record<string, boolean>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      empresaId?: number;
      /** Contexto de auditoría */
      audit?: { modulo: string; entidadTipo?: string; entidadId?: number };
    }
  }
}

export {};
