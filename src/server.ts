import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

async function bootstrap() {
  const app = createApp();

  // Escuchamos primero: si la base de datos falla, la API sigue en pie y
  // /health reporta el problema en lugar de morir con un 503 opaco.
  const server = app.listen(env.port, () => {
    logger.info({ port: env.port, nodeEnv: env.nodeEnv }, 'Maquind API escuchando');
  });

  try {
    await prisma.$connect();
    logger.info('Conexión a la base de datos establecida');
  } catch (err) {
    logger.error(
      { err },
      'No se pudo conectar a la base de datos; la API arranca igual pero fallará al consultar',
    );
  }

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Cerrando API');
    server.close(() => {
      prisma.$disconnect().finally(() => process.exit(0));
    });
    // Si algo se queda colgado, forzamos la salida.
    setTimeout(() => process.exit(0), 8000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Promesa rechazada sin manejar');
  });
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Excepción no capturada');
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Error fatal al arrancar la API');
  process.exit(1);
});
