import express, { Router } from 'express';
import {
  getPerformanceStats,
  getSystemMetrics,
  getHealthCheck
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
router.get('/metrics', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), getSystemMetrics)

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
router.get('/stats', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), getPerformanceStats)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;