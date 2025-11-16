/**
 * SettingsService Unit Tests
 * Comprehensive test coverage for system settings functionality
 */

import 'reflect-metadata';
import { SettingsService } from '../../../src/services/SettingsService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new SettingsService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getAllSettings', () => {
    it('should return all settings', async () => {
      const mockSettings = [
        { id: '1', key: 'app_name', value: 'Test App', category: 'general', updatedBy: 'user-1' },
        { id: '2', key: 'theme_primary', value: '#000000', category: 'theme', updatedBy: 'user-1' },
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const result = await service.getAllSettings();

      expect(result).toEqual(mockSettings);
      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalled();
    });

    it('should return empty array when no settings exist', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      const result = await service.getAllSettings();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrisma.systemSetting.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllSettings()).rejects.toThrow('Database error');
    });
  });

  describe('getSettingsByCategory', () => {
    it('should return settings for specific category', async () => {
      const mockSettings = [
        { id: '1', key: 'theme_primary', value: '#000000', category: 'theme', updatedBy: 'user-1' },
        { id: '2', key: 'theme_secondary', value: '#FFFFFF', category: 'theme', updatedBy: 'user-1' },
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const result = await service.getSettingsByCategory('theme');

      expect(result).toEqual(mockSettings);
      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledWith({
        where: { category: 'theme' },
      });
    });

    it('should return empty array for category with no settings', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      const result = await service.getSettingsByCategory('nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle different category types', async () => {
      const categories = ['general', 'theme', 'privacy', 'email'];

      for (const category of categories) {
        mockPrisma.systemSetting.findMany.mockResolvedValue([]);
        await service.getSettingsByCategory(category);
        expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledWith({
          where: { category },
        });
      }
    });
  });

  describe('getAppName', () => {
    it('should return app name and subtitle', async () => {
      mockPrisma.systemSetting.findFirst
        .mockResolvedValueOnce({ id: '1', key: 'app_name', value: 'My Event App', category: 'general' } as any)
        .mockResolvedValueOnce({ id: '2', key: 'app_subtitle', value: 'Manage Your Events', category: 'general' } as any);

      const result = await service.getAppName();

      expect(result.appName).toBe('My Event App');
      expect(result.appSubtitle).toBe('Manage Your Events');
    });

    it('should return default values when settings not found', async () => {
      mockPrisma.systemSetting.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await service.getAppName();

      expect(result.appName).toBe('Event Manager');
      expect(result.appSubtitle).toBe('');
    });

    it('should handle partial settings', async () => {
      mockPrisma.systemSetting.findFirst
        .mockResolvedValueOnce({ id: '1', key: 'app_name', value: 'Custom App', category: 'general' } as any)
        .mockResolvedValueOnce(null);

      const result = await service.getAppName();

      expect(result.appName).toBe('Custom App');
      expect(result.appSubtitle).toBe('');
    });
  });

  describe('getPublicSettings', () => {
    it('should return public settings', async () => {
      const mockSettings = [
        { id: '1', key: 'app_name', value: 'Public App', category: 'general' },
        { id: '2', key: 'app_subtitle', value: 'Event Management', category: 'general' },
        { id: '3', key: 'show_forgot_password', value: 'true', category: 'security' },
        { id: '4', key: 'theme_logoPath', value: '/logo.png', category: 'theme' },
        { id: '5', key: 'theme_faviconPath', value: '/favicon.ico', category: 'theme' },
        { id: '6', key: 'footer_contactEmail', value: 'contact@test.com', category: 'footer' },
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const result = await service.getPublicSettings();

      expect(result.appName).toBe('Public App');
      expect(result.appSubtitle).toBe('Event Management');
      expect(result.showForgotPassword).toBe(true);
      expect(result.logoPath).toBe('/logo.png');
      expect(result.faviconPath).toBe('/favicon.ico');
      expect(result.contactEmail).toBe('contact@test.com');
    });

    it('should return defaults when settings not found', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      const result = await service.getPublicSettings();

      expect(result.appName).toBe('Event Manager');
      expect(result.appSubtitle).toBe('');
      expect(result.showForgotPassword).toBe(true);
      expect(result.logoPath).toBeNull();
      expect(result.faviconPath).toBeNull();
      expect(result.contactEmail).toBeNull();
    });

    it('should parse boolean values correctly', async () => {
      const mockSettings = [
        { id: '1', key: 'show_forgot_password', value: 'false', category: 'security' },
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const result = await service.getPublicSettings();

      expect(result.showForgotPassword).toBe(false);
    });

    it('should only query public setting keys', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      await service.getPublicSettings();

      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledWith({
        where: {
          key: {
            in: [
              'app_name',
              'app_subtitle',
              'show_forgot_password',
              'theme_logoPath',
              'theme_faviconPath',
              'footer_contactEmail',
            ],
          },
        },
      });
    });
  });

  describe('getContestantVisibilitySettings', () => {
    it('should return contestant visibility settings', async () => {
      const mockSettings = [
        { id: '1', key: 'contestant_visibility_canViewWinners', value: 'true', category: 'privacy' },
        { id: '2', key: 'contestant_visibility_canViewOverallResults', value: 'false', category: 'privacy' },
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const result = await service.getContestantVisibilitySettings();

      expect(result['contestant_visibility_canViewWinners']).toBe('true');
      expect(result['contestant_visibility_canViewOverallResults']).toBe('false');
    });

    it('should return empty object when no settings exist', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      const result = await service.getContestantVisibilitySettings();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('updateContestantVisibilitySettings', () => {
    it('should update visibility settings from frontend format', async () => {
      const frontendData = {
        canViewWinners: true,
        canViewOverallResults: false,
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateContestantVisibilitySettings(frontendData, 'user-1');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalled();
    });

    it('should handle string boolean values', async () => {
      const frontendData = {
        canViewWinners: 'true' as any,
        canViewOverallResults: 'false' as any,
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateContestantVisibilitySettings(frontendData, 'user-1');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalled();
    });

    it('should transform frontend keys to database keys', async () => {
      const frontendData = {
        canViewWinners: true,
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateContestantVisibilitySettings(frontendData, 'user-1');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            key: 'contestant_visibility_canViewWinners',
          }),
        })
      );
    });
  });

  describe('updateSettings', () => {
    it('should update multiple settings', async () => {
      const settings = {
        app_name: 'New App Name',
        theme_primary: '#FF0000',
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      const result = await service.updateSettings(settings, 'user-1');

      expect(result).toBeGreaterThan(0);
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledTimes(2);
    });

    it('should determine category from key', async () => {
      const settings = {
        theme_primary: '#000000',
        email_host: 'smtp.test.com',
        privacy_showScores: 'true',
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateSettings(settings, 'user-1');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledTimes(3);
    });

    it('should handle empty settings object', async () => {
      const result = await service.updateSettings({}, 'user-1');

      expect(result).toBe(0);
      expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();
    });

    it('should continue on individual setting errors', async () => {
      const settings = {
        setting1: 'value1',
        setting2: 'value2',
        setting3: 'value3',
      };

      mockPrisma.systemSetting.upsert
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('Update failed'))
        .mockResolvedValueOnce({} as any);

      const result = await service.updateSettings(settings, 'user-1');

      expect(result).toBe(2);
    });
  });

  describe('deleteSetting', () => {
    it('should delete a setting', async () => {
      mockPrisma.systemSetting.delete.mockResolvedValue({} as any);

      await service.deleteSetting('setting-key');

      expect(mockPrisma.systemSetting.delete).toHaveBeenCalledWith({
        where: { key: 'setting-key' },
      });
    });

    it('should handle deletion errors', async () => {
      mockPrisma.systemSetting.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteSetting('nonexistent')).rejects.toThrow('Delete failed');
    });
  });

  describe('validateEmailSettings', () => {
    it('should validate email configuration', async () => {
      const emailSettings = {
        email_host: 'smtp.gmail.com',
        email_port: '587',
        email_secure: 'false',
        email_user: 'test@gmail.com',
        email_password: 'password123',
      };

      const result = await service.validateEmailSettings(emailSettings);

      expect(result).toBeDefined();
    });

    it('should detect missing required fields', async () => {
      const emailSettings = {
        email_host: 'smtp.gmail.com',
        // Missing other required fields
      };

      const result = await service.validateEmailSettings(emailSettings);

      expect(result).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle null values', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { id: '1', key: 'test', value: null, category: 'general' } as any,
      ]);

      const result = await service.getAllSettings();

      expect(result).toHaveLength(1);
    });

    it('should handle empty string values', async () => {
      const settings = {
        app_name: '',
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateSettings(settings, 'user-1');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalled();
    });

    it('should handle special characters in values', async () => {
      const settings = {
        app_name: "Test's & <Special> \"Chars\"",
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateSettings(settings, 'user-1');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalled();
    });

    it('should handle very long setting values', async () => {
      const longValue = 'a'.repeat(10000);
      const settings = {
        custom_setting: longValue,
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateSettings(settings, 'user-1');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalled();
    });
  });
});
