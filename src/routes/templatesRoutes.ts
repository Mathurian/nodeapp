import express, { Router } from 'express';
import { getAllTemplates, createTemplate, getTemplateById, updateTemplate, deleteTemplate, duplicateTemplate, createTemplateFromCategory, createCategoryFromTemplate } from '../controllers/templatesController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { validate, createTemplateFromCategorySchema, createCategoryFromTemplateSchema } from '../middleware/validation';

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
router.get('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), getTemplateById)
router.put('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_TEMPLATE', 'TEMPLATE'), updateTemplate)
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('DELETE_TEMPLATE', 'TEMPLATE'), deleteTemplate)
router.post('/:id/duplicate', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('DUPLICATE_TEMPLATE', 'TEMPLATE'), duplicateTemplate)
router.post('/:id/create-category', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), validate(createCategoryFromTemplateSchema), logActivity('CREATE_CATEGORY_FROM_TEMPLATE', 'TEMPLATE'), createCategoryFromTemplate)
router.post('/categories/from-category/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), validate(createTemplateFromCategorySchema), logActivity('CREATE_TEMPLATE_FROM_CATEGORY', 'TEMPLATE'), createTemplateFromCategory)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
