/**
 * DR (Disaster Recovery) Routes
 */

import { Router } from 'express';
import * as drController from '../controllers/drController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// All DR routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/dr/config:
 *   get:
 *     summary: Get DR configuration
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: DR configuration retrieved
 */
router.get('/config', requireRole(['ADMIN']), drController.getDRConfig);

/**
 * @swagger
 * /api/dr/config/:id:
 *   put:
 *     summary: Update DR configuration
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: DR configuration updated
 */
router.put('/config/:id', requireRole(['ADMIN']), drController.updateDRConfig);

/**
 * @swagger
 * /api/dr/schedules:
 *   get:
 *     summary: List backup schedules
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of backup schedules
 *   post:
 *     summary: Create backup schedule
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Backup schedule created
 */
router.get('/schedules', requireRole(['ADMIN']), drController.listBackupSchedules);
router.post('/schedules', requireRole(['ADMIN']), drController.createBackupSchedule);

/**
 * @swagger
 * /api/dr/schedules/:id:
 *   put:
 *     summary: Update backup schedule
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup schedule updated
 *   delete:
 *     summary: Delete backup schedule
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup schedule deleted
 */
router.put('/schedules/:id', requireRole(['ADMIN']), drController.updateBackupSchedule);
router.delete('/schedules/:id', requireRole(['ADMIN']), drController.deleteBackupSchedule);

/**
 * @swagger
 * /api/dr/targets:
 *   get:
 *     summary: List backup targets
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of backup targets
 *   post:
 *     summary: Create backup target
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Backup target created
 */
router.get('/targets', requireRole(['ADMIN']), drController.listBackupTargets);
router.post('/targets', requireRole(['ADMIN']), drController.createBackupTarget);

/**
 * @swagger
 * /api/dr/targets/:id:
 *   put:
 *     summary: Update backup target
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup target updated
 *   delete:
 *     summary: Delete backup target
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup target deleted
 */
router.put('/targets/:id', requireRole(['ADMIN']), drController.updateBackupTarget);
router.delete('/targets/:id', requireRole(['ADMIN']), drController.deleteBackupTarget);

/**
 * @swagger
 * /api/dr/targets/:id/verify:
 *   post:
 *     summary: Verify backup target connectivity
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup target verification result
 */
router.post('/targets/:id/verify', requireRole(['ADMIN']), drController.verifyBackupTarget);

/**
 * @swagger
 * /api/dr/backup/execute:
 *   post:
 *     summary: Execute backup manually
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup execution result
 */
router.post('/backup/execute', requireRole(['ADMIN']), drController.executeBackup);

/**
 * @swagger
 * /api/dr/test/execute:
 *   post:
 *     summary: Execute DR test
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: DR test execution result
 */
router.post('/test/execute', requireRole(['ADMIN']), drController.executeDRTest);

/**
 * @swagger
 * /api/dr/metrics:
 *   get:
 *     summary: Get DR metrics
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: DR metrics
 */
router.get('/metrics', requireRole(['ADMIN']), drController.getDRMetrics);

/**
 * @swagger
 * /api/dr/dashboard:
 *   get:
 *     summary: Get DR dashboard summary
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: DR dashboard data
 */
router.get('/dashboard', requireRole(['ADMIN']), drController.getDRDashboard);

/**
 * @swagger
 * /api/dr/rto-rpo:
 *   get:
 *     summary: Check RTO/RPO violations
 *     tags: [Disaster Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: RTO/RPO status
 */
router.get('/rto-rpo', requireRole(['ADMIN']), drController.checkRTORPO);

export default router;
