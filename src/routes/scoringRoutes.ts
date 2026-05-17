import express, { Router } from 'express';
import { getCategories, getScores, submitScore, updateScore, deleteScore, certifyScore, certifyScores, certifyTotals, finalCertification, requestDeduction, approveDeduction, rejectDeduction, getDeductions, unsignScore, uncertifyCategory } from '../controllers/scoringController';
import { authenticateToken, requireAnyPermission, requirePermission, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { validate, createScoreSchema, updateScoreSchema } from '../middleware/validation';
import { idempotencyMiddleware } from '../middleware/idempotency';

const router: Router = express.Router();
const requireScoresRead = requirePermission('scores:read');
const requireScoringWrite = requireAnyPermission(['scores:write', 'delegated-scores:write']);
const requireScoringDelete = requireAnyPermission(['scores:delete', 'delegated-scores:write']);
const requireScoresCertify = requireAnyPermission(['scores:certify', 'delegated-scores:certify']);
const requireScoresUncertify = requirePermission('scores:uncertify');
const requireScoresUnsign = requirePermission('scores:unsign');
const requireCertificationsWrite = requirePermission('certifications:write');

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/scoring/categories:
 *   get:
 *     summary: Get all categories for scoring
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories available for scoring
 */
router.get('/categories', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), requireScoresRead, getCategories)

// Keep backward-compatible GET endpoint used by frontend scoring flow
router.get('/category/:categoryId',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']),
  requireScoresRead,
  getScores
)

router.get('/category/:categoryId/contestant/:contestantId',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']),
  requireScoresRead,
  (req, _res, next) => {
    req.query['contestantId'] = req.params['contestantId'];
    next();
  },
  getScores
)

/**
 * @swagger
 * /api/scoring/category/{categoryId}/contestant/{contestantId}:
 *   post:
 *     summary: Submit a score
 *     tags: [Scoring]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - score
 *             properties:
 *               score:
 *                 type: integer
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Score submitted successfully
 */
router.post('/category/:categoryId/contestant/:contestantId',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']),
  requireScoringWrite,
  idempotencyMiddleware,
  validate(createScoreSchema, 'body'),
  logActivity('SUBMIT_SCORE', 'SCORE'),
  submitScore
)
router.post('/category/:categoryId/certify', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), requireScoresCertify, logActivity('CERTIFY_SCORES', 'SCORE'), certifyScores)
router.post('/category/:categoryId/certify-totals', requireRole(['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER']), requireCertificationsWrite, certifyTotals)
router.post('/category/:categoryId/final-certification', requireRole(['SUPER_ADMIN', 'ADMIN', 'AUDITOR']), requireCertificationsWrite, finalCertification)
router.post('/category/:categoryId/uncertify', requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD', 'ORGANIZER']), requireScoresUncertify, logActivity('UNCERTIFY_CATEGORY', 'SCORE'), uncertifyCategory)

// Score-specific routes (must come after category routes)
router.put('/:scoreId',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']),
  requireScoringWrite,
  idempotencyMiddleware,
  validate(updateScoreSchema, 'body'),
  logActivity('UPDATE_SCORE', 'SCORE'),
  updateScore
)
router.delete('/:scoreId', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), requireScoringDelete, idempotencyMiddleware, logActivity('DELETE_SCORE', 'SCORE'), deleteScore)
router.post('/:scoreId/certify', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE']), requireScoresCertify, logActivity('CERTIFY_SCORE', 'SCORE'), certifyScore)
router.post('/:scoreId/unsign', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireScoresUnsign, logActivity('UNSIGN_SCORE', 'SCORE'), unsignScore)

// Deduction endpoints
router.post('/deductions', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), requirePermission('deductions:create'), logActivity('REQUEST_DEDUCTION', 'DEDUCTION'), requestDeduction)
router.get('/deductions', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), requirePermission('deductions:read'), getDeductions)
router.post('/deductions/:deductionId/approve', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR']), requirePermission('deductions:approve'), logActivity('APPROVE_DEDUCTION', 'DEDUCTION'), approveDeduction)
router.post('/deductions/:deductionId/reject', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR']), requirePermission('deductions:reject'), logActivity('REJECT_DEDUCTION', 'DEDUCTION'), rejectDeduction)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
