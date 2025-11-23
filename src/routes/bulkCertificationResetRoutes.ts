import express, { Router } from 'express';
import { resetCertifications } from '../controllers/bulkCertificationResetController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/bulk-certification-reset:
 *   post:
 *     summary: Reset certifications in bulk
 *     tags: [Bulk Certification Reset]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('BULK_RESET_CERTIFICATIONS', 'CERTIFICATION'), resetCertifications);

export default router;

// CommonJS compatibility
module.exports = router;


