import type { Request, Response } from 'express';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function ok<T>(res: Response, data: T, message?: string, status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function created<T>(res: Response, data: T, message = 'Registro creado') {
  return ok(res, data, message, 201);
}

export function paginated<T>(res: Response, result: Paginated<T>) {
  return res.json({ success: true, data: result });
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  search: string;
}

export function getPagination(req: Request, defaultPageSize = 10): PaginationParams {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const rawSize = Number.parseInt(String(req.query.pageSize ?? defaultPageSize), 10) || defaultPageSize;
  const pageSize = Math.min(200, Math.max(1, rawSize));
  const search = String(req.query.search ?? '').trim();
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize, search };
}

export function buildPaginated<T>(items: T[], total: number, p: PaginationParams): Paginated<T> {
  return {
    items,
    total,
    page: p.page,
    pageSize: p.pageSize,
    totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
  };
}

/** Ordenamiento seguro: solo permite columnas en la allowlist. */
export function getOrderBy<T extends string>(
  req: Request,
  allowed: readonly T[],
  fallback: Record<string, 'asc' | 'desc'>,
): Record<string, 'asc' | 'desc'> {
  const sortBy = String(req.query.sortBy ?? '');
  const sortDir = String(req.query.sortDir ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  if (allowed.includes(sortBy as T)) {
    return { [sortBy]: sortDir };
  }
  return fallback;
}
