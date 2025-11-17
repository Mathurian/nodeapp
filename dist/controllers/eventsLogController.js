"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWebhook = exports.updateWebhook = exports.createWebhook = exports.listWebhooks = exports.getEventLog = exports.listEventLogs = void 0;
const database_1 = __importDefault(require("../config/database"));
const responseHelpers_1 = require("../utils/responseHelpers");
const listEventLogs = async (req, res, next) => {
    try {
        const { eventType, entityType, limit = 100, offset = 0 } = req.query;
        const logs = await database_1.default.eventLog.findMany({
            where: {
                tenantId: req.tenantId,
                ...(eventType && { eventType: eventType }),
                ...(entityType && { entityType: entityType })
            },
            orderBy: { timestamp: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        const total = await database_1.default.eventLog.count({
            where: {
                tenantId: req.tenantId,
                ...(eventType && { eventType: eventType }),
                ...(entityType && { entityType: entityType })
            }
        });
        (0, responseHelpers_1.sendSuccess)(res, { logs, total, limit, offset });
    }
    catch (error) {
        return next(error);
    }
};
exports.listEventLogs = listEventLogs;
const getEventLog = async (req, res, next) => {
    try {
        const log = await database_1.default.eventLog.findUnique({
            where: { id: req.params.id }
        });
        (0, responseHelpers_1.sendSuccess)(res, log);
    }
    catch (error) {
        return next(error);
    }
};
exports.getEventLog = getEventLog;
const listWebhooks = async (req, res, next) => {
    try {
        const webhooks = await database_1.default.webhookConfig.findMany({
            where: { tenantId: req.tenantId }
        });
        (0, responseHelpers_1.sendSuccess)(res, webhooks);
    }
    catch (error) {
        return next(error);
    }
};
exports.listWebhooks = listWebhooks;
const createWebhook = async (req, res, next) => {
    try {
        const webhook = await database_1.default.webhookConfig.create({
            data: {
                ...req.body,
                tenantId: req.tenantId
            }
        });
        (0, responseHelpers_1.sendSuccess)(res, webhook, 'Webhook created', 201);
    }
    catch (error) {
        return next(error);
    }
};
exports.createWebhook = createWebhook;
const updateWebhook = async (req, res, next) => {
    try {
        const webhook = await database_1.default.webhookConfig.update({
            where: { id: req.params.id },
            data: req.body
        });
        (0, responseHelpers_1.sendSuccess)(res, webhook, 'Webhook updated');
    }
    catch (error) {
        return next(error);
    }
};
exports.updateWebhook = updateWebhook;
const deleteWebhook = async (req, res, next) => {
    try {
        await database_1.default.webhookConfig.delete({
            where: { id: req.params.id }
        });
        (0, responseHelpers_1.sendSuccess)(res, null, 'Webhook deleted');
    }
    catch (error) {
        return next(error);
    }
};
exports.deleteWebhook = deleteWebhook;
//# sourceMappingURL=eventsLogController.js.map