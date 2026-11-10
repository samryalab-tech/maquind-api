/**
 * Catálogo único de módulos y acciones del sistema.
 * Sirve para: sembrar la tabla `permiso`, validar y construir la matriz de
 * permisos en el frontend. Es la fuente de verdad del RBAC.
 */

export interface ModuloDef {
  modulo: string;
  nombre: string;
  grupo: string;
  icono: string;
  acciones: AccionDef[];
}

export interface AccionDef {
  accion: string;
  nombre: string;
}

// Acciones genéricas por defecto para cualquier CRUD
const CRUD: AccionDef[] = [
  { accion: 'ver', nombre: 'Ver' },
  { accion: 'crear', nombre: 'Crear' },
  { accion: 'editar', nombre: 'Editar' },
  { accion: 'eliminar', nombre: 'Eliminar' },
  { accion: 'exportar', nombre: 'Exportar' },
];

export const MODULOS: ModuloDef[] = [
  { modulo: 'dashboard', nombre: 'Dashboard', grupo: 'General', icono: 'fas fa-tachometer-alt', acciones: [{ accion: 'ver', nombre: 'Ver' }] },
  { modulo: 'clientes', nombre: 'Clientes', grupo: 'Catálogos', icono: 'fas fa-users', acciones: [...CRUD] },
  { modulo: 'productos', nombre: 'Catálogo de trabajos', grupo: 'Catálogos', icono: 'fas fa-tools', acciones: [...CRUD] },
  { modulo: 'cotizaciones', nombre: 'Cotizaciones', grupo: 'Operación', icono: 'fas fa-file-invoice-dollar', acciones: [
    ...CRUD,
    { accion: 'enviar', nombre: 'Enviar por correo' },
    { accion: 'aprobar', nombre: 'Aprobar / convertir a trabajo' },
    { accion: 'cancelar', nombre: 'Cancelar' },
  ] },
  { modulo: 'trabajos', nombre: 'Trabajos', grupo: 'Operación', icono: 'fas fa-hard-hat', acciones: [...CRUD, { accion: 'cancelar', nombre: 'Cancelar' }, { accion: 'exportar', nombre: 'Exportar' }] },
  { modulo: 'cobros', nombre: 'Cobros', grupo: 'Facturación', icono: 'fas fa-hand-holding-usd', acciones: [...CRUD, { accion: 'facturar', nombre: 'Facturar' }] },
  { modulo: 'facturas', nombre: 'Facturas', grupo: 'Facturación', icono: 'fas fa-file-invoice', acciones: [
    { accion: 'ver', nombre: 'Ver' }, { accion: 'crear', nombre: 'Crear' }, { accion: 'editar', nombre: 'Editar' },
    { accion: 'eliminar', nombre: 'Eliminar' }, { accion: 'exportar', nombre: 'Exportar' },
    { accion: 'enviar', nombre: 'Enviar por correo' }, { accion: 'cancelar', nombre: 'Cancelar CFDI' },
  ] },
  { modulo: 'pagos', nombre: 'Pagos y conciliación', grupo: 'Facturación', icono: 'fas fa-balance-scale', acciones: [
    ...CRUD, { accion: 'conciliar', nombre: 'Conciliar' },
  ] },
  { modulo: 'configuracion', nombre: 'Configuración', grupo: 'Administración', icono: 'fas fa-cog', acciones: [{ accion: 'ver', nombre: 'Ver' }, { accion: 'editar', nombre: 'Editar' }] },
  { modulo: 'correos', nombre: 'Plantillas y bitácora de correo', grupo: 'Administración', icono: 'fas fa-envelope', acciones: [...CRUD, { accion: 'enviar', nombre: 'Reenviar' }] },
  { modulo: 'usuarios', nombre: 'Usuarios', grupo: 'Seguridad', icono: 'fas fa-user-shield', acciones: [...CRUD] },
  { modulo: 'perfiles', nombre: 'Perfiles y permisos', grupo: 'Seguridad', icono: 'fas fa-user-tag', acciones: [...CRUD] },
  { modulo: 'empresas', nombre: 'Empresa', grupo: 'Seguridad', icono: 'fas fa-building', acciones: [{ accion: 'ver', nombre: 'Ver' }, { accion: 'editar', nombre: 'Editar' }] },
  { modulo: 'auditoria', nombre: 'Auditoría', grupo: 'Seguridad', icono: 'fas fa-clipboard-list', acciones: [{ accion: 'ver', nombre: 'Ver' }, { accion: 'exportar', nombre: 'Exportar' }] },
];

/** Lista plana de "modulo:accion" válidos. */
export const PERMISOS_VALIDOS: Set<string> = new Set(
  MODULOS.flatMap((m) => m.acciones.map((a) => `${m.modulo}:${a.accion}`)),
);

export function permisoValido(modulo: string, accion: string): boolean {
  return PERMISOS_VALIDOS.has(`${modulo}:${accion}`);
}

/** Perfiles base que se siembran por defecto. */
export const PERFILES_BASE = [
  {
    nombre: 'Administrador',
    descripcion: 'Acceso total al sistema',
    esAdmin: true,
    permisos: 'ALL',
  },
  {
    nombre: 'Ventas',
    descripcion: 'Clientes, cotizaciones y trabajos',
    esAdmin: false,
    permisos: [
      'dashboard:ver',
      'clientes:ver', 'clientes:crear', 'clientes:editar',
      'productos:ver',
      'cotizaciones:ver', 'cotizaciones:crear', 'cotizaciones:editar', 'cotizaciones:enviar', 'cotizaciones:aprobar', 'cotizaciones:cancelar', 'cotizaciones:exportar',
      'trabajos:ver', 'trabajos:crear', 'trabajos:editar', 'trabajos:exportar',
      'correos:ver',
    ] as string[],
  },
  {
    nombre: 'Facturación',
    descripcion: 'Cobros, facturas y conciliación de pagos',
    esAdmin: false,
    permisos: [
      'dashboard:ver',
      'clientes:ver', 'productos:ver',
      'cotizaciones:ver', 'trabajos:ver', 'trabajos:exportar',
      'cobros:ver', 'cobros:crear', 'cobros:editar', 'cobros:facturar',
      'facturas:ver', 'facturas:crear', 'facturas:editar', 'facturas:exportar', 'facturas:enviar', 'facturas:cancelar',
      'pagos:ver', 'pagos:crear', 'pagos:editar', 'pagos:conciliar',
      'correos:ver',
    ] as string[],
  },
  {
    nombre: 'Consulta',
    descripcion: 'Solo lectura de la información',
    esAdmin: false,
    permisos: MODULOS.filter((m) => m.modulo !== 'auditoria').map((m) => `${m.modulo}:ver`) as string[],
  },
];
