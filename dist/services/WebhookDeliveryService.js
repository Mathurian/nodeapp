"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookDeliveryService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('WebhookDeliveryService');
class WebhookDeliveryService {
    static async deliver(webhook, event) {
        try {
            logger.info(`Delivering webhook ${webhook.name} for event ${event.type}`);
            const delivery = await database_1.default.webhookDelivery.create({
                data: {
                    tenantId: webhook.tenantId || 'default_tenant',
                    webhookId: webhook.id,
                    eventId: event.metadata.correlationId || event.type || 'unknown',
                    status: 'pending',
                    attemptCount: 0
                }
            });
            const result = await this.deliverWithRetry(webhook, event, delivery.id);
            await database_1.default.webhookDelivery.update({
                where: { id: delivery.id },
                data: {
                    status: result.success ? 'success' : 'failed',
                    attemptCount: result.attemptCount,
                    lastAttemptAt: new Date(),
                    responseStatus: result.responseStatus,
                    responseBody: result.responseBody
                        ? result.responseBody.substring(0, 1000)
                        : null
                }
            });
            return result;
        }
        catch (error) {
            logger.error(`Error delivering webhook ${webhook.id}:`, error);
            throw error;
        }
    }
    static async deliverWithRetry(webhook, event, deliveryId) {
        const maxAttempts = webhook.retryAttempts || 3;
        let attemptCount = 0;
        let lastError;
        for (attemptCount = 1; attemptCount <= maxAttempts; attemptCount++) {
            try {
                logger.debug(`Webhook delivery attempt ${attemptCount}/${maxAttempts} for ${webhook.name}`);
                const result = await this.sendWebhook(webhook, event);
                logger.info(`Webhook delivered successfully to ${webhook.name} (attempt ${attemptCount}, status ${result.responseStatus})`);
                return {
                    success: true,
                    deliveryId,
                    attemptCount,
                    responseStatus: result.responseStatus,
                    responseBody: result.responseBody
                };
            }
            catch (error) {
                lastError = error.message;
                logger.warn(`Webhook delivery attempt ${attemptCount}/${maxAttempts} failed for ${webhook.name}: ${error.message}`);
                if (attemptCount < maxAttempts) {
                    const backoffMs = Math.pow(2, attemptCount) * 1000;
                    logger.debug(`Waiting ${backoffMs}ms before retry...`);
                    await this.sleep(backoffMs);
                }
            }
        }
        logger.error(`All webhook delivery attempts failed for ${webhook.name}: ${lastError}`);
        return {
            success: false,
            deliveryId,
            attemptCount,
            error: lastError
        };
    }
    static async sendWebhook(webhook, event) {
        const timestamp = new Date().toISOString();
        const payload = {
            event: event.type,
            timestamp,
            data: event.payload,
            metadata: event.metadata
        };
        const signature = this.calculateSignature(payload, webhook.secret || '');
        const headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': timestamp,
            'X-Webhook-Event': event.type,
            'User-Agent': 'EventManager-Webhook/1.0',
            ...(webhook.headers || {})
        };
        try {
            const response = await axios_1.default.post(webhook.url, payload, {
                headers,
                timeout: (webhook.timeout || 30) * 1000,
                validateStatus: (status) => status >= 200 && status < 300
            });
            return {
                responseStatus: response.status,
                responseBody: JSON.stringify(response.data)
            };
        }
        catch (error) {
            if (error.response) {
                throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
            }
            else if (error.request) {
                throw new Error(`No response from webhook URL: ${error.message}`);
            }
            else {
                throw new Error(`Request setup error: ${error.message}`);
            }
        }
    }
    static calculateSignature(payload, secret) {
        const payloadString = JSON.stringify(payload);
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(payloadString);
        return hmac.digest('hex');
    }
    static sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    static async getDeliveryHistory(webhookId, limit = 50) {
        try {
            return await database_1.default.webhookDelivery.findMany({
                where: { webhookId },
                orderBy: { createdAt: 'desc' },
                take: limit
            });
        }
        catch (error) {
            logger.error('Error getting webhook delivery history:', error);
            throw error;
        }
    }
    static async getWebhookStats(webhookId, days = 7) {
        try {
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const deliveries = await database_1.default.webhookDelivery.findMany({
                where: {
                    webhookId,
                    createdAt: { gte: since }
                }
            });
            const total = deliveries.length;
            const successful = deliveries.filter((d) => d.status === 'success').length;
            const failed = deliveries.filter((d) => d.status === 'failed').length;
            const pending = deliveries.filter((d) => d.status === 'pending').length;
            const successRate = total > 0 ? (successful / total) * 100 : 0;
            const avgAttempts = successful > 0
                ? deliveries
                    .filter((d) => d.status === 'success')
                    .reduce((sum, d) => sum + d.attemptCount, 0) / successful
                : 0;
            return {
                total,
                successful,
                failed,
                pending,
                successRate,
                avgAttempts: Math.round(avgAttempts * 10) / 10,
                recentDeliveries: deliveries.slice(0, 10)
            };
        }
        catch (error) {
            logger.error('Error getting webhook stats:', error);
            throw error;
        }
    }
    static async retryDelivery(deliveryId) {
        try {
            const delivery = await database_1.default.webhookDelivery.findUnique({
                where: { id: deliveryId },
            });
            if (!delivery) {
                throw new Error(`Webhook delivery ${deliveryId} not found`);
            }
            if (delivery.status === 'success') {
                throw new Error('Cannot retry successful delivery');
            }
            const webhook = await database_1.default.webhookConfig.findUnique({
                where: { id: delivery.webhookId }
            });
            if (!webhook) {
                throw new Error(`Webhook config ${delivery.webhookId} not found`);
            }
            const eventLog = await database_1.default.eventLog.findFirst({
                where: { id: delivery.eventId }
            });
            if (!eventLog) {
                throw new Error(`Event log ${delivery.eventId} not found`);
            }
            const event = {
                type: eventLog.eventType,
                payload: eventLog.payload,
                metadata: {
                    source: eventLog.source,
                    correlationId: eventLog.correlationId || undefined,
                    ...eventLog.metadata
                }
            };
            logger.info(`Retrying webhook delivery ${deliveryId}`);
            return await this.deliver(webhook, event);
        }
        catch (error) {
            logger.error(`Error retrying webhook delivery ${deliveryId}:`, error);
            throw error;
        }
    }
    static verifySignature(payload, signature, secret) {
        const calculatedSignature = this.calculateSignature(payload, secret);
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature));
    }
}
exports.WebhookDeliveryService = WebhookDeliveryService;
exports.default = WebhookDeliveryService;
//# sourceMappingURL=WebhookDeliveryService.js.map