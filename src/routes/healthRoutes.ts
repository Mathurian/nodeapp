/**
 * Health check routes for monitoring system status
 * Provides endpoints for monitoring database, cache, and application health
 */

import express, { Router, Request, Response } from 'express';
import { env } from '../config/env';
import prisma from '../utils/prisma';
import { env } from '../config/env';
import { cache } from '../utils/cache';
import { env } from '../config/env';

const router: Router = express.Router();

/**
 * Basic health check endpoint
 * Returns 200 OK if application is running
 * @swagger
 * /api/health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is healthy
 */
router.get('/health', async (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'event-manager'
  })
})

/**
 * Detailed health check endpoint
 * Tests connectivity to all dependent services
 */
router.get('/health/detailed', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const health: {
    status: string;
    timestamp: string;
    uptime: number;
    service: string;
    version: string;
    environment: string;
    checks: Record<string, any>;
    responseTime?: number;
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'event-manager',
    version: process.env['npm_package_version'] || '1.0.0',
    environment: env.get('NODE_ENV') || 'development',
    checks: {}
  };

  // Database health check
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1 as health_check`
    const dbDuration = Date.now() - dbStart

    health.checks['database'] = {
      status: 'healthy',
      responseTime: dbDuration,
      message: 'Database connection successful'
    }
  } catch (error: unknown) {
    const errorObj = error as { message?: string };
    health.status = 'unhealthy';
    health.checks['database'] = {
      status: 'unhealthy',
      error: errorObj.message,
      message: 'Database connection failed'
    };
  }

  // Cache health check
  try {
    const cacheStart = Date.now()
    const testKey = '__health_check__'
    const testValue = 'test'

    cache.set(testKey, testValue, 1) // 1 second TTL
    const retrieved = cache.get(testKey)
    cache.delete(testKey)

    const cacheDuration = Date.now() - cacheStart
    const cacheWorking = retrieved === testValue

    health.checks['cache'] = {
      status: cacheWorking ? 'healthy' : 'degraded',
      responseTime: cacheDuration,
      size: cache.getStats().size,
      message: cacheWorking ? 'Cache working correctly' : 'Cache test failed'
    }

    if (!cacheWorking) {
      health.status = 'degraded'
    }
  } catch (error: unknown) {
    const errorObj = error as { message?: string };
    health.status = 'degraded';
    health.checks['cache'] = {
      status: 'unhealthy',
      error: errorObj.message,
      message: 'Cache check failed'
    };
  }

  // Memory health check
  const memory = process.memoryUsage()
  const memoryUsageMB = {
    rss: Math.round(memory.rss / 1024 / 1024),
    heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
    external: Math.round(memory.external / 1024 / 1024)
  }

  const heapUsagePercent = (memory.heapUsed / memory.heapTotal) * 100

  health.checks['memory'] = {
    status: heapUsagePercent > 90 ? 'critical' : heapUsagePercent > 75 ? 'warning' : 'healthy',
    usageMB: memoryUsageMB,
    heapUsagePercent: Math.round(heapUsagePercent * 100) / 100,
    message: `Memory usage at ${Math.round(heapUsagePercent)}%`
  }

  if (heapUsagePercent > 90) {
    health.status = 'critical'
  } else if (heapUsagePercent > 75 && health.status === 'healthy') {
    health.status = 'warning'
  }

  // Overall response time
  health.responseTime = Date.now() - startTime

  // Determine HTTP status code
  const statusCode = health.status === 'healthy' ? 200 :
                     health.status === 'degraded' ? 200 :
                     health.status === 'warning' ? 200 :
                     503

  res.status(statusCode).json(health)
})

/**
 * Liveness probe endpoint
 * Simple check that the application process is alive
 * Used by Kubernetes/Docker for basic liveness detection
 */
router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  })
})

/**
 * Readiness probe endpoint
 * Checks if the application is ready to accept traffic
 * Tests database connectivity as minimum requirement
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    // Quick database connectivity check
    await prisma.$queryRaw`SELECT 1 as ready_check`

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      message: 'Application is ready to accept traffic'
    })
  } catch (error: unknown) {
    const errorObj = error as { message?: string };
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      message: 'Application is not ready to accept traffic',
      error: errorObj.message || 'Unknown error'
    });
    return;
  }
})

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
