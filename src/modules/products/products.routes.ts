import { createCrudRouter } from '../../factories/createCrudRouter';
import { productoSchema, productoUpdateSchema } from '../clients/common.catalog.schema';

const router = createCrudRouter({
  model: 'producto',
  basePath: '/api/productos',
  modulo: 'productos',
  searchable: ['codigo', 'nombre', 'descripcion', 'categoria'],
  orderBy: { nombre: 'asc' },
  orderByAllowed: ['codigo', 'nombre', 'precio', 'activo', 'createdAt'],
  createSchema: productoSchema,
  updateSchema: productoUpdateSchema,
  softDelete: true,
  softDeleteField: 'activo',
});

export default router;
