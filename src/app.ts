import { Router } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { apiRateLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';

import authRouter from './modules/auth/auth.routes';
import usersRouter from './modules/users/users.routes';
import profilesRouter from './modules/profiles/profiles.routes';
import companiesRouter from './modules/companies/companies.routes';
import clientsRouter from './modules/clients/clients.routes';
import productsRouter from './modules/products/products.routes';
import quotesRouter from './modules/quotes/quotes.routes';
import jobsRouter from './modules/jobs/jobs.routes';
import chargesRouter from './modules/charges/charges.routes';
import invoicesRouter from './modules/invoices/invoices.routes';
import paymentsRouter from './modules/payments/payments.routes';
import settingsRouter from './modules/settings/settings.routes';
import emailsRouter from './modules/email/emails.routes';
import permissionsRouter from './modules/permissions/permissions.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';
import auditRouter from './modules/audit/audit.routes';
import pdfRouter from './modules/pdf/pdf.routes';

export function createApp() {
  const app = express();

  // Seguridad y middlewares base
  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // CORS para admin
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (env.corsOrigin.includes(origin)) return cb(null, true);
        return cb(null, true); // permitir en dev; ajustar en prod
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    }),
  );

  app.use(apiRateLimiter);

  // Ruta de salud
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Rutas de módulos
  app.use('/api/auth', authRouter);
  app.use('/api/usuarios', usersRouter);
  app.use('/api/perfiles', profilesRouter);
  app.use('/api/empresas', companiesRouter);
  app.use('/api/clientes', clientsRouter);
  app.use('/api/productos', productsRouter);
  app.use('/api/cotizaciones', quotesRouter);
  app.use('/api/trabajos', jobsRouter);
  app.use('/api/cobros', chargesRouter);
  app.use('/api/facturas', invoicesRouter);
  app.use('/api/pagos', paymentsRouter);
  app.use('/api/configuracion', settingsRouter);
  app.use('/api/correos', emailsRouter);
  app.use('/api/permisos', permissionsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/auditoria', auditRouter);
  app.use('/api/pdf', pdfRouter);

  app.use('/storage', express.static('storage')); // PDFs, comprobantes, etc.

  app.use(errorHandler);
  return app;
}
