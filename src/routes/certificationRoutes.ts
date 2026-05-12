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
  getCertificationStats,
  getCertificationOverview
} from '../controllers/certificationController';
import { authenticateToken, requirePermission, requireRole } from '../middleware/auth';
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
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), requirePermission('certifications:read'), getAllCertifications)
router.get('/stats', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), requirePermission('certifications:read'), getCertificationStats)
router.get('/overview', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), requirePermission('certifications:read'), getCertificationOverview)
router.get('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), requirePermission('certifications:read'), validate(idParamSchema, 'params'), getCertificationById)
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('certifications:write'), validate(createCertificationSchema, 'body'), logActivity('CREATE_CERTIFICATION', 'CERTIFICATION'), createCertification)
router.put('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('certifications:write'), validate(idParamSchema, 'params'), validate(updateCertificationSchema, 'body'), logActivity('UPDATE_CERTIFICATION', 'CERTIFICATION'), updateCertification)
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('certifications:write'), validate(idParamSchema, 'params'), logActivity('DELETE_CERTIFICATION', 'CERTIFICATION'), deleteCertification)

// Workflow endpoints
router.post('/:id/certify-judge', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE']), requirePermission('certifications:write'), validate(idParamSchema, 'params'), logActivity('CERTIFY_JUDGE', 'CERTIFICATION'), certifyJudge)
router.post('/:id/certify-tally', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'TALLY_MASTER']), requirePermission('certifications:write'), validate(idParamSchema, 'params'), logActivity('CERTIFY_TALLY', 'CERTIFICATION'), certifyTally)
router.post('/:id/certify-auditor', requireRole(['SUPER_ADMIN', 'ADMIN', 'AUDITOR']), requirePermission('certifications:write'), validate(idParamSchema, 'params'), logActivity('CERTIFY_AUDITOR', 'CERTIFICATION'), certifyAuditor)
router.post('/:id/approve-board', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requirePermission('certifications:write'), validate(idParamSchema, 'params'), logActivity('APPROVE_BOARD', 'CERTIFICATION'), approveBoard)
router.post('/:id/reject', requireRole(['SUPER_ADMIN', 'ADMIN', 'BOARD', 'AUDITOR']), requirePermission('certifications:write'), validate(idParamSchema, 'params'), logActivity('REJECT_CERTIFICATION', 'CERTIFICATION'), rejectCertification)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
