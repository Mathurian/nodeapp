import express, { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  certifyContestantScores,
  getCategoryCertificationStatus,
  certifyCategory
} from '../controllers/judgeContestantCertificationController';

const router: Router = express.Router();

router.use(authenticateToken)

/**
 * @swagger
 * /api/judge-contestant-certification/category/{categoryId}/contestant/{contestantId}/certify:
 *   post:
 *     summary: Certify contestant scores
 *     tags: [Judge Contestant Certification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: contestantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contestant scores certified successfully
 */
router.post('/category/:categoryId/contestant/:contestantId/certify', requireRole(['ADMIN', 'JUDGE']), certifyContestantScores)

// Get certification status for a category
router.get('/category/:categoryId/status', requireRole(['ADMIN', 'JUDGE']), getCategoryCertificationStatus)

// Certify entire category (after all contestants certified)
router.post('/category/:categoryId/certify', requireRole(['ADMIN', 'JUDGE']), certifyCategory)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;