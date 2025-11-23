import prisma from '../../config/database';
import { AppEvent, AppEventType, EventHandler } from '../EventBusService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('StatisticsHandler');

/**
 * Statistics Handler
 *
 * Tracks application metrics and statistics based on events
 */
export class StatisticsHandler {
  /**
   * Handle events and update statistics
   */
  static readonly handler: EventHandler = async (event: AppEvent) => {
    try {
      switch (event.type) {
        case AppEventType.USER_LOGGED_IN:
          await trackUserLogin(event);
          break;

        case AppEventType.SCORE_SUBMITTED:
          await trackScoreSubmission(event);
          break;

        case AppEventType.EVENT_CREATED:
          await trackEventCreation(event);
          break;

        case AppEventType.CONTEST_CERTIFIED:
          await trackContestCertification(event);
          break;

        default:
          // No statistics tracking needed for this event type
          break;
      }
    } catch (error) {
      logger.error('Failed to update statistics', { error, event: event.type });
      // Don't throw - statistics failures shouldn't break the application
    }
  };
}

/**
 * Track user login for analytics
 */
async function trackUserLogin(event: AppEvent) {
  const { userId, ipAddress: _ipAddress } = event.payload;

  if (!userId) return;

  try {
    // Update user's last login timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: event.metadata.timestamp },
    });

    // Could also track login analytics in a separate table
    // For now, we just update the user record

    logger.debug('User login tracked', { userId });
  } catch (error) {
    logger.error('Failed to track user login', { error, userId });
  }
}

/**
 * Track score submission metrics
 */
async function trackScoreSubmission(event: AppEvent) {
  const { judgeId, categoryId, contestId } = event.payload;

  try {
    // Could track:
    // - Average time to submit scores
    // - Number of scores per judge
    // - Score submission patterns
    // For now, just log the metric

    logger.debug('Score submission tracked', { judgeId, categoryId, contestId });
  } catch (error) {
    logger.error('Failed to track score submission', { error });
  }
}

/**
 * Track event creation metrics
 */
async function trackEventCreation(event: AppEvent) {
  const { eventId, createdBy } = event.payload;

  try {
    // Could track:
    // - Events created per month
    // - Most active event creators
    // - Event types
    // For now, just log the metric

    logger.debug('Event creation tracked', { eventId, createdBy });
  } catch (error) {
    logger.error('Failed to track event creation', { error });
  }
}

/**
 * Track contest certification metrics
 */
async function trackContestCertification(event: AppEvent) {
  const { contestId, certifiedBy, timeToComplete } = event.payload;

  try {
    // Could track:
    // - Average certification time
    // - Certification completion rate
    // - Certifier performance
    // For now, just log the metric

    logger.debug('Contest certification tracked', { contestId, certifiedBy, timeToComplete });
  } catch (error) {
    logger.error('Failed to track contest certification', { error });
  }
}
