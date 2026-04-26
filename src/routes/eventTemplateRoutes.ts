import express, { Router } from 'express';
import {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  createEventFromTemplate,
  createContestFromTemplate
} from '../controllers/eventTemplateController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { validate, createContestFromTemplateSchema } from '../middleware/validation';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/event-templates:
 *   get:
 *     summary: Get event templates
 *     tags: [Event Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Event templates retrieved successfully
 *   post:
 *     summary: Create event template
 *     tags: [Event Templates]
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
 *         description: Event template created successfully
 */
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), getTemplates)
router.get('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), getTemplate)
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_EVENT_TEMPLATE', 'EVENT_TEMPLATE'), createTemplate)
router.put('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_EVENT_TEMPLATE', 'EVENT_TEMPLATE'), updateTemplate)
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('DELETE_EVENT_TEMPLATE', 'EVENT_TEMPLATE'), deleteTemplate)
router.post('/:id/create-event', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_EVENT_FROM_TEMPLATE', 'EVENT_TEMPLATE'), createEventFromTemplate)
router.post('/:id/create-contest', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), validate(createContestFromTemplateSchema), logActivity('CREATE_CONTEST_FROM_TEMPLATE', 'EVENT_TEMPLATE'), createContestFromTemplate)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
