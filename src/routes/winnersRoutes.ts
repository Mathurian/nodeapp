import express, { Router } from 'express';
import {
  getWinners,
  getWinnersByCategory,
  getWinnersByContest,
  signWinners,
  getSignatureStatus,
  getCertificationProgress,
  getRoleCertificationStatus,
  certifyScores
} from '../controllers/winnersController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

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
router.get('/', requireRole(['ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']), getWinners)

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
router.get('/category/:categoryId', requireRole(['ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']), getWinnersByCategory)

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
router.get('/contest/:contestId', requireRole(['ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']), getWinnersByContest)
router.post('/category/:categoryId/sign', requireRole(['ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), logActivity('SIGN_WINNERS', 'WINNER'), signWinners)
router.get('/category/:categoryId/signatures', requireRole(['ADMIN', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), getSignatureStatus)

// Certification endpoints
router.get('/category/:categoryId/certification-progress', requireRole(['ADMIN', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']), getCertificationProgress)
router.get('/category/:categoryId/certification-status/:role', requireRole(['ADMIN', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']), getRoleCertificationStatus)
router.post('/category/:categoryId/certify', requireRole(['ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), logActivity('CERTIFY_SCORES', 'CERTIFICATION'), certifyScores)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;