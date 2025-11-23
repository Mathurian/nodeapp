import express, { Router } from 'express';
const router: Router = express.Router();
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getCacheStats,
  flushCache,
  deleteCacheKey,
  deleteCachePattern,
  getCacheStatus,
  getCacheKeys
} from '../controllers/cacheController';

// All cache routes require authentication and ADMIN/ORGANIZER role
router.use(authenticateToken)
router.use(requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']))

/**
 * @swagger
 * /api/cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache statistics retrieved successfully
 */
router.get('/stats', getCacheStats)

/**
 * @swagger
 * /api/cache/status:
 *   get:
 *     summary: Get cache status
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache status retrieved successfully
 */
router.get('/status', getCacheStatus)

/**
 * @swagger
 * /api/cache/keys:
 *   get:
 *     summary: Get all cache keys
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache keys retrieved successfully
 */
router.get('/keys', getCacheKeys)

// Flush all cache
router.post('/flush', flushCache)

// Delete specific cache key
router.delete('/key/:key', deleteCacheKey)

// Delete cache keys by pattern
router.post('/pattern', deleteCachePattern)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;