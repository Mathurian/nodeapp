import express, { Router } from 'express';
import {
  getPrintTemplates,
  createPrintTemplate,
  printEventReport,
  printContestResults,
  printJudgePerformance,
  printContestantReport,
  printJudgeReport,
  printCategoryReport,
  printContestReport,
  printArchivedContestReport
} from '../controllers/printController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/print/templates:
 *   get:
 *     summary: Get print templates
 *     tags: [Print]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Print templates retrieved successfully
 *   post:
 *     summary: Create print template
 *     tags: [Print]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Template created successfully
 */
router.get('/templates', getPrintTemplates)
router.post('/templates', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_PRINT_TEMPLATE', 'TEMPLATE'), createPrintTemplate)

// Print functionality
router.post('/event-report', requireRole(['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR']), logActivity('PRINT_EVENT_REPORT', 'PRINT'), printEventReport)
router.post('/contest-results', requireRole(['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR']), logActivity('PRINT_CONTEST_RESULTS', 'PRINT'), printContestResults)
router.post('/judge-performance', requireRole(['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR']), logActivity('PRINT_JUDGE_PERFORMANCE', 'PRINT'), printJudgePerformance)

// Direct print report routes
router.get('/contestant/:id', printContestantReport)
router.get('/judge/:id', printJudgeReport)
router.get('/category/:id', printCategoryReport)
router.get('/contest/:id', printContestReport)
router.get('/archived-contest/:id', printArchivedContestReport)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;