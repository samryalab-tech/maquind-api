import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

async function bootstrap() {
  try {
    await prisma.$connect();
    const app = createApp();
    app.listen(env.port, () => {
      logger.info({ port: env.port }, 'Maquind API escuchando');
    });
  } catch (err) {
    logger.error({ err }, 'Error al arrancar la API');
    process.exit(1);
  }
}

bootstrap();
