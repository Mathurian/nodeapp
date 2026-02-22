import express, { Router } from 'express';
import { wipeData, wipeAllData, wipeEventData } from '../controllers/dataWipeController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/data-wipe:
 *   post:
 *     summary: Tenant-scoped data wipe by scope (legacy compatibility path)
 *     tags: [Data Wipe]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN']), logActivity('WIPE_DATA_SCOPE', 'SYSTEM'), wipeData);

/**
 * @swagger
 * /api/data-wipe/all:
 *   post:
 *     summary: Wipe all event/contest/user data (ADMIN ONLY)
 *     tags: [Data Wipe]
 *     security:
 *       - bearerAuth: []
 */
router.post('/all', requireRole(['SUPER_ADMIN']), logActivity('WIPE_ALL_DATA', 'SYSTEM'), wipeAllData);

/**
 * @swagger
 * /api/data-wipe/event/{eventId}:
 *   post:
 *     summary: Wipe data for a specific event
 *     tags: [Data Wipe]
 *     security:
 *       - bearerAuth: []
 */
router.post('/event/:eventId', requireRole(['SUPER_ADMIN', 'ADMIN']), logActivity('WIPE_EVENT_DATA', 'EVENT'), wipeEventData);

export default router;

// CommonJS compatibility
module.exports = router;
