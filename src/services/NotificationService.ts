/**
 * Notification Service
 * Handles business logic for notifications with real-time support
 */

import { injectable, inject } from 'tsyringe';
import { Notification } from '@prisma/client';
import { NotificationRepository, CreateNotificationDTO } from '../repositories/NotificationRepository';
import { Server as SocketIOServer } from 'socket.io';

@injectable()
export class NotificationService {
  private io: SocketIOServer | null = null;

  constructor(
    @inject(NotificationRepository)
    private notificationRepository: NotificationRepository
  ) {}

  /**
   * Set Socket.IO server instance for real-time notifications
   */
  setSocketIO(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * Create a notification for a user
   */
  async createNotification(data: CreateNotificationDTO): Promise<Notification> {
    const notification = await this.notificationRepository.create(data);

    // Emit real-time notification
    if (this.io) {
      this.io.to(`user:${data.userId}`).emit('notification:new', notification);
    }

    return notification;
  }

  /**
   * Broadcast notification to multiple users
   */
  async broadcastNotification(
    userIds: string[],
    notification: Omit<CreateNotificationDTO, 'userId'>
  ): Promise<number> {
    const count = await this.notificationRepository.createMany(userIds, notification);

    // Emit real-time notifications to all users
    if (this.io) {
      userIds.forEach((userId) => {
        this.io?.to(`user:${userId}`).emit('notification:new', { ...notification, userId });
      });
    }

    return count;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, tenantId: string, limit = 50, offset = 0): Promise<Notification[]> {
    return this.notificationRepository.findByUser({
      userId,
      tenantId,
      limit,
      offset,
    });
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    return this.notificationRepository.getUnreadCount(userId, tenantId);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string, tenantId: string): Promise<Notification> {
    const notification = await this.notificationRepository.markAsRead(id, userId, tenantId);

    // Emit real-time update
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification:read', { id });
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, tenantId: string): Promise<number> {
    const count = await this.notificationRepository.markAllAsRead(userId, tenantId);

    // Emit real-time update
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification:read-all');
    }

    return count;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string, userId: string, tenantId: string): Promise<Notification> {
    const notification = await this.notificationRepository.delete(id, userId, tenantId);

    // Emit real-time update
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification:deleted', { id });
    }

    return notification;
  }

  /**
   * Delete old read notifications
   */
  async cleanupOldNotifications(userId: string, tenantId: string, daysOld = 30): Promise<number> {
    return this.notificationRepository.deleteOldRead(userId, tenantId, daysOld);
  }

  // ==================== Specific Notification Creators ====================

  /**
   * Notify user when score is submitted
   */
  async notifyScoreSubmitted(
    tenantId: string,
    userId: string,
    contestantName: string,
    categoryName: string
  ): Promise<Notification> {
    return this.createNotification({
      tenantId,
      userId,
      type: 'SUCCESS',
      title: 'Score Submitted',
      message: `Your score for ${contestantName} in ${categoryName} has been submitted successfully.`,
      link: '/judge/scoring',
    });
  }

  /**
   * Notify user when contest is certified
   */
  async notifyContestCertified(tenantId: string, userId: string, contestName: string): Promise<Notification> {
    return this.createNotification({
      tenantId,
      userId,
      type: 'SUCCESS',
      title: 'Contest Certified',
      message: `The contest "${contestName}" has been certified.`,
      link: '/results',
    });
  }

  /**
   * Notify user about assignment change
   */
  async notifyAssignmentChange(
    tenantId: string,
    userId: string,
    contestName: string,
    action: 'assigned' | 'removed'
  ): Promise<Notification> {
    return this.createNotification({
      tenantId,
      userId,
      type: 'INFO',
      title: action === 'assigned' ? 'New Assignment' : 'Assignment Removed',
      message:
        action === 'assigned'
          ? `You have been assigned to judge "${contestName}".`
          : `You have been removed from judging "${contestName}".`,
      link: '/judge/assignments',
    });
  }

  /**
   * Notify user when report is ready
   */
  async notifyReportReady(tenantId: string, userId: string, reportName: string, reportId: string): Promise<Notification> {
    return this.createNotification({
      tenantId,
      userId,
      type: 'SUCCESS',
      title: 'Report Ready',
      message: `Your requested report "${reportName}" is ready for download.`,
      link: `/reports/${reportId}`,
    });
  }

  /**
   * Notify user about certification requirement
   */
  async notifyCertificationRequired(
    tenantId: string,
    userId: string,
    contestName: string,
    level: number
  ): Promise<Notification> {
    const levels = ['', 'Judge Review', 'Tally Master Review', 'Board Approval'];
    return this.createNotification({
      tenantId,
      userId,
      type: 'WARNING',
      title: 'Certification Required',
      message: `Your action is required for ${levels[level]} of "${contestName}".`,
      link: '/certification',
    });
  }

  /**
   * Notify user about role change
   */
  async notifyRoleChange(tenantId: string, userId: string, newRole: string): Promise<Notification> {
    return this.createNotification({
      tenantId,
      userId,
      type: 'INFO',
      title: 'Role Updated',
      message: `Your role has been changed to ${newRole}.`,
      link: '/profile',
    });
  }

  /**
   * Notify user about event status change
   */
  async notifyEventStatusChange(
    tenantId: string,
    userId: string,
    eventName: string,
    newStatus: string
  ): Promise<Notification> {
    return this.createNotification({
      tenantId,
      userId,
      type: 'INFO',
      title: 'Event Status Changed',
      message: `The event "${eventName}" status has been changed to ${newStatus}.`,
      link: '/events',
    });
  }

  /**
   * Send system-wide notification to all users
   */
  async notifySystemMaintenance(tenantId: string, message: string, affectedUserIds: string[]): Promise<number> {
    return this.broadcastNotification(affectedUserIds, {
      tenantId,
      type: 'SYSTEM',
      title: 'System Maintenance',
      message,
    });
  }

  /**
   * Send error notification
   */
  async notifyError(tenantId: string, userId: string, title: string, message: string): Promise<Notification> {
    return this.createNotification({
      tenantId,
      userId,
      type: 'ERROR',
      title,
      message,
    });
  }
}
