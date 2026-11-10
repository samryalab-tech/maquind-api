-- CreateTable
CREATE TABLE `empresa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rfc` VARCHAR(13) NOT NULL,
    `razonSocial` VARCHAR(255) NOT NULL,
    `nombreComercial` VARCHAR(255) NULL,
    `regimenFiscal` VARCHAR(3) NOT NULL,
    `codigoPostal` VARCHAR(5) NOT NULL,
    `calle` VARCHAR(255) NULL,
    `colonia` VARCHAR(255) NULL,
    `municipio` VARCHAR(255) NULL,
    `estado` VARCHAR(255) NULL,
    `pais` VARCHAR(100) NOT NULL DEFAULT 'México',
    `telefono` VARCHAR(30) NULL,
    `email` VARCHAR(255) NULL,
    `sitioWeb` VARCHAR(255) NULL,
    `logoUrl` VARCHAR(500) NULL,
    `certificadoPath` VARCHAR(500) NULL,
    `llavePath` VARCHAR(500) NULL,
    `llavePasswordCifrada` VARCHAR(500) NULL,
    `pacProveedor` VARCHAR(50) NULL,
    `pacUsuario` VARCHAR(255) NULL,
    `pacPasswordCifrada` VARCHAR(500) NULL,
    `serieFactura` VARCHAR(10) NOT NULL DEFAULT 'A',
    `folioFacturaActual` INTEGER NOT NULL DEFAULT 1,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `empresa_rfc_key`(`rfc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `perfil` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `esAdmin` BOOLEAN NOT NULL DEFAULT false,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `perfil_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permiso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `modulo` VARCHAR(50) NOT NULL,
    `accion` VARCHAR(50) NOT NULL,
    `descripcion` VARCHAR(255) NULL,

    UNIQUE INDEX `permiso_modulo_accion_key`(`modulo`, `accion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `perfil_permiso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `perfilId` INTEGER NOT NULL,
    `modulo` VARCHAR(50) NOT NULL,
    `accion` VARCHAR(50) NOT NULL,
    `permitido` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `perfil_permiso_perfilId_modulo_accion_key`(`perfilId`, `modulo`, `accion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario_permiso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `modulo` VARCHAR(50) NOT NULL,
    `accion` VARCHAR(50) NOT NULL,
    `permitido` BOOLEAN NOT NULL,

    UNIQUE INDEX `usuario_permiso_usuarioId_modulo_accion_key`(`usuarioId`, `modulo`, `accion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `apellido` VARCHAR(150) NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `telefono` VARCHAR(30) NULL,
    `avatarUrl` VARCHAR(500) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `esSuperadmin` BOOLEAN NOT NULL DEFAULT false,
    `perfilId` INTEGER NULL,
    `ultimoAcceso` DATETIME(3) NULL,
    `intentosFallidos` INTEGER NOT NULL DEFAULT 0,
    `bloqueadoHasta` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario_empresa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `empresaId` INTEGER NOT NULL,
    `esDefault` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `usuario_empresa_usuarioId_empresaId_key`(`usuarioId`, `empresaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_token` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revoked` BOOLEAN NOT NULL DEFAULT false,
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `refresh_token_tokenHash_idx`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cliente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `codigo` VARCHAR(30) NULL,
    `razonSocial` VARCHAR(255) NOT NULL,
    `nombreComercial` VARCHAR(255) NULL,
    `rfc` VARCHAR(13) NOT NULL,
    `regimenFiscal` VARCHAR(3) NOT NULL,
    `codigoPostalFiscal` VARCHAR(5) NOT NULL,
    `usoCfdi` VARCHAR(4) NOT NULL DEFAULT 'G03',
    `formaPago` VARCHAR(3) NULL,
    `metodoPago` VARCHAR(3) NULL,
    `email` VARCHAR(255) NULL,
    `telefono` VARCHAR(30) NULL,
    `contacto` VARCHAR(200) NULL,
    `calle` VARCHAR(255) NULL,
    `colonia` VARCHAR(255) NULL,
    `municipio` VARCHAR(255) NULL,
    `estado` VARCHAR(255) NULL,
    `pais` VARCHAR(100) NOT NULL DEFAULT 'México',
    `diasCredito` INTEGER NOT NULL DEFAULT 0,
    `notas` TEXT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cliente_empresaId_razonSocial_idx`(`empresaId`, `razonSocial`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `producto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `codigo` VARCHAR(30) NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `descripcion` TEXT NULL,
    `categoria` VARCHAR(100) NULL,
    `unidad` VARCHAR(50) NOT NULL DEFAULT 'Servicio',
    `precio` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `moneda` VARCHAR(3) NOT NULL DEFAULT 'MXN',
    `ivaTasa` DECIMAL(5, 2) NOT NULL DEFAULT 16,
    `iepsTasa` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `claveProdServ` VARCHAR(20) NULL,
    `claveUnidad` VARCHAR(20) NULL,
    `objetoImpuesto` VARCHAR(2) NULL DEFAULT '02',
    `esServicio` BOOLEAN NOT NULL DEFAULT true,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `producto_empresaId_nombre_idx`(`empresaId`, `nombre`),
    UNIQUE INDEX `producto_empresaId_codigo_key`(`empresaId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cotizacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `usuarioId` INTEGER NULL,
    `folio` VARCHAR(30) NOT NULL,
    `estado` ENUM('BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'CONVERTIDA', 'CANCELADA') NOT NULL DEFAULT 'BORRADOR',
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validezDias` INTEGER NOT NULL DEFAULT 15,
    `fechaVencimiento` DATETIME(3) NULL,
    `moneda` VARCHAR(3) NOT NULL DEFAULT 'MXN',
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `descuento` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `iva` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `ieps` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `condiciones` TEXT NULL,
    `observaciones` TEXT NULL,
    `notasInternas` TEXT NULL,
    `emailEnviadoAt` DATETIME(3) NULL,
    `emailDestinatario` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cotizacion_empresaId_estado_idx`(`empresaId`, `estado`),
    UNIQUE INDEX `cotizacion_empresaId_folio_key`(`empresaId`, `folio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cotizacion_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cotizacionId` INTEGER NOT NULL,
    `productoId` INTEGER NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `descripcion` VARCHAR(500) NOT NULL,
    `unidad` VARCHAR(50) NOT NULL DEFAULT 'Servicio',
    `cantidad` DECIMAL(14, 4) NOT NULL DEFAULT 1,
    `precioUnitario` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `descuentoPct` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `ivaTasa` DECIMAL(5, 2) NOT NULL DEFAULT 16,
    `iepsTasa` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `importe` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `importeIva` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `importeIeps` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,

    INDEX `cotizacion_item_cotizacionId_idx`(`cotizacionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trabajo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `cotizacionId` INTEGER NULL,
    `usuarioId` INTEGER NULL,
    `folio` VARCHAR(30) NOT NULL,
    `estado` ENUM('PENDIENTE', 'EN_PROCESO', 'TERMINADO', 'ENTREGADO', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `descripcion` TEXT NULL,
    `moneda` VARCHAR(3) NOT NULL DEFAULT 'MXN',
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `descuento` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `iva` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `ieps` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `facturable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `trabajo_empresaId_estado_idx`(`empresaId`, `estado`),
    UNIQUE INDEX `trabajo_empresaId_folio_key`(`empresaId`, `folio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trabajo_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `trabajoId` INTEGER NOT NULL,
    `productoId` INTEGER NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `descripcion` VARCHAR(500) NOT NULL,
    `unidad` VARCHAR(50) NOT NULL DEFAULT 'Servicio',
    `cantidad` DECIMAL(14, 4) NOT NULL DEFAULT 1,
    `precioUnitario` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `descuentoPct` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `ivaTasa` DECIMAL(5, 2) NOT NULL DEFAULT 16,
    `iepsTasa` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `importe` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `importeIva` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `importeIeps` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,

    INDEX `trabajo_item_trabajoId_idx`(`trabajoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cobro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `usuarioId` INTEGER NULL,
    `folio` VARCHAR(30) NOT NULL,
    `tipo` ENUM('FISCAL', 'NO_FISCAL') NOT NULL DEFAULT 'FISCAL',
    `estado` ENUM('PENDIENTE', 'PARCIAL', 'PAGADO', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `periodoDesde` DATETIME(3) NULL,
    `periodoHasta` DATETIME(3) NULL,
    `moneda` VARCHAR(3) NOT NULL DEFAULT 'MXN',
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `iva` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `ieps` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `saldo` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `formaPago` VARCHAR(3) NOT NULL DEFAULT '99',
    `metodoPago` VARCHAR(3) NOT NULL DEFAULT 'PUE',
    `usoCfdi` VARCHAR(4) NOT NULL DEFAULT 'G03',
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cobro_empresaId_tipo_estado_idx`(`empresaId`, `tipo`, `estado`),
    UNIQUE INDEX `cobro_empresaId_folio_key`(`empresaId`, `folio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cobro_trabajo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cobroId` INTEGER NOT NULL,
    `trabajoId` INTEGER NOT NULL,
    `importe` DECIMAL(14, 2) NOT NULL DEFAULT 0,

    UNIQUE INDEX `cobro_trabajo_cobroId_trabajoId_key`(`cobroId`, `trabajoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `factura` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `cobroId` INTEGER NULL,
    `clienteId` INTEGER NOT NULL,
    `usuarioId` INTEGER NULL,
    `serie` VARCHAR(10) NOT NULL,
    `folio` INTEGER NOT NULL,
    `uuid` VARCHAR(50) NULL,
    `estado` ENUM('BORRADOR', 'TIMBRADA', 'CANCELADA', 'ERROR') NOT NULL DEFAULT 'BORRADOR',
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `moneda` VARCHAR(3) NOT NULL DEFAULT 'MXN',
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `descuento` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `iva` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `ieps` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `metodoPago` VARCHAR(3) NOT NULL DEFAULT 'PUE',
    `formaPago` VARCHAR(3) NOT NULL DEFAULT '99',
    `usoCfdi` VARCHAR(4) NOT NULL DEFAULT 'G03',
    `regimenFiscalReceptor` VARCHAR(3) NOT NULL,
    `codigoPostalReceptor` VARCHAR(5) NOT NULL,
    `xmlPath` VARCHAR(500) NULL,
    `pdfPath` VARCHAR(500) NULL,
    `pacProveedor` VARCHAR(50) NULL,
    `pacRespuesta` JSON NULL,
    `timbreFecha` DATETIME(3) NULL,
    `cancelacionMotivo` VARCHAR(3) NULL,
    `cancelacionSustituto` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `factura_uuid_key`(`uuid`),
    UNIQUE INDEX `factura_empresaId_serie_folio_key`(`empresaId`, `serie`, `folio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `factura_concepto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `facturaId` INTEGER NOT NULL,
    `descripcion` VARCHAR(500) NOT NULL,
    `claveProdServ` VARCHAR(20) NULL,
    `claveUnidad` VARCHAR(20) NULL,
    `unidad` VARCHAR(50) NOT NULL,
    `cantidad` DECIMAL(14, 4) NOT NULL DEFAULT 1,
    `valorUnitario` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `importe` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `ivaTasa` DECIMAL(5, 2) NOT NULL DEFAULT 16,
    `base` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `importeIva` DECIMAL(14, 2) NOT NULL DEFAULT 0,

    INDEX `factura_concepto_facturaId_idx`(`facturaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pago` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `cobroId` INTEGER NULL,
    `usuarioId` INTEGER NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `moneda` VARCHAR(3) NOT NULL DEFAULT 'MXN',
    `monto` DECIMAL(14, 2) NOT NULL,
    `formaPago` VARCHAR(3) NOT NULL DEFAULT '03',
    `referencia` VARCHAR(150) NULL,
    `conciliado` BOOLEAN NOT NULL DEFAULT false,
    `fechaConciliacion` DATETIME(3) NULL,
    `comprobantePath` VARCHAR(500) NULL,
    `notas` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pago_empresaId_conciliado_idx`(`empresaId`, `conciliado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL DEFAULT 0,
    `grupo` VARCHAR(50) NOT NULL DEFAULT 'general',
    `clave` VARCHAR(100) NOT NULL,
    `valor` TEXT NULL,
    `tipo` VARCHAR(20) NOT NULL DEFAULT 'string',
    `descripcion` VARCHAR(255) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `configuracion_empresaId_clave_key`(`empresaId`, `clave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plantilla_correo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL DEFAULT 0,
    `clave` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `asunto` VARCHAR(255) NOT NULL,
    `cuerpo` TEXT NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `plantilla_correo_empresaId_clave_key`(`empresaId`, `clave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `correo_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL DEFAULT 0,
    `plantillaClave` VARCHAR(50) NULL,
    `destinatario` VARCHAR(500) NOT NULL,
    `cc` VARCHAR(500) NULL,
    `asunto` VARCHAR(255) NOT NULL,
    `cuerpo` TEXT NULL,
    `entidadTipo` VARCHAR(50) NULL,
    `entidadId` INTEGER NULL,
    `estado` ENUM('ENVIADO', 'ERROR') NOT NULL DEFAULT 'ENVIADO',
    `error` TEXT NULL,
    `usuarioId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `correo_log_empresaId_createdAt_idx`(`empresaId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `archivo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL DEFAULT 0,
    `entidadTipo` VARCHAR(50) NOT NULL,
    `entidadId` INTEGER NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `mime` VARCHAR(150) NULL,
    `size` INTEGER NULL,
    `usuarioId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `archivo_entidadTipo_entidadId_idx`(`entidadTipo`, `entidadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `folio_counter` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `tipo` VARCHAR(30) NOT NULL,
    `ultimo` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `folio_counter_empresaId_tipo_key`(`empresaId`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NULL,
    `usuarioId` INTEGER NULL,
    `accion` VARCHAR(50) NOT NULL,
    `modulo` VARCHAR(50) NOT NULL,
    `entidadTipo` VARCHAR(50) NULL,
    `entidadId` INTEGER NULL,
    `descripcion` VARCHAR(500) NULL,
    `datos` JSON NULL,
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_log_empresaId_createdAt_idx`(`empresaId`, `createdAt`),
    INDEX `audit_log_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `perfil_permiso` ADD CONSTRAINT `perfil_permiso_perfilId_fkey` FOREIGN KEY (`perfilId`) REFERENCES `perfil`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_permiso` ADD CONSTRAINT `usuario_permiso_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_perfilId_fkey` FOREIGN KEY (`perfilId`) REFERENCES `perfil`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_empresa` ADD CONSTRAINT `usuario_empresa_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_empresa` ADD CONSTRAINT `usuario_empresa_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_token` ADD CONSTRAINT `refresh_token_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cliente` ADD CONSTRAINT `cliente_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto` ADD CONSTRAINT `producto_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cotizacion` ADD CONSTRAINT `cotizacion_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cotizacion` ADD CONSTRAINT `cotizacion_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cotizacion` ADD CONSTRAINT `cotizacion_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cotizacion_item` ADD CONSTRAINT `cotizacion_item_cotizacionId_fkey` FOREIGN KEY (`cotizacionId`) REFERENCES `cotizacion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cotizacion_item` ADD CONSTRAINT `cotizacion_item_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `producto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trabajo` ADD CONSTRAINT `trabajo_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trabajo` ADD CONSTRAINT `trabajo_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trabajo` ADD CONSTRAINT `trabajo_cotizacionId_fkey` FOREIGN KEY (`cotizacionId`) REFERENCES `cotizacion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trabajo` ADD CONSTRAINT `trabajo_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trabajo_item` ADD CONSTRAINT `trabajo_item_trabajoId_fkey` FOREIGN KEY (`trabajoId`) REFERENCES `trabajo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trabajo_item` ADD CONSTRAINT `trabajo_item_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `producto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cobro` ADD CONSTRAINT `cobro_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cobro` ADD CONSTRAINT `cobro_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cobro` ADD CONSTRAINT `cobro_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cobro_trabajo` ADD CONSTRAINT `cobro_trabajo_cobroId_fkey` FOREIGN KEY (`cobroId`) REFERENCES `cobro`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cobro_trabajo` ADD CONSTRAINT `cobro_trabajo_trabajoId_fkey` FOREIGN KEY (`trabajoId`) REFERENCES `trabajo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `factura` ADD CONSTRAINT `factura_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `factura` ADD CONSTRAINT `factura_cobroId_fkey` FOREIGN KEY (`cobroId`) REFERENCES `cobro`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `factura` ADD CONSTRAINT `factura_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `factura` ADD CONSTRAINT `factura_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `factura_concepto` ADD CONSTRAINT `factura_concepto_facturaId_fkey` FOREIGN KEY (`facturaId`) REFERENCES `factura`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pago` ADD CONSTRAINT `pago_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pago` ADD CONSTRAINT `pago_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pago` ADD CONSTRAINT `pago_cobroId_fkey` FOREIGN KEY (`cobroId`) REFERENCES `cobro`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pago` ADD CONSTRAINT `pago_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `configuracion` ADD CONSTRAINT `configuracion_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plantilla_correo` ADD CONSTRAINT `plantilla_correo_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `correo_log` ADD CONSTRAINT `correo_log_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `archivo` ADD CONSTRAINT `archivo_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
