"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSMSHistory = exports.sendNotificationSMS = exports.sendBulkSMS = exports.sendSMS = exports.updateSMSConfig = exports.getSMSConfig = exports.SMSController = void 0;
const container_1 = require("../config/container");
const SMSService_1 = require("../services/SMSService");
const responseHelpers_1 = require("../utils/responseHelpers");
class SMSController {
    smsService;
    prisma;
    constructor() {
        this.smsService = container_1.container.resolve(SMSService_1.SMSService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    getSMSConfig = async (_req, res, next) => {
        try {
            const settings = await this.smsService.getSettings();
            return (0, responseHelpers_1.sendSuccess)(res, settings);
        }
        catch (error) {
            return next(error);
        }
    };
    updateSMSConfig = async (req, res, next) => {
        try {
            const { enabled, apiKey, apiSecret, fromNumber, provider } = req.body;
            await this.smsService.updateSettings({ enabled, apiKey, apiSecret, fromNumber, provider }, req.user?.id);
            return (0, responseHelpers_1.sendSuccess)(res, null, 'SMS settings updated successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    sendSMS = async (req, res, next) => {
        try {
            const { to, message } = req.body;
            const result = await this.smsService.sendSMS(to, message);
            return (0, responseHelpers_1.sendSuccess)(res, result, 'SMS sent successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    sendBulkSMS = async (req, res, next) => {
        try {
            const { recipients, message } = req.body;
            if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Recipients array is required', 400);
            }
            if (!message) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Message is required', 400);
            }
            const results = await Promise.allSettled(recipients.map(async (phone) => {
                return await this.smsService.sendSMS(phone, message);
            }));
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            return (0, responseHelpers_1.sendSuccess)(res, {
                sent: successful,
                failed,
                total: recipients.length
            }, `Bulk SMS sent: ${successful} succeeded, ${failed} failed`);
        }
        catch (error) {
            return next(error);
        }
    };
    sendNotificationSMS = async (req, res, next) => {
        try {
            const { userRole, message } = req.body;
            if (!message) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Message is required', 400);
            }
            const users = await this.prisma.user.findMany({
                where: {
                    role: userRole || undefined,
                    phone: { not: null }
                },
                select: {
                    phone: true,
                    name: true
                }
            });
            const results = await Promise.allSettled(users.map(async (user) => {
                if (user.phone) {
                    return await this.smsService.sendSMS(user.phone, message);
                }
            }));
            const successful = results.filter(r => r.status === 'fulfilled').length;
            return (0, responseHelpers_1.sendSuccess)(res, {
                sent: successful,
                total: users.length
            }, `Notification SMS sent to ${successful} users`);
        }
        catch (error) {
            return next(error);
        }
    };
    getSMSHistory = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;
            const [smsLogs, total] = await Promise.all([
                this.prisma.activityLog.findMany({
                    where: {
                        action: 'SMS_SENT'
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.activityLog.count({
                    where: { action: 'SMS_SENT' }
                })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                history: smsLogs,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: skip + limit < total
                }
            });
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.SMSController = SMSController;
const controller = new SMSController();
exports.getSMSConfig = controller.getSMSConfig;
exports.updateSMSConfig = controller.updateSMSConfig;
exports.sendSMS = controller.sendSMS;
exports.sendBulkSMS = controller.sendBulkSMS;
exports.sendNotificationSMS = controller.sendNotificationSMS;
exports.getSMSHistory = controller.getSMSHistory;
//# sourceMappingURL=smsController.js.map