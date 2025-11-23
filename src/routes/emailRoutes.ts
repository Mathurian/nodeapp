import express, { Router } from 'express';
import { getTemplates, createTemplate, getCampaigns, createCampaign, getLogs, sendMultipleEmails, sendEmailByRole } from '../controllers/emailController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/email/templates:
 *   get:
 *     summary: Get email templates
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email templates retrieved successfully
 *   post:
 *     summary: Create email template
 *     tags: [Email]
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
router.get('/templates', getTemplates)
router.post('/templates', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_EMAIL_TEMPLATE', 'EMAIL'), createTemplate)

/**
 * @swagger
 * /api/email/campaigns:
 *   get:
 *     summary: Get email campaigns
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Campaigns retrieved successfully
 *   post:
 *     summary: Create email campaign
 *     tags: [Email]
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
 *         description: Campaign created successfully
 */
router.get('/campaigns', getCampaigns)
router.post('/campaigns', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_EMAIL_CAMPAIGN', 'EMAIL'), createCampaign)

// Multiple recipient email endpoints
router.post('/send-multiple', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('SEND_MULTIPLE_EMAILS', 'EMAIL'), sendMultipleEmails)
router.post('/send-by-role', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('SEND_EMAIL_BY_ROLE', 'EMAIL'), sendEmailByRole)

// Email logs endpoint
router.get('/logs', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), getLogs)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;