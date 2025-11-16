import express, { Router } from 'express';
import { createTestEvent } from '../controllers/testEventSetupController';
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
router.post('/', requireRole(['ADMIN']), logActivity('CREATE_TEST_EVENT', 'EVENT'), createTestEvent);

export default router;

// CommonJS compatibility
module.exports = router;


