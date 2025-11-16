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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const tsyringe_1 = require("tsyringe");
const NotificationRepository_1 = require("../repositories/NotificationRepository");
let NotificationService = class NotificationService {
    notificationRepository;
    io = null;
    constructor(notificationRepository) {
        this.notificationRepository = notificationRepository;
    }
    setSocketIO(io) {
        this.io = io;
    }
    async createNotification(data) {
        const notification = await this.notificationRepository.create(data);
        if (this.io) {
            this.io.to(`user:${data.userId}`).emit('notification:new', notification);
        }
        return notification;
    }
    async broadcastNotification(userIds, notification) {
        const count = await this.notificationRepository.createMany(userIds, notification);
        if (this.io) {
            userIds.forEach((userId) => {
                this.io?.to(`user:${userId}`).emit('notification:new', { ...notification, userId });
            });
        }
        return count;
    }
    async getUserNotifications(userId, limit = 50, offset = 0) {
        return this.notificationRepository.findByUser({
            userId,
            limit,
            offset,
        });
    }
    async getUnreadCount(userId) {
        return this.notificationRepository.getUnreadCount(userId);
    }
    async markAsRead(id, userId) {
        const notification = await this.notificationRepository.markAsRead(id, userId);
        if (this.io) {
            this.io.to(`user:${userId}`).emit('notification:read', { id });
        }
        return notification;
    }
    async markAllAsRead(userId) {
        const count = await this.notificationRepository.markAllAsRead(userId);
        if (this.io) {
            this.io.to(`user:${userId}`).emit('notification:read-all');
        }
        return count;
    }
    async deleteNotification(id, userId) {
        const notification = await this.notificationRepository.delete(id, userId);
        if (this.io) {
            this.io.to(`user:${userId}`).emit('notification:deleted', { id });
        }
        return notification;
    }
    async cleanupOldNotifications(userId, daysOld = 30) {
        return this.notificationRepository.deleteOldRead(userId, daysOld);
    }
    async notifyScoreSubmitted(tenantId, userId, contestantName, categoryName) {
        return this.createNotification({
            tenantId,
            userId,
            type: 'SUCCESS',
            title: 'Score Submitted',
            message: `Your score for ${contestantName} in ${categoryName} has been submitted successfully.`,
            link: '/judge/scoring',
        });
    }
    async notifyContestCertified(tenantId, userId, contestName) {
        return this.createNotification({
            tenantId,
            userId,
            type: 'SUCCESS',
            title: 'Contest Certified',
            message: `The contest "${contestName}" has been certified.`,
            link: '/results',
        });
    }
    async notifyAssignmentChange(tenantId, userId, contestName, action) {
        return this.createNotification({
            tenantId,
            userId,
            type: 'INFO',
            title: action === 'assigned' ? 'New Assignment' : 'Assignment Removed',
            message: action === 'assigned'
                ? `You have been assigned to judge "${contestName}".`
                : `You have been removed from judging "${contestName}".`,
            link: '/judge/assignments',
        });
    }
    async notifyReportReady(tenantId, userId, reportName, reportId) {
        return this.createNotification({
            tenantId,
            userId,
            type: 'SUCCESS',
            title: 'Report Ready',
            message: `Your requested report "${reportName}" is ready for download.`,
            link: `/reports/${reportId}`,
        });
    }
    async notifyCertificationRequired(tenantId, userId, contestName, level) {
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
    async notifyRoleChange(tenantId, userId, newRole) {
        return this.createNotification({
            tenantId,
            userId,
            type: 'INFO',
            title: 'Role Updated',
            message: `Your role has been changed to ${newRole}.`,
            link: '/profile',
        });
    }
    async notifyEventStatusChange(tenantId, userId, eventName, newStatus) {
        return this.createNotification({
            tenantId,
            userId,
            type: 'INFO',
            title: 'Event Status Changed',
            message: `The event "${eventName}" status has been changed to ${newStatus}.`,
            link: '/events',
        });
    }
    async notifySystemMaintenance(tenantId, message, affectedUserIds) {
        return this.broadcastNotification(affectedUserIds, {
            tenantId,
            type: 'SYSTEM',
            title: 'System Maintenance',
            message,
        });
    }
    async notifyError(tenantId, userId, title, message) {
        return this.createNotification({
            tenantId,
            userId,
            type: 'ERROR',
            title,
            message,
        });
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(NotificationRepository_1.NotificationRepository)),
    __metadata("design:paramtypes", [NotificationRepository_1.NotificationRepository])
], NotificationService);
//# sourceMappingURL=NotificationService.js.map