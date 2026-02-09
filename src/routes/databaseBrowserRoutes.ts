import express, { Router } from 'express';
const router: Router = express.Router();
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import {
  executeQuery,
  getTables,
  getTableSchema,
  getTableData,
  getQueryHistory,
  getRecord,
  updateRecord,
  deleteRecord,
  createRecord
} from '../controllers/databaseBrowserController';

// All database browser routes require authentication
router.use(authenticateToken);

// Read-only routes - allow ADMIN and ORGANIZER
const readOnlyRoles = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'];

/**
 * @swagger
 * /api/database-browser/query:
 *   post:
 *     summary: Execute database query (DISABLED)
 *     tags: [Database Browser]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       403:
 *         description: Feature disabled for security
 */
router.post(
  '/query',
  requireRole(readOnlyRoles),
  logActivity('DATABASE_QUERY', 'DATABASE'),
  executeQuery
);

/**
 * @swagger
 * /api/database-browser/tables:
 *   get:
 *     summary: Get list of database tables
 *     tags: [Database Browser]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tables retrieved successfully
 */
router.get('/tables', requireRole(readOnlyRoles), getTables);

// Get table schema
router.get('/tables/:tableName/schema', requireRole(readOnlyRoles), getTableSchema);

// Get table data with pagination
router.get('/tables/:tableName/data', requireRole(readOnlyRoles), getTableData);

// Alias for getting table data (frontend compatibility)
router.get('/tables/:tableName', requireRole(readOnlyRoles), getTableData);

// Get query history
router.get('/history', requireRole(readOnlyRoles), getQueryHistory);

// ============================================================================
// SUPER_ADMIN ONLY - Edit Operations
// These routes allow direct database record manipulation
// All operations are logged for audit purposes
// ============================================================================

/**
 * @swagger
 * /api/database-browser/tables/{tableName}/records:
 *   post:
 *     summary: Create a new record in a table (SUPER_ADMIN only)
 *     tags: [Database Browser]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Record created successfully
 *       403:
 *         description: Forbidden - SUPER_ADMIN role required
 */
router.post(
  '/tables/:tableName/records',
  requireRole(['SUPER_ADMIN']),
  logActivity('DATABASE_RECORD_CREATE', 'DATABASE'),
  createRecord
);

/**
 * @swagger
 * /api/database-browser/tables/{tableName}/records/{recordId}:
 *   get:
 *     summary: Get a single record by ID (SUPER_ADMIN only)
 *     tags: [Database Browser]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record retrieved successfully
 */
router.get(
  '/tables/:tableName/records/:recordId',
  requireRole(['SUPER_ADMIN']),
  getRecord
);

/**
 * @swagger
 * /api/database-browser/tables/{tableName}/records/{recordId}:
 *   put:
 *     summary: Update a record by ID (SUPER_ADMIN only)
 *     tags: [Database Browser]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Record updated successfully
 *       403:
 *         description: Forbidden - SUPER_ADMIN role required
 */
router.put(
  '/tables/:tableName/records/:recordId',
  requireRole(['SUPER_ADMIN']),
  logActivity('DATABASE_RECORD_UPDATE', 'DATABASE'),
  updateRecord
);

/**
 * @swagger
 * /api/database-browser/tables/{tableName}/records/{recordId}:
 *   delete:
 *     summary: Delete a record by ID (SUPER_ADMIN only)
 *     tags: [Database Browser]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record deleted successfully
 *       403:
 *         description: Forbidden - SUPER_ADMIN role required
 */
router.delete(
  '/tables/:tableName/records/:recordId',
  requireRole(['SUPER_ADMIN']),
  logActivity('DATABASE_RECORD_DELETE', 'DATABASE'),
  deleteRecord
);

export default router;

// CommonJS compatibility for server.ts
module.exports = router;