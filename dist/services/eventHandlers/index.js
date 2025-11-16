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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeEventHandlers = initializeEventHandlers;
exports.shutdownEventHandlers = shutdownEventHandlers;
const EventBusService_1 = __importStar(require("../EventBusService"));
const AuditLogHandler_1 = require("./AuditLogHandler");
const NotificationHandler_1 = require("./NotificationHandler");
const CacheInvalidationHandler_1 = require("./CacheInvalidationHandler");
const StatisticsHandler_1 = require("./StatisticsHandler");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('EventHandlers');
function initializeEventHandlers() {
    const eventBus = EventBusService_1.default;
    logger.info('Initializing event handlers...');
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
    auditableEvents.forEach((eventType) => {
        eventBus.subscribe(eventType, AuditLogHandler_1.AuditLogHandler.handler);
    });
    logger.info('Audit log handler registered', { eventCount: auditableEvents.length });
    const notificationEvents = [
        EventBusService_1.AppEventType.ASSIGNMENT_CREATED,
        EventBusService_1.AppEventType.SCORE_SUBMITTED,
        EventBusService_1.AppEventType.SCORES_FINALIZED,
        EventBusService_1.AppEventType.CERTIFICATION_APPROVED,
        EventBusService_1.AppEventType.CERTIFICATION_REJECTED,
        EventBusService_1.AppEventType.CONTEST_CERTIFIED,
    ];
    notificationEvents.forEach((eventType) => {
        eventBus.subscribe(eventType, NotificationHandler_1.NotificationHandler.handler);
    });
    logger.info('Notification handler registered', { eventCount: notificationEvents.length });
    const cacheEvents = [
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
        EventBusService_1.AppEventType.CATEGORY_CREATED,
        EventBusService_1.AppEventType.CATEGORY_UPDATED,
        EventBusService_1.AppEventType.CATEGORY_DELETED,
        EventBusService_1.AppEventType.CATEGORY_CERTIFIED,
        EventBusService_1.AppEventType.SCORE_SUBMITTED,
        EventBusService_1.AppEventType.SCORE_UPDATED,
        EventBusService_1.AppEventType.SCORE_DELETED,
        EventBusService_1.AppEventType.SCORES_FINALIZED,
        EventBusService_1.AppEventType.ASSIGNMENT_CREATED,
        EventBusService_1.AppEventType.ASSIGNMENT_UPDATED,
        EventBusService_1.AppEventType.ASSIGNMENT_DELETED,
    ];
    cacheEvents.forEach((eventType) => {
        eventBus.subscribe(eventType, CacheInvalidationHandler_1.CacheInvalidationHandler.handler);
    });
    logger.info('Cache invalidation handler registered', { eventCount: cacheEvents.length });
    const statisticsEvents = [
        EventBusService_1.AppEventType.USER_LOGGED_IN,
        EventBusService_1.AppEventType.SCORE_SUBMITTED,
        EventBusService_1.AppEventType.EVENT_CREATED,
        EventBusService_1.AppEventType.CONTEST_CERTIFIED,
    ];
    statisticsEvents.forEach((eventType) => {
        eventBus.subscribe(eventType, StatisticsHandler_1.StatisticsHandler.handler);
    });
    logger.info('Statistics handler registered', { eventCount: statisticsEvents.length });
    logger.info('All event handlers initialized successfully');
}
async function shutdownEventHandlers() {
    logger.info('Shutting down event handlers...');
    await EventBusService_1.default.shutdown();
    logger.info('Event handlers shutdown complete');
}
//# sourceMappingURL=index.js.map