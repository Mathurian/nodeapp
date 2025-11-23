import express, { Router } from 'express';
import {
  generateEventReport,
} from '../controllers/advancedReportingController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/advanced-reporting/event:
 *   get:
 *     summary: Generate event report
 *     tags: [Advanced Reporting]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Event report generated successfully
 */
router.get('/event', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('GENERATE_EVENT_REPORT', 'REPORT'), generateEventReport)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;