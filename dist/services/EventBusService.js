"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBusService = exports.AppEventType = void 0;
const logger_1 = require("../utils/logger");
const QueueService_1 = __importDefault(require("./QueueService"));
const logger = (0, logger_1.createLogger)('EventBusService');
var AppEventType;
(function (AppEventType) {
    AppEventType["USER_CREATED"] = "user.created";
    AppEventType["USER_UPDATED"] = "user.updated";
    AppEventType["USER_DELETED"] = "user.deleted";
    AppEventType["USER_LOGGED_IN"] = "user.logged_in";
    AppEventType["USER_LOGGED_OUT"] = "user.logged_out";
    AppEventType["EVENT_CREATED"] = "event.created";
    AppEventType["EVENT_UPDATED"] = "event.updated";
    AppEventType["EVENT_DELETED"] = "event.deleted";
    AppEventType["EVENT_PUBLISHED"] = "event.published";
    AppEventType["CONTEST_CREATED"] = "contest.created";
    AppEventType["CONTEST_UPDATED"] = "contest.updated";
    AppEventType["CONTEST_DELETED"] = "contest.deleted";
    AppEventType["CONTEST_CERTIFIED"] = "contest.certified";
    AppEventType["CATEGORY_CREATED"] = "category.created";
    AppEventType["CATEGORY_UPDATED"] = "category.updated";
    AppEventType["CATEGORY_DELETED"] = "category.deleted";
    AppEventType["CATEGORY_CERTIFIED"] = "category.certified";
    AppEventType["SCORE_SUBMITTED"] = "score.submitted";
    AppEventType["SCORE_UPDATED"] = "score.updated";
    AppEventType["SCORE_DELETED"] = "score.deleted";
    AppEventType["SCORES_FINALIZED"] = "scores.finalized";
    AppEventType["ASSIGNMENT_CREATED"] = "assignment.created";
    AppEventType["ASSIGNMENT_UPDATED"] = "assignment.updated";
    AppEventType["ASSIGNMENT_DELETED"] = "assignment.deleted";
    AppEventType["CERTIFICATION_REQUESTED"] = "certification.requested";
    AppEventType["CERTIFICATION_APPROVED"] = "certification.approved";
    AppEventType["CERTIFICATION_REJECTED"] = "certification.rejected";
    AppEventType["NOTIFICATION_SENT"] = "notification.sent";
    AppEventType["EMAIL_SENT"] = "email.sent";
    AppEventType["SMS_SENT"] = "sms.sent";
    AppEventType["CACHE_INVALIDATED"] = "cache.invalidated";
    AppEventType["BACKUP_COMPLETED"] = "backup.completed";
    AppEventType["MAINTENANCE_STARTED"] = "maintenance.started";
    AppEventType["MAINTENANCE_COMPLETED"] = "maintenance.completed";
})(AppEventType || (exports.AppEventType = AppEventType = {}));
class EventBusService {
    static instance;
    queueService;
    handlers;
    EVENTS_QUEUE = 'app-events';
    constructor() {
        this.queueService = QueueService_1.default;
        this.handlers = new Map();
        this.initializeWorker();
    }
    static getInstance() {
        if (!EventBusService.instance) {
            EventBusService.instance = new EventBusService();
        }
        return EventBusService.instance;
    }
    initializeWorker() {
        this.queueService.createWorker(this.EVENTS_QUEUE, async (job) => {
            const event = job.data;
            await this.processEvent(event);
        }, 5);
        logger.info('Event bus worker initialized');
    }
    async publish(type, payload, metadata = {}) {
        try {
            const event = {
                type,
                payload,
                metadata: {
                    timestamp: new Date(),
                    source: metadata.source || 'unknown',
                    userId: metadata.userId,
                    correlationId: metadata.correlationId || this.generateCorrelationId(),
                },
            };
            await this.queueService.addJob(this.EVENTS_QUEUE, type, event, {
                priority: this.getEventPriority(type),
                attempts: 3,
            });
            logger.debug('Event published', { type, correlationId: event.metadata.correlationId });
        }
        catch (error) {
            logger.error('Failed to publish event', { error, type });
            throw error;
        }
    }
    subscribe(type, handler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type).add(handler);
        logger.debug('Event handler subscribed', { type });
        return () => {
            this.unsubscribe(type, handler);
        };
    }
    unsubscribe(type, handler) {
        const handlers = this.handlers.get(type);
        if (handlers) {
            handlers.delete(handler);
            logger.debug('Event handler unsubscribed', { type });
        }
    }
    async processEvent(event) {
        const handlers = this.handlers.get(event.type);
        if (!handlers || handlers.size === 0) {
            logger.debug('No handlers registered for event', { type: event.type });
            return;
        }
        logger.debug('Processing event', {
            type: event.type,
            handlerCount: handlers.size,
            correlationId: event.metadata.correlationId,
        });
        const results = await Promise.allSettled(Array.from(handlers).map((handler) => handler(event)));
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                logger.error('Event handler failed', {
                    type: event.type,
                    handlerIndex: index,
                    error: result.reason,
                    correlationId: event.metadata.correlationId,
                });
            }
        });
    }
    getEventPriority(type) {
        const highPriority = [
            AppEventType.USER_LOGGED_IN,
            AppEventType.SCORE_SUBMITTED,
            AppEventType.SCORES_FINALIZED,
            AppEventType.CERTIFICATION_APPROVED,
            AppEventType.CERTIFICATION_REJECTED,
        ];
        const mediumPriority = [
            AppEventType.USER_CREATED,
            AppEventType.EVENT_CREATED,
            AppEventType.CONTEST_CREATED,
            AppEventType.ASSIGNMENT_CREATED,
        ];
        if (highPriority.includes(type)) {
            return 10;
        }
        else if (mediumPriority.includes(type)) {
            return 5;
        }
        else {
            return 1;
        }
    }
    generateCorrelationId() {
        return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
    async getEventStats() {
        return await this.queueService.getQueueStats(this.EVENTS_QUEUE);
    }
    async shutdown() {
        logger.info('Shutting down event bus...');
        this.handlers.clear();
        logger.info('Event bus shutdown complete');
    }
}
exports.EventBusService = EventBusService;
exports.default = EventBusService.getInstance();
//# sourceMappingURL=EventBusService.js.map