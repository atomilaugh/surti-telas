import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { Express, Request, Response } from 'express';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { env } from './env';
import { asyncHandler } from '../shared/presentation/http/asyncHandler';
import { errorHandler } from '../shared/presentation/http/errorHandler';
import { authRouter } from '../modules/auth/presentation/routes/auth.routes';
import { catalogRouter } from '../modules/catalog/presentation/routes/catalog.routes';
import { customerRouter } from '../modules/customers/presentation/routes/customer.routes';
import { orderRouter } from '../modules/orders/presentation/routes/order.routes';
import { adminOrderRouter } from '../modules/orders/presentation/routes/admin-order.routes';
import { stockRouter } from '../modules/stock/presentation/routes/stock.routes';
import { productionRouter } from '../modules/production/presentation/routes/production.routes';
import { notificationRouter } from '../modules/notifications/presentation/routes/notification.routes';
import { alertRouter } from '../modules/alerts/presentation/routes/alert.routes';
import { webhookRouter } from '../modules/webhooks/presentation/routes/webhook.routes';
import { paymentsRoutes } from '../modules/payments/presentation/routes/payments.routes';
import { receiptsRoutes } from '../modules/receipts/presentation/routes/receipts.routes';
import { commissionsRoutes } from '../modules/commissions/presentation/routes/commissions.routes';
import { companyRoutes } from '../modules/company/presentation/routes/company.routes';
import { deliveryRouter } from '../modules/deliveries/presentation/routes/delivery.routes';
import { cmsRoutes } from '../modules/cms/presentation/routes/cms.routes';
import { contactRoutes } from '../modules/contact/presentation/routes/contact.routes';
import { auditRouter } from '../modules/audit/presentation/routes/audit.routes';
import { reportRouter } from '../modules/reports/presentation/routes/report.routes';
import { returnRouter } from '../modules/returns/presentation/routes/return.routes';
import { clientReturnRouter } from '../modules/returns/presentation/routes/client-return.routes';
import { favoriteRouter } from '../modules/favorites/presentation/routes/favorite.routes';
import { healthRouter } from '../modules/health/presentation/routes/health.routes';
import { orderApprovalRouter } from '../modules/sales-orders/presentation/routes/orderApproval.routes';
import { salesReportRouter } from '../modules/sales-orders/presentation/routes/salesReport.routes';
import { saleRouter } from '../modules/sales-orders/presentation/routes/sale.routes';
import { userRateLimiter } from '../modules/shared/presentation/middlewares/userRateLimiter';
import { redisUserRateLimiter } from '../modules/shared/presentation/middlewares/redisUserRateLimiter';
import { metricsMiddleware, metricsEndpoint } from '../modules/shared/presentation/middlewares/metrics';
import { sanitizeInput } from '../modules/shared/presentation/middlewares/sanitize';
import { idempotency } from '../modules/shared/presentation/middlewares/idempotency';
import { setupSwagger } from './swagger';
import { logger } from '../shared/infrastructure/logger';
import { getHealthStatus } from '../shared/infrastructure/healthCheck';
import { registerAuditEventHandlers } from '../modules/audit/application/use-cases/AuditEventHandler';
import { analyticsRouter } from '../modules/analytics/presentation/routes/analytics.routes';
import { exportRouter } from '../modules/export/presentation/routes/export.routes';
import { deliveryTrackingRouter } from '../modules/delivery/presentation/routes/delivery.routes';
import { commissionRouter } from '../modules/commission/presentation/routes/commission.routes';
import { alertInventoryRouter } from '../modules/alert/presentation/routes/alert-inventory.routes';
import { financialRouter } from '../modules/financial/presentation/routes/financial.routes';
import { domiciliarioRouter } from '../modules/domiciliarios/presentation/routes/domiciliario.routes';
import { employeeRouter } from '../modules/employees/presentation/routes/employee.routes';
import { customOrderRouter } from '../modules/pedidos-personalizados/presentation/routes/custom-order.routes';
import { adminCustomOrderRouter } from '../modules/pedidos-personalizados/presentation/routes/admin-custom-order.routes';
import { purchasesRouter } from '../modules/purchases/presentation/routes/purchases.routes';
import { rawMaterialCategoriesRouter } from '../modules/raw-material-categories/presentation/routes/raw-material-categories.routes';
import { chatRouter } from '../modules/chat/presentation/routes/chat.routes';

