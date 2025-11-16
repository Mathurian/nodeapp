import express, { Router } from 'express';
import { getNavigationData } from '../middleware/navigation';
import { authenticateToken } from '../middleware/auth';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/navigation:
 *   get:
 *     summary: Get navigation data for authenticated user
 *     tags: [Navigation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Navigation data retrieved successfully
 */
router.get('/', getNavigationData)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;