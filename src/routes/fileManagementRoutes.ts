import express, { Router } from 'express';
import {
  getFilesWithFilters,
  getFileSearchSuggestions,
  getFileAnalytics,
  checkFileIntegrity,
  bulkCheckFileIntegrity
} from '../controllers/fileManagementController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/file-management/files:
 *   get:
 *     summary: Get files with filters
 *     tags: [File Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 */
router.get('/files', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), getFilesWithFilters)

// File search and suggestions
router.get('/files/search', getFileSearchSuggestions)

// File analytics
router.get('/files/analytics', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), getFileAnalytics)

// File integrity checks
router.get('/files/:fileId/integrity', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), checkFileIntegrity)
router.post('/files/integrity/bulk', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), logActivity('BULK_INTEGRITY_CHECK', 'FILE'), bulkCheckFileIntegrity)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;