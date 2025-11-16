/**
 * Email Digest Service
 * Handles email digest functionality for notifications
 */

import { injectable, inject } from 'tsyringe';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { NotificationPreferenceRepository } from '../repositories/NotificationPreferenceRepository';
import { EmailService } from './EmailService';
import prisma from '../config/database';

export interface DigestNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  createdAt: Date;
}

@injectable()
export class EmailDigestService {
  constructor(
    @inject(NotificationRepository)
    private notificationRepository: NotificationRepository,
    @inject(NotificationPreferenceRepository)
    private preferenceRepository: NotificationPreferenceRepository,
    @inject(EmailService)
    private emailService: EmailService
  ) {}

  /**
   * Send daily digest to users
   */
  async sendDailyDigests(): Promise<number> {
    return this.sendDigests('daily');
  }

  /**
   * Send weekly digest to users
   */
  async sendWeeklyDigests(): Promise<number> {
    return this.sendDigests('weekly');
  }

  /**
   * Send digest to users based on frequency
   */
  private async sendDigests(frequency: string): Promise<number> {
    const preferences = await this.preferenceRepository.getUsersForDigest(frequency);
    let sentCount = 0;

    for (const preference of preferences) {
      try {
        const sent = await this.sendDigestToUser(preference.userId, frequency);
        if (sent) sentCount++;
      } catch (error) {
        console.error(`Error sending digest to user ${preference.userId}:`, error);
      }
    }

    return sentCount;
  }

  /**
   * Send digest email to a single user
   */
  async sendDigestToUser(userId: string, frequency: string): Promise<boolean> {
    // Get time range based on frequency
    const since = this.getTimeRange(frequency);

    // Get unread notifications - filter by createdAt since 'since' is not in the type
    const allNotifications = await this.notificationRepository.findByUser({
      userId,
      read: false,
      limit: 100,
    });

    // Filter by time range manually
    const notifications = allNotifications.filter(n => n.createdAt >= since);

    if (notifications.length === 0) {
      return false; // No notifications to send
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user || !user.email) {
      return false;
    }

    // Group notifications by type
    const grouped = this.groupNotifications(notifications);

    // Generate HTML email
    const html = this.generateDigestHTML(user.name, grouped, frequency);

    // Send email - EmailService expects 3 separate arguments
    await this.emailService.sendEmail(
      user.email,
      `Your ${frequency} notification digest`,
      html
    );

    // Update digest record
    await this.updateDigestRecord(userId, frequency);

    return true;
  }

  /**
   * Get time range based on frequency
   */
  private getTimeRange(frequency: string): Date {
    const now = new Date();

    switch (frequency) {
      case 'hourly':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'daily':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Group notifications by type
   */
  private groupNotifications(notifications: any[]): Map<string, DigestNotification[]> {
    const grouped = new Map<string, DigestNotification[]>();

    notifications.forEach((notification) => {
      const type = notification.type;
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
      });
    });

    return grouped;
  }

  /**
   * Generate HTML for digest email
   */
  private generateDigestHTML(
    userName: string,
    grouped: Map<string, DigestNotification[]>,
    frequency: string
  ): string {
    const totalCount = Array.from(grouped.values()).reduce((sum, arr) => sum + arr.length, 0);

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .notification-group {
              background: white;
              padding: 20px;
              margin-bottom: 20px;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .notification-group h3 {
              margin: 0 0 15px 0;
              color: #1f2937;
              font-size: 18px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 10px;
            }
            .notification-item {
              padding: 12px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .notification-item:last-child {
              border-bottom: none;
            }
            .notification-title {
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 4px;
            }
            .notification-message {
              color: #6b7280;
              font-size: 14px;
            }
            .notification-time {
              color: #9ca3af;
              font-size: 12px;
              margin-top: 4px;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
              margin-right: 8px;
            }
            .badge-info { background: #dbeafe; color: #1e40af; }
            .badge-success { background: #d1fae5; color: #065f46; }
            .badge-warning { background: #fef3c7; color: #92400e; }
            .badge-error { background: #fee2e2; color: #991b1b; }
            .badge-system { background: #e5e7eb; color: #374151; }
            .footer {
              background: #f9fafb;
              padding: 20px;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
              border: 1px solid #e5e7eb;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Your ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Digest</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">You have ${totalCount} new notification${totalCount !== 1 ? 's' : ''}</p>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Here's a summary of your notifications from the past ${frequency === 'daily' ? '24 hours' : 'week'}:</p>
    `;

    // Add each notification group
    grouped.forEach((notifications, type) => {
      const badgeClass = `badge-${type.toLowerCase()}`;
      html += `
        <div class="notification-group">
          <h3><span class="badge ${badgeClass}">${type}</span>${notifications.length} notification${notifications.length !== 1 ? 's' : ''}</h3>
      `;

      notifications.forEach((notification) => {
        const timeAgo = this.getTimeAgo(notification.createdAt);
        html += `
          <div class="notification-item">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${timeAgo}</div>
          </div>
        `;
      });

      html += `</div>`;
    });

    html += `
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/notifications" class="button">View All Notifications</a>
            </div>
          </div>
          <div class="footer">
            <p>You're receiving this email because you've enabled ${frequency} email digests.</p>
            <p><a href="${process.env.FRONTEND_URL}/settings/notifications" style="color: #667eea;">Manage notification preferences</a></p>
          </div>
        </body>
      </html>
    `;

    return html;
  }

  /**
   * Get human-readable time ago
   */
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [name, value] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / value);
      if (interval >= 1) {
        return `${interval} ${name}${interval !== 1 ? 's' : ''} ago`;
      }
    }

    return 'Just now';
  }

  /**
   * Update digest record
   */
  private async updateDigestRecord(userId: string, frequency: string): Promise<void> {
    const nextSendAt = this.getNextSendTime(frequency);

    // Find existing digest record
    const existing = await prisma.notificationDigest.findFirst({
      where: {
        userId,
        frequency,
      },
    });

    if (existing) {
      // Update existing record
      await prisma.notificationDigest.update({
        where: { id: existing.id },
        data: {
          lastSentAt: new Date(),
          nextSendAt,
        },
      });
    } else {
      // Create new record
      await prisma.notificationDigest.create({
        data: {
          userId,
          frequency,
          lastSentAt: new Date(),
          nextSendAt,
        },
      });
    }
  }

  /**
   * Calculate next send time based on frequency
   */
  private getNextSendTime(frequency: string): Date {
    const now = new Date();

    switch (frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        // Send at 8 AM next day
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);
        return tomorrow;
      case 'weekly':
        // Send every Monday at 8 AM
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + ((7 - nextWeek.getDay() + 1) % 7 || 7));
        nextWeek.setHours(8, 0, 0, 0);
        return nextWeek;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get digests that are due to be sent
   */
  async getDueDigests(): Promise<Array<{ userId: string; frequency: string }>> {
    const digests = await prisma.notificationDigest.findMany({
      where: {
        nextSendAt: {
          lte: new Date(),
        },
      },
    });

    return digests.map((d) => ({ userId: d.userId, frequency: d.frequency }));
  }
}
