/**
 * Notification Repository
 * Handles database operations for notifications
 */

import { injectable } from 'tsyringe';
import { PrismaClient, Notification, NotificationType, Prisma } from '@prisma/client';

const normalizeNotificationType = (type: unknown): NotificationType => {
  const normalized = String(type ?? 'INFO').trim().toUpperCase();
  if (normalized === 'INFO' || normalized === 'SUCCESS' || normalized === 'WARNING' || normalized === 'ERROR' || normalized === 'SYSTEM') {
    return normalized as NotificationType;
  }
  return 'INFO';
};

export interface CreateNotificationDTO {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  sentBy?: string; // User ID of who sent the notification
}

export interface NotificationFilters {
  userId: string;
  tenantId: string;
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
    const normalizedType = normalizeNotificationType(data.type);
    return this.prisma.notification.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        type: normalizedType,
        title: data.title,
        message: data.message,
        link: data.link,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        sentBy: data.sentBy || null,
      },
    });
  }

  /**
   * Create notifications for multiple users (broadcast)
   */
  async createMany(userIds: string[], notification: Omit<CreateNotificationDTO, 'userId'>): Promise<number> {
    const normalizedType = normalizeNotificationType(notification.type);
    const data = userIds.map((userId) => ({
      tenantId: notification.tenantId,
      userId,
      type: normalizedType,
      title: notification.title,
      message: notification.message,
      link: notification.link || undefined,
      metadata: notification.metadata ? JSON.stringify(notification.metadata) : undefined,
      sentBy: notification.sentBy || undefined,
    }));

    const result = await this.prisma.notification.createMany({
      data,
    });

    return result.count;
  }

  /**
   * Create notifications for multiple users and return created records.
   * Used by delivery paths that need notification IDs for channel status updates.
   */
  async createManyAndReturn(userIds: string[], notification: Omit<CreateNotificationDTO, 'userId'>): Promise<Notification[]> {
    const normalizedType = normalizeNotificationType(notification.type);

    return this.prisma.$transaction(
      userIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            tenantId: notification.tenantId,
            userId,
            type: normalizedType,
            title: notification.title,
            message: notification.message,
            link: notification.link || undefined,
            metadata: notification.metadata ? JSON.stringify(notification.metadata) : undefined,
            sentBy: notification.sentBy || undefined,
          },
        })
      )
    );
  }

  async markPushSentByIds(notificationIds: string[]): Promise<number> {
    if (notificationIds.length === 0) {
      return 0;
    }

    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
      },
      data: {
        pushSent: true,
        pushSentAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Get notifications for a user
   */
  async findByUser(filters: NotificationFilters): Promise<Notification[]> {
    const where: Prisma.NotificationWhereInput = {
      userId: filters.userId,
      tenantId: filters.tenantId,
      deletedAt: null, // Exclude soft-deleted notifications
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
  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        tenantId,
        read: false,
        deletedAt: null, // Exclude soft-deleted notifications
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string, tenantId: string): Promise<Notification> {
    // Verify notification belongs to user and tenant
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, tenantId },
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
  async markAllAsRead(userId: string, tenantId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        tenantId,
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
   * Soft delete a notification
   */
  async delete(id: string, userId: string, tenantId: string): Promise<Notification> {
    // Verify notification belongs to user and tenant
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, tenantId, deletedAt: null },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restore a soft-deleted notification
   */
  async restore(id: string, userId: string, tenantId: string): Promise<Notification> {
    // Verify notification belongs to user and tenant and is deleted
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, tenantId, deletedAt: { not: null } },
    });

    if (!notification) {
      throw new Error('Deleted notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Permanently delete a soft-deleted notification
   */
  async permanentlyDelete(id: string, userId: string, tenantId: string): Promise<void> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        id,
        userId,
        tenantId,
        deletedAt: { not: null },
      },
    });

    if (result.count === 0) {
      throw new Error('Deleted notification not found');
    }
  }

  /**
   * Get deleted notifications for a user
   */
  async findDeleted(userId: string, tenantId: string, limit?: number, offset?: number): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        tenantId,
        deletedAt: { not: null },
      },
      orderBy: {
        deletedAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Permanently delete old soft-deleted notifications
   */
  async permanentlyDeleteOld(userId: string, tenantId: string, daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        userId,
        tenantId,
        deletedAt: {
          not: null,
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Delete old read notifications (cleanup)
   */
  async deleteOldRead(userId: string, tenantId: string, daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        userId,
        tenantId,
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
  async findById(id: string, tenantId: string): Promise<Notification | null> {
    return this.prisma.notification.findFirst({
      where: { id, tenantId },
    });
  }
}
