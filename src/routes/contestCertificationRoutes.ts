import express, { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getContestCertificationProgress } from '../controllers/contestCertificationController';

const router: Router = express.Router();

router.use(authenticateToken)

/**
 * @swagger
 * /api/contest-certification/{contestId}/progress:
 *   get:
 *     summary: Get contest certification progress
 *     tags: [Contest Certification]
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
 *         description: Certification progress retrieved successfully
 */
router.get('/:contestId/progress', requireRole(['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'TALLY_MASTER', 'JUDGE']), getContestCertificationProgress)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;