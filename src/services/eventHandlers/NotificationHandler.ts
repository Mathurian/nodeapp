import prisma from '../../config/database';
import { AppEvent, AppEventType, EventHandler } from '../EventBusService';
import { createLogger } from '../../utils/logger';
import { Contestant } from '@prisma/client';
import { resolveEventTenantId } from '../../utils/tenantContext';
import { withTenantDbRlsContext } from '../../utils/prismaRlsContext';

type ContestantWithUsers = Contestant & {
  users: Array<{ id: string }>;
};

const logger = createLogger('NotificationHandler');

async function withEventTenantDb<T>(
  tenantId: string,
  operation: (db: typeof prisma) => Promise<T>
): Promise<T> {
  return withTenantDbRlsContext(
    prisma,
    { tenantId, isSuperAdmin: false },
    async tx => operation(tx as unknown as typeof prisma)
  );
}

async function resolveNotificationTenantId(
  event: AppEvent,
  options: { userId?: string; contestantId?: string } = {}
): Promise<string | null> {
  const fromEvent = resolveEventTenantId(event);
  if (fromEvent) {
    return fromEvent;
  }

  if (options.userId) {
    const user = await prisma.user.findUnique({
      where: { id: options.userId },
      select: { tenantId: true }
    });
    if (user?.tenantId) {
      return user.tenantId;
    }
  }

  if (options.contestantId) {
    const contestant = await prisma.contestant.findUnique({
      where: { id: options.contestantId },
      select: { tenantId: true }
    });
    if (contestant?.tenantId) {
      return contestant.tenantId;
    }
  }

  return null;
}

/**
 * Notification Handler
 *
 * Automatically creates notifications for users based on events
 */
export class NotificationHandler {
  /**
   * Handle events and create notifications
   */
  static readonly handler: EventHandler = async (event: AppEvent) => {
    try {
      switch (event.type) {
        case AppEventType.ASSIGNMENT_CREATED:
          await handleAssignmentCreated(event);
          break;

        case AppEventType.SCORE_SUBMITTED:
          await handleScoreSubmitted(event);
          break;

        case AppEventType.SCORES_FINALIZED:
          await handleScoresFinalized(event);
          break;

        case AppEventType.CERTIFICATION_APPROVED:
        case AppEventType.CERTIFICATION_REJECTED:
          await handleCertificationUpdate(event);
          break;

        case AppEventType.CONTEST_CERTIFIED:
          await handleContestCertified(event);
          break;

        default:
          // No notification needed for this event type
          break;
      }
    } catch (error) {
      logger.error('Failed to create notification', { error, event: event.type });
      // Don't throw - notification failures shouldn't break the application
    }
  };
}

/**
 * Handle assignment created event
 */
async function handleAssignmentCreated(event: AppEvent) {
  const { userId, assignmentType, contestName, categoryName } = event.payload;

  if (!userId) return;
  const tenantId = await resolveNotificationTenantId(event, { userId });
  if (!tenantId) {
    logger.warn('Skipping assignment notification: missing tenant context', { userId });
    return;
  }

  await withEventTenantDb(tenantId, async (db) => {
    await db.notification.create({
      data: {
        tenantId,
        userId,
        type: 'INFO',
        title: 'New Assignment',
        message: `You have been assigned as ${assignmentType} for ${contestName} - ${categoryName}`,
        link: `/assignments`,
      },
    });
  });

  logger.debug('Assignment notification created', { userId });
}

/**
 * Handle score submitted event
 */
