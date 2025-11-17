import express, { Router } from 'express';
import {
  createFileBackup,
  listFileBackups,
  downloadBackup
} from '../controllers/fileBackupController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/file-backups:
 *   get:
 *     summary: List file backups
 *     tags: [File Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File backups retrieved successfully
 *   post:
 *     summary: Create file backup
 *     tags: [File Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: File backup created successfully
 */
router.post('/create', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), logActivity('CREATE_FILE_BACKUP', 'BACKUP'), createFileBackup)
router.get('/', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), listFileBackups)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;