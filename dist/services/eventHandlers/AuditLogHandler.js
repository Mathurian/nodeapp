"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogHandler = void 0;
const client_1 = require("@prisma/client");
const EventBusService_1 = require("../EventBusService");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('AuditLogHandler');
const prisma = new client_1.PrismaClient();
class AuditLogHandler {
    static handler = async (event) => {
        try {
            const auditableEvents = [
                EventBusService_1.AppEventType.USER_CREATED,
                EventBusService_1.AppEventType.USER_UPDATED,
                EventBusService_1.AppEventType.USER_DELETED,
                EventBusService_1.AppEventType.EVENT_CREATED,
                EventBusService_1.AppEventType.EVENT_UPDATED,
                EventBusService_1.AppEventType.EVENT_DELETED,
                EventBusService_1.AppEventType.CONTEST_CREATED,
                EventBusService_1.AppEventType.CONTEST_UPDATED,
                EventBusService_1.AppEventType.CONTEST_DELETED,
                EventBusService_1.AppEventType.CONTEST_CERTIFIED,
                EventBusService_1.AppEventType.CATEGORY_CERTIFIED,
                EventBusService_1.AppEventType.SCORE_SUBMITTED,
                EventBusService_1.AppEventType.SCORE_UPDATED,
                EventBusService_1.AppEventType.SCORE_DELETED,
                EventBusService_1.AppEventType.SCORES_FINALIZED,
                EventBusService_1.AppEventType.CERTIFICATION_APPROVED,
                EventBusService_1.AppEventType.CERTIFICATION_REJECTED,
            ];
            if (!auditableEvents.includes(event.type)) {
                return;
            }
            await prisma.auditLog.create({
                data: {
                    tenantId: event.metadata?.tenantId || event.payload?.tenantId || 'default_tenant',
                    userId: event.metadata.userId || 'system',
                    action: event.type,
                    entityType: extractEntityType(event.type),
                    entityId: extractEntityId(event.payload) || 'unknown',
                    changes: JSON.stringify(event.payload),
                    ipAddress: event.metadata.source,
                    userAgent: null,
                    timestamp: event.metadata.timestamp,
                },
            });
            logger.debug('Audit log created', { type: event.type });
        }
        catch (error) {
            logger.error('Failed to create audit log', { error, event: event.type });
        }
    };
}
exports.AuditLogHandler = AuditLogHandler;
function extractEntityType(eventType) {
    const parts = eventType.split('.');
    return parts[0];
}
function extractEntityId(payload) {
    return payload?.id || payload?.entityId || null;
}
//# sourceMappingURL=AuditLogHandler.js.map