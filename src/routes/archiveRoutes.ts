import express, { Router } from 'express';
import { getAllArchives, archiveEvent, restoreEvent, deleteArchivedItem } from '../controllers/archiveController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/archive:
 *   get:
 *     summary: Get all archived items
 *     tags: [Archive]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Archived items retrieved successfully
 */
router.get('/', getAllArchives)

/**
 * @swagger
 * /api/archive/event/{eventId}:
 *   post:
 *     summary: Archive an event
 *     tags: [Archive]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event archived successfully
 */
router.post('/event/:eventId', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('ARCHIVE_EVENT', 'EVENT'), archiveEvent)
router.post('/event/:eventId/restore', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('RESTORE_EVENT', 'EVENT'), restoreEvent)
router.post('/events/:eventId/restore', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('RESTORE_EVENT', 'EVENT'), restoreEvent)
router.delete('/event/:eventId', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('DELETE_ARCHIVE', 'EVENT'), deleteArchivedItem)
router.delete('/events/:eventId', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('DELETE_ARCHIVE', 'EVENT'), deleteArchivedItem)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;