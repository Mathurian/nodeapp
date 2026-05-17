import express, { Router } from 'express';
import { getAllContests, getContestById, getContestsByEvent, createContest, updateContest, deleteContest, restoreContest, archiveContest, reactivateContest, getOlympicScoringValidation, getMinimumWinningScore, updateMinimumWinningScore, cloneContest } from '../controllers/contestsController';
import { authenticateToken, requirePermission, requireRole } from '../middleware/auth';
import { validate, createContestSchema, updateContestSchema, cloneContestSchema } from '../middleware/validation';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();
const requireContestsRead = requirePermission('contests:read');
const requireContestsWrite = requirePermission('contests:write');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/contests:
 *   get:
 *     summary: Get all active contests
 *     tags: [Contests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all active contests
 */
router.get('/', requireContestsRead, getAllContests);

/**
 * @swagger
 * /api/contests/event/{eventId}:
 *   get:
 *     summary: Get contests by event ID
 *     tags: [Contests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of contests for the event
 */
router.get('/event/:eventId', requireContestsRead, getContestsByEvent);

/**
 * @swagger
 * /api/contests/{id}:
 *   get:
 *     summary: Get contest by ID
 *     tags: [Contests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contest details
 */
router.get('/:id', requireContestsRead, getContestById);

/**
 * @swagger
 * /api/contests/event/{eventId}:
 *   post:
 *     summary: Create a new contest
 *     tags: [Contests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contest created successfully
 */
router.post('/event/:eventId', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireContestsWrite, validate(createContestSchema), logActivity('CREATE_CONTEST', 'CONTEST'), createContest);
router.put('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireContestsWrite, validate(updateContestSchema), logActivity('UPDATE_CONTEST', 'CONTEST'), updateContest);
router.post('/:id/clone', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireContestsWrite, validate(cloneContestSchema), logActivity('CLONE_CONTEST', 'CONTEST'), cloneContest);
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireContestsWrite, logActivity('DELETE_CONTEST', 'CONTEST'), deleteContest);
// S4-3: Restore soft-deleted contests
router.post('/:id/restore', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireContestsWrite, logActivity('RESTORE_CONTEST', 'CONTEST'), restoreContest);
router.post('/:id/archive', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireContestsWrite, logActivity('ARCHIVE_CONTEST', 'CONTEST'), archiveContest);
router.post('/:id/reactivate', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireContestsWrite, logActivity('REACTIVATE_CONTEST', 'CONTEST'), reactivateContest);

/**
 * @swagger
 * /api/contests/{id}/olympic-scoring-validation:
 *   get:
 *     summary: Get Olympic scoring validation status for a contest
 *     description: Returns warnings if Olympic scoring is configured but insufficient judges are assigned
 *     tags: [Contests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contest ID
 *     responses:
 *       200:
 *         description: Olympic scoring validation status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contestId:
 *                   type: string
 *                 usesOlympicScoring:
 *                   type: boolean
 *                 judgeCount:
 *                   type: number
 *                 minimumJudgesRequired:
 *                   type: number
 *                 recommendedMinJudges:
 *                   type: number
 *                 warning:
 *                   type: string
 *                   nullable: true
 *                 severity:
 *                   type: string
 *                   enum: [info, warning, error]
 *                 canMigrateToStraight:
 *                   type: boolean
 */
router.get('/:id/olympic-scoring-validation', requireContestsRead, getOlympicScoringValidation);
router.get('/:id/minimum-winning-score', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'EMCEE', 'CONTESTANT']), requireContestsRead, getMinimumWinningScore);
router.put('/:id/minimum-winning-score', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireContestsWrite, logActivity('UPDATE_CONTEST_MIN_WINNING_SCORE', 'CONTEST'), updateMinimumWinningScore);

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
