import express, { Router } from 'express';
import {
  getStats,
  getCertifications,
  approveCertification,
  rejectCertification,
  getCertificationStatus,
  getScoreRemovalRequests,
  approveScoreRemoval,
  rejectScoreRemoval
} from '../controllers/boardController';
import {
  getBoardCertificationStatus,
  submitBoardCertification,
  getPendingBoardApprovals,
  getApprovedCategories,
  revokeBoardCertification
} from '../controllers/boardCertificationController';
import {
  createScoreRemovalRequest,
  getScoreRemovalRequests as getScoreRemovalRequestsNew,
  getScoreRemovalRequest,
  signScoreRemovalRequest,
  executeScoreRemoval
} from '../controllers/scoreRemovalController';
import { authenticateToken, requirePermission, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();
const requireScoresRead = requirePermission('scores:read');
const requireCertificationsRead = requirePermission('certifications:read');
const requireCertificationsWrite = requirePermission('certifications:write');
const requireScoreRemovalRead = requirePermission('score-removal:read');
const requireScoreRemovalRequest = requirePermission('score-removal:request');
const requireScoreRemovalSign = requirePermission('score-removal:sign');
const requireScoreRemovalApprove = requirePermission('score-removal:approve');
const requireScoreRemovalReject = requirePermission('score-removal:reject');
const requireScoreRemovalExecute = requirePermission('score-removal:execute');

// Apply authentication to all routes
router.use(authenticateToken)
router.use(requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD', 'ORGANIZER']))

/**
 * @swagger
 * /api/board/stats:
 *   get:
 *     summary: Get board statistics
 *     tags: [Board]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Board statistics retrieved successfully
 */
router.get('/stats', requireScoresRead, getStats)

/**
 * @swagger
 * /api/board/certifications:
 *   get:
 *     summary: Get certifications
 *     tags: [Board]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Certifications retrieved successfully
 */
router.get('/certifications', requireCertificationsRead, getCertifications)
router.get('/certification-status', requireCertificationsRead, getCertificationStatus)

// Certification management (legacy)
router.post('/certifications/:id/approve', requireCertificationsWrite, logActivity('APPROVE_CERTIFICATION', 'CERTIFICATION'), approveCertification)
router.post('/certifications/:id/reject', requireCertificationsWrite, logActivity('REJECT_CERTIFICATION', 'CERTIFICATION'), rejectCertification)

// Board Certification - Stage 4 Workflow
router.get('/category/:categoryId/certification/status', requireCertificationsRead, getBoardCertificationStatus)
router.post('/category/:categoryId/certification/submit', requireCertificationsWrite, logActivity('SUBMIT_BOARD_CERTIFICATION', 'CATEGORY'), submitBoardCertification)
router.get('/pending-approvals', requireCertificationsRead, getPendingBoardApprovals)
router.get('/approved-categories', requireCertificationsRead, getApprovedCategories)
router.delete('/category/:categoryId/certification/revoke', requireCertificationsWrite, logActivity('REVOKE_BOARD_CERTIFICATION', 'CATEGORY'), revokeBoardCertification)

// Score removal requests (legacy)
router.get('/score-removal-requests-old', requireScoreRemovalRead, getScoreRemovalRequests)
router.post('/score-removal-requests/:id/approve', requireScoreRemovalApprove, logActivity('APPROVE_SCORE_REMOVAL', 'SCORE_REMOVAL'), approveScoreRemoval)
router.post('/score-removal-requests/:id/reject', requireScoreRemovalReject, logActivity('REJECT_SCORE_REMOVAL', 'SCORE_REMOVAL'), rejectScoreRemoval)

// New score removal endpoints
router.get('/score-removal', requireScoreRemovalRead, getScoreRemovalRequestsNew)
router.get('/score-removal/:id', requireScoreRemovalRead, getScoreRemovalRequest)
router.post('/score-removal', requireScoreRemovalRequest, logActivity('CREATE_SCORE_REMOVAL_REQUEST', 'SCORE_REMOVAL'), createScoreRemovalRequest)
router.post('/score-removal/:id/sign', requireScoreRemovalSign, logActivity('SIGN_SCORE_REMOVAL_REQUEST', 'SCORE_REMOVAL'), signScoreRemovalRequest)
router.post('/score-removal/:id/execute', requireScoreRemovalExecute, logActivity('EXECUTE_SCORE_REMOVAL', 'SCORE_REMOVAL'), executeScoreRemoval)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
