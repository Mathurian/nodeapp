import express, { Router } from 'express';
import {
  getAllCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  getCertificationById,
  certifyJudge,
  certifyTally,
  certifyAuditor,
  approveBoard,
  rejectCertification,
  getCertificationStats
} from '../controllers/certificationController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/certifications:
 *   get:
 *     summary: Get all certifications
 *     tags: [Certifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Certifications retrieved successfully
 *   post:
 *     summary: Create certification
 *     tags: [Certifications]
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
 *         description: Certification created successfully
 */
router.get('/', getAllCertifications)
router.get('/stats', getCertificationStats)
router.get('/:id', getCertificationById)
router.post('/', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_CERTIFICATION', 'CERTIFICATION'), createCertification)
router.put('/:id', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_CERTIFICATION', 'CERTIFICATION'), updateCertification)
router.delete('/:id', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('DELETE_CERTIFICATION', 'CERTIFICATION'), deleteCertification)

// Workflow endpoints
router.post('/:id/certify-judge', requireRole(['ADMIN', 'JUDGE']), logActivity('CERTIFY_JUDGE', 'CERTIFICATION'), certifyJudge)
router.post('/:id/certify-tally', requireRole(['ADMIN', 'TALLY_MASTER']), logActivity('CERTIFY_TALLY', 'CERTIFICATION'), certifyTally)
router.post('/:id/certify-auditor', requireRole(['ADMIN', 'AUDITOR']), logActivity('CERTIFY_AUDITOR', 'CERTIFICATION'), certifyAuditor)
router.post('/:id/approve-board', requireRole(['ADMIN', 'BOARD']), logActivity('APPROVE_BOARD', 'CERTIFICATION'), approveBoard)
router.post('/:id/reject', requireRole(['ADMIN', 'BOARD', 'AUDITOR']), logActivity('REJECT_CERTIFICATION', 'CERTIFICATION'), rejectCertification)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;