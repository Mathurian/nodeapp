/**
 * Email Template Routes
 * Manage customizable email templates for system notifications
 */

import { Router } from 'express';
import { emailTemplateController } from '../controllers/EmailTemplateController';
import { authenticateToken, checkRoles } from '../middleware/auth';

const router = Router();

// All email template routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/email-templates:
 *   get:
 *     summary: List all email templates
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all email templates for the tenant
 *     responses:
 *       200:
 *         description: List of email templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                         example: "Welcome Email"
 *                       type:
 *                         type: string
 *                         enum: [WELCOME, PASSWORD_RESET, VERIFICATION, NOTIFICATION, INVITATION]
 *                       subject:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/email-templates', emailTemplateController.getAllTemplates.bind(emailTemplateController));

/**
 * @swagger
 * /api/email-templates/type/{type}:
 *   get:
 *     summary: Get templates by type
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve email templates filtered by type
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [WELCOME, PASSWORD_RESET, VERIFICATION, NOTIFICATION, INVITATION]
 *         description: Template type
 *         example: "WELCOME"
 *     responses:
 *       200:
 *         description: Templates of specified type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No templates found for this type
 */
router.get('/email-templates/type/:type', emailTemplateController.getTemplatesByType.bind(emailTemplateController));

/**
 * @swagger
 * /api/email-templates/variables/{type}:
 *   get:
 *     summary: Get available template variables
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     description: Get list of variables available for use in email templates of a specific type
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [WELCOME, PASSWORD_RESET, VERIFICATION, NOTIFICATION, INVITATION]
 *         description: Template type
 *     responses:
 *       200:
 *         description: Available template variables
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 variables:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "{{userName}}"
 *                       description:
 *                         type: string
 *                         example: "User's full name"
 *                   example:
 *                     - name: "{{userName}}"
 *                       description: "User's full name"
 *                     - name: "{{eventName}}"
 *                       description: "Event name"
 *       401:
 *         description: Unauthorized
 */
router.get('/email-templates/variables/:type', emailTemplateController.getAvailableVariables.bind(emailTemplateController));

/**
 * @swagger
 * /api/email-templates/{id}:
 *   get:
 *     summary: Get email template by ID
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve a specific email template
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Email template details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     subject:
 *                       type: string
 *                     htmlBody:
 *                       type: string
 *                     textBody:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 */
router.get('/email-templates/:id', emailTemplateController.getTemplateById.bind(emailTemplateController));

/**
 * @swagger
 * /api/email-templates:
 *   post:
 *     summary: Create new email template
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     description: Create a custom email template (Admin/Organizer only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - subject
 *               - htmlBody
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Custom Welcome Email"
 *               type:
 *                 type: string
 *                 enum: [WELCOME, PASSWORD_RESET, VERIFICATION, NOTIFICATION, INVITATION]
 *                 example: "WELCOME"
 *               subject:
 *                 type: string
 *                 example: "Welcome to {{tenantName}}!"
 *               htmlBody:
 *                 type: string
 *                 description: HTML version of email (supports template variables)
 *                 example: "<h1>Welcome {{userName}}</h1><p>Thank you for joining!</p>"
 *               textBody:
 *                 type: string
 *                 description: Plain text version of email
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Email template created successfully
 *       400:
 *         description: Invalid template data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN or ORGANIZER role
 */
router.post('/email-templates', checkRoles(['ADMIN', 'ORGANIZER']), emailTemplateController.createTemplate.bind(emailTemplateController));

/**
 * @swagger
 * /api/email-templates/{id}:
 *   put:
 *     summary: Update email template
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     description: Update an existing email template (Admin/Organizer only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               subject:
 *                 type: string
 *               htmlBody:
 *                 type: string
 *               textBody:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Email template updated successfully
 *       400:
 *         description: Invalid template data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN or ORGANIZER role
 *       404:
 *         description: Template not found
 */
router.put('/email-templates/:id', checkRoles(['ADMIN', 'ORGANIZER']), emailTemplateController.updateTemplate.bind(emailTemplateController));

/**
 * @swagger
 * /api/email-templates/{id}:
 *   delete:
 *     summary: Delete email template
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     description: Delete an email template (Admin/Organizer only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Email template deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN or ORGANIZER role
 *       404:
 *         description: Template not found
 */
router.delete('/email-templates/:id', checkRoles(['ADMIN', 'ORGANIZER']), emailTemplateController.deleteTemplate.bind(emailTemplateController));

/**
 * @swagger
 * /api/email-templates/{id}/clone:
 *   post:
 *     summary: Clone email template
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     description: Create a copy of an existing email template (Admin/Organizer only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID to clone
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name for cloned template
 *                 example: "Welcome Email (Copy)"
 *     responses:
 *       201:
 *         description: Email template cloned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN or ORGANIZER role
 *       404:
 *         description: Template not found
 */
router.post('/email-templates/:id/clone', checkRoles(['ADMIN', 'ORGANIZER']), emailTemplateController.cloneTemplate.bind(emailTemplateController));

/**
 * @swagger
 * /api/email-templates/{id}/preview:
 *   post:
 *     summary: Preview email template
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     description: Generate a preview of the email template with sample data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sampleData:
 *                 type: object
 *                 description: Sample variable values for preview
 *                 example:
 *                   userName: "John Doe"
 *                   eventName: "Summer Championship"
 *     responses:
 *       200:
 *         description: Email template preview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 preview:
 *                   type: object
 *                   properties:
 *                     subject:
 *                       type: string
 *                     htmlBody:
 *                       type: string
 *                     textBody:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 */
router.post('/email-templates/:id/preview', emailTemplateController.previewTemplate.bind(emailTemplateController));

export default router;
