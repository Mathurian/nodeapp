import express, { Router } from 'express';
import {
  getPerformanceStats,
  getSystemMetrics,
  getMonitoringDashboard
} from '../controllers/performanceController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/performance/metrics:
 *   get:
 *     summary: Get system metrics
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System metrics retrieved successfully
 */
router.get('/metrics', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), getSystemMetrics)

/**
 * @swagger
 * /api/performance/stats:
 *   get:
 *     summary: Get performance statistics
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance statistics retrieved successfully
 */
router.get('/stats', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), getPerformanceStats)

/**
 * @swagger
 * /api/performance/dashboard:
 *   get:
 *     summary: Get comprehensive monitoring dashboard
 *     description: Aggregates circuit breaker stats, Prometheus metrics, health checks, cache stats, database metrics, and performance data
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monitoring dashboard retrieved successfully
 */
router.get('/dashboard', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), getMonitoringDashboard)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;