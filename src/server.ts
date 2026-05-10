/**
 * Main Server Entry Point
 * TypeScript Express server with comprehensive middleware and route configuration
 */

// MUST be first for dependency injection to work
import 'reflect-metadata';
import 'dotenv/config';

// Initialize Sentry as early as possible (before other imports)
import { initializeSentry, closeSentry } from './config/sentry';
import * as Sentry from '@sentry/node';
initializeSentry();

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
import { buildSwaggerSpec, swaggerUiOptions } from './config/swagger.config';

// Middleware
import { requestLogging, errorLogging } from './middleware/requestLogger';
import { generalLimiter, bootstrapEndpointLimiter, publicEndpointLimiter } from './middleware/rateLimiting';
import { rateLimitMiddleware } from './middleware/enhancedRateLimiting';
import { errorHandler } from './middleware/errorHandler';
import { getCsrfToken, csrfProtection, csrfErrorHandler } from './middleware/csrf';
import { initMetrics, metricsMiddleware, metricsEndpoint } from './middleware/metrics';
import { tenantMiddleware, TenantIdentifier } from './middleware/tenantMiddleware';
import { authenticateToken } from './middleware/auth';
import { offlineWriteOwnershipGuard } from './middleware/offlineWriteOwnershipGuard';
// S4-2: Correlation ID middleware for request tracing
import { correlationIdMiddleware, contextMiddleware } from './middleware/correlationId';

// Utilities
import { createLogger } from './utils/logger';
import { validateProductionConfig } from './utils/config';
import { ensureDefaultTenant } from './utils/ensureDefaultTenant';
import { env } from './config/env';
import {
  getOfflineWriteOwnershipManifestState,
  initializeOfflineWriteOwnershipManifest,
} from './config/offlineWriteOwnership.config';
import {
  getOfflineReliabilityInvariantState,
  initializeOfflineReliabilityInvariants,
} from './config/offlineReliability.config';
import {
  canViewScoreFile,
  createCommentaryViewerContext,
} from './utils/commentaryAccess';

// Services
import ScheduledBackupService from './services/scheduledBackupService';
import { BusinessMetricsCollector } from './services/BusinessMetricsCollector';
import { ServiceMonitor } from './services/ServiceMonitor';
import { ActiveSessionTracker } from './services/ActiveSessionTracker';
import { IdempotencyLifecycleService } from './services/idempotency/IdempotencyLifecycleService';
import WorkflowSchedulerService from './services/workflowSchedulerService';
import { SettingsService } from './services/SettingsService';
import { container } from './config/container';

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
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  appLogger.error('Configuration validation failed', { error: errorMessage });
  process.exit(1);
}

/**
 * Initialize Express Application
 */
const app: Application = express();
const server = http.createServer(app);
const PORT: number = env.get('PORT');

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
const workflowSchedulerService = new WorkflowSchedulerService();
let businessMetricsCollector: BusinessMetricsCollector | null = null;
let serviceMonitor: ServiceMonitor | null = null;
let activeSessionTracker: ActiveSessionTracker | null = null;
let idempotencyLifecycleService: IdempotencyLifecycleService | null = null;

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

// S4-2: Request correlation IDs for tracing (must be early in middleware chain)
app.use(correlationIdMiddleware);
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
 * Sentry Request Handler (must be before routes)
 * Note: In Sentry v10+, tracing is set up automatically via init()
 */

/**
 * Rate limiting
 */
app.use('/api/', generalLimiter);
app.use([
  '/api/settings/theme',
  '/api/v1/settings/theme',
  '/api/settings/public',
  '/api/v1/settings/public',
  '/api/settings/pwa-manifest',
  '/api/v1/settings/pwa-manifest',
  '/api/navigation',
  '/api/v1/navigation',
  '/api/tenants/slug',
  '/api/v1/tenants/slug',
], bootstrapEndpointLimiter);

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
    const manifestState = getOfflineWriteOwnershipManifestState();
    const invariantState = getOfflineReliabilityInvariantState();
    const overallStatus =
      dbHealthy && manifestState.valid && invariantState.valid ? 'OK' : 'DEGRADED';
    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealthy ? 'connected' : 'disconnected',
      offlineWriteManifest: {
        initialized: manifestState.initialized,
        valid: manifestState.valid,
        usingFallback: manifestState.usingFallback,
        reason: manifestState.reason,
        version: manifestState.version,
      },
      offlineReliabilityInvariants: invariantState,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      message: errorMessage,
    });
  }
});

