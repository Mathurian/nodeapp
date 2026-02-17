import express, { Router } from 'express';
const router: Router = express.Router();
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getLogFiles,
  getLogFileContents,
  downloadLogFile,
  cleanupOldLogs,
  deleteLogFile
} from '../controllers/logFilesController';

// All log file routes require authentication.
// Read endpoints are available to operational roles, while destructive operations
// are restricted to platform administrators.
router.use(authenticateToken)
const logReadRoles = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'];
const logAdminRoles = ['SUPER_ADMIN', 'ADMIN'];

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Get list of log files (alias for /files)
 *     tags: [Log Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Log files retrieved successfully
 */
router.get('/', requireRole(logReadRoles), getLogFiles)

/**
 * @swagger
 * /api/log-files/files:
 *   get:
 *     summary: Get list of log files
 *     tags: [Log Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Log files retrieved successfully
 */
router.get('/files', requireRole(logReadRoles), getLogFiles)

// Get contents of a specific log file
router.get('/files/:filename', requireRole(logReadRoles), getLogFileContents)

// Download a log file
router.get('/files/:filename/download', requireRole(logReadRoles), downloadLogFile)

// Delete a specific log file
router.delete('/files/:filename', requireRole(logAdminRoles), deleteLogFile)

// Cleanup old log files
router.post('/cleanup', requireRole(logAdminRoles), cleanupOldLogs)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
