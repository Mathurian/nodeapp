/**
 * Notification Preference Repository
 * Handles database operations for notification preferences
 */

import { injectable } from 'tsyringe';
import { PrismaClient, NotificationPreference, Prisma } from '@prisma/client';
import prisma from '../config/database';

export interface CreateNotificationPreferenceDTO {
  tenantId: string;
  userId: string;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  emailDigestFrequency?: string;
  emailTypes?: string[];
  pushTypes?: string[];
  inAppTypes?: string[];
  quietHoursStart?: number;
  quietHoursEnd?: number;
}

export interface UpdateNotificationPreferenceDTO {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  emailDigestFrequency?: string;
  emailTypes?: string[];
  pushTypes?: string[];
  inAppTypes?: string[];
  quietHoursStart?: number;
  quietHoursEnd?: number;
}

@injectable()
export class NotificationPreferenceRepository {
  constructor(private prismaClient: PrismaClient = prisma) {}

  /**
   * Find preference by tenant and user ID
   */
  async findByUserId(tenantId: string, userId: string): Promise<NotificationPreference | null> {
    return this.prismaClient.notificationPreference.findUnique({
      where: {
        tenantId_userId: { tenantId, userId }
      },
    });
  }

  /**
   * Create preference with defaults
   */
  async create(data: CreateNotificationPreferenceDTO): Promise<NotificationPreference> {
    return this.prismaClient.notificationPreference.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        emailEnabled: data.emailEnabled ?? true,
        pushEnabled: data.pushEnabled ?? false,
        inAppEnabled: data.inAppEnabled ?? true,
        emailDigestFrequency: data.emailDigestFrequency ?? 'daily',
        emailTypes: data.emailTypes ? JSON.stringify(data.emailTypes) : null,
        pushTypes: data.pushTypes ? JSON.stringify(data.pushTypes) : null,
        inAppTypes: data.inAppTypes ? JSON.stringify(data.inAppTypes) : null,
        quietHoursStart: data.quietHoursStart ? String(data.quietHoursStart) : null,
        quietHoursEnd: data.quietHoursEnd ? String(data.quietHoursEnd) : null,
      },
    });
  }

  /**
   * Update preference
   */
  async update(tenantId: string, userId: string, data: UpdateNotificationPreferenceDTO): Promise<NotificationPreference> {
    const updateData: Prisma.NotificationPreferenceUpdateInput = {};

    if (data.emailEnabled !== undefined) updateData.emailEnabled = data.emailEnabled;
    if (data.pushEnabled !== undefined) updateData.pushEnabled = data.pushEnabled;
    if (data.inAppEnabled !== undefined) updateData.inAppEnabled = data.inAppEnabled;
    if (data.emailDigestFrequency !== undefined) updateData.emailDigestFrequency = data.emailDigestFrequency;
    if (data.emailTypes !== undefined) updateData.emailTypes = JSON.stringify(data.emailTypes);
    if (data.pushTypes !== undefined) updateData.pushTypes = JSON.stringify(data.pushTypes);
    if (data.inAppTypes !== undefined) updateData.inAppTypes = JSON.stringify(data.inAppTypes);
    if (data.quietHoursStart !== undefined) updateData.quietHoursStart = String(data.quietHoursStart);
    if (data.quietHoursEnd !== undefined) updateData.quietHoursEnd = String(data.quietHoursEnd);

    return this.prismaClient.notificationPreference.update({
      where: {
        tenantId_userId: { tenantId, userId }
      },
      data: updateData,
    });
  }

  /**
   * Get or create preference for user
   */
  async getOrCreate(tenantId: string, userId: string): Promise<NotificationPreference> {
    const existing = await this.findByUserId(tenantId, userId);
    if (existing) return existing;

    return this.create({ tenantId, userId });
  }

  /**
   * Delete preference
   */
  async delete(tenantId: string, userId: string): Promise<NotificationPreference> {
    return this.prismaClient.notificationPreference.delete({
      where: {
        tenantId_userId: { tenantId, userId }
      },
    });
  }

  /**
   * Check if notification type is enabled for user
   */
  async isNotificationTypeEnabled(
    tenantId: string,
    userId: string,
    type: 'email' | 'push' | 'inApp',
    notificationType?: string
  ): Promise<boolean> {
    const preference = await this.getOrCreate(tenantId, userId);

    // Check if the delivery method is enabled
    if (type === 'email' && !preference.emailEnabled) return false;
    if (type === 'push' && !preference.pushEnabled) return false;
    if (type === 'inApp' && !preference.inAppEnabled) return false;

    // Check if specific notification type is enabled
    if (notificationType) {
      const typesField = type === 'email' ? preference.emailTypes :
                        type === 'push' ? preference.pushTypes :
                        preference.inAppTypes;

      if (typesField && typesField.length > 0) {
        return typesField.includes(notificationType);
      }
    }

    return true;
  }

  /**
   * Check if user is in quiet hours
   */
  async isInQuietHours(tenantId: string, userId: string): Promise<boolean> {
    const preference = await this.getOrCreate(tenantId, userId);

    if (preference.quietHoursStart === null || preference.quietHoursStart === undefined ||
        preference.quietHoursEnd === null || preference.quietHoursEnd === undefined) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();

    const startHour = parseInt(preference.quietHoursStart, 10);
    const endHour = parseInt(preference.quietHoursEnd, 10);

    if (startHour < endHour) {
      return currentHour >= startHour && currentHour <= endHour;
    } else {
      // Quiet hours span midnight
      return currentHour >= startHour || currentHour <= endHour;
    }
  }

  /**
   * Get all users with email digest enabled
   */
  async getUsersForDigest(frequency: string): Promise<NotificationPreference[]> {
    return this.prismaClient.notificationPreference.findMany({
      where: {
        emailEnabled: true,
        emailDigestFrequency: frequency,
      },
      // include removed - no user relation in schema
    });
  }
}
