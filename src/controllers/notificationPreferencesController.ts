/**
 * Notification Preferences Controller
 * Handles HTTP requests for notification preferences
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { NotificationPreferenceRepository } from '../repositories/NotificationPreferenceRepository';
import { sendSuccess , sendUnauthorized} from '../utils/responseHelpers';
import { PushNotificationService } from '../services/PushNotificationService';

const parseStringArrayField = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(item => String(item));
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item));
    }
  } catch {
    // Ignore parse failures and fall back to empty list.
  }
  return [];
};

export class NotificationPreferencesController {
  private preferenceRepository: NotificationPreferenceRepository;
  private pushNotificationService: PushNotificationService;

  constructor() {
    this.preferenceRepository = container.resolve(NotificationPreferenceRepository);
    this.pushNotificationService = container.resolve(PushNotificationService);
  }

  /**
   * Get user's notification preferences
   */
  getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const preferences = await this.preferenceRepository.getOrCreate(tenantId, userId);

      const parsed = {
        ...preferences,
        emailTypes: parseStringArrayField(preferences.emailTypes),
        pushTypes: parseStringArrayField(preferences.pushTypes),
        inAppTypes: parseStringArrayField(preferences.inAppTypes),
      };

      return sendSuccess(res, parsed);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update notification preferences
   */
  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const {
        emailEnabled: requestEmailEnabled,
        pushEnabled: requestPushEnabled,
        inAppEnabled: requestInAppEnabled,
        // Legacy frontend key compatibility
        emailNotifications,
        pushNotifications,
        systemAlerts,
        emailDigestFrequency,
        emailTypes,
        pushTypes,
        inAppTypes,
        quietHoursStart,
        quietHoursEnd,
      } = req.body;

      const emailEnabled = requestEmailEnabled ?? emailNotifications;
      const pushEnabled = requestPushEnabled ?? pushNotifications;
      const inAppEnabled = requestInAppEnabled ?? systemAlerts;

      const preferences = await this.preferenceRepository.update(tenantId, userId, {
        emailEnabled,
        pushEnabled,
        inAppEnabled,
        emailDigestFrequency,
        emailTypes,
        pushTypes,
        inAppTypes,
        quietHoursStart,
        quietHoursEnd,
      });

      const parsed = {
        ...preferences,
        emailTypes: parseStringArrayField(preferences.emailTypes),
        pushTypes: parseStringArrayField(preferences.pushTypes),
        inAppTypes: parseStringArrayField(preferences.inAppTypes),
      };

      return sendSuccess(res, parsed, 'Notification preferences updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Reset preferences to default
   */
  resetPreferences = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const tenantId = req.user.tenantId;
      const userId = req.user.id;

      // Delete existing and create new with defaults
      await this.preferenceRepository.delete(tenantId, userId).catch(() => {});
      const preferences = await this.preferenceRepository.create({ tenantId, userId });

      const parsed = {
        ...preferences,
        emailTypes: [],
        pushTypes: [],
        inAppTypes: [],
      };

      return sendSuccess(res, parsed, 'Notification preferences reset to defaults');
    } catch (error) {
      return next(error);
    }
  };

  getPushConfig = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const config = this.pushNotificationService.getClientConfig();
      return sendSuccess(res, config);
    } catch (error) {
      return next(error);
    }
  };

  upsertPushSubscription = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { endpoint, expirationTime, keys } = req.body;
      const userAgent = req.get('user-agent') || null;

      await this.pushNotificationService.upsertSubscription({
        tenantId,
        userId,
        endpoint,
        expirationTime,
        keys,
        userAgent,
      });

      return sendSuccess(res, { endpoint }, 'Push subscription saved');
    } catch (error) {
      return next(error);
    }
  };

  removePushSubscription = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { endpoint } = req.body;

      const removed = await this.pushNotificationService.removeSubscription({
        tenantId,
        userId,
        endpoint,
      });

      return sendSuccess(res, { removed, endpoint }, 'Push subscription removed');
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new NotificationPreferencesController();
export const getPreferences = controller.getPreferences;
export const updatePreferences = controller.updatePreferences;
export const resetPreferences = controller.resetPreferences;
export const getPushConfig = controller.getPushConfig;
export const upsertPushSubscription = controller.upsertPushSubscription;
export const removePushSubscription = controller.removePushSubscription;
