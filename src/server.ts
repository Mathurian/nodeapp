/**
 * Main Server Entry Point
 * TypeScript Express server with comprehensive middleware and route configuration
 */

// MUST be first for dependency injection to work
import 'reflect-metadata';
import 'dotenv/config';

import express, { Application, Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

// Database and DI Container
import { prisma, testDatabaseConnection, disconnectDatabase } from './config/database';
import { setupContainer } from './config/container';

// Configuration modules
import { parseAllowedOrigins, configureMiddleware } from './config/express.config';
import { createSocketServer, configureSocketHandlers } from './config/socket.config';
import { registerRoutes } from './config/routes.config';
import { swaggerSpec, swaggerUiOptions } from './config/swagger.config';

// Middleware
import { requestLogging, errorLogging } from './middleware/requestLogger';
import { generalLimiter, authLimiter } from './middleware/rateLimiting';
import { errorHandler } from './middleware/errorHandler';
import { getCsrfToken, csrfProtection, csrfErrorHandler } from './middleware/csrf';
import { initMetrics, metricsMiddleware, metricsEndpoint } from './middleware/metrics';
import { tenantMiddleware, optionalTenantMiddleware } from './middleware/tenantMiddleware';

// Utilities
import { createLogger } from './utils/logger';
import { validateProductionConfig } from './utils/config';

// Services
import ScheduledBackupService from './services/scheduledBackupService';

// Controllers
import { logPerformance } from './controllers/performanceController';

// Initialize loggers
const appLogger = createLogger('default');
const backupLogger = createLogger('backup');

/**
 * Validate environment configuration
 */
try {
  validateProductionConfig();
  appLogger.info('Configuration validation passed');
} catch (error: any) {
  appLogger.error('Configuration validation failed', { error: error.message });
  process.exit(1);
}

/**
 * Initialize Express Application
 */
const app: Application = express();
const server = http.createServer(app);
const PORT: number = parseInt(process.env.PORT || '3000', 10);

/**
 * Setup Dependency Injection Container
 */
setupContainer();

/**
 * Initialize Metrics Service
 */
initMetrics();

/**
 * Initialize Services
 */
const scheduledBackupService = new ScheduledBackupService(prisma);

/**
 * Parse and configure CORS origins
 */
const allowedOrigins = parseAllowedOrigins();
appLogger.info(`Allowed origins: ${allowedOrigins.join(', ') || 'none (development mode)'}`);

/**
 * Configure Express middleware
 */
configureMiddleware(app, allowedOrigins);

// Additional middleware
app.use(morgan('combined'));
app.use(cookieParser());
app.use(requestLogging);

/**
 * Create upload directories
 */
const uploadDirs = ['uploads/users', 'uploads/emcee', 'uploads/theme', 'uploads/bios'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    appLogger.info(`Created upload directory: ${dir}`);
  }
});

/**
 * Rate limiting
 */
app.use('/api/auth/', authLimiter);
app.use('/api/', generalLimiter);

/**
 * Performance monitoring
 */
app.use('/api/', logPerformance);
app.use('/api/', metricsMiddleware);

/**
 * Metrics endpoint (Prometheus format)
 */
app.get('/metrics', metricsEndpoint);

/**
 * Health check endpoint (public)
 */
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const dbHealthy = await testDatabaseConnection();
    res.json({
      status: dbHealthy ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealthy ? 'connected' : 'disconnected',
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * CSRF token endpoint (public)
 */
app.get('/api/csrf-token', getCsrfToken);

/**
 * API Documentation (Swagger UI)
 * Accessible at /api-docs
 * Always enabled - can be disabled by setting ENABLE_API_DOCS=false
 */
if (process.env.ENABLE_API_DOCS !== 'false') {
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  appLogger.info('Swagger UI available at /api-docs');
} else {
  appLogger.info('Swagger UI disabled (ENABLE_API_DOCS=false)');
}

/**
 * Apply tenant middleware to all API routes
 * This identifies the tenant and injects context into req.tenantId
 */
app.use('/api', tenantMiddleware);

/**
 * Apply CSRF protection to mutating API routes
 * Skip CSRF protection in test environment
 */
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF protection in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const method = req.method.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return csrfProtection(req, res, next);
  }
  return next();
});

