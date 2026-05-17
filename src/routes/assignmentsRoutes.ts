import express, { Router } from 'express';
import {
  getAllAssignments,
  createAssignment,
  getJudges,
  getCategories,
  assignJudge,
  removeAssignment,
  getContestants,
  assignContestantToCategory,
  removeContestantFromCategory,
  getCategoryContestants,
  getAllContestantAssignments,
  getTallyMasterAssignments,
  createTallyMasterAssignment,
  removeTallyMasterAssignment,
  getAuditorAssignments,
  createAuditorAssignment,
  removeAuditorAssignment,
  getJudgeContestLimitPolicy,
  updateJudgeContestLimitPolicy
} from '../controllers/assignmentsController';
import { authenticateToken, requirePermission, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { validateAssignmentCreation, validateAssignmentQuery } from '../middleware/assignmentValidation';

const router: Router = express.Router();
const requireAssignmentsRead = requirePermission('assignments:read');
const requireAssignmentsWrite = requirePermission('assignments:write');

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/assignments:
 *   get:
 *     summary: Get all assignments
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assignments retrieved successfully
 *   post:
 *     summary: Create an assignment
 *     tags: [Assignments]
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
 *         description: Assignment created successfully
 */
router.get(
  '/',
  validateAssignmentQuery,
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE', 'TALLY_MASTER', 'AUDITOR']),
  requireAssignmentsRead,
  getAllAssignments
)
router.post('/', validateAssignmentCreation, requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireAssignmentsWrite, logActivity('CREATE_ASSIGNMENT', 'ASSIGNMENT'), createAssignment)

/**
 * @swagger
 * /api/assignments/judges:
 *   get:
 *     summary: Get all judges
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Judges retrieved successfully
 */
router.get('/judges', requireAssignmentsRead, getJudges)

/**
 * @swagger
 * /api/assignments/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', requireAssignmentsRead, getCategories)

// Contestant endpoints
router.get('/contestants', requireAssignmentsRead, getContestants)
router.get('/contestants/assignments', requireAssignmentsRead, getAllContestantAssignments)
router.get('/category/:categoryId/contestants', requireAssignmentsRead, getCategoryContestants)
router.post('/contestants', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireAssignmentsWrite, logActivity('ASSIGN_CONTESTANT', 'ASSIGNMENT'), assignContestantToCategory)
router.delete('/category/:categoryId/contestant/:contestantId', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireAssignmentsWrite, logActivity('REMOVE_CONTESTANT', 'ASSIGNMENT'), removeContestantFromCategory)

// Tally Master Assignment endpoints
router.get('/tally-masters', requireAssignmentsRead, getTallyMasterAssignments)
router.post('/tally-masters', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireAssignmentsWrite, logActivity('ASSIGN_TALLY_MASTER', 'ASSIGNMENT'), createTallyMasterAssignment)
router.delete('/tally-masters/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireAssignmentsWrite, logActivity('REMOVE_TALLY_MASTER', 'ASSIGNMENT'), removeTallyMasterAssignment)

// Auditor Assignment endpoints
router.get('/auditors', requireAssignmentsRead, getAuditorAssignments)
router.post('/auditors', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireAssignmentsWrite, logActivity('ASSIGN_AUDITOR', 'ASSIGNMENT'), createAuditorAssignment)
router.delete('/auditors/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireAssignmentsWrite, logActivity('REMOVE_AUDITOR', 'ASSIGNMENT'), removeAuditorAssignment)

// Assignment policy endpoints
router.get('/policies/judge-contest-limit', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireAssignmentsRead, getJudgeContestLimitPolicy)
router.put('/policies/judge-contest-limit', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireAssignmentsWrite, logActivity('UPDATE_ASSIGNMENT_POLICY', 'ASSIGNMENT'), updateJudgeContestLimitPolicy)

// Legacy endpoints for backward compatibility
router.post('/judge', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireAssignmentsWrite, logActivity('ASSIGN_JUDGE', 'ASSIGNMENT'), assignJudge)
router.put('/remove/:assignmentId', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireAssignmentsWrite, logActivity('REMOVE_ASSIGNMENT', 'ASSIGNMENT'), removeAssignment)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
