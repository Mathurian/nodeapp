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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPreferenceRepository = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../config/database"));
let NotificationPreferenceRepository = class NotificationPreferenceRepository {
    prismaClient;
    constructor(prismaClient = database_1.default) {
        this.prismaClient = prismaClient;
    }
    async findByUserId(tenantId, userId) {
        return this.prismaClient.notificationPreference.findUnique({
            where: {
                tenantId_userId: { tenantId, userId }
            },
        });
    }
    async create(data) {
        return this.prismaClient.notificationPreference.create({
            data: {
                tenantId: data.tenantId,
                userId: data.userId,
                emailEnabled: data.emailEnabled ?? true,
                pushEnabled: data.pushEnabled ?? false,
                inAppEnabled: data.inAppEnabled ?? true,
                emailDigestFrequency: data.emailDigestFrequency ?? 'daily',
                emailTypes: data.emailTypes ? JSON.stringify(data.emailTypes) : null,
                pushTypes: data.pushTypes ? JSON.stringify(data.pushTypes) : null,
                inAppTypes: data.inAppTypes ? JSON.stringify(data.inAppTypes) : null,
                quietHoursStart: data.quietHoursStart ? String(data.quietHoursStart) : null,
                quietHoursEnd: data.quietHoursEnd ? String(data.quietHoursEnd) : null,
            },
        });
    }
    async update(tenantId, userId, data) {
        const updateData = {};
        if (data.emailEnabled !== undefined)
            updateData.emailEnabled = data.emailEnabled;
        if (data.pushEnabled !== undefined)
            updateData.pushEnabled = data.pushEnabled;
        if (data.inAppEnabled !== undefined)
            updateData.inAppEnabled = data.inAppEnabled;
        if (data.emailDigestFrequency !== undefined)
            updateData.emailDigestFrequency = data.emailDigestFrequency;
        if (data.emailTypes !== undefined)
            updateData.emailTypes = JSON.stringify(data.emailTypes);
        if (data.pushTypes !== undefined)
            updateData.pushTypes = JSON.stringify(data.pushTypes);
        if (data.inAppTypes !== undefined)
            updateData.inAppTypes = JSON.stringify(data.inAppTypes);
        if (data.quietHoursStart !== undefined)
            updateData.quietHoursStart = String(data.quietHoursStart);
        if (data.quietHoursEnd !== undefined)
            updateData.quietHoursEnd = String(data.quietHoursEnd);
        return this.prismaClient.notificationPreference.update({
            where: {
                tenantId_userId: { tenantId, userId }
            },
            data: updateData,
        });
    }
    async getOrCreate(tenantId, userId) {
        const existing = await this.findByUserId(tenantId, userId);
        if (existing)
            return existing;
        return this.create({ tenantId, userId });
    }
    async delete(tenantId, userId) {
        return this.prismaClient.notificationPreference.delete({
            where: {
                tenantId_userId: { tenantId, userId }
            },
        });
    }
    async isNotificationTypeEnabled(tenantId, userId, type, notificationType) {
        const preference = await this.getOrCreate(tenantId, userId);
        if (type === 'email' && !preference.emailEnabled)
            return false;
        if (type === 'push' && !preference.pushEnabled)
            return false;
        if (type === 'inApp' && !preference.inAppEnabled)
            return false;
        if (notificationType) {
            const typesField = type === 'email' ? preference.emailTypes :
                type === 'push' ? preference.pushTypes :
                    preference.inAppTypes;
            if (typesField && typesField.length > 0) {
                return typesField.includes(notificationType);
            }
        }
        return true;
    }
    async isInQuietHours(tenantId, userId) {
        const preference = await this.getOrCreate(tenantId, userId);
        if (preference.quietHoursStart === null || preference.quietHoursStart === undefined ||
            preference.quietHoursEnd === null || preference.quietHoursEnd === undefined) {
            return false;
        }
        const now = new Date();
        const currentHour = now.getHours();
        const startHour = parseInt(preference.quietHoursStart, 10);
        const endHour = parseInt(preference.quietHoursEnd, 10);
        if (startHour < endHour) {
            return currentHour >= startHour && currentHour <= endHour;
        }
        else {
            return currentHour >= startHour || currentHour <= endHour;
        }
    }
    async getUsersForDigest(frequency) {
        return this.prismaClient.notificationPreference.findMany({
            where: {
                emailEnabled: true,
                emailDigestFrequency: frequency,
            },
        });
    }
};
exports.NotificationPreferenceRepository = NotificationPreferenceRepository;
exports.NotificationPreferenceRepository = NotificationPreferenceRepository = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], NotificationPreferenceRepository);
//# sourceMappingURL=NotificationPreferenceRepository.js.map