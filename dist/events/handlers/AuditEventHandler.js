"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEventHandler = void 0;
const database_1 = __importDefault(require("../../config/database"));
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('AuditEventHandler');
class AuditEventHandler {
    static async handle(event) {
        try {
            const tenantId = event.payload?.tenantId || event.metadata?.tenantId;
            const userId = event.metadata?.userId || event.payload?.userId;
            await database_1.default.eventLog.create({
                data: {
                    tenantId: tenantId || null,
                    eventType: event.type,
                    entityType: event.payload?.entityType,
                    entityId: event.payload?.entityId,
                    payload: event.payload,
                    userId: userId || null,
                    source: event.metadata.source,
                    correlationId: event.metadata.correlationId,
                    timestamp: event.metadata.timestamp,
                    processed: true
                }
            });
            logger.debug(`Logged event to audit log: ${event.type}`);
        }
        catch (error) {
            logger.error('Error handling audit event:', error);
            throw error;
        }
    }
}
exports.AuditEventHandler = AuditEventHandler;
//# sourceMappingURL=AuditEventHandler.js.map