import express, { Router } from 'express';
import { getCategories, submitScore, updateScore, deleteScore, certifyScore, certifyScores, certifyTotals, finalCertification, requestDeduction, approveDeduction, rejectDeduction, getDeductions, unsignScore, uncertifyCategory } from '../controllers/scoringController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { validate, createScoreSchema, updateScoreSchema } from '../middleware/validation';

const router: Router = express.Router();

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
router.get('/categories', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), getCategories)

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
  requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE']),
  validate(createScoreSchema, 'body'),
  logActivity('SUBMIT_SCORE', 'SCORE'),
  submitScore
)
router.post('/category/:categoryId/certify', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE']), logActivity('CERTIFY_SCORES', 'SCORE'), certifyScores)
router.post('/category/:categoryId/certify-totals', requireRole(['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER']), certifyTotals)
router.post('/category/:categoryId/final-certification', requireRole(['SUPER_ADMIN', 'ADMIN', 'AUDITOR']), finalCertification)
router.post('/category/:categoryId/uncertify', requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD', 'ORGANIZER']), logActivity('UNCERTIFY_CATEGORY', 'SCORE'), uncertifyCategory)

// Score-specific routes (must come after category routes)
router.put('/:scoreId',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE']),
  validate(updateScoreSchema, 'body'),
  logActivity('UPDATE_SCORE', 'SCORE'),
  updateScore
)
router.delete('/:scoreId', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE']), logActivity('DELETE_SCORE', 'SCORE'), deleteScore)
router.post('/:scoreId/certify', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE']), logActivity('CERTIFY_SCORE', 'SCORE'), certifyScore)
router.post('/:scoreId/unsign', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UNSIGN_SCORE', 'SCORE'), unsignScore)

// Deduction endpoints
router.post('/deductions', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), logActivity('REQUEST_DEDUCTION', 'DEDUCTION'), requestDeduction)
router.get('/deductions', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), getDeductions)
router.post('/deductions/:deductionId/approve', requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD', 'AUDITOR', 'TALLY_MASTER']), logActivity('APPROVE_DEDUCTION', 'DEDUCTION'), approveDeduction)
router.post('/deductions/:deductionId/reject', requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD', 'AUDITOR']), logActivity('REJECT_DEDUCTION', 'DEDUCTION'), rejectDeduction)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;