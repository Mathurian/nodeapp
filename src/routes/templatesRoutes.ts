import express, { Router } from 'express';
import { getAllTemplates, createTemplate } from '../controllers/templatesController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/templates:
 *   get:
 *     summary: Get all templates
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 *   post:
 *     summary: Create template
 *     tags: [Templates]
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
 *         description: Template created successfully
 */
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), getAllTemplates)
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_TEMPLATE', 'TEMPLATE'), createTemplate)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;