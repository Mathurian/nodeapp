/**
 * UserFieldVisibilityService Unit Tests
 * Comprehensive tests for user field visibility management
 */

import 'reflect-metadata';
import { UserFieldVisibilityService } from '../../../src/services/UserFieldVisibilityService';
import prisma from '../../../src/utils/prisma';

jest.mock('../../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    systemSetting: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn()
    }
  }
}));

describe('UserFieldVisibilityService', () => {
  let service: UserFieldVisibilityService;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    service = new UserFieldVisibilityService();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(UserFieldVisibilityService);
    });
  });

  describe('getFieldVisibilitySettings', () => {
    it('should return default settings when no custom settings exist', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      const result = await service.getFieldVisibilitySettings();

      expect(result).toBeDefined();
      expect(result.name).toEqual({ visible: true, required: true });
      expect(result.email).toEqual({ visible: true, required: true });
      expect(result.role).toEqual({ visible: true, required: true });
      expect(result.phone).toEqual({ visible: true, required: false });
      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledWith({
        where: {
          key: {
            startsWith: 'user_field_visibility_'
          }
        }
      });
    });

    it('should merge custom settings with defaults', async () => {
      const customSettings = [
        {
          key: 'user_field_visibility_phone',
          value: JSON.stringify({ visible: false, required: false })
        },
        {
          key: 'user_field_visibility_bio',
          value: JSON.stringify({ visible: true, required: true })
        }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(customSettings as any);

      const result = await service.getFieldVisibilitySettings();

      expect(result.phone).toEqual({ visible: false, required: false });
      expect(result.bio).toEqual({ visible: true, required: true });
      expect(result.name).toEqual({ visible: true, required: true });
    });

    it('should skip invalid JSON in settings', async () => {
      const invalidSettings = [
        {
          key: 'user_field_visibility_phone',
          value: 'invalid json'
        },
        {
          key: 'user_field_visibility_bio',
          value: JSON.stringify({ visible: true, required: false })
        }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(invalidSettings as any);

      const result = await service.getFieldVisibilitySettings();

      expect(result.phone).toEqual({ visible: true, required: false }); // Should use default
      expect(result.bio).toEqual({ visible: true, required: false });
    });

    it('should include all default fields', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      const result = await service.getFieldVisibilitySettings();

      const expectedFields = [
        'name', 'email', 'role', 'phone', 'address', 'bio',
        'preferredName', 'pronouns', 'gender', 'judgeNumber',
        'judgeLevel', 'isHeadJudge', 'contestantNumber', 'age',
        'school', 'grade', 'parentGuardian', 'parentPhone'
      ];

      expectedFields.forEach(field => {
        expect(result[field]).toBeDefined();
        expect(result[field]).toHaveProperty('visible');
        expect(result[field]).toHaveProperty('required');
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.systemSetting.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getFieldVisibilitySettings()).rejects.toThrow('Database error');
    });

    it('should parse multiple custom field settings', async () => {
      const customSettings = [
        { key: 'user_field_visibility_phone', value: JSON.stringify({ visible: false, required: false }) },
        { key: 'user_field_visibility_bio', value: JSON.stringify({ visible: true, required: true }) },
        { key: 'user_field_visibility_pronouns', value: JSON.stringify({ visible: true, required: true }) }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(customSettings as any);

      const result = await service.getFieldVisibilitySettings();

      expect(result.phone.visible).toBe(false);
      expect(result.bio.required).toBe(true);
      expect(result.pronouns.visible).toBe(true);
    });
  });

  describe('updateFieldVisibility', () => {
    it('should create new field visibility setting', async () => {
      mockPrisma.systemSetting.upsert.mockResolvedValue({
        key: 'user_field_visibility_phone',
        value: JSON.stringify({ visible: false, required: false })
      } as any);

      const result = await service.updateFieldVisibility('phone', false, false, 'user123');

      expect(result).toEqual({
        message: 'Field visibility updated successfully',
        field: 'phone',
        visible: false,
        required: false
      });
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'user_field_visibility_phone' },
        update: {
          value: JSON.stringify({ visible: false, required: false }),
          updatedBy: 'user123'
        },
        create: {
          key: 'user_field_visibility_phone',
          value: JSON.stringify({ visible: false, required: false }),
          description: 'Visibility setting for user field: phone',
          category: 'user_fields',
          updatedBy: 'user123'
        }
      });
    });

    it('should update existing field visibility setting', async () => {
      mockPrisma.systemSetting.upsert.mockResolvedValue({
        key: 'user_field_visibility_bio',
        value: JSON.stringify({ visible: true, required: true })
      } as any);

      await service.updateFieldVisibility('bio', true, true, 'admin123');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'user_field_visibility_bio' },
          update: expect.objectContaining({
            value: JSON.stringify({ visible: true, required: true })
          })
        })
      );
    });

    it('should default required to false when not provided', async () => {
      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      const result = await service.updateFieldVisibility('phone', true, undefined, 'user123');

      expect(result.required).toBe(false);
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            value: JSON.stringify({ visible: true, required: false })
          })
        })
      );
    });

    it('should handle update without userId', async () => {
      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateFieldVisibility('email', true, false);

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            updatedBy: undefined
          })
        })
      );
    });

    it('should throw error when field is missing', async () => {
      await expect(
        service.updateFieldVisibility('', true, false, 'user123')
      ).rejects.toThrow();
    });

    it('should throw error when visible is missing', async () => {
      await expect(
        service.updateFieldVisibility('phone', undefined as any, false, 'user123')
      ).rejects.toThrow();
    });

    it('should handle boolean false for visible', async () => {
      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      const result = await service.updateFieldVisibility('phone', false, false, 'user123');

      expect(result.visible).toBe(false);
    });

    it('should handle boolean true for required', async () => {
      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      const result = await service.updateFieldVisibility('email', true, true, 'user123');

      expect(result.required).toBe(true);
    });

    it('should set appropriate description and category', async () => {
      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateFieldVisibility('customField', true, false, 'user123');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            description: 'Visibility setting for user field: customField',
            category: 'user_fields'
          })
        })
      );
    });
  });

  describe('resetFieldVisibility', () => {
    it('should delete all field visibility settings', async () => {
      mockPrisma.systemSetting.deleteMany.mockResolvedValue({ count: 5 } as any);

      const result = await service.resetFieldVisibility();

      expect(result).toEqual({
        message: 'Field visibility reset to defaults successfully'
      });
      expect(mockPrisma.systemSetting.deleteMany).toHaveBeenCalledWith({
        where: {
          key: {
            startsWith: 'user_field_visibility_'
          }
        }
      });
    });

    it('should succeed even when no settings exist', async () => {
      mockPrisma.systemSetting.deleteMany.mockResolvedValue({ count: 0 } as any);

      const result = await service.resetFieldVisibility();

      expect(result.message).toBe('Field visibility reset to defaults successfully');
      expect(mockPrisma.systemSetting.deleteMany).toHaveBeenCalled();
    });

    it('should only delete field visibility settings', async () => {
      mockPrisma.systemSetting.deleteMany.mockResolvedValue({ count: 3 } as any);

      await service.resetFieldVisibility();

      expect(mockPrisma.systemSetting.deleteMany).toHaveBeenCalledWith({
        where: {
          key: {
            startsWith: 'user_field_visibility_'
          }
        }
      });
    });

    it('should handle database errors during reset', async () => {
      mockPrisma.systemSetting.deleteMany.mockRejectedValue(new Error('Delete failed'));

      await expect(service.resetFieldVisibility()).rejects.toThrow('Delete failed');
    });
  });
});