export function createApp(): Express {
  const app = express();

  app.use((req: Request, _res: Response, next) => {
    req.requestId = randomUUID();
    next();
  });

  app.use((req: Request, res: Response, next) => {
    res.set('X-Request-Id', req.requestId || '');
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              fontSrc: ["'self'", 'data:'],
              connectSrc: ["'self'",'wss:','https://surti-telas-backend.onrender.com',],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : false,
      hsts: env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginEmbedderPolicy: { policy: 'require-corp' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hidePoweredBy: true,
    })
  );

  const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  const isDev = env.NODE_ENV === 'development';
  app.use(cors({
    origin: (origin, callback) => {
      if (isDev) {
        return callback(null, true);
      }
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  }));

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, parameterLimit: 100000 }));

  app.use((req: Request, res: Response, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP request', {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration,
        requestId: req.requestId,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      });
    });
    next();
  });

  app.use('/uploads/custom-orders/payments', (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'not_found', message: 'Ruta no disponible' });
  });

  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  app.use(sanitizeInput);
  app.use(idempotency);

  app.use(metricsMiddleware);

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: env.NODE_ENV === 'development' ? 100000 : env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'too_many_requests', message: 'Demasiadas solicitudes' },
    })
  );

  if (env.NODE_ENV === 'test') {
    app.use(userRateLimiter);
  } else if (env.NODE_ENV === 'production') {
    app.use(asyncHandler(redisUserRateLimiter));
  }

  app.get('/health', async (_req: Request, res: Response) => {
    try {
      const health = await getHealthStatus();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json({ success: statusCode === 200, data: health });
    } catch (error) {
      logger.error('Health check failed', { error: (error as Error).message });
      res.status(503).json({ success: false, data: { status: 'unhealthy', checks: {}, timestamp: new Date().toISOString() } });
    }
  });

  app.get('/health/database', async (_req: Request, res: Response) => {
    try {
      const result = await getHealthStatus();
      res.json({ success: true, data: { database: result.checks.database, timestamp: result.timestamp } });
    } catch (error) {
      logger.error('Health check database failed', { error: (error as Error).message });
      res.status(503).json({ success: false, data: { database: { status: 'unhealthy', error: (error as Error).message }, timestamp: new Date().toISOString() } });
    }
  });

  app.get('/health/redis', async (_req: Request, res: Response) => {
    try {
      const result = await getHealthStatus();
      res.json({ success: true, data: { redis: result.checks.redis, timestamp: result.timestamp } });
    } catch (error) {
      logger.error('Health check redis failed', { error: (error as Error).message });
      res.status(503).json({ success: false, data: { redis: { status: 'unhealthy', error: (error as Error).message }, timestamp: new Date().toISOString() } });
    }
  });

  app.get('/health/memory', async (_req: Request, res: Response) => {
    try {
      const result = await getHealthStatus();
      res.json({ success: true, data: { memory: result.checks.memory, timestamp: result.timestamp } });
    } catch (error) {
      logger.error('Health check memory failed', { error: (error as Error).message });
      res.status(503).json({ success: false, data: { memory: { status: 'unhealthy', error: (error as Error).message }, timestamp: new Date().toISOString() } });
    }
  });

  const allowedIps = new Set(env.METRICS_ALLOWED_IPS.split(',').map((ip) => ip.trim()));
  app.get('/metrics', (req: Request, res: Response) => {
    if (env.NODE_ENV === 'production') {
      const token = req.get('X-Metrics-Token');
      if (!env.METRICS_SECRET || token !== env.METRICS_SECRET) {
        return res.status(403).json({ success: false, error: 'forbidden', message: 'Acceso denegado' });
      }
    } else if (!allowedIps.has(req.ip || '')) {
      return res.status(403).json({ success: false, error: 'forbidden', message: 'Acceso denegado' });
    }
    return metricsEndpoint(req, res);
  });

  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/alerts', alertRouter);
  app.use('/api/v1/webhooks', webhookRouter);
  app.use('/api/v1/payments', paymentsRoutes);
  app.use('/api/v1/receipts', receiptsRoutes);
  app.use('/api/v1/commissions', commissionsRoutes);
  app.use('/api/v1/company', companyRoutes);
  app.use('/api/v1/deliveries', deliveryRouter);
  app.use('/api/v1/cms', cmsRoutes);
  app.use('/api/v1/contact', contactRoutes);
  app.use('/api/v1/audit', auditRouter);
  app.use('/api/v1/access-logs', auditRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/returns', returnRouter);
app.use('/api/v1/client/returns', clientReturnRouter);
app.use('/api/v1/favorites', favoriteRouter);
  app.use('/api/v1/sales-orders', orderApprovalRouter);
  app.use('/api/v1/sales-orders', salesReportRouter);
  app.use('/api/v1/sales', saleRouter);



  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/admin/export', exportRouter);
  app.use('/api/v1/admin/delivery', deliveryTrackingRouter);
  app.use('/api/v1/admin/commissions', commissionRouter);
  app.use('/api/v1/admin/alerts', alertInventoryRouter);
  app.use('/api/v1/admin/financial', financialRouter);
  app.use('/api/v1/custom-orders', customOrderRouter);
  app.use('/api/v1/admin/custom-orders', adminCustomOrderRouter);
  app.use('/api/v1/purchases', purchasesRouter);
  app.use('/api/v1/raw-material-categories', rawMaterialCategoriesRouter);
  app.use('/api/v1/chat', chatRouter);
  app.use('/api/v1/domiciliarios', domiciliarioRouter);
  app.use('/api/v1/employees', employeeRouter);
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1/customers', customerRouter);
  app.use('/api/v1/orders', orderRouter);
  app.use('/api/v1/admin/orders', adminOrderRouter);
  app.use('/api/v1/stock', stockRouter);
  app.use('/api/v1/production', productionRouter);
  app.use('/health', healthRouter);
  app.use('/api/v1/health', healthRouter);

  if (env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  app.use((_req, res) => {
    logger.warn('Ruta no encontrada', { url: _req.originalUrl || _req.url, method: _req.method, requestId: _req.requestId });
    res.status(404).json({ success: false, error: 'not_found', message: 'Ruta no encontrada' });
  });

  app.use(errorHandler);

  registerAuditEventHandlers();

  return app;
}
