import express, { Router } from 'express';
import multer from 'multer';
import {
  createBackup,
  restoreBackup,
  listBackups,
  getBackupSettings,
  createBackupSetting,
  updateBackupSetting,
  deleteBackupSetting,
  runScheduledBackup,
  getActiveSchedules,
  debugBackupSettings
} from '../controllers/backupController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

const upload = multer({ dest: 'temp/' })

// Apply authentication to all routes - MUST be first
router.use(authenticateToken)

// IMPORTANT: ADMIN users have access to ALL backup routes - requireRole handles this
// All routes below require authentication (handled by router.use above)

/**
 * @swagger
 * /api/backups:
 *   get:
 *     summary: List all backups
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backups listed successfully
 *   post:
 *     summary: Create a backup
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Backup created successfully
 */
router.get('/', listBackups) // Admin can list backups
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_BACKUP', 'BACKUP'), createBackup)
router.post('/create', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_BACKUP', 'BACKUP'), createBackup)

/**
 * @swagger
 * /api/backups/restore:
 *   post:
 *     summary: Restore a backup
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               backup:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Backup restored successfully
 */
router.post('/restore', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), upload.single('backup'), logActivity('RESTORE_BACKUP', 'BACKUP'), restoreBackup)

/**
 * @swagger
 * /api/backups/settings:
 *   get:
 *     summary: Get backup settings
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup settings retrieved successfully
 */
router.get('/settings', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), getBackupSettings)
router.post('/settings', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), logActivity('CREATE_BACKUP_SETTING', 'BACKUP'), createBackupSetting)
router.put('/settings/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), logActivity('UPDATE_BACKUP_SETTING', 'BACKUP'), updateBackupSetting)
router.delete('/settings/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), logActivity('DELETE_BACKUP_SETTING', 'BACKUP'), deleteBackupSetting)

// Debug/test endpoints for scheduled backups
router.post('/settings/test/run', requireRole(['SUPER_ADMIN', 'ADMIN']), logActivity('TEST_SCHEDULED_BACKUP', 'BACKUP'), runScheduledBackup)
router.get('/schedules/active', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), getActiveSchedules)
router.get('/settings/debug', requireRole(['SUPER_ADMIN', 'ADMIN']), debugBackupSettings)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;