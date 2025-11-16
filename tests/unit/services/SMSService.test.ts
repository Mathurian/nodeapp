/**
 * SMSService Tests
 * Comprehensive test coverage for SMS functionality
 */

import 'reflect-metadata';
import { SMSService, SMSSettings } from '../../../src/services/SMSService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('SMSService', () => {
  let service: SMSService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new SMSService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(SMSService);
    });

    it('should extend BaseService', () => {
      expect(service).toHaveProperty('badRequestError');
      expect(service).toHaveProperty('notFoundError');
    });
  });

  describe('getSettings', () => {
    it('should retrieve SMS settings from database', async () => {
      const mockSettings = [
        { key: 'SMS_ENABLED', value: 'true' },
        { key: 'SMS_API_KEY', value: 'test-key' },
        { key: 'SMS_API_SECRET', value: 'test-secret' },
        { key: 'SMS_FROM_NUMBER', value: '+1234567890' },
        { key: 'SMS_PROVIDER', value: 'twilio' }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const settings = await service.getSettings();

      expect(settings).toEqual({
        enabled: true,
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        fromNumber: '+1234567890',
        provider: 'twilio'
      });

      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledWith({
        where: {
          key: {
            in: ['SMS_ENABLED', 'SMS_API_KEY', 'SMS_API_SECRET', 'SMS_FROM_NUMBER', 'SMS_PROVIDER']
          }
        }
      });
    });

    it('should return disabled settings when SMS_ENABLED is false', async () => {
      const mockSettings = [
        { key: 'SMS_ENABLED', value: 'false' },
        { key: 'SMS_API_KEY', value: 'test-key' },
        { key: 'SMS_API_SECRET', value: 'test-secret' },
        { key: 'SMS_FROM_NUMBER', value: '+1234567890' },
        { key: 'SMS_PROVIDER', value: 'twilio' }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const settings = await service.getSettings();

      expect(settings.enabled).toBe(false);
      expect(settings.apiKey).toBe('test-key');
    });

    it('should return default settings when database has no settings', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      const settings = await service.getSettings();

      expect(settings).toEqual({
        enabled: false,
        apiKey: '',
        apiSecret: '',
        fromNumber: '',
        provider: 'twilio'
      });
    });

    it('should return default settings when partial settings exist', async () => {
      const mockSettings = [
        { key: 'SMS_ENABLED', value: 'true' },
        { key: 'SMS_PROVIDER', value: 'twilio' }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const settings = await service.getSettings();

      expect(settings.enabled).toBe(true);
      expect(settings.apiKey).toBe('');
      expect(settings.apiSecret).toBe('');
      expect(settings.fromNumber).toBe('');
      expect(settings.provider).toBe('twilio');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.systemSetting.findMany.mockRejectedValue(new Error('Database error'));

      const settings = await service.getSettings();

      expect(settings).toEqual({
        enabled: false,
        apiKey: '',
        apiSecret: '',
        fromNumber: '',
        provider: 'twilio'
      });
    });

    it('should handle various SMS_ENABLED values', async () => {
      const mockSettings = [{ key: 'SMS_ENABLED', value: 'anything' }];
      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const settings = await service.getSettings();
      expect(settings.enabled).toBe(false);
    });

    it('should default to twilio provider when not specified', async () => {
      const mockSettings = [
        { key: 'SMS_ENABLED', value: 'true' }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const settings = await service.getSettings();
      expect(settings.provider).toBe('twilio');
    });
  });

  describe('updateSettings', () => {
    it('should update all SMS settings', async () => {
      const newSettings: SMSSettings = {
        enabled: true,
        apiKey: 'new-key',
        apiSecret: 'new-secret',
        fromNumber: '+9876543210',
        provider: 'twilio'
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateSettings(newSettings, 'user-1');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledTimes(5);

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'SMS_ENABLED' },
        update: {
          value: 'true',
          updatedAt: expect.any(Date),
          updatedBy: 'user-1'
        },
        create: {
          key: 'SMS_ENABLED',
          value: 'true',
          category: 'sms',
          description: 'Enable SMS notifications',
          updatedBy: 'user-1'
        }
      });
    });

    it('should update settings without userId', async () => {
      const newSettings: SMSSettings = {
        enabled: true,
        apiKey: 'new-key',
        apiSecret: 'new-secret',
        fromNumber: '+9876543210',
        provider: 'twilio'
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateSettings(newSettings);

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledTimes(5);
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            updatedBy: undefined
          })
        })
      );
    });

    it('should convert enabled boolean to string', async () => {
      const newSettings: SMSSettings = {
        enabled: false,
        apiKey: 'key',
        apiSecret: 'secret',
        fromNumber: '+1234567890',
        provider: 'twilio'
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateSettings(newSettings, 'user-1');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'SMS_ENABLED' },
          update: expect.objectContaining({
            value: 'false'
          })
        })
      );
    });

    it('should handle empty string values', async () => {
      const newSettings: SMSSettings = {
        enabled: true,
        apiKey: '',
        apiSecret: '',
        fromNumber: '',
        provider: ''
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateSettings(newSettings, 'user-1');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'SMS_PROVIDER' },
          update: expect.objectContaining({
            value: 'twilio' // Defaults to twilio when empty
          })
        })
      );
    });

    it('should update API key setting', async () => {
      const newSettings: SMSSettings = {
        enabled: true,
        apiKey: 'updated-key',
        apiSecret: 'secret',
        fromNumber: '+1234567890',
        provider: 'twilio'
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateSettings(newSettings, 'user-1');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'SMS_API_KEY' },
        update: {
          value: 'updated-key',
          updatedAt: expect.any(Date),
          updatedBy: 'user-1'
        },
        create: {
          key: 'SMS_API_KEY',
          value: 'updated-key',
          category: 'sms',
          description: 'SMS API Key',
          updatedBy: 'user-1'
        }
      });
    });

    it('should update API secret setting', async () => {
      const newSettings: SMSSettings = {
        enabled: true,
        apiKey: 'key',
        apiSecret: 'updated-secret',
        fromNumber: '+1234567890',
        provider: 'twilio'
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateSettings(newSettings, 'user-1');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'SMS_API_SECRET' },
        update: {
          value: 'updated-secret',
          updatedAt: expect.any(Date),
          updatedBy: 'user-1'
        },
        create: {
          key: 'SMS_API_SECRET',
          value: 'updated-secret',
          category: 'sms',
          description: 'SMS API Secret',
          updatedBy: 'user-1'
        }
      });
    });

    it('should update from number setting', async () => {
      const newSettings: SMSSettings = {
        enabled: true,
        apiKey: 'key',
        apiSecret: 'secret',
        fromNumber: '+9999999999',
        provider: 'twilio'
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

      await service.updateSettings(newSettings, 'user-1');

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'SMS_FROM_NUMBER' },
        update: {
          value: '+9999999999',
          updatedAt: expect.any(Date),
          updatedBy: 'user-1'
        },
        create: {
          key: 'SMS_FROM_NUMBER',
          value: '+9999999999',
          category: 'sms',
          description: 'SMS From Number',
          updatedBy: 'user-1'
        }
      });
    });

    it('should handle database errors during update', async () => {
      const newSettings: SMSSettings = {
        enabled: true,
        apiKey: 'key',
        apiSecret: 'secret',
        fromNumber: '+1234567890',
        provider: 'twilio'
      };

      mockPrisma.systemSetting.upsert.mockRejectedValue(new Error('Database error'));

      await expect(service.updateSettings(newSettings, 'user-1')).rejects.toThrow('Database error');
    });
  });

  describe('sendSMS', () => {
    it('should send SMS when enabled', async () => {
      const mockSettings = [
        { key: 'SMS_ENABLED', value: 'true' },
        { key: 'SMS_FROM_NUMBER', value: '+1234567890' }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const result = await service.sendSMS('+9876543210', 'Test message');

      expect(result).toEqual({
        success: true,
        message: 'SMS would be sent (not implemented)',
        to: '+9876543210',
        from: '+1234567890'
      });
    });

    it('should throw error when phone number is missing', async () => {
      await expect(service.sendSMS('', 'Test message')).rejects.toThrow('Phone number and message are required');
    });

    it('should throw error when message is missing', async () => {
      await expect(service.sendSMS('+1234567890', '')).rejects.toThrow('Phone number and message are required');
    });

    it('should throw error when both phone and message are missing', async () => {
      await expect(service.sendSMS('', '')).rejects.toThrow('Phone number and message are required');
    });

    it('should throw error when SMS is disabled', async () => {
      const mockSettings = [
        { key: 'SMS_ENABLED', value: 'false' }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      await expect(service.sendSMS('+9876543210', 'Test message')).rejects.toThrow('SMS service is not enabled');
    });

    it('should throw error when SMS settings not configured', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      await expect(service.sendSMS('+9876543210', 'Test message')).rejects.toThrow('SMS service is not enabled');
    });

    it('should include correct from number in response', async () => {
      const mockSettings = [
        { key: 'SMS_ENABLED', value: 'true' },
        { key: 'SMS_FROM_NUMBER', value: '+1111111111' }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const result = await service.sendSMS('+9876543210', 'Test message');

      expect(result.from).toBe('+1111111111');
      expect(result.to).toBe('+9876543210');
    });

    it('should handle special characters in message', async () => {
      const mockSettings = [
        { key: 'SMS_ENABLED', value: 'true' },
        { key: 'SMS_FROM_NUMBER', value: '+1234567890' }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const specialMessage = 'Test with special chars: !@#$%^&*()';
      const result = await service.sendSMS('+9876543210', specialMessage);

      expect(result.success).toBe(true);
    });

    it('should handle international phone numbers', async () => {
      const mockSettings = [
        { key: 'SMS_ENABLED', value: 'true' },
        { key: 'SMS_FROM_NUMBER', value: '+1234567890' }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const result = await service.sendSMS('+44123456789', 'Test message');

      expect(result.to).toBe('+44123456789');
      expect(result.success).toBe(true);
    });

    it('should handle long messages', async () => {
      const mockSettings = [
        { key: 'SMS_ENABLED', value: 'true' },
        { key: 'SMS_FROM_NUMBER', value: '+1234567890' }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const longMessage = 'A'.repeat(500);
      const result = await service.sendSMS('+9876543210', longMessage);

      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values in settings gracefully', async () => {
      const mockSettings = [
        { key: 'SMS_ENABLED', value: null },
        { key: 'SMS_API_KEY', value: null }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const settings = await service.getSettings();

      expect(settings.enabled).toBe(false);
      expect(settings.apiKey).toBe('');
    });

    it('should handle concurrent getSettings calls', async () => {
      const mockSettings = [
        { key: 'SMS_ENABLED', value: 'true' },
        { key: 'SMS_API_KEY', value: 'test-key' }
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings as any);

      const [result1, result2, result3] = await Promise.all([
        service.getSettings(),
        service.getSettings(),
        service.getSettings()
      ]);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should handle various provider names', async () => {
      const providers = ['twilio', 'vonage', 'messagebird'];

      for (const provider of providers) {
        const newSettings: SMSSettings = {
          enabled: true,
          apiKey: 'key',
          apiSecret: 'secret',
          fromNumber: '+1234567890',
          provider
        };

        mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);

        await service.updateSettings(newSettings);

        expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { key: 'SMS_PROVIDER' },
            update: expect.objectContaining({
              value: provider
            })
          })
        );
      }
    });
  });
});
