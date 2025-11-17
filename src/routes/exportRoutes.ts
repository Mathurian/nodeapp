import express, { Router } from 'express';
import {
  exportEventToExcel,
  getExportHistory
} from '../controllers/exportController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/export/event/excel:
 *   post:
 *     summary: Export event to Excel
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Event exported successfully
 */
router.post('/event/excel', requireRole(['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR']), logActivity('EXPORT_EVENT_EXCEL', 'EXPORT'), exportEventToExcel)

// Export history
router.get('/history', getExportHistory)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;