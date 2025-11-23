import express, { Router } from 'express';
const router: Router = express.Router();
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import {
  executeQuery,
  getTables,
  getTableSchema,
  getTableData,
  getQueryHistory
} from '../controllers/databaseBrowserController';

// All database browser routes require authentication and ADMIN/ORGANIZER role
router.use(authenticateToken)
router.use(requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']))

/**
 * @swagger
 * /api/database-browser/query:
 *   post:
 *     summary: Execute database query
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
 *       200:
 *         description: Query executed successfully
 */
router.post(
  '/query', 
  logActivity('DATABASE_QUERY', 'DATABASE'), 
  executeQuery
)

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
router.get('/tables', getTables)

// Get table schema
router.get('/tables/:tableName/schema', getTableSchema)

// Get table data
router.get('/tables/:tableName/data', getTableData)

// Alias for getting table data (frontend compatibility)
router.get('/tables/:tableName', getTableData)

// Get query history
router.get('/history', getQueryHistory)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;