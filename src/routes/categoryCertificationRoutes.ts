import express, { Router } from 'express';
const router: Router = express.Router();
import {
  getCategoryCertificationProgress,
  certifyContestant,
  certifyJudgeScores,
  certifyCategory
} from '../controllers/categoryCertificationController';
import { authenticateToken, requireRole } from '../middleware/auth';

router.use(authenticateToken)

/**
 * @swagger
 * /api/category-certification/category/{categoryId}/progress:
 *   get:
 *     summary: Get category certification progress
 *     tags: [Category Certification]
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
 *         description: Certification progress retrieved successfully
 */
router.get('/category/:categoryId/progress', requireRole(['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'TALLY_MASTER', 'JUDGE']), getCategoryCertificationProgress)

// Certify contestant (Tally Master or Auditor)
router.post('/category/:categoryId/contestant/:contestantId/certify', requireRole(['ADMIN', 'TALLY_MASTER', 'AUDITOR']), certifyContestant)

// Certify judge scores (Tally Master or Auditor)
router.post('/category/:categoryId/judge/:judgeId/certify', requireRole(['ADMIN', 'TALLY_MASTER', 'AUDITOR']), certifyJudgeScores)

// Certify category
router.post('/category/:categoryId/certify', requireRole(['ADMIN', 'ORGANIZER', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), certifyCategory)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;