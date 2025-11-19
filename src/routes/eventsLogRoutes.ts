/**
 * Events Log Routes
 * System event logging and webhook management for audit trails and integrations
 */

import { Router } from 'express';
import * as eventsLogController from '../controllers/eventsLogController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

/**
 * @swagger
 * /api/events-log:
 *   get:
 *     summary: List system event logs
 *     tags: [Event Logs]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve system event logs for audit trail (Admin and Auditor only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Events per page
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *           enum: [USER_LOGIN, USER_CREATED, CONTEST_CREATED, SCORE_SUBMITTED, PERMISSION_CHANGED]
 *         description: Filter by event type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter events after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter events before this date
 *     responses:
 *       200:
 *         description: List of event logs
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
 *                       eventType:
 *                         type: string
 *                         example: "USER_LOGIN"
 *                       userId:
 *                         type: string
 *                       metadata:
 *                         type: object
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       ipAddress:
 *                         type: string
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN or AUDITOR role
 */
router.get('/', eventsLogController.listEventLogs);

/**
 * @swagger
 * /api/events-log/{id}:
 *   get:
 *     summary: Get event log details
 *     tags: [Event Logs]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve detailed information about a specific event log entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event log ID
 *     responses:
 *       200:
 *         description: Event log details
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
 *                     eventType:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     metadata:
 *                       type: object
 *                       description: Event-specific data
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     ipAddress:
 *                       type: string
 *                     userAgent:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN or AUDITOR role
 *       404:
 *         description: Event log not found
 */
router.get('/:id', eventsLogController.getEventLog);

/**
 * @swagger
 * /api/events-log/webhooks:
 *   get:
 *     summary: List configured webhooks
 *     tags: [Event Logs]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all configured webhooks for event notifications (Admin only)
 *     responses:
 *       200:
 *         description: List of webhooks
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
 *                         example: "Slack Notifications"
 *                       url:
 *                         type: string
 *                         example: "https://hooks.slack.com/services/..."
 *                       events:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["USER_CREATED", "CONTEST_COMPLETED"]
 *                       isActive:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.get('/webhooks', requireRole(['ADMIN']), eventsLogController.listWebhooks);

/**
 * @swagger
 * /api/events-log/webhooks:
 *   post:
 *     summary: Create new webhook
 *     tags: [Event Logs]
 *     security:
 *       - bearerAuth: []
 *     description: Configure a webhook to receive event notifications (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - url
 *               - events
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Slack Notifications"
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: "https://hooks.slack.com/services/..."
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Event types to send to this webhook
 *                 example: ["USER_CREATED", "CONTEST_COMPLETED", "SCORE_SUBMITTED"]
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               headers:
 *                 type: object
 *                 description: Custom HTTP headers to include in webhook requests
 *                 example:
 *                   Authorization: "Bearer token123"
 *     responses:
 *       201:
 *         description: Webhook created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid webhook configuration
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/webhooks', requireRole(['ADMIN']), eventsLogController.createWebhook);

/**
 * @swagger
 * /api/events-log/webhooks/{id}:
 *   put:
 *     summary: Update webhook configuration
 *     tags: [Event Logs]
 *     security:
 *       - bearerAuth: []
 *     description: Update webhook settings (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *               headers:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook updated successfully
 *       400:
 *         description: Invalid webhook configuration
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 *       404:
 *         description: Webhook not found
 */
router.put('/webhooks/:id', requireRole(['ADMIN']), eventsLogController.updateWebhook);

/**
 * @swagger
 * /api/events-log/webhooks/{id}:
 *   delete:
 *     summary: Delete webhook
 *     tags: [Event Logs]
 *     security:
 *       - bearerAuth: []
 *     description: Remove a webhook configuration (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID
 *     responses:
 *       200:
 *         description: Webhook deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 *       404:
 *         description: Webhook not found
 */
router.delete('/webhooks/:id', requireRole(['ADMIN']), eventsLogController.deleteWebhook);

export default router;
