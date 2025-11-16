import { injectable } from 'tsyringe';
import { BaseService } from './BaseService';
import prisma from '../utils/prisma';

interface FieldVisibility {
  visible: boolean;
  required: boolean;
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
  async getFieldVisibilitySettings(): Promise<FieldVisibilityConfig> {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          startsWith: 'user_field_visibility_',
        },
      },
    });

    const fieldVisibility = this.getDefaultFieldVisibility();

    settings.forEach((setting: any) => {
      const fieldName = setting.key.replace('user_field_visibility_', '');
      try {
        fieldVisibility[fieldName] = JSON.parse(setting.value);
      } catch (e) {
        // Silently skip invalid JSON
      }
    });

    return fieldVisibility;
  }

  /**
   * Update field visibility
   */
  async updateFieldVisibility(field: string, visible: boolean, required?: boolean, userId?: string) {
    this.validateRequired({ field, visible }, ['field', 'visible']);

    const value = JSON.stringify({ visible, required: required || false });

    await prisma.systemSetting.upsert({
      where: {
        key: `user_field_visibility_${field}`,
      },
      update: {
        value: value,
        updatedBy: userId,
      },
      create: {
        key: `user_field_visibility_${field}`,
        value: value,
        description: `Visibility setting for user field: ${field}`,
        category: 'user_fields',
        updatedBy: userId,
      },
    });

    return {
      message: 'Field visibility updated successfully',
      field,
      visible,
      required: required || false,
    };
  }

  /**
   * Reset field visibility to defaults
   */
  async resetFieldVisibility() {
    await prisma.systemSetting.deleteMany({
      where: {
        key: {
          startsWith: 'user_field_visibility_',
        },
      },
    });

    return { message: 'Field visibility reset to defaults successfully' };
  }
}
