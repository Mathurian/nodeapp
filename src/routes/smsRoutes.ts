import express, { Router } from 'express';
import { sendSMS, sendBulkSMS, sendNotificationSMS, getSMSHistory, getSMSConfig, updateSMSConfig } from '../controllers/smsController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/sms/settings:
 *   get:
 *     summary: Get SMS configuration
 *     tags: [SMS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SMS configuration retrieved successfully
 *   put:
 *     summary: Update SMS configuration
 *     tags: [SMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: SMS configuration updated successfully
 */
router.get('/settings', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), getSMSConfig)
router.put('/settings', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_SMS_SETTINGS', 'SMS'), updateSMSConfig)

/**
 * @swagger
 * /api/sms/send:
 *   post:
 *     summary: Send SMS
 *     tags: [SMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: SMS sent successfully
 */
router.post('/send', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), logActivity('SEND_SMS', 'SMS'), sendSMS)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;