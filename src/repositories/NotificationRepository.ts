/**
 * Notification Repository
 * Handles database operations for notifications
 */

import { injectable } from 'tsyringe';
import { PrismaClient, Notification, NotificationType, Prisma } from '@prisma/client';

export interface CreateNotificationDTO {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export interface NotificationFilters {
  userId: string;
  read?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

@injectable()
export class NotificationRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new notification
   */
  async create(data: CreateNotificationDTO): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  }

  /**
   * Create notifications for multiple users (broadcast)
   */
  async createMany(userIds: string[], notification: Omit<CreateNotificationDTO, 'userId'>): Promise<number> {
    const result = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        tenantId: notification.tenantId,
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        metadata: notification.metadata ? JSON.stringify(notification.metadata) : null,
      })),
    });

    return result.count;
  }

  /**
   * Get notifications for a user
   */
  async findByUser(filters: NotificationFilters): Promise<Notification[]> {
    const where: Prisma.NotificationWhereInput = {
      userId: filters.userId,
    };

    if (filters.read !== undefined) {
      where.read = filters.read;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: filters.limit,
      skip: filters.offset,
    });
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    // Verify notification belongs to user
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Delete a notification
   */
  async delete(id: string, userId: string): Promise<Notification> {
    // Verify notification belongs to user
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Delete old read notifications (cleanup)
   */
  async deleteOldRead(userId: string, daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        userId,
        read: true,
        readAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Get notification by ID
   */
  async findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }
}
