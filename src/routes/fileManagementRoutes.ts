import express, { Router } from 'express';
import {
  getFilesWithFilters,
  getFileSearchSuggestions,
  getFileAnalytics,
  checkFileIntegrity,
  bulkCheckFileIntegrity
} from '../controllers/fileManagementController';
import { authenticateToken, requirePermission, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { validate, fileIdParamSchema } from '../middleware/validation';

const router: Router = express.Router();
const requireFilesRead = requirePermission('files:read');
const requireFilesWrite = requirePermission('files:write');

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
router.get('/files', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireFilesRead, getFilesWithFilters)

// File search and suggestions
router.get('/files/search', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireFilesRead, getFileSearchSuggestions)

// File analytics
router.get('/files/analytics', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireFilesRead, getFileAnalytics)

// File integrity checks
router.get('/files/:fileId/integrity', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireFilesRead, validate(fileIdParamSchema, 'params'), checkFileIntegrity)
router.post('/files/integrity/bulk', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireFilesWrite, logActivity('BULK_INTEGRITY_CHECK', 'FILE'), bulkCheckFileIntegrity)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
