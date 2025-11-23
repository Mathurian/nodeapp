import express, { Router } from 'express';
import { createTestEvent, deleteTestEvent } from '../controllers/testEventSetupController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/test-event-setup:
 *   post:
 *     summary: Create a test event with configurable options (ADMIN ONLY)
 *     tags: [Test Event Setup]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN']), logActivity('CREATE_TEST_EVENT', 'EVENT'), createTestEvent);

/**
 * @swagger
 * /api/test-event-setup/:eventId:
 *   delete:
 *     summary: Delete a test event and optionally its tenant (ADMIN ONLY)
 *     tags: [Test Event Setup]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:eventId', requireRole(['SUPER_ADMIN', 'ADMIN']), logActivity('DELETE_TEST_EVENT', 'EVENT'), deleteTestEvent);

export default router;

// CommonJS compatibility
module.exports = router;


