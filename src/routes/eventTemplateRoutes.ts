import express, { Router } from 'express';
import { createTemplate, getTemplates, getTemplate, createEventFromTemplate } from '../controllers/eventTemplateController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

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
router.get('/', getTemplates)
router.get('/:id', getTemplate)
router.post('/', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_EVENT_TEMPLATE', 'EVENT_TEMPLATE'), createTemplate)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;