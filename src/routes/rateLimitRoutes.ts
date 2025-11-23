/**
 * Rate Limit Routes
 * API endpoints for rate limit management
 */

import express, { Router } from 'express';
import { getAllConfigs, getConfig, updateConfig, getMyRateLimitStatus } from '../controllers/rateLimitController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/rate-limits:
 *   get:
 *     summary: Get all rate limit configurations
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rate limit configurations
 */
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN']), getAllConfigs);

/**
 * @swagger
 * /api/rate-limits/my-status:
 *   get:
 *     summary: Get current user's rate limit status
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rate limit status
 */
router.get('/my-status', getMyRateLimitStatus);

/**
 * @swagger
 * /api/rate-limits/{tier}:
 *   get:
 *     summary: Get rate limit configuration for a tier
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tier
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rate limit configuration
 *   put:
 *     summary: Update rate limit configuration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tier
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               points:
 *                 type: number
 *               duration:
 *                 type: number
 *               blockDuration:
 *                 type: number
 *     responses:
 *       200:
 *         description: Configuration updated
 */
router.get('/:tier', requireRole(['SUPER_ADMIN', 'ADMIN']), getConfig);
router.put('/:tier', requireRole(['SUPER_ADMIN', 'ADMIN']), updateConfig);

export default router;

// CommonJS compatibility
module.exports = router;

