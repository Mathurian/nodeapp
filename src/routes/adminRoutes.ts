import express, { Router } from 'express';
import {
  getDatabaseTables,
  getTableStructure,
  getTableData,
  getStats,
  getLogs,
  getActiveUsers,
  getUsers,
  getEvents,
  getContests,
  getCategories,
  getScores,
  getAuditLogs,
  exportAuditLogs,
  testConnection,
  forceLogoutAllUsers,
  forceLogoutUser,
  getContestantScores
} from '../controllers/adminController';
import {
  getSettings,
  updateSettings,
  getLoggingLevels,
  updateLoggingLevel,
  getSecuritySettings,
  updateSecuritySettings,
  getBackupSettings,
  updateBackupSettings,
  getEmailSettings,
  updateEmailSettings,
  getPasswordPolicy,
  updatePasswordPolicy
} from '../controllers/settingsController';
import {
  authenticateToken,
  requireRole
} from '../middleware/auth';
import {
  logActivity
} from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/admin/database/tables:
 *   get:
 *     summary: Get database tables list
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database tables retrieved
 */
router.get("/database/tables", requireRole(["ADMIN"]), getDatabaseTables)

/**
 * @swagger
 * /api/admin/database/query:
 *   post:
 *     summary: Execute database query
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *     responses:
 *       200:
 *         description: Query executed successfully
 */
// SECURITY FIX: Route disabled due to SQL injection vulnerability (P0-1)
// router.post("/database/query", requireRole(["ADMIN"]), logActivity("EXECUTE_DATABASE_QUERY", "DATABASE"), executeDatabaseQuery)
router.use(requireRole(['ADMIN', 'ORGANIZER', 'BOARD']))

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get admin statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', getStats)

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: Get system logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 */
router.get('/logs', getLogs)

/**
 * @swagger
 * /api/admin/active-users:
 *   get:
 *     summary: Get active users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active users retrieved successfully
 */
router.get('/active-users', getActiveUsers)
router.get('/users', getUsers)
router.get('/events', getEvents)
router.get('/contests', getContests)
router.get('/categories', getCategories)
router.get('/scores', getScores)
router.get('/audit-logs', getAuditLogs)
router.post('/export-audit-logs', exportAuditLogs)
router.post('/test/:type', testConnection)
router.post('/users/force-logout-all', logActivity('FORCE_LOGOUT_ALL', 'USER'), forceLogoutAllUsers)
router.post('/users/:id/force-logout', logActivity('FORCE_LOGOUT_USER', 'USER'), forceLogoutUser)
router.get('/contestant/:contestantId/scores', getContestantScores)

// Admin settings endpoints
router.get('/settings', getSettings)
router.put('/settings', updateSettings)
router.get('/settings/logging', getLoggingLevels)
router.put('/settings/logging', updateLoggingLevel)
router.get('/settings/security', getSecuritySettings)
router.put('/settings/security', updateSecuritySettings)
router.get('/settings/backup', getBackupSettings)
router.put('/settings/backup', updateBackupSettings)
router.get('/settings/email', getEmailSettings)
router.put('/settings/email', updateEmailSettings)
router.get('/password-policy', getPasswordPolicy)
router.put('/password-policy', updatePasswordPolicy)

// Database browser routes (ADMIN only) - additional endpoints
router.get('/database/tables/:tableName/structure', requireRole(['ADMIN']), getTableStructure)
router.get('/database/tables/:tableName/data', requireRole(['ADMIN']), getTableData)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;