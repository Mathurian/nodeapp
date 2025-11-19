/**
 * Notification Preferences Routes
 * Manage user notification preferences for email, SMS, and in-app notifications
 */

import { Router } from 'express';
import {
  getPreferences,
  updatePreferences,
  resetPreferences,
} from '../controllers/notificationPreferencesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/notification-preferences:
 *   get:
 *     summary: Get user's notification preferences
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve notification preferences for the authenticated user
 *     responses:
 *       200:
 *         description: User notification preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 preferences:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: object
 *                       properties:
 *                         contestUpdates:
 *                           type: boolean
 *                           example: true
 *                         assignmentNotifications:
 *                           type: boolean
 *                           example: true
 *                         resultsPublished:
 *                           type: boolean
 *                           example: true
 *                         systemAnnouncements:
 *                           type: boolean
 *                           example: false
 *                     inApp:
 *                       type: object
 *                       properties:
 *                         contestUpdates:
 *                           type: boolean
 *                         assignmentNotifications:
 *                           type: boolean
 *                     sms:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                           example: false
 *                         urgentOnly:
 *                           type: boolean
 *                           example: true
 *       401:
 *         description: Unauthorized
 */
router.get('/', getPreferences);

/**
 * @swagger
 * /api/notification-preferences:
 *   put:
 *     summary: Update notification preferences
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     description: Update notification preferences for the authenticated user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: object
 *                 properties:
 *                   contestUpdates:
 *                     type: boolean
 *                   assignmentNotifications:
 *                     type: boolean
 *                   resultsPublished:
 *                     type: boolean
 *                   systemAnnouncements:
 *                     type: boolean
 *               inApp:
 *                 type: object
 *                 properties:
 *                   contestUpdates:
 *                     type: boolean
 *                   assignmentNotifications:
 *                     type: boolean
 *               sms:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   urgentOnly:
 *                     type: boolean
 *             example:
 *               email:
 *                 contestUpdates: true
 *                 assignmentNotifications: true
 *                 resultsPublished: false
 *                 systemAnnouncements: false
 *               inApp:
 *                 contestUpdates: true
 *                 assignmentNotifications: true
 *               sms:
 *                 enabled: false
 *                 urgentOnly: true
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 preferences:
 *                   type: object
 *       400:
 *         description: Invalid preference data
 *       401:
 *         description: Unauthorized
 */
router.put('/', updatePreferences);

/**
 * @swagger
 * /api/notification-preferences/reset:
 *   post:
 *     summary: Reset preferences to default
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     description: Reset notification preferences to system defaults
 *     responses:
 *       200:
 *         description: Preferences reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 preferences:
 *                   type: object
 *                   description: Default notification preferences
 *       401:
 *         description: Unauthorized
 */
router.post('/reset', resetPreferences);

export default router;
