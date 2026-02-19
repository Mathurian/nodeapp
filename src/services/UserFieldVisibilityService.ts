import { injectable } from 'tsyringe';
import { BaseService } from './BaseService';
import prisma from '../utils/prisma';

interface FieldVisibility {
  visible: boolean;
  required: boolean;
  isCustomField?: boolean;
  customFieldId?: string;
  label?: string;
  type?: string;
}

interface FieldVisibilityConfig {
  [key: string]: FieldVisibility;
}

/**
 * Service for User Field Visibility management
 * Handles configuration of user field visibility and requirements
 */
@injectable()
export class UserFieldVisibilityService extends BaseService {
  private readonly keyPrefix = 'user_field_visibility_';

  private normalizeTenantId(tenantId?: string | null): string | null {
    if (!tenantId || typeof tenantId !== 'string') {
      return null;
    }

    const trimmed = tenantId.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private applyVisibilitySettings(
    target: FieldVisibilityConfig,
    settings: Array<{ key: string; value: string }>
  ): void {
    settings.forEach((setting) => {
      const fieldName = setting.key.replace(this.keyPrefix, '');
      try {
        target[fieldName] = JSON.parse(setting.value);
      } catch (_error) {
        // Ignore malformed setting payloads and continue with defaults.
      }
    });
  }

  /**
   * Get default field visibility configuration
   */
  private getDefaultFieldVisibility(): FieldVisibilityConfig {
    return {
      name: { visible: true, required: true },
      email: { visible: true, required: true },
      role: { visible: true, required: true },
      phone: { visible: true, required: false },
      address: { visible: true, required: false },
      bio: { visible: true, required: false },
      preferredName: { visible: true, required: false },
      pronouns: { visible: true, required: false },
      gender: { visible: true, required: false },
      judgeNumber: { visible: true, required: false },
      judgeLevel: { visible: true, required: false },
      isHeadJudge: { visible: true, required: false },
      contestantNumber: { visible: true, required: false },
      age: { visible: true, required: false },
      school: { visible: true, required: false },
      grade: { visible: true, required: false },
      parentGuardian: { visible: true, required: false },
      parentPhone: { visible: true, required: false },
    };
  }

  /**
   * Get field visibility settings
   */
  async getFieldVisibilitySettings(tenantId?: string | null): Promise<FieldVisibilityConfig> {
    const scopedTenantId = this.normalizeTenantId(tenantId);
    const [globalSettings, tenantSettings] = await Promise.all([
      prisma.systemSetting.findMany({
        where: {
          key: {
            startsWith: this.keyPrefix,
          },
          tenantId: null,
        },
      }),
      scopedTenantId
        ? prisma.systemSetting.findMany({
            where: {
              key: {
                startsWith: this.keyPrefix,
              },
              tenantId: scopedTenantId,
            },
          })
        : Promise.resolve([]),
    ]);

    const fieldVisibility = this.getDefaultFieldVisibility();

    this.applyVisibilitySettings(fieldVisibility, globalSettings);
    this.applyVisibilitySettings(fieldVisibility, tenantSettings);

    // Add custom fields for USER entity type in the active tenant scope.
    const customFields = scopedTenantId
      ? await prisma.customField.findMany({
          where: {
            tenantId: scopedTenantId,
            entityType: 'USER',
            active: true,
          },
          orderBy: {
            order: 'asc',
          },
        })
      : [];

    // Add each custom field to the field visibility config
    customFields.forEach((field: any) => {
      // Use the field's key as the field name
      const fieldKey = `custom_${field.key}`;

      // Check if there's already a visibility setting for this custom field
      if (!fieldVisibility[fieldKey]) {
        // Default to visible and use the field's required setting
        fieldVisibility[fieldKey] = {
          visible: true,
          required: field.required || false,
          isCustomField: true,
          customFieldId: field.id,
          label: field.label || field.name,
          type: field.type,
        };
      }
    });

    return fieldVisibility;
  }

  /**
   * Update field visibility
   */
  async updateFieldVisibility(
    field: string,
    visible: boolean,
    required?: boolean,
    userId?: string,
    tenantId?: string | null
  ) {
    this.validateRequired({ field, visible } as unknown as Record<string, unknown>, ['field', 'visible']);

    const value = JSON.stringify({ visible, required: required || false });
    const scopedTenantId = this.normalizeTenantId(tenantId);

    const key = `${this.keyPrefix}${field}`;

    // Check if setting exists
    const existing = await prisma.systemSetting.findFirst({
      where: {
        key,
        tenantId: scopedTenantId,
      },
    });

    if (existing) {
      // Update existing setting
      await prisma.systemSetting.update({
        where: {
          id: existing.id,
        },
        data: {
          value: value,
          updatedBy: userId,
        },
      });
    } else {
      // Create new setting
      await prisma.systemSetting.create({
        data: {
          key,
          value: value,
          tenantId: scopedTenantId,
          description: `Visibility setting for user field: ${field}`,
          category: 'user_fields',
          updatedBy: userId,
        },
      });
    }

    return {
      message: 'Field visibility updated successfully',
      field,
      visible,
      required: required || false,
      scope: scopedTenantId ? 'tenant' : 'global',
    };
  }

  /**
   * Reset field visibility to defaults
   */
  async resetFieldVisibility(tenantId?: string | null) {
    const scopedTenantId = this.normalizeTenantId(tenantId);
    await prisma.systemSetting.deleteMany({
      where: {
        key: {
          startsWith: this.keyPrefix,
        },
        tenantId: scopedTenantId,
      },
    });

    return {
      message: 'Field visibility reset to defaults successfully',
      scope: scopedTenantId ? 'tenant' : 'global',
    };
  }
}
