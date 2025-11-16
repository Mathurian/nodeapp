"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheInvalidationHandler = void 0;
const EventBusService_1 = require("../EventBusService");
const RedisCacheService_1 = require("../RedisCacheService");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('CacheInvalidationHandler');
const cacheService = (0, RedisCacheService_1.getCacheService)();
class CacheInvalidationHandler {
    static handler = async (event) => {
        try {
            switch (event.type) {
                case EventBusService_1.AppEventType.USER_CREATED:
                case EventBusService_1.AppEventType.USER_UPDATED:
                case EventBusService_1.AppEventType.USER_DELETED:
                    await invalidateUserCaches(event);
                    break;
                case EventBusService_1.AppEventType.EVENT_CREATED:
                case EventBusService_1.AppEventType.EVENT_UPDATED:
                case EventBusService_1.AppEventType.EVENT_DELETED:
                    await invalidateEventCaches(event);
                    break;
                case EventBusService_1.AppEventType.CONTEST_CREATED:
                case EventBusService_1.AppEventType.CONTEST_UPDATED:
                case EventBusService_1.AppEventType.CONTEST_DELETED:
                case EventBusService_1.AppEventType.CONTEST_CERTIFIED:
                    await invalidateContestCaches(event);
                    break;
                case EventBusService_1.AppEventType.CATEGORY_CREATED:
                case EventBusService_1.AppEventType.CATEGORY_UPDATED:
                case EventBusService_1.AppEventType.CATEGORY_DELETED:
                case EventBusService_1.AppEventType.CATEGORY_CERTIFIED:
                    await invalidateCategoryCaches(event);
                    break;
                case EventBusService_1.AppEventType.SCORE_SUBMITTED:
                case EventBusService_1.AppEventType.SCORE_UPDATED:
                case EventBusService_1.AppEventType.SCORE_DELETED:
                case EventBusService_1.AppEventType.SCORES_FINALIZED:
                    await invalidateScoreCaches(event);
                    break;
                case EventBusService_1.AppEventType.ASSIGNMENT_CREATED:
                case EventBusService_1.AppEventType.ASSIGNMENT_UPDATED:
                case EventBusService_1.AppEventType.ASSIGNMENT_DELETED:
                    await invalidateAssignmentCaches(event);
                    break;
                default:
                    break;
            }
            logger.debug('Cache invalidation handled', { type: event.type });
        }
        catch (error) {
            logger.error('Failed to invalidate cache', { error, event: event.type });
        }
    };
}
exports.CacheInvalidationHandler = CacheInvalidationHandler;
async function invalidateUserCaches(event) {
    const userId = event.payload?.id || event.payload?.userId;
    if (userId) {
        await cacheService.delete(`user:${userId}`);
        await cacheService.delete(`user:${userId}:profile`);
        await cacheService.delete(`user:${userId}:permissions`);
    }
    await cacheService.delete('users:list');
    await cacheService.delete('users:active');
    const role = event.payload?.role;
    if (role) {
        await cacheService.delete(`users:role:${role}`);
    }
    logger.debug('User caches invalidated', { userId, role });
}
async function invalidateEventCaches(event) {
    const eventId = event.payload?.id || event.payload?.eventId;
    if (eventId) {
        await cacheService.delete(`event:${eventId}`);
        await cacheService.delete(`event:${eventId}:details`);
        await cacheService.delete(`event:${eventId}:contests`);
    }
    await cacheService.delete('events:list');
    await cacheService.delete('events:active');
    await cacheService.delete('events:upcoming');
    logger.debug('Event caches invalidated', { eventId });
}
async function invalidateContestCaches(event) {
    const contestId = event.payload?.id || event.payload?.contestId;
    const eventId = event.payload?.eventId;
    if (contestId) {
        await cacheService.delete(`contest:${contestId}`);
        await cacheService.delete(`contest:${contestId}:details`);
        await cacheService.delete(`contest:${contestId}:categories`);
        await cacheService.delete(`contest:${contestId}:results`);
    }
    await cacheService.delete('contests:list');
    if (eventId) {
        await cacheService.delete(`event:${eventId}:contests`);
    }
    logger.debug('Contest caches invalidated', { contestId, eventId });
}
async function invalidateCategoryCaches(event) {
    const categoryId = event.payload?.id || event.payload?.categoryId;
    const contestId = event.payload?.contestId;
    if (categoryId) {
        await cacheService.delete(`category:${categoryId}`);
        await cacheService.delete(`category:${categoryId}:details`);
        await cacheService.delete(`category:${categoryId}:scores`);
        await cacheService.delete(`category:${categoryId}:results`);
    }
    await cacheService.delete('categories:list');
    if (contestId) {
        await cacheService.delete(`contest:${contestId}:categories`);
    }
    logger.debug('Category caches invalidated', { categoryId, contestId });
}
async function invalidateScoreCaches(event) {
    const categoryId = event.payload?.categoryId;
    const contestId = event.payload?.contestId;
    const contestantId = event.payload?.contestantId;
    if (categoryId) {
        await cacheService.delete(`category:${categoryId}:scores`);
        await cacheService.delete(`category:${categoryId}:results`);
    }
    if (contestId) {
        await cacheService.delete(`contest:${contestId}:results`);
    }
    if (contestantId) {
        await cacheService.delete(`contestant:${contestantId}:scores`);
    }
    await cacheService.delete('results:latest');
    await cacheService.delete('leaderboard');
    logger.debug('Score caches invalidated', { categoryId, contestId, contestantId });
}
async function invalidateAssignmentCaches(event) {
    const assignmentId = event.payload?.id || event.payload?.assignmentId;
    const userId = event.payload?.userId;
    const categoryId = event.payload?.categoryId;
    if (assignmentId) {
        await cacheService.delete(`assignment:${assignmentId}`);
    }
    if (userId) {
        await cacheService.delete(`user:${userId}:assignments`);
    }
    if (categoryId) {
        await cacheService.delete(`category:${categoryId}:assignments`);
    }
    await cacheService.delete('assignments:list');
    logger.debug('Assignment caches invalidated', { assignmentId, userId, categoryId });
}
//# sourceMappingURL=CacheInvalidationHandler.js.map