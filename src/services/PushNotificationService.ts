import { inject, injectable } from 'tsyringe';
import webpush from 'web-push';
import { env } from '../config/env';
import { createLogger } from '../utils/logger';
import { NotificationPreferenceRepository } from '../repositories/NotificationPreferenceRepository';
import { PushSubscriptionRepository } from '../repositories/PushSubscriptionRepository';

interface PushPayload {
  title: string;
  message: string;
  link?: string | null;
  notificationId?: string | null;
  type?: string;
}

export interface PushDispatchOptions {
  ignoreUserPreferences?: boolean;
}

export interface PushDispatchSummary {
  enabled: boolean;
  totalUsers: number;
  eligibleUsers: number;
  subscriptionsAttempted: number;
  deliveredEndpoints: number;
  deliveredUsers: string[];
  invalidatedEndpoints: number;
  failedEndpoints: number;
}

@injectable()
export class PushNotificationService {
  private readonly logger = createLogger('PushNotificationService');
  private vapidInitialized = false;
  private readonly pushEnabled = env.get('PUSH_NOTIFICATIONS_ENABLED');

  constructor(
    @inject(PushSubscriptionRepository)
    private readonly pushSubscriptionRepository: PushSubscriptionRepository,
    @inject(NotificationPreferenceRepository)
    private readonly notificationPreferenceRepository: NotificationPreferenceRepository
  ) {}

  public getClientConfig(): { enabled: boolean; publicKey?: string; reason?: string } {
    if (!this.pushEnabled) {
      return { enabled: false, reason: 'Push notifications are disabled by configuration.' };
    }

    const publicKey = env.get('VAPID_PUBLIC_KEY');
    if (!publicKey) {
      return { enabled: false, reason: 'Push notifications are not configured.' };
    }

    return { enabled: true, publicKey };
  }

  public async upsertSubscription(input: {
    tenantId: string;
    userId: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
    expirationTime?: number | null;
    userAgent?: string | null;
  }): Promise<void> {
    await this.pushSubscriptionRepository.upsert(input);
  }

  public async removeSubscription(input: {
    tenantId: string;
    userId: string;
    endpoint: string;
  }): Promise<number> {
    const deleted = await this.pushSubscriptionRepository.removeByEndpoint(
      input.tenantId,
      input.userId,
      input.endpoint
    );

    if (deleted > 0) {
      return deleted;
    }

    return this.pushSubscriptionRepository.deactivateByEndpoint(
      input.tenantId,
      input.userId,
      input.endpoint
    );
  }

  public async dispatchToUsers(
    tenantId: string,
    userIds: string[],
    payload: PushPayload,
    options: PushDispatchOptions = {}
  ): Promise<PushDispatchSummary> {
    if (!this.pushEnabled || userIds.length === 0) {
      return {
        enabled: false,
        totalUsers: userIds.length,
        eligibleUsers: 0,
        subscriptionsAttempted: 0,
        deliveredEndpoints: 0,
        deliveredUsers: [],
        invalidatedEndpoints: 0,
        failedEndpoints: 0,
      };
    }

    if (!this.ensureVapidConfig()) {
      return {
        enabled: false,
        totalUsers: userIds.length,
        eligibleUsers: 0,
        subscriptionsAttempted: 0,
        deliveredEndpoints: 0,
        deliveredUsers: [],
        invalidatedEndpoints: 0,
        failedEndpoints: 0,
      };
    }

    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    const pushEnabledUserIds = options.ignoreUserPreferences
      ? uniqueUserIds
      : await this.resolvePushEnabledUserIds(tenantId, uniqueUserIds);
    const subscriptions = await this.pushSubscriptionRepository.findActiveByUserIds(tenantId, pushEnabledUserIds);

    if (subscriptions.length === 0) {
      return {
        enabled: true,
        totalUsers: uniqueUserIds.length,
        eligibleUsers: pushEnabledUserIds.length,
        subscriptionsAttempted: 0,
        deliveredEndpoints: 0,
        deliveredUsers: [],
        invalidatedEndpoints: 0,
        failedEndpoints: 0,
      };
    }

    const deliveredUsers = new Set<string>();
    const deliveredEndpoints: string[] = [];
    const invalidEndpoints: string[] = [];
    let failedEndpoints = 0;

    const body = JSON.stringify({
      title: payload.title,
      message: payload.message,
      link: payload.link || '/',
      notificationId: payload.notificationId || null,
      type: payload.type || 'INFO',
      tenantId,
      timestamp: new Date().toISOString(),
    });

    await Promise.all(
      subscriptions.map(async subscription => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              expirationTime: subscription.expirationTime ? subscription.expirationTime.getTime() : null,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            body,
            {
              TTL: 120,
              urgency: 'normal',
              topic: 'event-manager-notification',
            }
          );

          deliveredUsers.add(subscription.userId);
          deliveredEndpoints.push(subscription.endpoint);
        } catch (error: any) {
          const statusCode = Number(error?.statusCode || error?.status || 0);
          if (statusCode === 404 || statusCode === 410) {
            invalidEndpoints.push(subscription.endpoint);
          } else {
            failedEndpoints += 1;
            this.logger.warn('Push delivery failed', {
              tenantId,
              userId: subscription.userId,
              endpoint: subscription.endpoint,
              statusCode,
              message: String(error?.message || 'unknown push delivery failure'),
            });
          }
        }
      })
    );

    if (deliveredEndpoints.length > 0) {
      await this.pushSubscriptionRepository.touchByEndpoints(tenantId, deliveredEndpoints);
    }

    let invalidatedCount = 0;
    if (invalidEndpoints.length > 0) {
      invalidatedCount = await this.pushSubscriptionRepository.deactivateInvalidEndpoints(
        tenantId,
        Array.from(new Set(invalidEndpoints))
      );
    }

    return {
      enabled: true,
      totalUsers: uniqueUserIds.length,
      eligibleUsers: pushEnabledUserIds.length,
      subscriptionsAttempted: subscriptions.length,
      deliveredEndpoints: deliveredEndpoints.length,
      deliveredUsers: Array.from(deliveredUsers),
      invalidatedEndpoints: invalidatedCount,
      failedEndpoints,
    };
  }

  private ensureVapidConfig(): boolean {
    if (this.vapidInitialized) {
      return true;
    }

    const publicKey = env.get('VAPID_PUBLIC_KEY');
    const privateKey = env.get('VAPID_PRIVATE_KEY');
    const subject = env.get('VAPID_SUBJECT');

    if (!publicKey || !privateKey || !subject) {
      this.logger.warn('Push notifications enabled without full VAPID configuration');
      return false;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.vapidInitialized = true;
    return true;
  }

  private async resolvePushEnabledUserIds(tenantId: string, userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) {
      return [];
    }

    const preferences = await this.notificationPreferenceRepository.findManyByUserIds(tenantId, userIds);
    const byUserId = new Map(preferences.map(preference => [preference.userId, preference.pushEnabled]));

    return userIds.filter(userId => {
      const pushEnabled = byUserId.get(userId);
      // Missing preference row defaults to true for push availability.
      return pushEnabled === undefined ? true : Boolean(pushEnabled);
    });
  }
}
