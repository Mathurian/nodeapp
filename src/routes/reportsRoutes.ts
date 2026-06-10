import express from 'express';
import {
  exportToPDF,
  exportToExcel,
  exportToCSV,
  getTemplates,
  createTemplate,
  generateReport,
  getContestantReportOptions,
  sendReportEmail,
  getReportInstances,
  deleteReportInstance,
  downloadReportInstance,
} from '../controllers/reportsController';
import { authenticateToken, requirePermission, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/reports/templates:
 *   get:
 *     summary: Get report templates
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report templates retrieved successfully
 *   post:
 *     summary: Create report template
 *     tags: [Reports]
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
router.get('/templates', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('reports:read'), getTemplates);
router.post('/templates', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('reports:write'), logActivity('CREATE_REPORT_TEMPLATE', 'REPORT'), createTemplate);

/**
 * @swagger
 * /api/reports/generate:
 *   post:
 *     summary: Generate report
 *     tags: [Reports]
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
 *         description: Report generated successfully
 */
router.post('/generate', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('reports:write'), logActivity('GENERATE_REPORT', 'REPORT'), generateReport);
router.get('/contest/:contestId/contestants', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('reports:read'), getContestantReportOptions);

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get report instances
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report instances retrieved successfully
 */
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('reports:read'), getReportInstances); // Main reports endpoint
router.get('/instances', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('reports:read'), getReportInstances);
router.delete('/instances/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('reports:write'), logActivity('DELETE_REPORT_INSTANCE', 'REPORT'), deleteReportInstance);
router.post('/send-email', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('reports:write'), logActivity('EMAIL_REPORT', 'REPORT'), sendReportEmail);

// Download/View route
router.get('/:id/download', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('reports:read'), downloadReportInstance);

// Export routes - these should come AFTER specific routes like /generate
// or they will match /generate as an :id parameter
router.post('/:id/export/pdf', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('reports:read'), logActivity('EXPORT_REPORT_PDF', 'REPORT'), exportToPDF);
router.post('/:id/export/excel', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('reports:read'), logActivity('EXPORT_REPORT_EXCEL', 'REPORT'), exportToExcel);
router.post('/:id/export/csv', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('reports:read'), logActivity('EXPORT_REPORT_CSV', 'REPORT'), exportToCSV);

export default router;

// CommonJS compatibility for server.js
module.exports = router;
