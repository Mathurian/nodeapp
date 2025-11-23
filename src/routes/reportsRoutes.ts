import express from 'express';
import {
  exportToPDF,
  exportToExcel,
  exportToCSV,
  getTemplates,
  createTemplate,
  generateReport,
  sendReportEmail,
  getReportInstances,
  deleteReportInstance,
} from '../controllers/reportsController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import prisma from '../utils/prisma';
import { createLogger } from '../utils/logger';

const logger = createLogger('ReportsRoutes');

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
router.get('/templates', getTemplates);
router.post('/templates', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_REPORT_TEMPLATE', 'REPORT'), createTemplate);

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
router.post('/generate', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'JUDGE']), logActivity('GENERATE_REPORT', 'REPORT'), generateReport);

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
router.get('/', getReportInstances); // Main reports endpoint
router.get('/instances', getReportInstances);
router.delete('/instances/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('DELETE_REPORT_INSTANCE', 'REPORT'), deleteReportInstance);
router.post('/send-email', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR']), logActivity('EMAIL_REPORT', 'REPORT'), sendReportEmail);

// Download/View route
router.get('/:id/download', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'JUDGE']), async (req, res): Promise<any> => {
  try {
    const { id } = req.params;
    const reportInstance = await prisma.reportInstance.findUnique({
      where: { id }
    });

    if (!reportInstance) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Parse the data field safely
    let parsedData: any = {};
    try {
      if (typeof reportInstance.data === 'string' && reportInstance.data !== '{}' && reportInstance.data.trim() !== '') {
        parsedData = JSON.parse(reportInstance.data);
      } else if (reportInstance.data && typeof reportInstance.data === 'object') {
        parsedData = reportInstance.data;
      } else {
        parsedData = {
          message: 'No report data available',
          reportType: reportInstance.type,
          generatedAt: reportInstance.generatedAt
        };
      }
    } catch (parseError) {
      logger.error('Failed to parse report data', { error: parseError });
      parsedData = {
        error: 'Failed to parse report data'
      };
    }

    // Return report data with parsed data
    res.json({
      data: {
        id: reportInstance.id,
        name: reportInstance.name,
        type: reportInstance.type,
        format: reportInstance.format || 'PDF',
        generatedAt: reportInstance.generatedAt,
        generatedBy: reportInstance.generatedById || 'System',
        data: parsedData
      }
    });
  } catch (error) {
    logger.error('Download report error', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export routes - these should come AFTER specific routes like /generate
// or they will match /generate as an :id parameter
router.post('/:id/export/pdf', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'JUDGE']), logActivity('EXPORT_REPORT_PDF', 'REPORT'), exportToPDF);
router.post('/:id/export/excel', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'JUDGE']), logActivity('EXPORT_REPORT_EXCEL', 'REPORT'), exportToExcel);
router.post('/:id/export/csv', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'JUDGE']), logActivity('EXPORT_REPORT_CSV', 'REPORT'), exportToCSV);

export default router;

// CommonJS compatibility for server.js
module.exports = router;
