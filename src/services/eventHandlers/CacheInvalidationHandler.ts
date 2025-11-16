import { AppEvent, AppEventType, EventHandler } from '../EventBusService';
import { getCacheService } from '../RedisCacheService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CacheInvalidationHandler');
const cacheService = getCacheService();

/**
 * Cache Invalidation Handler
 *
 * Automatically invalidates caches when data changes
 */
export class CacheInvalidationHandler {
  /**
   * Handle events and invalidate relevant caches
   */
  static readonly handler: EventHandler = async (event: AppEvent) => {
    try {
      switch (event.type) {
        // User events - invalidate user-related caches
        case AppEventType.USER_CREATED:
        case AppEventType.USER_UPDATED:
        case AppEventType.USER_DELETED:
          await invalidateUserCaches(event);
          break;

        // Event events - invalidate event-related caches
        case AppEventType.EVENT_CREATED:
        case AppEventType.EVENT_UPDATED:
        case AppEventType.EVENT_DELETED:
          await invalidateEventCaches(event);
          break;

        // Contest events - invalidate contest-related caches
        case AppEventType.CONTEST_CREATED:
        case AppEventType.CONTEST_UPDATED:
        case AppEventType.CONTEST_DELETED:
        case AppEventType.CONTEST_CERTIFIED:
          await invalidateContestCaches(event);
          break;

        // Category events - invalidate category-related caches
        case AppEventType.CATEGORY_CREATED:
        case AppEventType.CATEGORY_UPDATED:
        case AppEventType.CATEGORY_DELETED:
        case AppEventType.CATEGORY_CERTIFIED:
          await invalidateCategoryCaches(event);
          break;

        // Score events - invalidate score and results caches
        case AppEventType.SCORE_SUBMITTED:
        case AppEventType.SCORE_UPDATED:
        case AppEventType.SCORE_DELETED:
        case AppEventType.SCORES_FINALIZED:
          await invalidateScoreCaches(event);
          break;

        // Assignment events - invalidate assignment caches
        case AppEventType.ASSIGNMENT_CREATED:
        case AppEventType.ASSIGNMENT_UPDATED:
        case AppEventType.ASSIGNMENT_DELETED:
          await invalidateAssignmentCaches(event);
          break;

        default:
          // No cache invalidation needed for this event type
          break;
      }

      logger.debug('Cache invalidation handled', { type: event.type });
    } catch (error) {
      logger.error('Failed to invalidate cache', { error, event: event.type });
      // Don't throw - cache invalidation failures shouldn't break the application
    }
  };
}

/**
 * Invalidate user-related caches
 */
async function invalidateUserCaches(event: AppEvent) {
  const userId = event.payload?.id || event.payload?.userId;

  // Invalidate specific user cache
  if (userId) {
    await cacheService.delete(`user:${userId}`);
    await cacheService.delete(`user:${userId}:profile`);
    await cacheService.delete(`user:${userId}:permissions`);
  }

  // Invalidate users list cache
  await cacheService.delete('users:list');
  await cacheService.delete('users:active');

  // Invalidate role-specific lists
  const role = event.payload?.role;
  if (role) {
    await cacheService.delete(`users:role:${role}`);
  }

  logger.debug('User caches invalidated', { userId, role });
}

/**
 * Invalidate event-related caches
 */
async function invalidateEventCaches(event: AppEvent) {
  const eventId = event.payload?.id || event.payload?.eventId;

  // Invalidate specific event cache
  if (eventId) {
    await cacheService.delete(`event:${eventId}`);
    await cacheService.delete(`event:${eventId}:details`);
    await cacheService.delete(`event:${eventId}:contests`);
  }

  // Invalidate events list cache
  await cacheService.delete('events:list');
  await cacheService.delete('events:active');
  await cacheService.delete('events:upcoming');

  logger.debug('Event caches invalidated', { eventId });
}

/**
 * Invalidate contest-related caches
 */
async function invalidateContestCaches(event: AppEvent) {
  const contestId = event.payload?.id || event.payload?.contestId;
  const eventId = event.payload?.eventId;

  // Invalidate specific contest cache
  if (contestId) {
    await cacheService.delete(`contest:${contestId}`);
    await cacheService.delete(`contest:${contestId}:details`);
    await cacheService.delete(`contest:${contestId}:categories`);
    await cacheService.delete(`contest:${contestId}:results`);
  }

  // Invalidate contests list cache
  await cacheService.delete('contests:list');

  // Invalidate event's contests cache
  if (eventId) {
    await cacheService.delete(`event:${eventId}:contests`);
  }

  logger.debug('Contest caches invalidated', { contestId, eventId });
}

/**
 * Invalidate category-related caches
 */
async function invalidateCategoryCaches(event: AppEvent) {
  const categoryId = event.payload?.id || event.payload?.categoryId;
  const contestId = event.payload?.contestId;

  // Invalidate specific category cache
  if (categoryId) {
    await cacheService.delete(`category:${categoryId}`);
    await cacheService.delete(`category:${categoryId}:details`);
    await cacheService.delete(`category:${categoryId}:scores`);
    await cacheService.delete(`category:${categoryId}:results`);
  }

  // Invalidate categories list cache
  await cacheService.delete('categories:list');

  // Invalidate contest's categories cache
  if (contestId) {
    await cacheService.delete(`contest:${contestId}:categories`);
  }

  logger.debug('Category caches invalidated', { categoryId, contestId });
}

/**
 * Invalidate score and results caches
 */
async function invalidateScoreCaches(event: AppEvent) {
  const categoryId = event.payload?.categoryId;
  const contestId = event.payload?.contestId;
  const contestantId = event.payload?.contestantId;

  // Invalidate category scores and results
  if (categoryId) {
    await cacheService.delete(`category:${categoryId}:scores`);
    await cacheService.delete(`category:${categoryId}:results`);
  }

  // Invalidate contest results
  if (contestId) {
    await cacheService.delete(`contest:${contestId}:results`);
  }

  // Invalidate contestant scores
  if (contestantId) {
    await cacheService.delete(`contestant:${contestantId}:scores`);
  }

  // Invalidate overall results caches
  await cacheService.delete('results:latest');
  await cacheService.delete('leaderboard');

  logger.debug('Score caches invalidated', { categoryId, contestId, contestantId });
}

/**
 * Invalidate assignment-related caches
 */
async function invalidateAssignmentCaches(event: AppEvent) {
  const assignmentId = event.payload?.id || event.payload?.assignmentId;
  const userId = event.payload?.userId;
  const categoryId = event.payload?.categoryId;

  // Invalidate specific assignment cache
  if (assignmentId) {
    await cacheService.delete(`assignment:${assignmentId}`);
  }

  // Invalidate user's assignments cache
  if (userId) {
    await cacheService.delete(`user:${userId}:assignments`);
  }

  // Invalidate category's assignments cache
  if (categoryId) {
    await cacheService.delete(`category:${categoryId}:assignments`);
  }

  // Invalidate assignments list cache
  await cacheService.delete('assignments:list');

  logger.debug('Assignment caches invalidated', { assignmentId, userId, categoryId });
}
