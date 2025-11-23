import express, { Router } from 'express';
import {
  getStats,
  getCertifications,
  getCertificationQueue,
  getPendingCertifications,
  certifyTotals,
  getScoreReview,
  getContestScoreReview,
  getContestCertifications,
  getCertificationWorkflow,
  getBiasCheckingTools,
  getTallyMasterHistory,
  requestScoreRemoval,
  getScoreRemovalRequests,
  approveScoreRemoval,
  rejectScoreRemoval,
  getContestantScores,
  getJudgeScores,
  getCategoryJudges,
  removeJudgeContestantScores
} from '../controllers/tallyMasterController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)
router.use(requireRole(['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER', 'ORGANIZER', 'BOARD', 'AUDITOR']))

/**
 * @swagger
 * /api/tally-master/stats:
 *   get:
 *     summary: Get tally master statistics
 *     tags: [Tally Master]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', getStats)

/**
 * @swagger
 * /api/tally-master/certifications:
 *   get:
 *     summary: Get certifications
 *     tags: [Tally Master]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Certifications retrieved successfully
 */
router.get('/certifications', getCertifications)

/**
 * @swagger
 * /api/tally-master/certification-queue:
 *   get:
 *     summary: Get certification queue
 *     tags: [Tally Master]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Certification queue retrieved successfully
 */
router.get('/certification-queue', getCertificationQueue)

/**
 * @swagger
 * /api/tally-master/pending-certifications:
 *   get:
 *     summary: Get pending certifications
 *     tags: [Tally Master]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending certifications retrieved successfully
 */
router.get('/pending-certifications', getPendingCertifications)

// Score review interface
router.get('/score-review/:categoryId', getScoreReview)
router.get('/contest/:contestId/score-review', getContestScoreReview)
router.get('/contest/:contestId/certifications', getContestCertifications)

// Certification workflow
router.get('/certification-workflow/:categoryId', getCertificationWorkflow)

// Bias checking tools
router.get('/bias-checking/:categoryId', getBiasCheckingTools)

// Certify totals
router.post('/certify-totals', logActivity('CERTIFY_TOTALS', 'CATEGORY'), certifyTotals)

// Tally master history
router.get('/history', getTallyMasterHistory)

// Score removal routes
router.post('/score-removal-requests', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), logActivity('REQUEST_SCORE_REMOVAL', 'SCORE_REMOVAL'), requestScoreRemoval)
router.get('/score-removal-requests', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), getScoreRemovalRequests)
router.post('/score-removal-requests/:id/approve', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('APPROVE_SCORE_REMOVAL', 'SCORE_REMOVAL'), approveScoreRemoval)
router.post('/score-removal-requests/:id/reject', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('REJECT_SCORE_REMOVAL', 'SCORE_REMOVAL'), rejectScoreRemoval)

// Score drill-down routes
router.get('/scores/contestant', requireRole(['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), getContestantScores)
router.get('/scores/judge', requireRole(['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), getJudgeScores)
router.get('/category/:categoryId/judges', requireRole(['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), getCategoryJudges)
router.delete('/scores/remove', requireRole(['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), logActivity('REMOVE_JUDGE_CONTESTANT_SCORES', 'SCORE'), removeJudgeContestantScores)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;