import express from 'express';
import BackupAdminController from '../controllers/BackupAdminController';
import { authenticateToken, checkRoles } from '../middleware/auth';

const router = express.Router();

// All backup admin routes require authentication and ADMIN role
router.use(authenticateToken);
router.use(checkRoles(['ADMIN']));

// Get backup history
router.get('/', BackupAdminController.listBackups.bind(BackupAdminController));

// Get backup statistics
router.get('/stats', BackupAdminController.getStats.bind(BackupAdminController));

// Get latest backup
router.get('/latest', BackupAdminController.getLatest.bind(BackupAdminController));

// Get backup health
router.get('/health', BackupAdminController.getHealth.bind(BackupAdminController));

// Get backup size trend
router.get('/trend', BackupAdminController.getSizeTrend.bind(BackupAdminController));

// List backup files on disk
router.get('/files', BackupAdminController.listBackupFiles.bind(BackupAdminController));

// Trigger backup verification
router.post('/verify', BackupAdminController.verifyBackups.bind(BackupAdminController));

// Trigger manual full backup
router.post('/full', BackupAdminController.triggerFullBackup.bind(BackupAdminController));

// Log backup (called by backup scripts - should also check for system token)
router.post('/log', BackupAdminController.logBackup.bind(BackupAdminController));

// Receive alerts from backup scripts
router.post('/alert', BackupAdminController.receiveAlert.bind(BackupAdminController));

// Cleanup old backup logs
router.delete('/logs/cleanup', BackupAdminController.cleanupLogs.bind(BackupAdminController));

export default router;
