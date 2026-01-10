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
import { validate, createCertificationSchema, updateCertificationSchema, idParamSchema } from '../middleware/validation';

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
router.get('/:id', validate(idParamSchema, 'params'), getCertificationById)
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), validate(createCertificationSchema, 'body'), logActivity('CREATE_CERTIFICATION', 'CERTIFICATION'), createCertification)
router.put('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), validate(idParamSchema, 'params'), validate(updateCertificationSchema, 'body'), logActivity('UPDATE_CERTIFICATION', 'CERTIFICATION'), updateCertification)
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), validate(idParamSchema, 'params'), logActivity('DELETE_CERTIFICATION', 'CERTIFICATION'), deleteCertification)

// Workflow endpoints
router.post('/:id/certify-judge', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE']), validate(idParamSchema, 'params'), logActivity('CERTIFY_JUDGE', 'CERTIFICATION'), certifyJudge)
router.post('/:id/certify-tally', requireRole(['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER']), validate(idParamSchema, 'params'), logActivity('CERTIFY_TALLY', 'CERTIFICATION'), certifyTally)
router.post('/:id/certify-auditor', requireRole(['SUPER_ADMIN', 'ADMIN', 'AUDITOR']), validate(idParamSchema, 'params'), logActivity('CERTIFY_AUDITOR', 'CERTIFICATION'), certifyAuditor)
router.post('/:id/approve-board', requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD']), validate(idParamSchema, 'params'), logActivity('APPROVE_BOARD', 'CERTIFICATION'), approveBoard)
router.post('/:id/reject', requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD', 'AUDITOR']), validate(idParamSchema, 'params'), logActivity('REJECT_CERTIFICATION', 'CERTIFICATION'), rejectCertification)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;