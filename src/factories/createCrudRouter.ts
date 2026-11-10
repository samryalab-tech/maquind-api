import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma, type PrismaTx } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { buildPaginated, created, getOrderBy, getPagination, ok, paginated } from '../utils/http';
import { ApiError } from '../utils/ApiError';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditMiddleware } from '../middleware/audit';

export type WhereFactory = (req: Request) => any;
export type TransformCreate = (data: any, req: Request) => any;
export type TransformUpdate = (data: any, req: Request) => any;

export interface CreateCrudOptions {
  model: string; // Prisma model name in camelCase
  basePath: string; // /api/clientes
  modulo: string; // clientes
  searchable: string[]; // ['razonSocial', 'rfc']
  orderBy?: Record<string, 'asc' | 'desc'>;
  orderByAllowed?: string[];
  include?: any;
  select?: any;
  where?: WhereFactory;
  createSchema: z.ZodTypeAny;
  updateSchema: z.ZodTypeAny;
  transformCreate?: TransformCreate;
  transformUpdate?: TransformUpdate;
  // Soft delete: si true, en lugar de delete, hace update { activo: false } o campo indicado
  softDelete?: boolean;
  softDeleteField?: string; // default 'activo'
  canDelete?: (req: Request) => boolean; // validación extra
  onDelete?: (id: number, req: Request, tx?: PrismaTx) => Promise<void>;
  onCreate?: (id: number, data: any, req: Request, tx?: PrismaTx) => Promise<void>;
  onUpdate?: (id: number, data: any, req: Request, tx?: PrismaTx) => Promise<void>;
  // Filtros por empresa obligatorios
  empresaScoped?: boolean; // default true
  permissions?: { // override permisos por acción
    list?: string;
    get?: string;
    create?: string;
    update?: string;
    delete?: string;
  };
  readOnly?: boolean;
}

function getModelDelegate(model: string): any {
  const d = (prisma as any)[model];
  if (!d) throw new Error(`Modelo Prisma no encontrado: ${model}`);
  return d;
}

