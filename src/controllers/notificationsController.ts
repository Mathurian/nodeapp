import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { NotificationService } from '../services/NotificationService';
import { sendSuccess } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class NotificationsController {
  private notificationService: NotificationService;
  private prisma: PrismaClient;

  constructor() {
    this.notificationService = container.resolve(NotificationService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getAllNotifications = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const notifications = await this.notificationService.getUserNotifications(req.user!.id, req.user!.tenantId);
      return sendSuccess(res, notifications);
    } catch (error) {
      return next(error);
    }
  };

  getNotificationById = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // id from params not currently used
      // NotificationService doesn't have getById, we can use the repository directly or return error
      // For now, return a not implemented error
      return res.status(501).json({ error: 'Not implemented' });
    } catch (error) {
      return next(error);
    }
  };

  createNotification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const notification = await this.notificationService.createNotification({
        ...req.body,
        userId: req.user!.id
      });
      return sendSuccess(res, notification, 'Notification created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  updateNotification = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // id from params not currently used
      // NotificationService doesn't have update method
      return res.status(501).json({ error: 'Not implemented' });
    } catch (error) {
      return next(error);
    }
  };

  deleteNotification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      await this.notificationService.deleteNotification(id!, req.user!.id, req.user!.tenantId);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      await this.notificationService.markAsRead(id!, req.user!.id, req.user!.tenantId);
      return sendSuccess(res, null, 'Notification marked as read');
    } catch (error) {
      return next(error);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const count = await this.notificationService.markAllAsRead(req.user!.id, req.user!.tenantId);
      return sendSuccess(res, { count }, 'All notifications marked as read');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Send notification to specific users
   * Requires ADMIN, SUPER_ADMIN, ORGANIZER, or BOARD role
   */
  sendNotification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { userIds, title, message, type, link } = req.body;
      const senderRole = req.user!.role;
      const tenantId = req.user!.tenantId;

      // Permission check: ADMIN, SUPER_ADMIN, ORGANIZER, BOARD can send
      if (!['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(senderRole)) {
        return res.status(403).json({ error: 'Insufficient permissions to send notifications' });
      }

      // Validate required fields
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'userIds array is required' });
      }
      if (!title || !message) {
        return res.status(400).json({ error: 'title and message are required' });
      }

      // For non-SUPER_ADMIN, validate users belong to same tenant
      if (senderRole !== 'SUPER_ADMIN') {
        const users = await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, tenantId: true }
        });

        const invalidUsers = users.filter(u => u.tenantId !== tenantId);
        if (invalidUsers.length > 0) {
          return res.status(403).json({
            error: 'Cannot send notifications to users outside your tenant'
          });
        }

        if (users.length !== userIds.length) {
          return res.status(404).json({
            error: 'Some user IDs not found'
          });
        }
      }

      // Send notifications
      const count = await this.notificationService.broadcastNotification(userIds, {
        title,
        message,
        type: type || 'INFO',
        link: link || null,
        tenantId,
      });

      return sendSuccess(res, { count, recipientCount: userIds.length }, 'Notifications sent successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Broadcast notification to all users with specific roles
   * Requires ADMIN or SUPER_ADMIN role
   */
  broadcastByRole = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { roles, title, message, type, link } = req.body;
      const senderRole = req.user!.role;
      const tenantId = req.user!.tenantId;

      // Permission check: only ADMIN and SUPER_ADMIN can broadcast by role
      if (!['ADMIN', 'SUPER_ADMIN'].includes(senderRole)) {
        return res.status(403).json({ error: 'Insufficient permissions to broadcast notifications' });
      }

      // Validate required fields
      if (!roles || !Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({ error: 'roles array is required' });
      }
      if (!title || !message) {
        return res.status(400).json({ error: 'title and message are required' });
      }

      // Get users with specified roles (scoped to tenant for non-SUPER_ADMIN)
      const whereClause: any = {
        role: { in: roles },
        isActive: true,
      };

      if (senderRole !== 'SUPER_ADMIN') {
        whereClause.tenantId = tenantId;
      }

      const users = await this.prisma.user.findMany({
        where: whereClause,
        select: { id: true }
      });

      if (users.length === 0) {
        return sendSuccess(res, { count: 0, recipientCount: 0 }, 'No users found with specified roles');
      }

      const userIds = users.map(u => u.id);

      // Send notifications
      const count = await this.notificationService.broadcastNotification(userIds, {
        title,
        message,
        type: type || 'INFO',
        link: link || null,
        tenantId,
      });

      return sendSuccess(res, { count, recipientCount: userIds.length }, 'Notifications broadcast successfully');
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new NotificationsController();
export const getAllNotifications = controller.getAllNotifications;
export const getNotificationById = controller.getNotificationById;
export const createNotification = controller.createNotification;
export const updateNotification = controller.updateNotification;
export const deleteNotification = controller.deleteNotification;
export const markAsRead = controller.markAsRead;
export const markAllAsRead = controller.markAllAsRead;
export const sendNotification = controller.sendNotification;
export const broadcastByRole = controller.broadcastByRole;
