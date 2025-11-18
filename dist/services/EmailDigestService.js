"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailDigestService = void 0;
const tsyringe_1 = require("tsyringe");
const NotificationRepository_1 = require("../repositories/NotificationRepository");
const NotificationPreferenceRepository_1 = require("../repositories/NotificationPreferenceRepository");
const EmailService_1 = require("./EmailService");
const database_1 = __importDefault(require("../config/database"));
let EmailDigestService = class EmailDigestService {
    notificationRepository;
    preferenceRepository;
    emailService;
    constructor(notificationRepository, preferenceRepository, emailService) {
        this.notificationRepository = notificationRepository;
        this.preferenceRepository = preferenceRepository;
        this.emailService = emailService;
    }
    async sendDailyDigests() {
        return this.sendDigests('daily');
    }
    async sendWeeklyDigests() {
        return this.sendDigests('weekly');
    }
    async sendDigests(frequency) {
        const preferences = await this.preferenceRepository.getUsersForDigest(frequency);
        let sentCount = 0;
        for (const preference of preferences) {
            try {
                const sent = await this.sendDigestToUser(preference.userId, frequency, preference.tenantId);
                if (sent)
                    sentCount++;
            }
            catch (error) {
                console.error(`Error sending digest to user ${preference.userId}:`, error);
            }
        }
        return sentCount;
    }
    async sendDigestToUser(userId, frequency, tenantId) {
        const since = this.getTimeRange(frequency);
        const allNotifications = await this.notificationRepository.findByUser({
            userId,
            tenantId,
            read: false,
            limit: 100,
        });
        const notifications = allNotifications.filter(n => n.createdAt >= since);
        if (notifications.length === 0) {
            return false;
        }
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
        });
        if (!user || !user.email) {
            return false;
        }
        const grouped = this.groupNotifications(notifications);
        const html = this.generateDigestHTML(user.name, grouped, frequency);
        await this.emailService.sendEmail(user.email, `Your ${frequency} notification digest`, html);
        await this.updateDigestRecord(userId, frequency);
        return true;
    }
    getTimeRange(frequency) {
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
    groupNotifications(notifications) {
        const grouped = new Map();
        notifications.forEach((notification) => {
            const type = notification.type;
            if (!grouped.has(type)) {
                grouped.set(type, []);
            }
            grouped.get(type).push({
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
    generateDigestHTML(userName, grouped, frequency) {
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
    getTimeAgo(date) {
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
    async updateDigestRecord(userId, frequency) {
        const nextSendAt = this.getNextSendTime(frequency);
        const existing = await database_1.default.notificationDigest.findFirst({
            where: {
                userId,
                frequency,
            },
        });
        if (existing) {
            await database_1.default.notificationDigest.update({
                where: { id: existing.id },
                data: {
                    lastSentAt: new Date(),
                    nextSendAt,
                },
            });
        }
        else {
            const user = await database_1.default.user.findUnique({
                where: { id: userId },
                select: { tenantId: true }
            });
            await database_1.default.notificationDigest.create({
                data: {
                    tenantId: user?.tenantId || 'default_tenant',
                    userId,
                    frequency,
                    lastSentAt: new Date(),
                    nextSendAt,
                },
            });
        }
    }
    getNextSendTime(frequency) {
        const now = new Date();
        switch (frequency) {
            case 'hourly':
                return new Date(now.getTime() + 60 * 60 * 1000);
            case 'daily':
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(8, 0, 0, 0);
                return tomorrow;
            case 'weekly':
                const nextWeek = new Date(now);
                nextWeek.setDate(nextWeek.getDate() + ((7 - nextWeek.getDay() + 1) % 7 || 7));
                nextWeek.setHours(8, 0, 0, 0);
                return nextWeek;
            default:
                return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
    }
    async getDueDigests() {
        const digests = await database_1.default.notificationDigest.findMany({
            where: {
                nextSendAt: {
                    lte: new Date(),
                },
            },
        });
        return digests.map((d) => ({ userId: d.userId, frequency: d.frequency }));
    }
};
exports.EmailDigestService = EmailDigestService;
exports.EmailDigestService = EmailDigestService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(NotificationRepository_1.NotificationRepository)),
    __param(1, (0, tsyringe_1.inject)(NotificationPreferenceRepository_1.NotificationPreferenceRepository)),
    __param(2, (0, tsyringe_1.inject)(EmailService_1.EmailService)),
    __metadata("design:paramtypes", [NotificationRepository_1.NotificationRepository,
        NotificationPreferenceRepository_1.NotificationPreferenceRepository,
        EmailService_1.EmailService])
], EmailDigestService);
//# sourceMappingURL=EmailDigestService.js.map