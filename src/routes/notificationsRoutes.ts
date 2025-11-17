/**
 * Notification Routes
 * API endpoints for notification management with real-time support
 */

import { Router, Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { NotificationService } from '../services/NotificationService';
import { authenticateToken as authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications for authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of notifications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationService = container.resolve(NotificationService);
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const notifications = await notificationService.getUserNotifications(userId, limit, offset);
    res.json(notifications);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 */
router.get('/unread-count', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationService = container.resolve(NotificationService);
    const userId = req.user!.id;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.put('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationService = container.resolve(NotificationService);
    const { id } = req.params;
    const userId = req.user!.id;
    const notification = await notificationService.markAsRead(id, userId);
    res.json(notification);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.put('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationService = container.resolve(NotificationService);
    const userId = req.user!.id;
    const count = await notificationService.markAllAsRead(userId);
    res.json({ count });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationService = container.resolve(NotificationService);
    const { id } = req.params;
    const userId = req.user!.id;
    await notificationService.deleteNotification(id, userId);
    res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   delete:
 *     summary: Delete all read notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysOld
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Delete notifications older than N days
 *     responses:
 *       200:
 *         description: Old notifications deleted
 */
router.delete('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationService = container.resolve(NotificationService);
    const userId = req.user!.id;
    const daysOld = parseInt(req.query.daysOld as string) || 30;
    const count = await notificationService.cleanupOldNotifications(userId, daysOld);
    res.json({ count });
  } catch (error) {
    return next(error);
  }
});

export default router;