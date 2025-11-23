import express, { Router } from 'express';
import {
  getStats,
  getCertifications,
  approveCertification,
  rejectCertification,
  getCertificationStatus,
  getEmceeScripts,
  createEmceeScript,
  updateEmceeScript,
  deleteEmceeScript,
  generateReport,
  getScoreRemovalRequests,
  approveScoreRemoval,
  rejectScoreRemoval
} from '../controllers/boardController';
import {
  createScoreRemovalRequest,
  getScoreRemovalRequests as getScoreRemovalRequestsNew,
  getScoreRemovalRequest,
  signScoreRemovalRequest,
  executeScoreRemoval
} from '../controllers/scoreRemovalController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

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
router.get('/stats', getStats)

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
router.get('/certifications', getCertifications)
router.get('/certification-status', getCertificationStatus)

// Certification management
router.post('/certifications/:id/approve', logActivity('APPROVE_CERTIFICATION', 'CERTIFICATION'), approveCertification)
router.post('/certifications/:id/reject', logActivity('REJECT_CERTIFICATION', 'CERTIFICATION'), rejectCertification)

// Emcee script management
router.get('/emcee-scripts', getEmceeScripts)
router.post('/emcee-scripts', logActivity('CREATE_EMCEE_SCRIPT', 'EMCEE_SCRIPT'), createEmceeScript)
router.put('/emcee-scripts/:id', logActivity('UPDATE_EMCEE_SCRIPT', 'EMCEE_SCRIPT'), updateEmceeScript)
router.delete('/emcee-scripts/:id', logActivity('DELETE_EMCEE_SCRIPT', 'EMCEE_SCRIPT'), deleteEmceeScript)

// Report generation
router.post('/reports', logActivity('GENERATE_REPORT', 'REPORT'), generateReport)

// Score removal requests (legacy)
router.get('/score-removal-requests-old', getScoreRemovalRequests)
router.post('/score-removal-requests/:id/approve', logActivity('APPROVE_SCORE_REMOVAL', 'SCORE_REMOVAL'), approveScoreRemoval)
router.post('/score-removal-requests/:id/reject', logActivity('REJECT_SCORE_REMOVAL', 'SCORE_REMOVAL'), rejectScoreRemoval)

// New score removal endpoints
router.get('/score-removal', getScoreRemovalRequestsNew)
router.get('/score-removal/:id', getScoreRemovalRequest)
router.post('/score-removal', logActivity('CREATE_SCORE_REMOVAL_REQUEST', 'SCORE_REMOVAL'), createScoreRemovalRequest)
router.post('/score-removal/:id/sign', logActivity('SIGN_SCORE_REMOVAL_REQUEST', 'SCORE_REMOVAL'), signScoreRemovalRequest)
router.post('/score-removal/:id/execute', logActivity('EXECUTE_SCORE_REMOVAL', 'SCORE_REMOVAL'), executeScoreRemoval)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;