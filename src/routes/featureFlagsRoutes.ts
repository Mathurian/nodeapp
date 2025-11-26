/**
 * Feature Flags Routes
 * Admin endpoints for managing feature flags
 */

import express, { Router } from 'express';
import {
  getAllFlags,
  upsertFlag,
  deleteFlag,
  evaluateFlag,
  evaluateAllFlags,
  invalidateCache,
  invalidateAllCaches,
} from '../controllers/featureFlagsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/feature-flags:
 *   get:
 *     summary: Get all feature flags
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all feature flags
 */
router.get('/', requireRole(['SUPER_ADMIN']), getAllFlags);

/**
 * @swagger
 * /api/feature-flags/{name}:
 *   put:
 *     summary: Create or update a feature flag
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
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
 *               description:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               strategy:
 *                 type: string
 *                 enum: [ON, OFF, PERCENTAGE, USER_LIST, TENANT_LIST, GRADUAL]
 *               percentage:
 *                 type: integer
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               tenantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               targetPercentage:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Feature flag updated successfully
 */
router.put('/:name', requireRole(['SUPER_ADMIN']), upsertFlag);

/**
 * @swagger
 * /api/feature-flags/{name}:
 *   delete:
 *     summary: Delete a feature flag
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Feature flag deleted successfully
 */
router.delete('/:name', requireRole(['SUPER_ADMIN']), deleteFlag);

/**
 * @swagger
 * /api/feature-flags/{name}/evaluate:
 *   get:
 *     summary: Evaluate a feature flag for current user
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feature flag evaluation result
 */
router.get('/:name/evaluate', evaluateFlag);

/**
 * @swagger
 * /api/feature-flags/evaluate/all:
 *   get:
 *     summary: Evaluate all feature flags for current user
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All feature flag evaluations
 */
router.get('/evaluate/all', evaluateAllFlags);

/**
 * @swagger
 * /api/feature-flags/{name}/cache:
 *   delete:
 *     summary: Invalidate cache for a feature flag
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cache invalidated successfully
 */
router.delete('/:name/cache', requireRole(['SUPER_ADMIN']), invalidateCache);

/**
 * @swagger
 * /api/feature-flags/cache/all:
 *   delete:
 *     summary: Invalidate all feature flag caches
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All caches invalidated successfully
 */
router.delete('/cache/all', requireRole(['SUPER_ADMIN']), invalidateAllCaches);

export default router;

// CommonJS compatibility
module.exports = router;
