import express, { Router } from 'express';
import { getScores, getCategories, submitScore, updateScore, deleteScore, certifyScore, certifyScores, certifyTotals, finalCertification, requestDeduction, approveDeduction, rejectDeduction, getDeductions, unsignScore, certifyJudgeContestScores, uncertifyCategory } from '../controllers/scoringController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

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
router.get('/categories', requireRole(['ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), getCategories)

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
router.post('/category/:categoryId/contestant/:contestantId', requireRole(['ADMIN', 'JUDGE']), logActivity('SUBMIT_SCORE', 'SCORE'), submitScore)
router.post('/category/:categoryId/certify', requireRole(['ADMIN', 'JUDGE']), logActivity('CERTIFY_SCORES', 'SCORE'), certifyScores)
router.post('/category/:categoryId/certify-totals', requireRole(['ADMIN', 'TALLY_MASTER']), certifyTotals)
router.post('/category/:categoryId/final-certification', requireRole(['ADMIN', 'AUDITOR']), finalCertification)
router.post('/category/:categoryId/uncertify', requireRole(['ADMIN', 'BOARD', 'ORGANIZER']), logActivity('UNCERTIFY_CATEGORY', 'SCORE'), uncertifyCategory)

// Score-specific routes (must come after category routes)
router.put('/:scoreId', requireRole(['ADMIN', 'JUDGE']), logActivity('UPDATE_SCORE', 'SCORE'), updateScore)
router.delete('/:scoreId', requireRole(['ADMIN', 'JUDGE']), logActivity('DELETE_SCORE', 'SCORE'), deleteScore)
router.post('/:scoreId/certify', requireRole(['ADMIN', 'JUDGE']), logActivity('CERTIFY_SCORE', 'SCORE'), certifyScore)
router.post('/:scoreId/unsign', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UNSIGN_SCORE', 'SCORE'), unsignScore)

// Deduction endpoints
router.post('/deductions', requireRole(['ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), logActivity('REQUEST_DEDUCTION', 'DEDUCTION'), requestDeduction)
router.get('/deductions', requireRole(['ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), getDeductions)
router.post('/deductions/:deductionId/approve', requireRole(['ADMIN', 'BOARD', 'AUDITOR', 'TALLY_MASTER']), logActivity('APPROVE_DEDUCTION', 'DEDUCTION'), approveDeduction)
router.post('/deductions/:deductionId/reject', requireRole(['ADMIN', 'BOARD', 'AUDITOR']), logActivity('REJECT_DEDUCTION', 'DEDUCTION'), rejectDeduction)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;