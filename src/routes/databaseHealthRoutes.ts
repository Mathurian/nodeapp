/**
 * Database Health Routes
 * P2-4: Routes for database health monitoring
 */

import { Router } from 'express';
import { getHealthStatus, getDetailedMetrics } from '../controllers/databaseHealthController';

const router = Router();

/**
 * GET /health/database
 * Get database health status
 * Public endpoint for monitoring
 */
router.get('/database', getHealthStatus);

/**
 * GET /health/database/metrics
 * Get detailed database metrics
 * Requires authentication (admin only)
 */
router.get('/database/metrics', getDetailedMetrics);

export default router;