/**
 * CSRF token endpoint (public)
 * SECURITY FIX #10: Added IP-based rate limiting to prevent abuse
 */
app.get('/api/csrf-token', publicEndpointLimiter, getCsrfToken);
app.get('/api/v1/csrf-token', publicEndpointLimiter, getCsrfToken);

// Some browsers still request /favicon.ico even when the app declares an SVG favicon.
// Redirecting avoids noisy 404s on public pages while keeping the SVG as the source of truth.
app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.redirect(302, '/favicon.svg');
});

/**
 * API Documentation (Swagger UI)
 * Accessible at /api-docs
 * Enabled by default - can be disabled by setting ENABLE_API_DOCS=false
 */
const enableApiDocs = env.get('ENABLE_API_DOCS');
if (enableApiDocs) {
  const settingsService = container.resolve(SettingsService);

  const getSwaggerRequestHost = (req: Request): string => {
    const forwardedHostRaw = req.headers['x-forwarded-host'];
    const hostSource = (Array.isArray(forwardedHostRaw) ? forwardedHostRaw[0] : forwardedHostRaw) || req.get('host') || '';
    const host = hostSource.toString().split(',')[0]?.trim() || '';
    return host.replace(/:\d+$/, '').toLowerCase();
  };

  const getReservedSubdomains = (): Set<string> => {
    const defaults = ['www', 'api', 'app', 'admin', 'dev', 'staging', 'stage', 'test', 'preview'];
    const configured = (process.env['TENANT_RESERVED_SUBDOMAINS'] || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    return new Set([...defaults, ...configured]);
  };

  const isIpOrLocalHost = (hostname: string): boolean => {
    if (!hostname) return true;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
  };

  const findActiveTenantIdByIdentifier = async (identifier: string): Promise<string | null> => {
    const normalized = String(identifier || '').trim();
    if (!normalized) return null;

    const tenant = await prisma.tenant.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: normalized },
          { slug: normalized.toLowerCase() },
        ],
      },
      select: { id: true },
    });

    return tenant?.id || null;
  };

  const resolveSwaggerTenantId = async (req: Request): Promise<string | null> => {
    const headerTenant = TenantIdentifier.fromHeader(req);
    if (headerTenant) {
      const headerTenantId = await findActiveTenantIdByIdentifier(headerTenant);
      if (headerTenantId) return headerTenantId;
    }

    const hostWithoutPort = getSwaggerRequestHost(req);
    if (!hostWithoutPort || isIpOrLocalHost(hostWithoutPort)) {
      return null;
    }

    const hostParts = hostWithoutPort.split('.').filter(Boolean);
    if (hostParts.length >= 3) {
      const subdomain = hostParts[0] || '';
      if (subdomain && !getReservedSubdomains().has(subdomain)) {
        const tenantBySubdomain = await findActiveTenantIdByIdentifier(subdomain);
        if (tenantBySubdomain) return tenantBySubdomain;
      }
    }

    const customDomain = TenantIdentifier.fromCustomDomain(req);
    if (customDomain) {
      const tenant = await prisma.tenant.findFirst({
        where: { domain: customDomain.toLowerCase(), isActive: true },
        select: { id: true },
      });
      if (tenant?.id) return tenant.id;
    }

    return null;
  };

  const getSwaggerPublicBaseUrl = (req: Request): string | undefined => {
    const forwardedProtoRaw = req.headers['x-forwarded-proto'];
    const forwardedHostRaw = req.headers['x-forwarded-host'];
    const protoSource = (Array.isArray(forwardedProtoRaw) ? forwardedProtoRaw[0] : forwardedProtoRaw) || req.protocol || 'https';
    const hostSource = (Array.isArray(forwardedHostRaw) ? forwardedHostRaw[0] : forwardedHostRaw) || req.get('host') || '';
    const protoValues = protoSource.toString().split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
    let proto = protoValues.includes('https') ? 'https' : (protoValues[0] || 'https');
    const host = hostSource.toString().split(',')[0]?.trim() || '';

    if (!host) return undefined;
    const hostWithoutPort = host.replace(/:\d+$/, '').toLowerCase();
    const isLocalHost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1' || hostWithoutPort === '::1';
    if (!isLocalHost && proto !== 'https') {
      proto = 'https';
    }
    return `${proto}://${host}`;
  };

  const apiDocsUiOptions = {
    ...swaggerUiOptions,
    swaggerOptions: {
      ...swaggerUiOptions.swaggerOptions,
      url: '/api-docs.json',
    },
  };

  app.get(['/api-docs', '/api-docs/'], (_req: Request, res: Response) => {
    return res.redirect(302, '/api-docs-v2/');
  });

  app.use('/api-docs-v2', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return next();
  });
  app.use('/api-docs-v2', swaggerUi.serve, swaggerUi.setup(undefined, apiDocsUiOptions));
  app.get('/api-docs.json', async (req: Request, res: Response) => {
    const publicBaseUrl = getSwaggerPublicBaseUrl(req);
    let supportEmail: string | undefined;

    try {
      const tenantId = await resolveSwaggerTenantId(req);
      supportEmail = (
        await settingsService.getSettingWithFallback('security_email', tenantId)
      ) || (
        await settingsService.getSettingWithFallback('footer_contactEmail', tenantId)
      ) || undefined;
    } catch (error: unknown) {
      appLogger.warn('Unable to resolve tenant-aware Swagger support email; falling back to environment defaults', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const spec = buildSwaggerSpec({ publicBaseUrl, supportEmail });
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'application/json');
    res.vary('Host');
    res.vary('X-Tenant-Slug');
    res.vary('X-Tenant-ID');
    res.send(spec);
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
 * S4-2: Apply context middleware for AsyncLocalStorage
 * This must come after tenant middleware but before routes
 * so that req.tenantId and req.user are available in context
 */
app.use('/api', contextMiddleware);

/**
 * Covered write-route safety gate.
 * When manifest verification fails in non-strict mode, only matrix-covered writes
 * are blocked; unrelated routes remain available.
 */
app.use('/api', offlineWriteOwnershipGuard);

/**
 * Enhanced rate limiting with tenant-aware tiered limits
 * Applied after tenant middleware to access tenant context
 * Note: Basic rate limiters above still apply as first line of defense
 */
app.use('/api', rateLimitMiddleware());

/**
 * Apply CSRF protection to mutating API routes
 * Skip CSRF protection in test environment
 */
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF protection in test environment
  if (env.isTest()) {
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
 * Serve uploaded files with tenant-aware access checks.
 * Only theme assets are public by design.
 */
const uploadsRoot = path.resolve(__dirname, '../uploads');

const normalizeUploadPath = (rawPath: string): string | null => {
  try {
    const decoded = decodeURIComponent(rawPath || '');
    const normalized = path.posix.normalize(decoded).replace(/^\/+/, '');
    if (!normalized || normalized.startsWith('..') || normalized.includes('\\')) {
      return null;
    }
    return normalized;
  } catch (_error) {
    return null;
  }
};

const buildUploadPathCandidates = (relativePath: string): string[] => {
  const normalized = relativePath.replace(/^\/+/, '');
  const basename = path.posix.basename(normalized);
  const candidates = new Set<string>([
    normalized,
    `/${normalized}`,
    `uploads/${normalized}`,
    `/uploads/${normalized}`,
    basename
  ]);
  return Array.from(candidates);
};

const findScoreFileByTenantAndPath = async (tenantId: string, relativePath: string) => {
  const pathCandidates = buildUploadPathCandidates(relativePath);
  return prisma.scoreFile.findFirst({
    where: {
      tenantId,
      OR: [
        { filePath: { in: pathCandidates } },
        { filePath: { endsWith: `/${relativePath}` } }
      ]
    },
    select: {
      id: true,
      uploadedById: true,
      contestantId: true,
    }
  });
};

const isUploadPathReferencedByTenant = async (tenantId: string, relativePath: string): Promise<boolean> => {
  const pathCandidates = buildUploadPathCandidates(relativePath);
  const basename = path.posix.basename(relativePath);

  const dbFile = await prisma.file.findFirst({
    where: {
      tenantId,
      OR: [
        { path: { in: pathCandidates } },
        { path: { endsWith: `/${relativePath}` } },
        { filename: basename }
      ]
    },
    select: { id: true }
  });
  if (dbFile) return true;

  const [scoreFileRef, userRef, contestantRef, judgeRef, emceeRef] = await Promise.all([
    prisma.scoreFile.findFirst({
      where: {
        tenantId,
        OR: [
          { filePath: { in: pathCandidates } },
          { filePath: { endsWith: `/${relativePath}` } }
        ]
      },
      select: { id: true }
    }),
    prisma.user.findFirst({
      where: {
        tenantId,
        OR: [
          { imagePath: { in: pathCandidates } },
          ...pathCandidates.map((candidate) => ({ bio: { contains: candidate } })),
          ...pathCandidates.map((candidate) => ({ judgeBio: { contains: candidate } })),
          ...pathCandidates.map((candidate) => ({ contestantBio: { contains: candidate } }))
        ]
      },
      select: { id: true }
    }),
    prisma.contestant.findFirst({
      where: {
        tenantId,
        OR: [
          { imagePath: { in: pathCandidates } },
          ...pathCandidates.map((candidate) => ({ bio: { contains: candidate } }))
        ]
      },
      select: { id: true }
    }),
    prisma.judge.findFirst({
      where: {
        tenantId,
        OR: [
          { imagePath: { in: pathCandidates } },
          ...pathCandidates.map((candidate) => ({ bio: { contains: candidate } }))
        ]
      },
      select: { id: true }
    }),
    prisma.emceeScript.findFirst({
      where: {
        tenantId,
        OR: [
          { filePath: { in: pathCandidates } },
          { filePath: { endsWith: `/${relativePath}` } }
        ]
      },
      select: { id: true }
    })
  ]);

  return Boolean(scoreFileRef || userRef || contestantRef || judgeRef || emceeRef);
};

app.get('/uploads/*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawPath = (req.params as Record<string, string>)['0'] || '';
    let relativePath = normalizeUploadPath(rawPath);

    if (!relativePath) {
      return res.status(400).json({ success: false, error: 'Invalid file path' });
    }

    // Backward compatibility: historical theme files were stored as /uploads/<filename>.
    if (!relativePath.includes('/')) {
      const legacyThemeCandidate = path.resolve(uploadsRoot, 'theme', relativePath);
      if (fs.existsSync(legacyThemeCandidate)) {
        relativePath = `theme/${relativePath}`;
      }
    }

    const absolutePath = path.resolve(uploadsRoot, relativePath);
    if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`) && absolutePath !== uploadsRoot) {
      return res.status(400).json({ success: false, error: 'Invalid file path' });
    }

    // Theme assets are intentionally public for pre-auth branding.
    if (relativePath.startsWith('theme/')) {
      if (!fs.existsSync(absolutePath)) {
        return next();
      }
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(absolutePath);
    }

    authenticateToken(req, res, (err?: unknown) => {
      if (err) {
        return next(err);
      }

      void (async () => {
        if (res.headersSent) {
          return;
        }

        if (!req.user) {
          res.status(401).json({ success: false, error: 'Authentication required' });
          return;
        }

        if (!fs.existsSync(absolutePath)) {
          next();
          return;
        }

        const tenantId = req.tenantId || req.user.tenantId;
        if (!tenantId) {
          res.status(400).json({ success: false, error: 'Tenant context required' });
          return;
        }

        const scoreFile = await findScoreFileByTenantAndPath(tenantId, relativePath);
        if (scoreFile) {
          const viewer = createCommentaryViewerContext(req.user);
          if (!canViewScoreFile(viewer, scoreFile)) {
            res.status(403).json({ success: false, error: 'Access denied' });
            return;
          }
        }

        const hasAccess = await isUploadPathReferencedByTenant(tenantId, relativePath);
        if (!hasAccess) {
          res.status(403).json({ success: false, error: 'Access denied' });
          return;
        }

        res.setHeader('Cache-Control', 'private, max-age=300');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.sendFile(absolutePath);
      })().catch(next);
    });
    return;
  } catch (error) {
    return next(error);
  }
});

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
  const noCacheStaticFiles = new Set([
    'sw.js',
    'service-worker.js',
    'push-sw.js',
    'manifest.webmanifest',
    'manifest.json',
  ]);

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    const requestedFile = path.posix.basename(req.path);
    if (!noCacheStaticFiles.has(requestedFile)) {
      return next();
    }

    const absolutePath = path.resolve(frontendDistPath, requestedFile);
    if (!absolutePath.startsWith(`${frontendDistPath}${path.sep}`) || !fs.existsSync(absolutePath)) {
      return next();
    }

    // Service worker and web app manifest files must be revalidated so updates
    // propagate reliably, especially on iOS installed PWAs.
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    if (requestedFile === 'sw.js' || requestedFile === 'service-worker.js') {
      res.setHeader('Service-Worker-Allowed', '/');
    }

    return res.sendFile(absolutePath);
  });

  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(frontendDistPath, {
    maxAge: env.isProduction() ? '1y' : '0', // Cache in production
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
    // Skip API routes, metrics, health checks, uploads, monitoring, and Socket.IO
    if (
      req.path.startsWith('/api/') ||
      req.path.startsWith('/metrics') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io') ||
      req.path.startsWith('/api-docs') ||
      req.path.startsWith('/monitoring/')
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
// Sentry error handler must be before other error handlers (v10 API)
Sentry.setupExpressErrorHandler(app);

app.use(csrfErrorHandler);
app.use(errorLogging);
app.use(errorHandler);

/**
 * Start Server
 */
const startServer = async (): Promise<void> => {
  try {
    await initializeOfflineWriteOwnershipManifest();
    initializeOfflineReliabilityInvariants();

    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      appLogger.error('Failed to connect to database');
      process.exit(1);
    }

    // Ensure default tenant exists
    await ensureDefaultTenant();

    // Start HTTP server
    server.listen(PORT, () => {
      appLogger.info(`🚀 Event Manager API server running on port ${PORT}`);
      appLogger.info(`📝 Environment: ${env.get('NODE_ENV')}`);
      appLogger.info(`🔒 CORS: ${allowedOrigins.length > 0 ? 'configured' : 'open (dev mode)'}`);
    });

    // Start scheduled backup service (skip in test mode)
    if (!env.isTest()) {
      try {
        await scheduledBackupService.start();
        backupLogger.info('Scheduled backup service started');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        backupLogger.error('Failed to start scheduled backup service', { error: errorMessage });
      }

      try {
        await workflowSchedulerService.start(60000);
        appLogger.info('Workflow scheduler started (60s interval)');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        appLogger.error('Failed to start workflow scheduler', { error: errorMessage });
      }

      // Start business metrics collector
      try {
        businessMetricsCollector = container.resolve(BusinessMetricsCollector);
        businessMetricsCollector.start(30000); // Collect every 30 seconds
        appLogger.info('Business metrics collector started (30s interval)');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        appLogger.error('Failed to start business metrics collector', { error: errorMessage });
      }

      // Start service monitor
      try {
        serviceMonitor = container.resolve(ServiceMonitor);
        serviceMonitor.start(15000); // Update every 15 seconds
        appLogger.info('Service monitor started (15s interval)');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        appLogger.error('Failed to start service monitor', { error: errorMessage });
      }

      // Start active session tracker
      try {
        activeSessionTracker = container.resolve(ActiveSessionTracker);
        activeSessionTracker.start(60000); // Cleanup every 60 seconds
        appLogger.info('Active session tracker started (60s cleanup interval)');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        appLogger.error('Failed to start active session tracker', { error: errorMessage });
      }

      try {
        idempotencyLifecycleService = container.resolve(IdempotencyLifecycleService);
        idempotencyLifecycleService.start();
        appLogger.info('Idempotency lifecycle service started');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        appLogger.error('Failed to start idempotency lifecycle service', { error: errorMessage });
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    appLogger.error('Failed to start server', { error: errorMessage });
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
    workflowSchedulerService.stop();
    appLogger.info('Workflow scheduler stopped');

    // Stop business metrics collector
    if (businessMetricsCollector) {
      businessMetricsCollector.stop();
      appLogger.info('Business metrics collector stopped');
    }

    // Stop service monitor
    if (serviceMonitor) {
      serviceMonitor.stop();
      appLogger.info('Service monitor stopped');
    }

    // Stop active session tracker
    if (activeSessionTracker) {
      activeSessionTracker.stop();
      appLogger.info('Active session tracker stopped');
    }

    if (idempotencyLifecycleService) {
      idempotencyLifecycleService.stop();
      appLogger.info('Idempotency lifecycle service stopped');
    }

    // Close database connections
    await disconnectDatabase();

    // Close Socket.IO
    io.close(() => {
      appLogger.info('Socket.IO closed');
    });

    // Close Sentry
    await closeSentry();

    appLogger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    appLogger.error('Error during graceful shutdown', { error: errorMessage });
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
 * Start the server automatically outside unit tests. Playwright e2e runs keep
 * NODE_ENV=test for isolated config, but opt into a real HTTP listener.
 */
if (process.env['NODE_ENV'] !== 'test' || process.env['E2E_START_SERVER'] === 'true') {
  startServer();
}

/**
 * Export app for testing
 */
export default app;
