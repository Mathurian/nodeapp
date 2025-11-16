import express, { Router } from 'express';
import { setContestantViewRestriction, canContestantView, lockEventContest, isLocked } from '../controllers/restrictionController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/restrictions/contestant-view:
 *   post:
 *     summary: Set contestant view restriction
 *     tags: [Restrictions]
 *     security:
 *       - bearerAuth: []
 */
router.post('/contestant-view', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('SET_CONTESTANT_VIEW_RESTRICTION', 'SETTING'), setContestantViewRestriction);

/**
 * @swagger
 * /api/restrictions/contestant-view/check:
 *   get:
 *     summary: Check if contestant can view scores/results
 *     tags: [Restrictions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/contestant-view/check', canContestantView);

/**
 * @swagger
 * /api/restrictions/lock:
 *   post:
 *     summary: Lock/unlock event or contest for editing
 *     tags: [Restrictions]
 *     security:
 *       - bearerAuth: []
 */
router.post('/lock', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('LOCK_EVENT_CONTEST', 'EVENT'), lockEventContest);

/**
 * @swagger
 * /api/restrictions/lock/check:
 *   get:
 *     summary: Check if event/contest is locked
 *     tags: [Restrictions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/lock/check', isLocked);

export default router;

// CommonJS compatibility
module.exports = router;


