import express, { Router } from 'express';
import {
  getWinners,
  getWinnersByCategory,
  getWinnersByContest,
  signWinners,
  getSignatureStatus,
  getCertificationProgress,
  getRoleCertificationStatus,
  certifyScores,
  publishWinners,
  unpublishWinners,
  getWinnersPublicationStatus,
  getWinnersPublicationOverview
} from '../controllers/winnersController';
import { authenticateToken, requirePermission, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();
const requireResultsRead = requirePermission('results:read');
const requireResultsWrite = requirePermission('results:write');
const requireCertificationsRead = requirePermission('certifications:read');
const requireCertificationsWrite = requirePermission('certifications:write');

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/winners:
 *   get:
 *     summary: Get all winners
 *     tags: [Winners]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Winners retrieved successfully
 */
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']), requireResultsRead, getWinners)

/**
 * @swagger
 * /api/winners/category/{categoryId}:
 *   get:
 *     summary: Get winners by category
 *     tags: [Winners]
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
 *         description: Category winners retrieved successfully
 */
router.get('/category/:categoryId', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']), requireResultsRead, getWinnersByCategory)

/**
 * @swagger
 * /api/winners/contest/{contestId}:
 *   get:
 *     summary: Get winners by contest
 *     tags: [Winners]
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
 *         description: Contest winners retrieved successfully
 */
router.get('/contest/:contestId', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']), requireResultsRead, getWinnersByContest)
router.post('/category/:categoryId/sign', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), requireCertificationsWrite, logActivity('SIGN_WINNERS', 'WINNER'), signWinners)
router.get('/category/:categoryId/signatures', requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), requireCertificationsRead, getSignatureStatus)

// Certification endpoints
router.get('/category/:categoryId/certification-progress', requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']), requireCertificationsRead, getCertificationProgress)
router.get('/category/:categoryId/certification-status/:role', requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']), requireCertificationsRead, getRoleCertificationStatus)
router.post('/category/:categoryId/certify', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), requireCertificationsWrite, logActivity('CERTIFY_SCORES', 'CERTIFICATION'), certifyScores)

// Winners publication control endpoints
router.get('/publication-overview', requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD', 'ORGANIZER', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']), requireResultsRead, getWinnersPublicationOverview)
router.get('/contest/:contestId/publication-status', requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD', 'ORGANIZER', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']), requireResultsRead, getWinnersPublicationStatus)
router.post('/contest/:contestId/publish', requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD', 'ORGANIZER']), requireResultsWrite, logActivity('PUBLISH_WINNERS', 'CONTEST'), publishWinners)
router.post('/contest/:contestId/unpublish', requireRole(['SUPER_ADMIN', 'ADMIN']), requireResultsWrite, logActivity('UNPUBLISH_WINNERS', 'CONTEST'), unpublishWinners)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
