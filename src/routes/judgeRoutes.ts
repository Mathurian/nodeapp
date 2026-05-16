import express, { Router } from 'express';
import {
  getStats,
  getAssignments,
  getScoringInterface,
  submitScore,
  getJudgeHistory,
  getCertificationWorkflow,
  getContestantBios,
  getContestantBio
} from '../controllers/judgeController';
import { authenticateToken, requirePermission, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();
const requireAssignmentsRead = requirePermission('assignments:read');
const requireScoresRead = requirePermission('scores:read');
const requireScoresWrite = requirePermission('scores:write');
const requireCertificationsRead = requirePermission('certifications:read');
const requireContestantsRead = requirePermission('contestants:read');

// Apply authentication to all routes
router.use(authenticateToken)
router.use(requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD']))

/**
 * @swagger
 * /api/judge/stats:
 *   get:
 *     summary: Get judge statistics
 *     tags: [Judge]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Judge statistics retrieved successfully
 */
router.get('/stats', requireScoresRead, getStats)

/**
 * @swagger
 * /api/judge/assignments:
 *   get:
 *     summary: Get judge assignments
 *     tags: [Judge]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assignments retrieved successfully
 */
router.get('/assignments', requireAssignmentsRead, getAssignments)

/**
 * @swagger
 * /api/judge/scoring/{categoryId}:
 *   get:
 *     summary: Get scoring interface for category
 *     tags: [Judge]
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
 *         description: Scoring interface retrieved successfully
 */
router.get('/scoring/:categoryId', requireScoresRead, getScoringInterface)

/**
 * @swagger
 * /api/judge/scoring/submit:
 *   post:
 *     summary: Submit a score
 *     tags: [Judge]
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
 *         description: Score submitted successfully
 */
router.post('/scoring/submit', requireScoresWrite, logActivity('SUBMIT_SCORE', 'SCORE'), submitScore)

router.get('/history', requireScoresRead, getJudgeHistory)

// Certification workflow
router.get('/certification-workflow/:categoryId', requireCertificationsRead, getCertificationWorkflow)

// Contestant bios
router.get('/contestant-bios/:categoryId', requireContestantsRead, getContestantBios)
router.get('/contestant/:contestantNumber', requireContestantsRead, getContestantBio)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
