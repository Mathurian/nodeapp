/**
 * Permissions Routes
 * Routes for managing role-based permissions
 */

import express, { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getAllPermissions,
  getPermissionAuditLogs,
  getPermissionStats,
  getAllPermissionScopes,
  updatePermission,
  updatePermissionScope,
  warmCache,
  exportPermissions
} from '../controllers/permissionsController';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role (optional)
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), getAllPermissions);
router.get('/scopes', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), getAllPermissionScopes);
router.get('/audit-logs', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), getPermissionAuditLogs);

/**
 * @swagger
 * /api/permissions/stats:
 *   get:
 *     summary: Get permission statistics
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permission statistics
 */
router.get('/stats', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), getPermissionStats);

/**
 * @swagger
 * /api/permissions:
 *   put:
 *     summary: Update a permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               resource:
 *                 type: string
 *               operation:
 *                 type: string
 *               allowed:
 *                 type: boolean
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Permission updated successfully
 */
router.put('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), updatePermission);
router.put('/scopes', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), updatePermissionScope);

/**
 * @swagger
 * /api/permissions/cache/warm:
 *   post:
 *     summary: Warm permission cache
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache warmed successfully
 */
router.post('/cache/warm', requireRole(['SUPER_ADMIN', 'ADMIN']), warmCache);

/**
 * @swagger
 * /api/permissions/export:
 *   get:
 *     summary: Export permissions to CSV
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role (optional)
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get('/export', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), exportPermissions);

export default router;

// CommonJS compatibility
module.exports = router;
