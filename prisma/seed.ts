import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { MODULOS, PERFILES_BASE } from '../src/modules/permissions/permissions.catalog';
import { encrypt } from '../src/utils/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando base de datos...');

  // ---- Catálogo de permisos ----
  for (const m of MODULOS) {
    for (const a of m.acciones) {
      await prisma.permiso.upsert({
        where: { modulo_accion: { modulo: m.modulo, accion: a.accion } },
        update: { descripcion: `${m.nombre} - ${a.nombre}` },
        create: { modulo: m.modulo, accion: a.accion, descripcion: `${m.nombre} - ${a.nombre}` },
      });
    }
  }
  console.log(`✓ ${MODULOS.length} módulos y sus permisos registrados`);

  // ---- Perfiles base ----
  for (const p of PERFILES_BASE) {
    const perfil = await prisma.perfil.upsert({
      where: { nombre: p.nombre },
      update: { descripcion: p.descripcion, esAdmin: p.esAdmin },
      create: { nombre: p.nombre, descripcion: p.descripcion, esAdmin: p.esAdmin },
    });
    if (p.permisos !== 'ALL') {
      await prisma.perfilPermiso.deleteMany({ where: { perfilId: perfil.id } });
      const data = (p.permisos as string[]).map((perm) => {
        const [modulo, accion] = perm.split(':');
        return { perfilId: perfil.id, modulo, accion, permitido: true };
      });
      if (data.length) await prisma.perfilPermiso.createMany({ data });
    }
  }
  console.log('✓ Perfiles base creados');

  // ---- Empresa ----
  const empresa = await prisma.empresa.upsert({
    where: { rfc: 'XAXX010101000' },
    update: {},
    create: {
      rfc: 'XAXX010101000',
      razonSocial: 'MAQUIND TALLER DE MÁQUINAS Y HERRAMIENTAS SA DE CV',
      nombreComercial: 'Maquind',
      regimenFiscal: '601',
      codigoPostal: '64000',
      calle: 'Av. Industrial 100',
      colonia: 'Centro',
      municipio: 'Monterrey',
      estado: 'Nuevo León',
      telefono: '8112345678',
      email: 'contacto@maquind.com',
      serieFactura: 'A',
      folioFacturaActual: 1,
      pacProveedor: 'MOCK',
    },
  });
  console.log(`✓ Empresa lista (id=${empresa.id})`);

  // ---- Usuario administrador ----
  const perfilAdmin = await prisma.perfil.findUnique({ where: { nombre: 'Administrador' } });
  const passwordHash = await bcrypt.hash('Admin1234', 12);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@maquind.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      apellido: 'Maquind',
      email: 'admin@maquind.com',
      passwordHash,
      esSuperadmin: true,
      perfilId: perfilAdmin?.id ?? null,
      activo: true,
    },
  });
  await prisma.usuarioEmpresa.upsert({
    where: { usuarioId_empresaId: { usuarioId: admin.id, empresaId: empresa.id } },
    update: { esDefault: true },
    create: { usuarioId: admin.id, empresaId: empresa.id, esDefault: true },
  });
  console.log('✓ Usuario administrador: admin@maquind.com / Admin1234');

  // ---- Configuración por defecto ----
  const configs = [
    { grupo: 'general', clave: 'nombreSistema', valor: 'Maquind ERP', tipo: 'string', descripcion: 'Nombre del sistema' },
    { grupo: 'general', clave: 'monedaDefault', valor: 'MXN', tipo: 'string', descripcion: 'Moneda por defecto' },
    { grupo: 'general', clave: 'ivaDefault', valor: '16', tipo: 'number', descripcion: 'Tasa de IVA por defecto' },
    { grupo: 'general', clave: 'validezCotizacionDias', valor: '15', tipo: 'number', descripcion: 'Días de validez de cotizaciones' },
    { grupo: 'smtp', clave: 'host', valor: 'smtp.hostinger.com', tipo: 'string', descripcion: 'Servidor SMTP' },
    { grupo: 'smtp', clave: 'port', valor: '465', tipo: 'number', descripcion: 'Puerto SMTP' },
    { grupo: 'smtp', clave: 'secure', valor: 'true', tipo: 'bool', descripcion: 'SSL/TLS' },
    { grupo: 'smtp', clave: 'user', valor: '', tipo: 'string', descripcion: 'Usuario SMTP' },
    { grupo: 'smtp', clave: 'password', valor: '', tipo: 'password', descripcion: 'Contraseña SMTP' },
    { grupo: 'smtp', clave: 'fromName', valor: 'Maquind', tipo: 'string', descripcion: 'Nombre del remitente' },
    { grupo: 'smtp', clave: 'fromEmail', valor: 'no-reply@maquind.com', tipo: 'string', descripcion: 'Correo del remitente' },
    { grupo: 'ventas', clave: 'mensajeCotizacionBase', valor: 'Hola, es un gusto saludarte.\n\nAdjuntamos la cotización solicitada en formato PDF con el detalle completo de los trabajos.\n\nQuedamos atentos a cualquier duda o aclaración.', tipo: 'string', descripcion: 'Mensaje base para cotizaciones' },
    { grupo: 'ventas', clave: 'mensajeFacturaBase', valor: 'Hola, adjuntamos tu factura en formato PDF.\n\nGracias por tu preferencia. Quedamos atentos a cualquier aclaración.', tipo: 'string', descripcion: 'Mensaje base para facturas' },
  ];
  for (const c of configs) {
    await prisma.configuracion.upsert({
      where: { empresaId_clave: { empresaId: empresa.id, clave: c.clave } },
      update: {},
      create: { empresaId: empresa.id, ...c },
    });
  }
  console.log('✓ Configuración por defecto');

  // ---- Plantillas de correo ----
  const wrap = (titulo: string, cuerpo: string) => `
<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6fb;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e9ecef">
    <div style="background:linear-gradient(135deg,#5e72e4,#825ee4);padding:22px 26px">
      <h2 style="margin:0;color:#fff;font-size:20px">${titulo}</h2>
    </div>
    <div style="padding:24px 26px;color:#32325d;font-size:15px;line-height:1.6">
      ${cuerpo}
    </div>
    <div style="padding:16px 26px;background:#f7f8fc;color:#8898aa;font-size:12px;text-align:center">
      {{empresa}} · Correo generado automáticamente
    </div>
  </div>
</div>`;

  const plantillas = [
    {
      clave: 'cotizacion',
      nombre: 'Envío de cotización',
      asunto: 'Cotización {{folio}} - {{empresa}}',
      cuerpo: wrap(
        'Cotización {{folio}}',
        `<p>Hola <strong>{{cliente}}</strong>,</p>
         <p>{{#if mensaje}}{{mensaje}}{{else}}Es un gusto saludarte. Adjuntamos la cotización <strong>{{folio}}</strong> correspondiente a tu solicitud.{{/if}}</p>
         <p>Total: <strong>{{total}}</strong></p>
         <p>Encontrarás el detalle completo en el PDF adjunto. Quedamos atentos a cualquier duda.</p>`,
      ),
    },
    {
      clave: 'factura',
      nombre: 'Envío de factura',
      asunto: 'Factura {{folio}} - {{empresa}}',
      cuerpo: wrap(
        'Factura {{folio}}',
        `<p>Hola <strong>{{cliente}}</strong>,</p>
         <p>Adjuntamos tu factura <strong>{{folio}}</strong> con un total de <strong>{{total}}</strong>.</p>
         {{#if uuid}}<p>Folio fiscal (UUID): <code>{{uuid}}</code></p>{{/if}}
         <p>Gracias por tu preferencia.</p>`,
      ),
    },
    {
      clave: 'recordatorio',
      nombre: 'Recordatorio de pago',
      asunto: 'Recordatorio de pago - {{empresa}}',
      cuerpo: wrap(
        'Recordatorio de pago',
        `<p>Hola <strong>{{cliente}}</strong>,</p><p>Te recordamos amablemente el saldo pendiente por <strong>{{total}}</strong>.</p><p>Quedamos atentos para cualquier aclaración.</p>`,
      ),
    },
  ];
  for (const p of plantillas) {
    await prisma.plantillaCorreo.upsert({
      where: { empresaId_clave: { empresaId: empresa.id, clave: p.clave } },
      update: { nombre: p.nombre, asunto: p.asunto, cuerpo: p.cuerpo },
      create: { empresaId: empresa.id, ...p },
    });
  }
  console.log('✓ Plantillas de correo');

  // ---- Datos de ejemplo ----
  await prisma.cliente.upsert({
    where: { id: 1 },
    update: {},
    create: {
      empresaId: empresa.id,
      codigo: 'CLI-001',
      razonSocial: 'ACEROS DEL NORTE SA DE CV',
      nombreComercial: 'Aceros del Norte',
      rfc: 'ACN950101ABC',
      regimenFiscal: '601',
      codigoPostalFiscal: '64000',
      usoCfdi: 'G03',
      email: 'compras@acerosdelnorte.com',
      telefono: '8187654321',
      contacto: 'Ing. Laura Méndez',
      colonia: 'Centro',
      municipio: 'Monterrey',
      estado: 'Nuevo León',
      diasCredito: 30,
    },
  });
  const productosDemo = [
    { codigo: 'TRB-001', nombre: 'Torneado de pieza', unidad: 'Hora', precio: 450, claveProdServ: '73161500', claveUnidad: 'HUR', categoria: 'Torneado' },
    { codigo: 'TRB-002', nombre: 'Fresado de pieza', unidad: 'Hora', precio: 520, claveProdServ: '73161500', claveUnidad: 'HUR', categoria: 'Fresado' },
    { codigo: 'TRB-003', nombre: 'Rectificado de superficie', unidad: 'Hora', precio: 600, claveProdServ: '73161500', claveUnidad: 'HUR', categoria: 'Rectificado' },
    { codigo: 'TRB-004', nombre: 'Fabricación de engranaje a medida', unidad: 'Pieza', precio: 1800, claveProdServ: '31191500', claveUnidad: 'H87', categoria: 'Fabricación' },
    { codigo: 'TRB-005', nombre: 'Reparación de eje industrial', unidad: 'Servicio', precio: 2500, claveProdServ: '73161500', claveUnidad: 'E48', categoria: 'Reparación' },
  ];
  for (const prod of productosDemo) {
    await prisma.producto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo: prod.codigo } },
      update: {},
      create: { empresaId: empresa.id, ...prod, ivaTasa: 16, esServicio: true, activo: true },
    });
  }
  console.log('✓ Cliente y productos de ejemplo');

  console.log('\n✅ Seed completado.');
  console.log('   Usuario: admin@maquind.com');
  console.log('   Contraseña: Admin1234\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
