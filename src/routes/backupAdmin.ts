import express from 'express';
import BackupAdminController from '../controllers/BackupAdminController';
import { authenticateToken, checkRoles } from '../middleware/auth';

const router = express.Router();

// All backup admin routes require authentication and ADMIN role
router.use(authenticateToken);
router.use(checkRoles(['ADMIN']));

/**
 * @swagger
 * /api/backup-admin:
 *   get:
 *     summary: List all backup records
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of backup records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [FULL, INCREMENTAL, DIFFERENTIAL]
 *                       status:
 *                         type: string
 *                         enum: [SUCCESS, FAILED, IN_PROGRESS]
 *                       size:
 *                         type: integer
 *                         description: Backup size in bytes
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.get('/', BackupAdminController.listBackups.bind(BackupAdminController));

/**
 * @swagger
 * /api/backup-admin/stats:
 *   get:
 *     summary: Get backup statistics
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalBackups:
 *                   type: integer
 *                 successfulBackups:
 *                   type: integer
 *                 failedBackups:
 *                   type: integer
 *                 totalSize:
 *                   type: integer
 *                   description: Total backup size in bytes
 *                 averageSize:
 *                   type: integer
 *                 lastBackupAt:
 *                   type: string
 *                   format: date-time
 */
router.get('/stats', BackupAdminController.getStats.bind(BackupAdminController));

/**
 * @swagger
 * /api/backup-admin/latest:
 *   get:
 *     summary: Get latest backup record
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Latest backup record
 *       404:
 *         description: No backups found
 */
router.get('/latest', BackupAdminController.getLatest.bind(BackupAdminController));

/**
 * @swagger
 * /api/backup-admin/health:
 *   get:
 *     summary: Get backup system health status
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [HEALTHY, WARNING, CRITICAL]
 *                 lastBackupAge:
 *                   type: integer
 *                   description: Hours since last backup
 *                 recentFailures:
 *                   type: integer
 *                 issues:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/health', BackupAdminController.getHealth.bind(BackupAdminController));

/**
 * @swagger
 * /api/backup-admin/trend:
 *   get:
 *     summary: Get backup size trend over time
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Backup size trend data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trend:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       size:
 *                         type: integer
 */
router.get('/trend', BackupAdminController.getSizeTrend.bind(BackupAdminController));

/**
 * @swagger
 * /api/backup-admin/files:
 *   get:
 *     summary: List backup files on disk
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of backup files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                       size:
 *                         type: integer
 *                       path:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */
router.get('/files', BackupAdminController.listBackupFiles.bind(BackupAdminController));

/**
 * @swagger
 * /api/backup-admin/verify:
 *   post:
 *     summary: Trigger backup verification process
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     description: Verifies integrity of recent backups
 *     responses:
 *       200:
 *         description: Verification initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 verificationId:
 *                   type: string
 *       500:
 *         description: Verification failed to start
 */
router.post('/verify', BackupAdminController.verifyBackups.bind(BackupAdminController));

/**
 * @swagger
 * /api/backup-admin/full:
 *   post:
 *     summary: Trigger manual full backup
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     description: Initiates a full database and file backup immediately
 *     responses:
 *       200:
 *         description: Backup initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 backupId:
 *                   type: string
 *       500:
 *         description: Backup failed to start
 */
router.post('/full', BackupAdminController.triggerFullBackup.bind(BackupAdminController));

/**
 * @swagger
 * /api/backup-admin/log:
 *   post:
 *     summary: Log backup completion (system use)
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     description: Called by backup scripts to log backup completion status
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - status
 *               - size
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [FULL, INCREMENTAL, DIFFERENTIAL]
 *               status:
 *                 type: string
 *                 enum: [SUCCESS, FAILED]
 *               size:
 *                 type: integer
 *                 description: Backup size in bytes
 *               duration:
 *                 type: integer
 *                 description: Backup duration in seconds
 *               errorMessage:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Backup log created
 *       400:
 *         description: Invalid backup log data
 */
router.post('/log', BackupAdminController.logBackup.bind(BackupAdminController));

/**
 * @swagger
 * /api/backup-admin/alert:
 *   post:
 *     summary: Receive alert from backup scripts (system use)
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     description: Called by backup scripts to report critical issues
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - severity
 *               - message
 *             properties:
 *               severity:
 *                 type: string
 *                 enum: [INFO, WARNING, ERROR, CRITICAL]
 *               message:
 *                 type: string
 *               details:
 *                 type: object
 *     responses:
 *       200:
 *         description: Alert received and processed
 */
router.post('/alert', BackupAdminController.receiveAlert.bind(BackupAdminController));

/**
 * @swagger
 * /api/backup-admin/logs/cleanup:
 *   delete:
 *     summary: Cleanup old backup logs
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     description: Deletes backup logs older than retention period
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 90
 *         description: Delete logs older than this many days
 *     responses:
 *       200:
 *         description: Cleanup completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 deletedCount:
 *                   type: integer
 */
router.delete('/logs/cleanup', BackupAdminController.cleanupLogs.bind(BackupAdminController));

export default router;