async function handleScoreSubmitted(event: AppEvent) {
  const { contestantId, judgeName, categoryName, score } = event.payload;

  if (!contestantId) return;
  const tenantId = await resolveNotificationTenantId(event, { contestantId });
  if (!tenantId) {
    logger.warn('Skipping score notification: missing tenant context', { contestantId });
    return;
  }

  // Find contestant's user account
  const contestant = await withEventTenantDb(tenantId, async (db) => (
    db.contestant.findFirst({
      where: { id: contestantId, tenantId },
      include: { users: true },
    }) as Promise<ContestantWithUsers | null>
  ));

  if (contestant?.users && contestant.users.length > 0) {
    const user = contestant.users[0]; // Get first associated user
    if (!user) {
      return;
    }
    await withEventTenantDb(tenantId, async (db) => {
      await db.notification.create({
        data: {
          tenantId,
          userId: user.id,
          type: 'SUCCESS',
          title: 'Score Received',
          message: `${judgeName} has submitted a score of ${score} for ${categoryName}`,
          link: `/results`,
        },
      });
    });

    logger.debug('Score notification created', { userId: user.id });
  }
}

/**
 * Handle scores finalized event
 */
async function handleScoresFinalized(event: AppEvent) {
  const { categoryId, categoryName, contestantIds } = event.payload;

  if (!contestantIds || contestantIds.length === 0) return;
  const tenantId = await resolveNotificationTenantId(event);
  if (!tenantId) {
    logger.warn('Skipping finalized scores notifications: missing tenant context', { categoryId });
    return;
  }

  // Get all contestants for this category
  const contestants = await withEventTenantDb(tenantId, async (db) => (
    db.contestant.findMany({
      where: { id: { in: contestantIds }, tenantId },
      include: { users: true },
    }) as Promise<ContestantWithUsers[]>
  ));

  // Create notifications for all contestants
  const notifications = contestants
    .filter((c) => c.users && c.users.length > 0)
    .map((contestant) => ({
      tenantId,
      userId: contestant.users[0]?.id || '',
      type: 'SUCCESS' as const,
      title: 'Results Available',
      message: `Final results are now available for ${categoryName}`,
      link: `/results?category=${categoryId}`,
    }));

  if (notifications.length > 0) {
    await withEventTenantDb(tenantId, async (db) => {
      await db.notification.createMany({ data: notifications });
    });
    logger.debug('Finalized score notifications created', { count: notifications.length });
  }
}

/**
 * Handle certification update event
 */
async function handleCertificationUpdate(event: AppEvent) {
  const { userId, status, categoryName, message } = event.payload;

  if (!userId) return;
  const tenantId = await resolveNotificationTenantId(event, { userId });
  if (!tenantId) {
    logger.warn('Skipping certification notification: missing tenant context', { userId, status });
    return;
  }

  const isApproved = event.type === AppEventType.CERTIFICATION_APPROVED;

  await withEventTenantDb(tenantId, async (db) => {
    await db.notification.create({
      data: {
        tenantId,
        userId,
        type: isApproved ? 'SUCCESS' : 'WARNING',
        title: `Certification ${isApproved ? 'Approved' : 'Rejected'}`,
        message: message || `Your certification for ${categoryName} has been ${isApproved ? 'approved' : 'rejected'}`,
        link: `/certifications`,
      },
    });
  });

  logger.debug('Certification notification created', { userId, status });
}

/**
 * Handle contest certified event
 */
async function handleContestCertified(event: AppEvent) {
  const { contestId, contestName } = event.payload;
  const tenantId = await resolveNotificationTenantId(event);
  if (!tenantId) {
    logger.warn('Skipping contest certification notifications: missing tenant context', { contestId });
    return;
  }

  // Notify all admins and organizers
  const adminsAndOrganizers = await withEventTenantDb(tenantId, async (db) => (
    db.user.findMany({
      where: {
        tenantId,
        role: { in: ['ADMIN', 'ORGANIZER', 'BOARD'] },
        isActive: true,
      },
    })
  ));

  const notifications = adminsAndOrganizers.map((user) => ({
    tenantId,
    userId: user.id,
    type: 'SUCCESS' as const,
    title: 'Contest Certified',
    message: `${contestName} has been fully certified and finalized`,
    link: `/contests/${contestId}`,
  }));

  if (notifications.length > 0) {
    await withEventTenantDb(tenantId, async (db) => {
      await db.notification.createMany({ data: notifications });
    });
    logger.debug('Contest certification notifications created', { count: notifications.length });
  }
}
