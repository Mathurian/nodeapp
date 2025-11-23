import express, { Router } from 'express';
import {
  getErrorStatistics,
} from '../controllers/errorHandlingController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/error-handling/statistics:
 *   get:
 *     summary: Get error statistics
 *     tags: [Error Handling]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Error statistics retrieved successfully
 */
router.get('/statistics', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), getErrorStatistics)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;