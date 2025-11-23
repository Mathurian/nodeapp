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
  removeAuditorAssignment
} from '../controllers/assignmentsController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { validateAssignmentCreation, validateAssignmentQuery } from '../middleware/assignmentValidation';

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
router.post('/', validateAssignmentCreation, requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_ASSIGNMENT', 'ASSIGNMENT'), createAssignment)

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
router.post('/contestants', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('ASSIGN_CONTESTANT', 'ASSIGNMENT'), assignContestantToCategory)
router.delete('/category/:categoryId/contestant/:contestantId', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('REMOVE_CONTESTANT', 'ASSIGNMENT'), removeContestantFromCategory)

// Tally Master Assignment endpoints
router.get('/tally-masters', getTallyMasterAssignments)
router.post('/tally-masters', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('ASSIGN_TALLY_MASTER', 'ASSIGNMENT'), createTallyMasterAssignment)
router.delete('/tally-masters/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('REMOVE_TALLY_MASTER', 'ASSIGNMENT'), removeTallyMasterAssignment)

// Auditor Assignment endpoints
router.get('/auditors', getAuditorAssignments)
router.post('/auditors', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('ASSIGN_AUDITOR', 'ASSIGNMENT'), createAuditorAssignment)
router.delete('/auditors/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('REMOVE_AUDITOR', 'ASSIGNMENT'), removeAuditorAssignment)

// Legacy endpoints for backward compatibility
router.post('/judge', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('ASSIGN_JUDGE', 'ASSIGNMENT'), assignJudge)
router.put('/remove/:assignmentId', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('REMOVE_ASSIGNMENT', 'ASSIGNMENT'), removeAssignment)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;