import express, { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getCategoryCertificationStatus
} from '../controllers/judgeContestantCertificationController';

const router: Router = express.Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/judge-certifications/category/{categoryId}/status:
 *   get:
 *     summary: Get certification status for a category (alias route for judge-contestant-certification)
 *     tags: [Judge Certifications]
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
 *         description: Certification status retrieved successfully
 */
// Alias route for backward compatibility and admin access
router.get('/category/:categoryId/status', requireRole(['ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), getCategoryCertificationStatus);

export default router;

// CommonJS compatibility for server.ts
module.exports = router;

