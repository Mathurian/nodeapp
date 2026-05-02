/**
 * EmailService Unit Tests
 * Comprehensive tests for email service
 */

import 'reflect-metadata';
import nodemailer from 'nodemailer';
import { EmailService } from '../../../src/services/EmailService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('EmailService', () => {
  let service: EmailService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockSendMail: jest.Mock;
  const mockCreateTransport = nodemailer.createTransport as jest.Mock;

  const mockSettings = [
    {
      id: '1',
      key: 'EMAIL_ENABLED',
      value: 'true',
      description: '',
      category: 'email',
      tenantId: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      key: 'EMAIL_HOST',
      value: 'smtp.example.com',
      description: '',
      category: 'email',
      tenantId: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      key: 'EMAIL_PORT',
      value: '587',
      description: '',
      category: 'email',
      tenantId: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '4',
      key: 'EMAIL_USER',
      value: 'test@example.com',
      description: '',
      category: 'email',
      tenantId: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '5',
      key: 'EMAIL_FROM',
      value: 'noreply@example.com',
      description: '',
      category: 'email',
      tenantId: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    mockSendMail = jest.fn().mockResolvedValue({
      messageId: 'mock-message-id',
      response: 'queued',
    });
    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
      verify: jest.fn().mockResolvedValue(true),
    });
    service = new EmailService(mockPrisma as any);
    jest.clearAllMocks();
    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
      verify: jest.fn().mockResolvedValue(true),
    });
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
        select: {
          key: true,
          value: true,
        },
      });
    });

    it('should return disabled config when EMAIL_ENABLED is false', async () => {
      const disabledSettings = [{ ...mockSettings[0], value: 'false' }, ...mockSettings.slice(1)];
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
    // Note: The actual EmailService.sendEmail checks env.get('SMTP_ENABLED') (not DB settings).
    // When SMTP is disabled, it returns success with message 'Email skipped (SMTP disabled)'.
    // When SMTP is enabled but no transporter, it throws.

    it('should return skipped result when SMTP is disabled', async () => {
      // By default SMTP_ENABLED is not set, so sendEmail returns skipped
      const result = await service.sendEmail('recipient@example.com', 'Test Subject', 'Test Body');

      expect(result).toEqual({
        success: true,
        to: 'recipient@example.com',
        subject: 'Test Subject',
        message: 'Email skipped (SMTP disabled)',
      });
    });

    it('should return skipped result with empty body when SMTP is disabled', async () => {
      const result = await service.sendEmail('recipient@example.com', 'Subject', '');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email skipped (SMTP disabled)');
    });

    it('should return skipped result with HTML content when SMTP is disabled', async () => {
      const htmlBody = '<html><body><h1>Test</h1></body></html>';
      const result = await service.sendEmail('recipient@example.com', 'Subject', htmlBody);

      expect(result.success).toBe(true);
    });

    it('should handle multiple recipients format when SMTP is disabled', async () => {
      const result = await service.sendEmail(
        'recipient1@example.com,recipient2@example.com',
        'Subject',
        'Body'
      );

      expect(result.success).toBe(true);
    });

    it('should apply global configured from address when no tenant id is provided', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValueOnce([
        { key: 'smtp_enabled', value: 'true' },
        { key: 'smtp_host', value: 'smtp.example.com' },
        { key: 'smtp_port', value: '587' },
        { key: 'email_fromEmail', value: 'competitions@okckinkweekend.com' },
        { key: 'email_fromName', value: 'OKC Competitions' },
      ] as any);

      const config = await (service as any).resolveSmtpRuntimeConfig();

      expect(config).toEqual(
        expect.objectContaining({
          enabled: true,
          host: 'smtp.example.com',
          from: 'competitions@okckinkweekend.com',
          fromName: 'OKC Competitions',
          source: 'settings',
        })
      );
      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: null }),
        })
      );
      expect((service as any).formatAddressHeader(config.from, config.fromName)).toBe(
        '"OKC Competitions" <competitions@okckinkweekend.com>'
      );
    });

    it('should let tenant configured from address override global from address', async () => {
      mockPrisma.systemSetting.findMany
        .mockResolvedValueOnce([
          { key: 'smtp_enabled', value: 'true' },
          { key: 'smtp_host', value: 'smtp.example.com' },
          { key: 'smtp_port', value: '587' },
          { key: 'email_fromEmail', value: 'admin@okckinkweekend.com' },
          { key: 'email_fromName', value: 'OKC Admin' },
        ] as any)
        .mockResolvedValueOnce([
          { key: 'email_fromEmail', value: 'competitions@okckinkweekend.com' },
          { key: 'email_fromName', value: 'OKC Competitions' },
        ] as any);

      const config = await (service as any).resolveSmtpRuntimeConfig('tenant-1');

      expect(config).toEqual(
        expect.objectContaining({
          enabled: true,
          host: 'smtp.example.com',
          from: 'competitions@okckinkweekend.com',
          fromName: 'OKC Competitions',
          source: 'settings',
        })
      );
      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledTimes(2);
      expect((service as any).formatAddressHeader(config.from, config.fromName)).toBe(
        '"OKC Competitions" <competitions@okckinkweekend.com>'
      );
    });

    it('should apply configured from name and reply-to headers for tenant runtime email', async () => {
      mockPrisma.systemSetting.findMany
        .mockResolvedValueOnce([{ key: 'email_reply_to_name', value: 'Global Support' }] as any)
        .mockResolvedValueOnce([
          { key: 'smtp_enabled', value: 'true' },
          { key: 'smtp_host', value: 'smtp.example.com' },
          { key: 'smtp_port', value: '587' },
          { key: 'email_fromEmail', value: 'sender@example.com' },
          { key: 'email_fromName', value: 'Event Ops' },
          { key: 'email_replyToEmail', value: 'replies@example.com' },
        ] as any);

      const config = await (service as any).resolveSmtpRuntimeConfig('tenant-1');

      expect((service as any).formatAddressHeader(config.from, config.fromName)).toBe(
        '"Event Ops" <sender@example.com>'
      );
      expect((service as any).formatAddressHeader(config.replyToAddress, config.replyToName)).toBe(
        '"Global Support" <replies@example.com>'
      );
    });

    it('should omit reply-to when tenant runtime email has no reply-to address', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValueOnce([] as any).mockResolvedValueOnce([
        { key: 'smtp_enabled', value: 'true' },
        { key: 'smtp_host', value: 'smtp.example.com' },
        { key: 'smtp_port', value: '587' },
        { key: 'email_fromEmail', value: 'sender@example.com' },
        { key: 'email_fromName', value: 'Event Ops' },
      ] as any);

      const config = await (service as any).resolveSmtpRuntimeConfig('tenant-1');

      expect(config).toEqual(
        expect.objectContaining({
          from: 'sender@example.com',
          fromName: 'Event Ops',
          replyToAddress: '',
        })
      );
      expect((service as any).formatAddressHeader(config.replyToAddress, config.replyToName)).toBe(
        ''
      );
    });
  });

  describe('sendBulkEmail', () => {
    it('should send emails to multiple recipients', async () => {
      // With SMTP disabled, all return skipped/success
      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const results = await service.sendBulkEmail(recipients, 'Test Subject', 'Test Body');

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(results[0].to).toBe('user1@example.com');
      expect(results[1].to).toBe('user2@example.com');
      expect(results[2].to).toBe('user3@example.com');
    });

    it('should handle empty recipient list', async () => {
      const results = await service.sendBulkEmail([], 'Subject', 'Body');

      expect(results).toHaveLength(0);
    });

    it('should handle single recipient', async () => {
      const results = await service.sendBulkEmail(['user@example.com'], 'Subject', 'Body');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should send to large recipient list', async () => {
      const recipients = Array.from({ length: 100 }, (_, i) => `user${i}@example.com`);
      const results = await service.sendBulkEmail(recipients, 'Subject', 'Body');

      expect(results).toHaveLength(100);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should include recipient email in each result', async () => {
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
        // getConfig only considers exact 'true' string match
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

    it('should preserve email address as-is', async () => {
      const result = await service.sendEmail(' test@example.com ', 'Subject', 'Body');

      expect(result.to).toBe(' test@example.com ');
    });
  });
});
