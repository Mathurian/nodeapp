import express, { Router } from 'express';
import {
  getScoringProgressByContest,
  getScoringProgressByCategory,
  getJudgeScoringProgress,
  getCertificationStatus,
  getPendingCertifications
} from '../controllers/trackerController';

import { authenticateToken, requireRole } from '../middleware/auth';
const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

// Only Tally Master, Auditor, Board, Organizer, Admin can access
router.use(requireRole(['TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER', 'ADMIN']))

/**
 * @swagger
 * /api/tracker/scoring/contest/{contestId}:
 *   get:
 *     summary: Get scoring progress by contest
 *     tags: [Tracker]
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
 *         description: Scoring progress retrieved successfully
 */
router.get('/scoring/contest/:contestId', getScoringProgressByContest)

/**
 * @swagger
 * /api/tracker/scoring/category/{categoryId}:
 *   get:
 *     summary: Get scoring progress by category
 *     tags: [Tracker]
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
 *         description: Scoring progress retrieved successfully
 */
router.get('/scoring/category/:categoryId', getScoringProgressByCategory)

// Certification endpoints
router.get('/certification/status', getCertificationStatus)
router.get('/certification/pending', getPendingCertifications)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;