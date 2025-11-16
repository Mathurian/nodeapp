"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookEventHandler = void 0;
const database_1 = __importDefault(require("../../config/database"));
const logger_1 = require("../../utils/logger");
const WebhookDeliveryService_1 = __importDefault(require("../../services/WebhookDeliveryService"));
const logger = (0, logger_1.createLogger)('WebhookEventHandler');
class WebhookEventHandler {
    static async handle(event) {
        try {
            const tenantId = event.payload?.tenantId || event.metadata?.tenantId;
            if (!tenantId)
                return;
            const webhooks = await database_1.default.webhookConfig.findMany({
                where: {
                    tenantId,
                    enabled: true
                }
            });
            for (const webhook of webhooks) {
                const events = webhook.events;
                if (events.includes(event.type)) {
                    this.triggerWebhook(webhook, event).catch((error) => {
                        logger.error(`Failed to trigger webhook ${webhook.id}:`, error);
                    });
                }
            }
        }
        catch (error) {
            logger.error('Error handling webhook event:', error);
        }
    }
    static async triggerWebhook(webhook, event) {
        try {
            logger.info(`Triggering webhook ${webhook.name} for event ${event.type}`);
            const result = await WebhookDeliveryService_1.default.deliver(webhook, event);
            if (result.success) {
                logger.info(`Webhook ${webhook.name} delivered successfully (${result.attemptCount} attempts)`);
            }
            else {
                logger.warn(`Webhook ${webhook.name} delivery failed after ${result.attemptCount} attempts: ${result.error}`);
            }
        }
        catch (error) {
            logger.error(`Error triggering webhook ${webhook.id}:`, error);
        }
    }
}
exports.WebhookEventHandler = WebhookEventHandler;
//# sourceMappingURL=WebhookEventHandler.js.map