/**
 * Register all API routes
 */
registerRoutes(app);

/**
 * Serve uploaded files statically with security options
 */
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  dotfiles: 'deny', // Prevent access to dotfiles
  index: false, // Disable directory listing
  setHeaders: (res: Response, filePath: string) => {
    // Set appropriate cache headers for uploaded files
    if (filePath.match(/.(jpg|jpeg|png|gif|webp)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year for images
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour for other files
    }
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

/**
 * Socket.IO Setup
 */
const io = createSocketServer(server, allowedOrigins);
configureSocketHandlers(io);

// Export io for use in controllers
export { io };

/**
 * Serve frontend static files (after API routes and Socket.IO)
 */
const frontendDistPath = path.join(__dirname, '../frontend/dist');
const frontendDistExists = fs.existsSync(frontendDistPath);

if (frontendDistExists) {
  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(frontendDistPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0', // Cache in production
    etag: true,
    lastModified: true,
  }));

  appLogger.info('Frontend static files serving enabled');
} else {
  appLogger.warn('Frontend dist directory not found. Frontend will not be served.');
  appLogger.warn('To build frontend: cd frontend && npm run build');
}

/**
 * Serve index.html for all non-API routes (React Router catch-all)
 * This must be BEFORE error handlers but AFTER all API routes
 */
if (frontendDistExists) {
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    // Skip API routes, metrics, health checks, uploads, and Socket.IO
    if (
      req.path.startsWith('/api/') ||
      req.path.startsWith('/metrics') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io') ||
      req.path.startsWith('/api-docs')
    ) {
      return next();
    }

    // Serve index.html for all other routes (React Router will handle routing)
    const indexPath = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next(); // Let error handler deal with it
    }
  });
}

/**
 * Error Handlers (must be last)
 */
app.use(csrfErrorHandler);
app.use(errorLogging);
app.use(errorHandler);

/**
 * Start Server
 */
const startServer = async (): Promise<void> => {
  // Don't start server in test environment
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  try {
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      appLogger.error('Failed to connect to database');
      process.exit(1);
    }

    // Start HTTP server
    server.listen(PORT, () => {
      appLogger.info(`🚀 Event Manager API server running on port ${PORT}`);
      appLogger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      appLogger.info(`🔒 CORS: ${allowedOrigins.length > 0 ? 'configured' : 'open (dev mode)'}`);
    });

    // Start scheduled backup service (skip in test mode)
    if (process.env.NODE_ENV !== 'test') {
      try {
        await scheduledBackupService.start();
        backupLogger.info('Scheduled backup service started');
      } catch (error: any) {
        backupLogger.error('Failed to start scheduled backup service', { error: error.message });
      }
    }
  } catch (error: any) {
    appLogger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

/**
 * Graceful Shutdown Handler
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
  appLogger.info(`${signal} received, shutting down gracefully...`);

  try {
    // Stop accepting new connections
    server.close(() => {
      appLogger.info('HTTP server closed');
    });

    // Stop scheduled services
    await scheduledBackupService.stop();
    backupLogger.info('Scheduled backup service stopped');

    // Close database connections
    await disconnectDatabase();

    // Close Socket.IO
    io.close(() => {
      appLogger.info('Socket.IO closed');
    });

    appLogger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error: any) {
    appLogger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
};

/**
 * Process Signal Handlers
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Uncaught Exception Handler
 */
process.on('uncaughtException', (error: Error) => {
  appLogger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown('uncaughtException');
});

/**
 * Unhandled Rejection Handler
 */
process.on('unhandledRejection', (reason: any) => {
  appLogger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  gracefulShutdown('unhandledRejection');
});

/**
 * Start the server (only in non-test environments)
 */
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

/**
 * Export app for testing
 */
export default app;
