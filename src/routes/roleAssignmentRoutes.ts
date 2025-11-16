import express, { Router } from 'express';
const router: Router = express.Router();
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getAllRoleAssignments,
  createRoleAssignment,
  deleteRoleAssignment,
  updateRoleAssignment
} from '../controllers/roleAssignmentController';

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
router.get('/', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), getAllRoleAssignments)
router.post('/', requireRole(['ADMIN', 'ORGANIZER']), createRoleAssignment)

// Update a role assignment
router.put('/:id', requireRole(['ADMIN', 'ORGANIZER']), updateRoleAssignment)

// Delete a role assignment
router.delete('/:id', requireRole(['ADMIN', 'ORGANIZER']), deleteRoleAssignment)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;