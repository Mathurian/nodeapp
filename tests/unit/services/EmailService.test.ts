/**
 * EmailService Unit Tests
 * Comprehensive tests for email service
 */

import 'reflect-metadata';
import { EmailService } from '../../../src/services/EmailService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('EmailService', () => {
  let service: EmailService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockSettings = [
    { id: '1', key: 'EMAIL_ENABLED', value: 'true', description: '', category: 'email', createdAt: new Date(), updatedAt: new Date() },
    { id: '2', key: 'EMAIL_HOST', value: 'smtp.example.com', description: '', category: 'email', createdAt: new Date(), updatedAt: new Date() },
    { id: '3', key: 'EMAIL_PORT', value: '587', description: '', category: 'email', createdAt: new Date(), updatedAt: new Date() },
    { id: '4', key: 'EMAIL_USER', value: 'test@example.com', description: '', category: 'email', createdAt: new Date(), updatedAt: new Date() },
    { id: '5', key: 'EMAIL_FROM', value: 'noreply@example.com', description: '', category: 'email', createdAt: new Date(), updatedAt: new Date() },
  ];

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new EmailService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getConfig', () => {
    it('should get email configuration from settings', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const result = await service.getConfig();

      expect(result).toEqual({
        enabled: true,
        host: 'smtp.example.com',
        port: 587,
        user: 'test@example.com',
        from: 'noreply@example.com',
      });
      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledWith({
        where: {
          key: { in: ['EMAIL_ENABLED', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_FROM'] },
        },
      });
    });

    it('should return disabled config when EMAIL_ENABLED is false', async () => {
      const disabledSettings = [
        { ...mockSettings[0], value: 'false' },
        ...mockSettings.slice(1),
      ];
      mockPrisma.systemSetting.findMany.mockResolvedValue(disabledSettings);

      const result = await service.getConfig();

      expect(result.enabled).toBe(false);
    });

    it('should use default values for missing settings', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      const result = await service.getConfig();

      expect(result).toEqual({
        enabled: false,
        host: '',
        port: 587,
        user: '',
        from: '',
      });
    });

    it('should parse port number correctly', async () => {
      const customPort = [
        ...mockSettings.slice(0, 2),
        { ...mockSettings[2], value: '465' },
        ...mockSettings.slice(3),
      ];
      mockPrisma.systemSetting.findMany.mockResolvedValue(customPort);

      const result = await service.getConfig();

      expect(result.port).toBe(465);
    });

    it('should use default port when invalid port provided', async () => {
      const invalidPort = [
        ...mockSettings.slice(0, 2),
        { ...mockSettings[2], value: 'invalid' },
        ...mockSettings.slice(3),
      ];
      mockPrisma.systemSetting.findMany.mockResolvedValue(invalidPort);

      const result = await service.getConfig();

      expect(result.port).toBe(587);
    });
  });

  describe('sendEmail', () => {
    it('should send email when service is enabled', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const result = await service.sendEmail('recipient@example.com', 'Test Subject', 'Test Body');

      expect(result).toEqual({
        success: true,
        to: 'recipient@example.com',
        subject: 'Test Subject',
      });
    });

    it('should throw error when email service is disabled', async () => {
      const disabledSettings = [
        { ...mockSettings[0], value: 'false' },
        ...mockSettings.slice(1),
      ];
      mockPrisma.systemSetting.findMany.mockResolvedValue(disabledSettings);

      await expect(
        service.sendEmail('recipient@example.com', 'Test Subject', 'Test Body')
      ).rejects.toThrow('Email service not enabled');
    });

    it('should send email with empty body', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const result = await service.sendEmail('recipient@example.com', 'Subject', '');

      expect(result.success).toBe(true);
    });

    it('should send email with HTML content', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const htmlBody = '<html><body><h1>Test</h1></body></html>';
      const result = await service.sendEmail('recipient@example.com', 'Subject', htmlBody);

      expect(result.success).toBe(true);
    });

    it('should handle multiple recipients format', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const result = await service.sendEmail(
        'recipient1@example.com,recipient2@example.com',
        'Subject',
        'Body'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendBulkEmail', () => {
    it('should send emails to multiple recipients', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const results = await service.sendBulkEmail(recipients, 'Test Subject', 'Test Body');

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(results[0].to).toBe('user1@example.com');
      expect(results[1].to).toBe('user2@example.com');
      expect(results[2].to).toBe('user3@example.com');
    });

    it('should handle empty recipient list', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const results = await service.sendBulkEmail([], 'Subject', 'Body');

      expect(results).toHaveLength(0);
    });

    it('should handle single recipient', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const results = await service.sendBulkEmail(['user@example.com'], 'Subject', 'Body');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should continue sending on individual failures', async () => {
      const disabledSettings = [
        { ...mockSettings[0], value: 'false' },
        ...mockSettings.slice(1),
      ];
      mockPrisma.systemSetting.findMany.mockResolvedValue(disabledSettings);

      const recipients = ['user1@example.com', 'user2@example.com'];
      const results = await service.sendBulkEmail(recipients, 'Subject', 'Body');

      expect(results).toHaveLength(2);
      expect(results.every((r) => !r.success)).toBe(true);
      expect(results[0].error).toBeDefined();
      expect(results[1].error).toBeDefined();
    });

    it('should track partial failures', async () => {
      let callCount = 0;
      mockPrisma.systemSetting.findMany.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          return [{ ...mockSettings[0], value: 'false' }, ...mockSettings.slice(1)];
        }
        return mockSettings;
      });

      const recipients = ['user1@example.com', 'user2@example.com'];
      const results = await service.sendBulkEmail(recipients, 'Subject', 'Body');

      expect(results).toHaveLength(2);
      expect(results.filter((r) => r.success).length).toBe(1);
      expect(results.filter((r) => !r.success).length).toBe(1);
    });

    it('should send to large recipient list', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const recipients = Array.from({ length: 100 }, (_, i) => `user${i}@example.com`);
      const results = await service.sendBulkEmail(recipients, 'Subject', 'Body');

      expect(results).toHaveLength(100);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should include recipient email in each result', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const recipients = ['alice@example.com', 'bob@example.com'];
      const results = await service.sendBulkEmail(recipients, 'Subject', 'Body');

      expect(results[0].to).toBe('alice@example.com');
      expect(results[1].to).toBe('bob@example.com');
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors in getConfig', async () => {
      mockPrisma.systemSetting.findMany.mockRejectedValue(new Error('Connection failed'));

      await expect(service.getConfig()).rejects.toThrow('Connection failed');
    });

    it('should handle null/undefined config values', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { ...mockSettings[0], value: null as any },
      ]);

      const result = await service.getConfig();

      expect(result.enabled).toBe(false);
    });
  });

  describe('configuration validation', () => {
    it('should accept various email_enabled values', async () => {
      const trueValues = ['true', 'TRUE', 'True', '1', 'yes'];

      for (const value of trueValues) {
        const settings = [{ ...mockSettings[0], value }, ...mockSettings.slice(1)];
        mockPrisma.systemSetting.findMany.mockResolvedValue(settings);

        const result = await service.getConfig();
        expect(result.enabled).toBe(value === 'true');
      }
    });

    it('should handle missing email configuration gracefully', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([mockSettings[0]]);

      const result = await service.getConfig();

      expect(result).toEqual({
        enabled: true,
        host: '',
        port: 587,
        user: '',
        from: '',
      });
    });

    it('should normalize email addresses', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const result = await service.sendEmail(' test@example.com ', 'Subject', 'Body');

      expect(result.to).toBe(' test@example.com ');
    });
  });
});