export function createCrudRouter(options: CreateCrudOptions): Router {
  const router = Router();
  const modulo = options.modulo;
  const empresaScoped = options.empresaScoped !== false;

  const perm = {
    list: options.permissions?.list ?? 'ver',
    get: options.permissions?.get ?? 'ver',
    create: options.permissions?.create ?? 'crear',
    update: options.permissions?.update ?? 'editar',
    delete: options.permissions?.delete ?? 'eliminar',
  };

  // Listado
  router.get(
    '/',
    authMiddleware,
    requirePermission(modulo, perm.list),
    auditMiddleware({ modulo, entidadTipo: options.model }),
    asyncHandler(async (req, res) => {
      const p = getPagination(req);
      const orderBy = getOrderBy(
        req,
        options.orderByAllowed ?? ['createdAt', 'updatedAt', ...options.searchable],
        options.orderBy ?? { createdAt: 'desc' },
      );

      let where: any = {};
      if (empresaScoped && req.empresaId) {
        where.empresaId = req.empresaId;
      }
      if (options.where) {
        where = { ...where, ...options.where(req) };
      }
      if (p.search) {
        where.OR = (options.searchable ?? []).map((field) => ({
          [field]: { contains: p.search, mode: 'insensitive' as any },
        }));
      }

      const [items, total] = await Promise.all([
        getModelDelegate(options.model).findMany({
          where,
          skip: p.skip,
          take: p.take,
          orderBy,
          include: options.include,
          select: options.select,
        }),
        getModelDelegate(options.model).count({ where }),
      ]);

      return paginated(res, buildPaginated(items, total, p));
    }),
  );

  // Obtener por id
  router.get(
    '/:id',
    authMiddleware,
    requirePermission(modulo, perm.get),
    validate(z.object({ id: z.coerce.number().int().positive() }), 'params'),
    auditMiddleware({
      modulo,
      entidadTipo: options.model,
      getEntidadId: (req) => Number(req.params.id),
    }),
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const where: any = { id };
      if (empresaScoped && req.empresaId) where.empresaId = req.empresaId;

      const item = await getModelDelegate(options.model).findFirst({
        where,
        include: options.include,
        select: options.select,
      });
      if (!item) throw ApiError.notFound();
      return ok(res, item);
    }),
  );

  if (!options.readOnly) {
    // Crear
    router.post(
      '/',
      authMiddleware,
      requirePermission(modulo, perm.create),
      validate(options.createSchema, 'body'),
      auditMiddleware({ modulo, entidadTipo: options.model }),
      asyncHandler(async (req, res) => {
        let data: any = { ...(req.body as any) };
        if (empresaScoped && req.empresaId && !('empresaId' in data)) {
          data.empresaId = req.empresaId;
        }
        if (options.transformCreate) data = await options.transformCreate(data, req);
        const item = await prisma.$transaction(async (tx) => {
          const prismaData = Object.fromEntries(
            Object.entries(data ?? {}).filter(([k]) => !k.startsWith('__')),
          );
          const createdItem = await (tx as any)[options.model].create({ data: prismaData });
          if (options.onCreate) await options.onCreate(createdItem.id, data, req, tx);
          return createdItem;
        });
        return created(res, item);
      }),
    );

    // Actualizar
    router.put(
      '/:id',
      authMiddleware,
      requirePermission(modulo, perm.update),
      validate(z.object({ id: z.coerce.number().int().positive() }), 'params'),
      validate(options.updateSchema, 'body'),
      auditMiddleware({
        modulo,
        entidadTipo: options.model,
        getEntidadId: (req) => Number(req.params.id),
      }),
      asyncHandler(async (req, res) => {
        const id = Number(req.params.id);
        // Verificar existencia y pertenencia
        const exists = await getModelDelegate(options.model).findFirst({
          where: { id, ...(empresaScoped && req.empresaId ? { empresaId: req.empresaId } : {}) },
        });
        if (!exists) throw ApiError.notFound();

        let data: any = { ...(req.body as any) };
        if (empresaScoped && 'empresaId' in data) delete data.empresaId; // no permitir mover de empresa
        if (options.transformUpdate) data = await options.transformUpdate(data, req);

        const updated = await prisma.$transaction(async (tx) => {
          const prismaData = Object.fromEntries(
            Object.entries(data ?? {}).filter(([k]) => !k.startsWith('__')),
          );
          const u = await (tx as any)[options.model].update({ where: { id }, data: prismaData });
          if (options.onUpdate) await options.onUpdate(id, data, req, tx);
          return u;
        });
        return ok(res, updated);
      }),
    );

    // Eliminar (hard o soft)
    router.delete(
      '/:id',
      authMiddleware,
      requirePermission(modulo, perm.delete),
      validate(z.object({ id: z.coerce.number().int().positive() }), 'params'),
      auditMiddleware({
        modulo,
        entidadTipo: options.model,
        getEntidadId: (req) => Number(req.params.id),
      }),
      asyncHandler(async (req, res) => {
        const id = Number(req.params.id);
        if (options.canDelete && !(await options.canDelete(req))) {
          throw ApiError.forbidden();
        }

        const where: any = { id };
        if (empresaScoped && req.empresaId) where.empresaId = req.empresaId;
        const exists = await getModelDelegate(options.model).findFirst({ where });
        if (!exists) throw ApiError.notFound();

        await prisma.$transaction(async (tx) => {
          if (options.softDelete) {
            const field = options.softDeleteField ?? 'activo';
            await (tx as any)[options.model].update({ where: { id }, data: { [field]: false } });
          } else {
            await (tx as any)[options.model].delete({ where: { id } });
          }
          if (options.onDelete) await options.onDelete(id, req, tx);
        });

        return ok(res, { id }, 'Registro eliminado');
      }),
    );
  }

  return router;
}
