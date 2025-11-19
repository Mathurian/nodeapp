/**
 * Bulk Operations Routes
 * All routes require ADMIN role for performing batch operations
 */

import { Router } from 'express';
import { container } from 'tsyringe';
import multer from 'multer';
import { BulkUserController } from '../controllers/BulkUserController';
import { BulkEventController } from '../controllers/BulkEventController';
import { BulkContestController } from '../controllers/BulkContestController';
import { BulkAssignmentController } from '../controllers/BulkAssignmentController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads (in-memory storage for CSV)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Get controller instances from DI container
const bulkUserController = container.resolve(BulkUserController);
const bulkEventController = container.resolve(BulkEventController);
const bulkContestController = container.resolve(BulkContestController);
const bulkAssignmentController = container.resolve(BulkAssignmentController);

// All bulk routes require authentication and ADMIN role
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

/**
 * @swagger
 * /api/bulk/users/activate:
 *   post:
 *     summary: Activate multiple users
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Activate selected users in bulk (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to activate
 *                 example: ["user-id-1", "user-id-2", "user-id-3"]
 *     responses:
 *       200:
 *         description: Users activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "3 users activated successfully"
 *                 results:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: integer
 *                       example: 3
 *                     failed:
 *                       type: integer
 *                       example: 0
 *       400:
 *         description: Invalid request - missing userIds
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/users/activate', (req, res) =>
  bulkUserController.activateUsers(req, res)
);

/**
 * @swagger
 * /api/bulk/users/deactivate:
 *   post:
 *     summary: Deactivate multiple users
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Deactivate selected users in bulk (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["user-id-1", "user-id-2"]
 *     responses:
 *       200:
 *         description: Users deactivated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/users/deactivate', (req, res) =>
  bulkUserController.deactivateUsers(req, res)
);

/**
 * @swagger
 * /api/bulk/users/delete:
 *   post:
 *     summary: Delete multiple users permanently
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Permanently delete selected users (Admin only, use with caution)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["user-id-1", "user-id-2"]
 *               confirm:
 *                 type: boolean
 *                 description: Confirmation flag to prevent accidental deletion
 *                 example: true
 *     responses:
 *       200:
 *         description: Users deleted successfully
 *       400:
 *         description: Missing confirmation or invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/users/delete', (req, res) =>
  bulkUserController.deleteUsers(req, res)
);

/**
 * @swagger
 * /api/bulk/users/change-role:
 *   post:
 *     summary: Change role for multiple users
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Update role for selected users (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *               - newRole
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["user-id-1", "user-id-2"]
 *               newRole:
 *                 type: string
 *                 enum: [ADMIN, ORGANIZER, JUDGE, CONTESTANT, BOARD, EMCEE, TALLY_MASTER, AUDITOR]
 *                 example: "JUDGE"
 *     responses:
 *       200:
 *         description: User roles changed successfully
 *       400:
 *         description: Invalid role specified
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/users/change-role', (req, res) =>
  bulkUserController.changeUserRoles(req, res)
);

/**
 * @swagger
 * /api/bulk/users/import:
 *   post:
 *     summary: Import users from CSV file
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Import multiple users from CSV file (Admin only, max 5MB)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with user data (name, email, role columns required)
 *     responses:
 *       200:
 *         description: Users imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 imported:
 *                   type: integer
 *                   example: 50
 *                 failed:
 *                   type: integer
 *                   example: 2
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       row:
 *                         type: integer
 *                       error:
 *                         type: string
 *       400:
 *         description: Invalid CSV format or missing required columns
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/users/import', upload.single('file'), (req, res) =>
  bulkUserController.importUsers(req, res)
);

/**
 * @swagger
 * /api/bulk/users/export:
 *   get:
 *     summary: Export users to CSV file
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Export all users to CSV format (Admin only)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *           default: active
 *         description: Filter users by status
 *     responses:
 *       200:
 *         description: CSV file with user data
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: "name,email,role,status\nJohn Doe,john@example.com,JUDGE,active"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.get('/users/export', (req, res) =>
  bulkUserController.exportUsers(req, res)
);

/**
 * @swagger
 * /api/bulk/users/template:
 *   get:
 *     summary: Download CSV import template
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Get CSV template file for user import (Admin only)
 *     responses:
 *       200:
 *         description: CSV template file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: "name,email,role\n"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.get('/users/template', (req, res) =>
  bulkUserController.getImportTemplate(req, res)
);

/**
 * @swagger
 * /api/bulk/events/status:
 *   post:
 *     summary: Change status for multiple events
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Update status for selected events (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventIds
 *               - status
 *             properties:
 *               eventIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["event-id-1", "event-id-2"]
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, IN_PROGRESS, COMPLETED, CANCELLED]
 *                 example: "PUBLISHED"
 *     responses:
 *       200:
 *         description: Event statuses changed successfully
 *       400:
 *         description: Invalid status specified
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/events/status', (req, res) =>
  bulkEventController.changeEventStatus(req, res)
);

/**
 * @swagger
 * /api/bulk/events/delete:
 *   post:
 *     summary: Delete multiple events permanently
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Permanently delete selected events (Admin only, use with caution)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventIds
 *             properties:
 *               eventIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["event-id-1", "event-id-2"]
 *     responses:
 *       200:
 *         description: Events deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/events/delete', (req, res) =>
  bulkEventController.deleteEvents(req, res)
);

/**
 * @swagger
 * /api/bulk/events/clone:
 *   post:
 *     summary: Clone multiple events
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Create copies of selected events (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventIds
 *             properties:
 *               eventIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["event-id-1", "event-id-2"]
 *               nameSuffix:
 *                 type: string
 *                 description: Suffix to add to cloned event names
 *                 example: " (Copy)"
 *     responses:
 *       200:
 *         description: Events cloned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 clonedEvents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       originalId:
 *                         type: string
 *                       clonedId:
 *                         type: string
 *                       name:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/events/clone', (req, res) =>
  bulkEventController.cloneEvents(req, res)
);

/**
 * @swagger
 * /api/bulk/contests/status:
 *   post:
 *     summary: Change status for multiple contests
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Update status for selected contests (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contestIds
 *               - status
 *             properties:
 *               contestIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["contest-id-1", "contest-id-2"]
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED]
 *                 example: "SCHEDULED"
 *     responses:
 *       200:
 *         description: Contest statuses changed successfully
 *       400:
 *         description: Invalid status specified
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/contests/status', (req, res) =>
  bulkContestController.changeContestStatus(req, res)
);

/**
 * @swagger
 * /api/bulk/contests/certify:
 *   post:
 *     summary: Certify multiple contests
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Mark selected contests as certified (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contestIds
 *             properties:
 *               contestIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["contest-id-1", "contest-id-2"]
 *               certificationNotes:
 *                 type: string
 *                 description: Optional notes about certification
 *                 example: "All results verified and approved"
 *     responses:
 *       200:
 *         description: Contests certified successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/contests/certify', (req, res) =>
  bulkContestController.certifyContests(req, res)
);

/**
 * @swagger
 * /api/bulk/contests/delete:
 *   post:
 *     summary: Delete multiple contests permanently
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Permanently delete selected contests (Admin only, use with caution)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contestIds
 *             properties:
 *               contestIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["contest-id-1", "contest-id-2"]
 *     responses:
 *       200:
 *         description: Contests deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/contests/delete', (req, res) =>
  bulkContestController.deleteContests(req, res)
);

/**
 * @swagger
 * /api/bulk/assignments/create:
 *   post:
 *     summary: Create multiple judge assignments
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Create judge assignments in bulk (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignments
 *             properties:
 *               assignments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     judgeId:
 *                       type: string
 *                     contestId:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [JUDGE, HEAD_JUDGE, PANEL_CHAIR]
 *                 example:
 *                   - judgeId: "judge-1"
 *                     contestId: "contest-1"
 *                     role: "JUDGE"
 *                   - judgeId: "judge-2"
 *                     contestId: "contest-1"
 *                     role: "HEAD_JUDGE"
 *     responses:
 *       200:
 *         description: Assignments created successfully
 *       400:
 *         description: Invalid assignment data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/assignments/create', (req, res) =>
  bulkAssignmentController.createAssignments(req, res)
);

/**
 * @swagger
 * /api/bulk/assignments/delete:
 *   post:
 *     summary: Delete multiple judge assignments
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Delete selected judge assignments (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignmentIds
 *             properties:
 *               assignmentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["assignment-id-1", "assignment-id-2"]
 *     responses:
 *       200:
 *         description: Assignments deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/assignments/delete', (req, res) =>
  bulkAssignmentController.deleteAssignments(req, res)
);

/**
 * @swagger
 * /api/bulk/assignments/reassign:
 *   post:
 *     summary: Reassign judges for multiple contests
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     description: Reassign judges from one to another across multiple contests (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromJudgeId
 *               - toJudgeId
 *               - contestIds
 *             properties:
 *               fromJudgeId:
 *                 type: string
 *                 description: Current judge to replace
 *                 example: "judge-id-1"
 *               toJudgeId:
 *                 type: string
 *                 description: New judge to assign
 *                 example: "judge-id-2"
 *               contestIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Contests where reassignment should occur
 *                 example: ["contest-1", "contest-2"]
 *     responses:
 *       200:
 *         description: Judges reassigned successfully
 *       400:
 *         description: Invalid judge IDs or contest IDs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/assignments/reassign', (req, res) =>
  bulkAssignmentController.reassignJudges(req, res)
);

export default router;
