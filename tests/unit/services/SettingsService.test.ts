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
      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledWith({
        where: { tenantId: null }
      });
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
        where: { category: 'theme', tenantId: null },
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
          where: { category, tenantId: null },
        });
      }
    });
  });

  describe('getAppName', () => {
    it('should return app name and subtitle', async () => {
      // getAppName calls getSettingWithFallback for each key.
      // Without tenantId, it only queries global (tenantId: null) for each key.
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

      expect(result.appName).toBe('ConMGR');
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
      // getPublicSettings calls getSettingWithFallback for each of 6 keys.
      // Without tenantId, each call queries findFirst with { key, tenantId: null }.
      mockPrisma.systemSetting.findFirst
        .mockResolvedValueOnce({ id: '1', key: 'app_name', value: 'Public App', category: 'general' } as any)
        .mockResolvedValueOnce({ id: '2', key: 'app_subtitle', value: 'Event Management', category: 'general' } as any)
        .mockResolvedValueOnce({ id: '3', key: 'show_forgot_password', value: 'true', category: 'security' } as any)
        .mockResolvedValueOnce({ id: '4', key: 'theme_logoPath', value: '/logo.png', category: 'theme' } as any)
        .mockResolvedValueOnce({ id: '5', key: 'theme_faviconPath', value: '/favicon.ico', category: 'theme' } as any)
        .mockResolvedValueOnce({ id: '6', key: 'footer_contactEmail', value: 'contact@test.com', category: 'footer' } as any);

      const result = await service.getPublicSettings();

      expect(result.appName).toBe('Public App');
      expect(result.appSubtitle).toBe('Event Management');
      expect(result.showForgotPassword).toBe(true);
      expect(result.logoPath).toBe('/logo.png');
      expect(result.faviconPath).toBe('/favicon.ico');
      expect(result.contactEmail).toBe('contact@test.com');
    });

    it('should return defaults when settings not found', async () => {
      // 6 keys, all return null
      mockPrisma.systemSetting.findFirst.mockResolvedValue(null);

      const result = await service.getPublicSettings();

      expect(result.appName).toBe('ConMGR');
      expect(result.appSubtitle).toBe('');
      expect(result.showForgotPassword).toBe(true);
      expect(result.logoPath).toBeNull();
      expect(result.faviconPath).toBeNull();
      expect(result.contactEmail).toBeNull();
    });

    it('should parse boolean values correctly', async () => {
      // getPublicSettings calls getSettingWithFallback for each of 6 keys
      mockPrisma.systemSetting.findFirst
        .mockResolvedValueOnce(null) // app_name
        .mockResolvedValueOnce(null) // app_subtitle
        .mockResolvedValueOnce({ id: '1', key: 'show_forgot_password', value: 'false', category: 'security' } as any)
        .mockResolvedValueOnce(null) // theme_logoPath
        .mockResolvedValueOnce(null) // theme_faviconPath
        .mockResolvedValueOnce(null); // footer_contactEmail

      const result = await service.getPublicSettings();

      expect(result.showForgotPassword).toBe(false);
    });

    it('should query settings using findFirst for each key', async () => {
      mockPrisma.systemSetting.findFirst.mockResolvedValue(null);

      await service.getPublicSettings();

      // Should call findFirst for each of the 6 public setting keys
      expect(mockPrisma.systemSetting.findFirst).toHaveBeenCalledTimes(6);
      expect(mockPrisma.systemSetting.findFirst).toHaveBeenCalledWith({
        where: { key: 'app_name', tenantId: null }
      });
      expect(mockPrisma.systemSetting.findFirst).toHaveBeenCalledWith({
        where: { key: 'app_subtitle', tenantId: null }
      });
    });
  });

  describe('getContestantVisibilitySettings', () => {
    it('should return contestant visibility settings', async () => {
      const mockSettings = [
        { id: '1', key: 'contestant_visibility_canViewWinners', value: 'true', category: 'privacy' },
        { id: '2', key: 'contestant_visibility_canViewOverallResults', value: 'false', category: 'privacy' },
      ];

      // getContestantVisibilitySettings calls getSettingsWithPrefixForTenant
      // which calls findMany with { key: { startsWith: 'contestant_visibility_' }, tenantId: null }
      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const result = await service.getContestantVisibilitySettings();

      // Returns boolean values now, not raw strings
      expect(result.canViewWinners).toBe(true);
      expect(result.canViewOverallResults).toBe(false);
    });

    it('should return default values when no settings exist', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      const result = await service.getContestantVisibilitySettings();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      // Defaults
      expect(result.canViewWinners).toBe(true);
      expect(result.canViewOverallResults).toBe(true);
    });
  });

  describe('updateContestantVisibilitySettings', () => {
    it('should update visibility settings from frontend format', async () => {
      const frontendData = {
        canViewWinners: true,
        canViewOverallResults: false,
      };

      // updateContestantVisibilitySettings calls updateSetting -> setSettingForTenant
      // with tenantId null (global), which uses findFirst + update/create
      mockPrisma.systemSetting.findFirst.mockResolvedValue(null);
      mockPrisma.systemSetting.create.mockResolvedValue({} as any);

      await service.updateContestantVisibilitySettings(frontendData, 'user-1');

      // Should have created settings (since findFirst returns null)
      expect(mockPrisma.systemSetting.create).toHaveBeenCalled();
    });

    it('should handle string boolean values', async () => {
      const frontendData = {
        canViewWinners: 'true' as any,
        canViewOverallResults: 'false' as any,
      };

      mockPrisma.systemSetting.findFirst.mockResolvedValue(null);
      mockPrisma.systemSetting.create.mockResolvedValue({} as any);

      await service.updateContestantVisibilitySettings(frontendData, 'user-1');

      expect(mockPrisma.systemSetting.create).toHaveBeenCalled();
    });

    it('should transform frontend keys to database keys', async () => {
      const frontendData = {
        canViewWinners: true,
      };

      mockPrisma.systemSetting.findFirst.mockResolvedValue(null);
      mockPrisma.systemSetting.create.mockResolvedValue({} as any);

      await service.updateContestantVisibilitySettings(frontendData, 'user-1');

      // The service transforms 'canViewWinners' to 'contestant_visibility_canViewWinners'
      // and calls setSettingForTenant with tenantId=null, which creates via prisma.systemSetting.create
      expect(mockPrisma.systemSetting.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
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

      // updateSettings calls setSettingForTenant for each key
      // With tenantId=null, it uses findFirst + update/create
      mockPrisma.systemSetting.findFirst.mockResolvedValue(null);
      mockPrisma.systemSetting.create.mockResolvedValue({} as any);

      const result = await service.updateSettings(settings, 'user-1');

      expect(result).toBe(2);
      // Each key calls findFirst (to check existing) + create (since findFirst returns null)
      expect(mockPrisma.systemSetting.create).toHaveBeenCalledTimes(2);
    });

    it('should determine category from key', async () => {
      const settings = {
        theme_primary: '#000000',
        email_host: 'smtp.test.com',
      };

      mockPrisma.systemSetting.findFirst.mockResolvedValue(null);
      mockPrisma.systemSetting.create.mockResolvedValue({} as any);

      await service.updateSettings(settings, 'user-1');

      expect(mockPrisma.systemSetting.create).toHaveBeenCalledTimes(2);
    });

    it('should handle empty settings object', async () => {
      const result = await service.updateSettings({}, 'user-1');

      expect(result).toBe(0);
      expect(mockPrisma.systemSetting.create).not.toHaveBeenCalled();
    });

    it('should handle errors during individual setting updates', async () => {
      const settings = {
        setting1: 'value1',
        setting2: 'value2',
        setting3: 'value3',
      };

      // updateSettings calls setSettingForTenant for each entry
      // If one fails, the error propagates (no try/catch in the loop)
      mockPrisma.systemSetting.findFirst.mockResolvedValue(null);
      mockPrisma.systemSetting.create
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('Update failed'))
        .mockResolvedValueOnce({} as any);

      // The service doesn't catch per-setting errors, so it will throw
      await expect(service.updateSettings(settings, 'user-1')).rejects.toThrow('Update failed');
    });
  });

  describe('deleteTenantSetting', () => {
    it('should delete a tenant setting', async () => {
      mockPrisma.systemSetting.deleteMany.mockResolvedValue({ count: 1 } as any);

      const result = await service.deleteTenantSetting('setting-key', 'tenant-1');

      expect(result).toBe(true);
      expect(mockPrisma.systemSetting.deleteMany).toHaveBeenCalledWith({
        where: { key: 'setting-key', tenantId: 'tenant-1' },
      });
    });

    it('should return false when setting not found', async () => {
      mockPrisma.systemSetting.deleteMany.mockResolvedValue({ count: 0 } as any);

      const result = await service.deleteTenantSetting('nonexistent', 'tenant-1');

      expect(result).toBe(false);
    });
  });

  describe('getEmailSettings', () => {
    it('should return email settings with defaults', async () => {
      // getEmailSettings calls getSettingWithFallback for each email key
      mockPrisma.systemSetting.findFirst.mockResolvedValue(null);

      const result = await service.getEmailSettings();

      expect(result).toBeDefined();
      expect(result.email_enabled).toBe('true');
      expect(result.email_smtp_port).toBe('587');
    });

    it('should return configured email settings', async () => {
      mockPrisma.systemSetting.findFirst
        .mockImplementation(async (args: any) => {
          const keyMap: Record<string, string> = {
            'email_smtp_host': 'smtp.gmail.com',
            'email_smtp_port': '465',
          };
          const key = args?.where?.key;
          if (key && keyMap[key]) {
            return { id: '1', key, value: keyMap[key], category: 'email' } as any;
          }
          return null;
        });

      const result = await service.getEmailSettings();

      expect(result).toBeDefined();
      expect(result.email_smtp_host).toBe('smtp.gmail.com');
      expect(result.email_smtp_port).toBe('465');
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

      // updateSettings -> setSettingForTenant with tenantId null -> findFirst + create
      mockPrisma.systemSetting.findFirst.mockResolvedValue(null);
      mockPrisma.systemSetting.create.mockResolvedValue({} as any);

      await service.updateSettings(settings, 'user-1');

      expect(mockPrisma.systemSetting.create).toHaveBeenCalled();
    });

    it('should handle special characters in values', async () => {
      const settings = {
        app_name: "Test's & <Special> \"Chars\"",
      };

      mockPrisma.systemSetting.findFirst.mockResolvedValue(null);
      mockPrisma.systemSetting.create.mockResolvedValue({} as any);

      await service.updateSettings(settings, 'user-1');

      expect(mockPrisma.systemSetting.create).toHaveBeenCalled();
    });

    it('should handle very long setting values', async () => {
      const longValue = 'a'.repeat(10000);
      const settings = {
        custom_setting: longValue,
      };

      mockPrisma.systemSetting.findFirst.mockResolvedValue(null);
      mockPrisma.systemSetting.create.mockResolvedValue({} as any);

      await service.updateSettings(settings, 'user-1');

      expect(mockPrisma.systemSetting.create).toHaveBeenCalled();
    });
  });
});
