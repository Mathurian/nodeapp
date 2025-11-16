import express, { Router } from 'express';
import {
  getStats,
  getPendingAudits,
  getCompletedAudits,
  finalCertification,
  rejectAudit,
  getScoreVerification,
  verifyScore,
  getTallyMasterStatus,
  getCertificationWorkflow,
  generateSummaryReport,
  getAuditHistory
} from '../controllers/auditorController';
import {
  getFinalCertificationStatus,
  submitFinalCertification
} from '../controllers/auditorCertificationController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)
router.use(requireRole(['ADMIN', 'AUDITOR', 'ORGANIZER', 'BOARD']))

/**
 * @swagger
 * /api/auditor/stats:
 *   get:
 *     summary: Get auditor statistics
 *     tags: [Auditor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Auditor statistics retrieved successfully
 */
router.get('/stats', getStats)

/**
 * @swagger
 * /api/auditor/pending-audits:
 *   get:
 *     summary: Get pending audits
 *     tags: [Auditor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending audits retrieved successfully
 */
router.get('/pending-audits', getPendingAudits)
router.get('/completed-audits', getCompletedAudits)

// Score verification endpoints
router.get('/score-verification/:categoryId', getScoreVerification)
router.get('/score-verification/:categoryId/:contestantId', getScoreVerification)
router.post('/verify-score/:scoreId', logActivity('VERIFY_SCORE', 'SCORE'), verifyScore)

// Tally master status tracking
router.get('/tally-status/:categoryId', getTallyMasterStatus)

// Certification workflow
router.get('/certification-workflow/:categoryId', getCertificationWorkflow)

// Final certification
router.post('/category/:categoryId/final-certification', logActivity('FINAL_CERTIFICATION', 'CATEGORY'), finalCertification)
router.post('/category/:categoryId/reject', logActivity('REJECT_AUDIT', 'CATEGORY'), rejectAudit)

// New final certification endpoints
router.get('/category/:categoryId/final-certification/status', getFinalCertificationStatus)
router.post('/category/:categoryId/final-certification/submit', logActivity('SUBMIT_FINAL_CERTIFICATION', 'CATEGORY'), submitFinalCertification)

// Summary reports
router.post('/summary-report', logActivity('GENERATE_SUMMARY_REPORT', 'REPORT'), generateSummaryReport)

// Audit history
router.get('/audit-history', getAuditHistory)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;