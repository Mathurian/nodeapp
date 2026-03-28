import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { NotificationService } from '../services/NotificationService';
import { sendSuccess , sendUnauthorized} from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('notificationsController');

export class NotificationsController {
  private notificationService: NotificationService;
  private prisma: PrismaClient;

  constructor() {
    this.notificationService = container.resolve(NotificationService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getAllNotifications = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const notifications = await this.notificationService.getUserNotifications(req.user.id, req.user.tenantId);
      return sendSuccess(res, notifications);
    } catch (error) {
      return next(error);
    }
  };

  getNotificationById = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!_req.user) {
        sendUnauthorized(res);
        return;
      }

      return res.status(410).json({
        error: 'Notification detail endpoint is not available',
        message: 'Use the list notifications endpoint to retrieve notification data.',
      });
    } catch (error) {
      return next(error);
    }
  };

  createNotification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const notification = await this.notificationService.createNotification({
        ...req.body,
        userId: req.user.id
      });
      return sendSuccess(res, notification, 'Notification created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  updateNotification = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!_req.user) {
        sendUnauthorized(res);
        return;
      }

      return res.status(410).json({
        error: 'Notification update endpoint is not available',
        message: 'Notifications can be marked as read or deleted, but not updated in place.',
      });
    } catch (error) {
      return next(error);
    }
  };

  deleteNotification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { id } = req.params;
      await this.notificationService.deleteNotification(id!, req.user.id, req.user.tenantId);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { id } = req.params;
      await this.notificationService.markAsRead(id!, req.user.id, req.user.tenantId);
      return sendSuccess(res, null, 'Notification marked as read');
    } catch (error) {
      return next(error);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const count = await this.notificationService.markAllAsRead(req.user.id, req.user.tenantId);
      return sendSuccess(res, { count }, 'All notifications marked as read');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get notifications sent by the current user
   */
  getSentNotifications = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : 50;
      const offset = req.query['offset'] ? parseInt(req.query['offset'] as string) : 0;

      const notifications = await this.prisma.notification.findMany({
        where: {
          sentBy: req.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const total = await this.prisma.notification.count({
        where: {
          sentBy: req.user.id,
        }
      });

      return sendSuccess(res, { notifications, total, limit, offset }, 'Sent notifications retrieved');
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
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { userIds, title, message, type, link, targetTenantId } = req.body;
      const senderRole = req.user.role;
      let tenantId = req.user.tenantId;

      // SUPER_ADMIN can specify targetTenantId to send to other tenants
      if (senderRole === 'SUPER_ADMIN' && targetTenantId) {
        tenantId = targetTenantId;
      }

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

      // Fetch users to validate and get their tenantIds
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, tenantId: true }
      });

      if (users.length !== userIds.length) {
        return res.status(404).json({
          error: 'Some user IDs not found'
        });
      }

      // For non-SUPER_ADMIN, validate users belong to same tenant
      if (senderRole !== 'SUPER_ADMIN') {
        const invalidUsers = users.filter(u => u.tenantId !== tenantId);
        if (invalidUsers.length > 0) {
          return res.status(403).json({
            error: 'Cannot send notifications to users outside your tenant'
          });
        }
      }

      // For SUPER_ADMIN sending to users across multiple tenants,
      // create notifications individually with each user's correct tenantId
      const usersByTenant = new Map<string, string[]>();
      for (const user of users) {
        const userTenantId = user.tenantId;
        if (!usersByTenant.has(userTenantId)) {
          usersByTenant.set(userTenantId, []);
        }
        usersByTenant.get(userTenantId)!.push(user.id);
      }

      logger.info('Sending notification across tenant groups', {
        totalUsers: users.length,
        tenantsCount: usersByTenant.size,
        senderRole,
      });

      // Send notifications grouped by tenant
      let count = 0;
      for (const [userTenantId, tenantUserIds] of usersByTenant.entries()) {
        const notificationData = {
          title,
          message,
          type: type || 'INFO',
          link: link || null,
          tenantId: userTenantId, // Use each user's tenant ID
          sentBy: req.user.id, // Track who sent the notification
        };

        const tenantCount = await this.notificationService.broadcastNotification(tenantUserIds, notificationData);
        count += tenantCount;
      }

      logger.info('Notification broadcast completed', {
        recipientCount: users.length,
        deliveredCount: count,
        senderRole,
      });

      return sendSuccess(res, { count, recipientCount: users.length }, 'Notifications sent successfully');
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
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { roles, title, message, type, link, targetTenantId } = req.body;
      const senderRole = req.user.role;
      let tenantId = req.user.tenantId;

      // SUPER_ADMIN can specify targetTenantId to send to other tenants
      // targetTenantId === null means all tenants (cross-tenant broadcast)
      const isAllTenants = senderRole === 'SUPER_ADMIN' && targetTenantId === null;
      if (senderRole === 'SUPER_ADMIN' && targetTenantId && targetTenantId !== null) {
        tenantId = targetTenantId;
      }

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

      // Only filter by tenant if:
      // - User is not SUPER_ADMIN, OR
      // - User is SUPER_ADMIN but not broadcasting to all tenants
      if (senderRole !== 'SUPER_ADMIN' || !isAllTenants) {
        whereClause.tenantId = tenantId;
      }

      const users = await this.prisma.user.findMany({
        where: whereClause,
        select: { id: true, tenantId: true }
      });

      if (users.length === 0) {
        return sendSuccess(res, { count: 0, recipientCount: 0 }, 'No users found with specified roles');
      }

      // For cross-tenant broadcasts, create notifications individually with correct tenantId
      let count = 0;
      if (isAllTenants) {
        for (const user of users) {
          const userCount = await this.notificationService.broadcastNotification([user.id], {
            title,
            message,
            type: type || 'INFO',
            link: link || null,
            tenantId: user.tenantId,
            sentBy: req.user.id, // Track who sent the notification
          });
          count += userCount;
        }
      } else {
        // Single tenant broadcast
        const userIds = users.map(u => u.id);
        count = await this.notificationService.broadcastNotification(userIds, {
          title,
          message,
          type: type || 'INFO',
          link: link || null,
          tenantId,
          sentBy: req.user.id, // Track who sent the notification
        });
      }

      return sendSuccess(res, { count, recipientCount: users.length }, 'Notifications broadcast successfully');
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
