import express, { Router } from 'express';
const router: Router = express.Router();
import { authenticateToken, requirePermission, requireRole } from '../middleware/auth';
import {
  getAllRoleAssignments,
  createRoleAssignment,
  deleteRoleAssignment,
  updateRoleAssignment
} from '../controllers/roleAssignmentController';
const requireAssignmentsRead = requirePermission('assignments:read');
const requireAssignmentsWrite = requirePermission('assignments:write');

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/role-assignments:
 *   get:
 *     summary: Get all role assignments
 *     tags: [Role Assignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Role assignments retrieved successfully
 *   post:
 *     summary: Create role assignment
 *     tags: [Role Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Role assignment created successfully
 */
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireAssignmentsRead, getAllRoleAssignments)
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), requireAssignmentsWrite, createRoleAssignment)

// Update a role assignment
router.put('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), requireAssignmentsWrite, updateRoleAssignment)

// Delete a role assignment
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), requireAssignmentsWrite, deleteRoleAssignment)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
