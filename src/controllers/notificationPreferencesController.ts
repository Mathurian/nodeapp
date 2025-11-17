/**
 * Notification Preferences Controller
 * Handles HTTP requests for notification preferences
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { NotificationPreferenceRepository } from '../repositories/NotificationPreferenceRepository';
import { sendSuccess } from '../utils/responseHelpers';

export class NotificationPreferencesController {
  private preferenceRepository: NotificationPreferenceRepository;

  constructor() {
    this.preferenceRepository = container.resolve(NotificationPreferenceRepository);
  }

  /**
   * Get user's notification preferences
   */
  getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const preferences = await this.preferenceRepository.getOrCreate(tenantId, userId);

      // emailTypes, pushTypes, inAppTypes are already arrays in Prisma, no need to parse
      const parsed = {
        ...preferences,
        emailTypes: preferences.emailTypes || [],
        pushTypes: preferences.pushTypes || [],
        inAppTypes: preferences.inAppTypes || [],
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
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const {
        emailEnabled,
        pushEnabled,
        inAppEnabled,
        emailDigestFrequency,
        emailTypes,
        pushTypes,
        inAppTypes,
        quietHoursStart,
        quietHoursEnd,
      } = req.body;

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

      // emailTypes, pushTypes, inAppTypes are already arrays in Prisma, no need to parse
      const parsed = {
        ...preferences,
        emailTypes: preferences.emailTypes || [],
        pushTypes: preferences.pushTypes || [],
        inAppTypes: preferences.inAppTypes || [],
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
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

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
}

const controller = new NotificationPreferencesController();
export const getPreferences = controller.getPreferences;
export const updatePreferences = controller.updatePreferences;
export const resetPreferences = controller.resetPreferences;
