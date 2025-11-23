import express, { Router } from 'express';
import { getAllContests, getContestById, getContestsByEvent, createContest, updateContest, deleteContest, archiveContest, reactivateContest } from '../controllers/contestsController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate, createContestSchema, updateContestSchema } from '../middleware/validation';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

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
router.get('/', getAllContests);

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
router.get('/event/:eventId', getContestsByEvent);

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
router.get('/:id', getContestById);

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
router.post('/event/:eventId', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), validate(createContestSchema), logActivity('CREATE_CONTEST', 'CONTEST'), createContest);
router.put('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), validate(updateContestSchema), logActivity('UPDATE_CONTEST', 'CONTEST'), updateContest);
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('DELETE_CONTEST', 'CONTEST'), deleteContest);
router.post('/:id/archive', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('ARCHIVE_CONTEST', 'CONTEST'), archiveContest);
router.post('/:id/reactivate', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('REACTIVATE_CONTEST', 'CONTEST'), reactivateContest);

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
