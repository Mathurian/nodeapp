import express, { Router } from 'express';
import {
  createDeductionRequest,
  getPendingDeductions,
  approveDeduction,
  rejectDeduction,
  getApprovalStatus,
  getDeductionHistory
} from '../controllers/deductionController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/deductions/request:
 *   post:
 *     summary: Create deduction request
 *     tags: [Deductions]
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
 *         description: Deduction request created successfully
 */
router.post('/request', requireRole(['JUDGE', 'ORGANIZER', 'BOARD', 'ADMIN']), logActivity('CREATE_DEDUCTION_REQUEST', 'DEDUCTION'), createDeductionRequest)

/**
 * @swagger
 * /api/deductions/pending:
 *   get:
 *     summary: Get pending deductions
 *     tags: [Deductions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending deductions retrieved successfully
 */
router.get('/pending', getPendingDeductions)
router.post('/:id/approve', requireRole(['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER', 'ADMIN']), logActivity('APPROVE_DEDUCTION', 'DEDUCTION'), approveDeduction)
router.post('/:id/reject', requireRole(['BOARD', 'ORGANIZER', 'ADMIN']), logActivity('REJECT_DEDUCTION', 'DEDUCTION'), rejectDeduction)
router.get('/:id/approvals', getApprovalStatus)
router.get('/history', getDeductionHistory)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;