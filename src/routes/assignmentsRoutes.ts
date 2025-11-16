import express, { Router } from 'express';
import {
  getAllAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getJudgeAssignments,
  getJudges,
  getCategories,
  assignJudge,
  removeAssignment,
  getContestants,
  assignContestantToCategory,
  removeContestantFromCategory,
  getCategoryContestants,
  getAllContestantAssignments
} from '../controllers/assignmentsController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { validateAssignmentCreation, validateAssignmentUpdate, validateAssignmentDeletion, validateBulkAssignmentOperation, validateAssignmentQuery } from '../middleware/assignmentValidation';

const router: Router = express.Router();

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
router.get('/', validateAssignmentQuery, getAllAssignments)
router.post('/', validateAssignmentCreation, requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_ASSIGNMENT', 'ASSIGNMENT'), createAssignment)

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
router.get('/judges', getJudges)

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
router.get('/categories', getCategories)

// Contestant endpoints
router.get('/contestants', getContestants)
router.get('/contestants/assignments', getAllContestantAssignments)
router.get('/category/:categoryId/contestants', getCategoryContestants)
router.post('/contestants', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('ASSIGN_CONTESTANT', 'ASSIGNMENT'), assignContestantToCategory)
router.delete('/category/:categoryId/contestant/:contestantId', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('REMOVE_CONTESTANT', 'ASSIGNMENT'), removeContestantFromCategory)

// Legacy endpoints for backward compatibility
router.post('/judge', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('ASSIGN_JUDGE', 'ASSIGNMENT'), assignJudge)
router.put('/remove/:assignmentId', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('REMOVE_ASSIGNMENT', 'ASSIGNMENT'), removeAssignment)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;