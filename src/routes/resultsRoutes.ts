import express, { Router } from 'express';
import { getAllResults, getCategories, getContestantResults, getCategoryResults, getContestResults, getEventResults } from '../controllers/resultsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

// Apply role-based access control - all authenticated users with appropriate roles can access results
router.use(requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'CONTESTANT', 'EMCEE']))

/**
 * @swagger
 * /api/results:
 *   get:
 *     summary: Get all results
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All results retrieved successfully
 */
router.get('/', getAllResults)

/**
 * @swagger
 * /api/results/categories:
 *   get:
 *     summary: Get all categories with results
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', getCategories)

/**
 * @swagger
 * /api/results/contestant/{contestantId}:
 *   get:
 *     summary: Get results for a specific contestant
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contestantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contestant results retrieved successfully
 */
router.get('/contestant/:contestantId', getContestantResults)

/**
 * @swagger
 * /api/results/category/{categoryId}:
 *   get:
 *     summary: Get results for a specific category
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category results retrieved successfully
 */
router.get('/category/:categoryId', getCategoryResults)

/**
 * @swagger
 * /api/results/contest/{contestId}:
 *   get:
 *     summary: Get results for a specific contest
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contest results retrieved successfully
 */
router.get('/contest/:contestId', getContestResults)

/**
 * @swagger
 * /api/results/event/{eventId}:
 *   get:
 *     summary: Get results for a specific event
 *     tags: [Results]
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
 *         description: Event results retrieved successfully
 */
router.get('/event/:eventId', getEventResults)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;