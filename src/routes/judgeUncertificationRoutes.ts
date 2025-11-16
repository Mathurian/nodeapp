import express, { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import {
  requestUncertification,
  getUncertificationRequests,
  approveUncertification,
  rejectUncertification,
  getJudgeUncertificationRequests
} from '../controllers/judgeUncertificationController';

const router: Router = express.Router();

router.use(authenticateToken)

/**
 * @swagger
 * /api/judge-uncertification/request:
 *   post:
 *     summary: Request judge uncertification
 *     tags: [Judge Uncertification]
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
 *         description: Uncertification request created successfully
 */
router.post('/request', requireRole(['JUDGE']), logActivity('REQUEST_JUDGE_UNCERTIFICATION', 'CERTIFICATION'), requestUncertification)

// Get all requests (for authorized users)
router.get('/requests', requireRole(['ADMIN', 'ORGANIZER', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), getUncertificationRequests)

// Get requests for a specific judge
router.get('/judge/requests', requireRole(['JUDGE']), getJudgeUncertificationRequests)

// Approve request
router.post('/:id/approve', requireRole(['ADMIN', 'ORGANIZER', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), logActivity('APPROVE_JUDGE_UNCERTIFICATION', 'CERTIFICATION'), approveUncertification)

// Reject request
router.post('/:id/reject', requireRole(['ADMIN', 'ORGANIZER', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), logActivity('REJECT_JUDGE_UNCERTIFICATION', 'CERTIFICATION'), rejectUncertification)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;