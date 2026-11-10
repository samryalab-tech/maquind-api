import { createCrudRouter } from '../../factories/createCrudRouter';
import { clienteSchema, clienteUpdateSchema } from './common.catalog.schema';

const router = createCrudRouter({
  model: 'cliente',
  basePath: '/api/clientes',
  modulo: 'clientes',
  searchable: ['razonSocial', 'rfc', 'nombreComercial', 'email'],
  orderBy: { razonSocial: 'asc' },
  orderByAllowed: ['razonSocial', 'rfc', 'activo', 'createdAt'],
  createSchema: clienteSchema,
  updateSchema: clienteUpdateSchema,
  softDelete: true,
  softDeleteField: 'activo',
});

export default router;
