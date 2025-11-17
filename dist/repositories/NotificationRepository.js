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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
let NotificationRepository = class NotificationRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
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
    async createMany(userIds, notification) {
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
    async findByUser(filters) {
        const where = {
            userId: filters.userId,
            tenantId: filters.tenantId,
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
    async getUnreadCount(userId, tenantId) {
        return this.prisma.notification.count({
            where: {
                userId,
                tenantId,
                read: false,
            },
        });
    }
    async markAsRead(id, userId, tenantId) {
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
    async markAllAsRead(userId, tenantId) {
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
    async delete(id, userId, tenantId) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId, tenantId },
        });
        if (!notification) {
            throw new Error('Notification not found');
        }
        return this.prisma.notification.delete({
            where: { id },
        });
    }
    async deleteOldRead(userId, tenantId, daysOld = 30) {
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
    async findById(id, tenantId) {
        return this.prisma.notification.findFirst({
            where: { id, tenantId },
        });
    }
};
exports.NotificationRepository = NotificationRepository;
exports.NotificationRepository = NotificationRepository = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], NotificationRepository);
//# sourceMappingURL=NotificationRepository.js.map