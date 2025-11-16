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

// All log file routes require authentication and ADMIN/ORGANIZER/BOARD role
// IMPORTANT: authenticateToken MUST run first to set req.user
// requireRole checks req.user, so order is critical
router.use(authenticateToken)
// ADMIN has access to everything - requireRole handles this automatically
router.use(requireRole(['ADMIN', 'ORGANIZER', 'BOARD']))

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
router.get('/files', getLogFiles)

// Get contents of a specific log file
router.get('/files/:filename', getLogFileContents)

// Download a log file
router.get('/files/:filename/download', downloadLogFile)

// Delete a specific log file
router.delete('/files/:filename', deleteLogFile)

// Cleanup old log files
router.post('/cleanup', cleanupOldLogs)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;