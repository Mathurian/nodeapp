/**
 * EmailDigestService Unit Tests
 * Aligned with tenant-aware digest dispatch and current EmailService contract.
 */

import 'reflect-metadata';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { EmailDigestService } from '../../../src/services/EmailDigestService';
import { NotificationRepository } from '../../../src/repositories/NotificationRepository';
import { NotificationPreferenceRepository } from '../../../src/repositories/NotificationPreferenceRepository';
import { EmailService } from '../../../src/services/EmailService';
import prisma from '../../../src/config/database';

jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: jest.fn(),
    },
    notificationDigest: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../../src/utils/prismaRlsContext', () => ({
  withTenantDbRlsContext: jest.fn(async (db: unknown, _context: unknown, operation: (tx: unknown) => unknown) =>
    operation(db)
  ),
}));

describe('EmailDigestService', () => {
  let service: EmailDigestService;
  let mockNotificationRepo: DeepMockProxy<NotificationRepository>;
  let mockEmailService: DeepMockProxy<EmailService>;
  let getUsersForDigestSpy: jest.SpyInstance;

  const mockedPrisma = prisma as unknown as {
    user: { findFirst: jest.Mock };
    notificationDigest: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const now = new Date('2026-02-25T12:00:00.000Z');

  const buildNotification = (
    overrides: Partial<{
      id: string;
      userId: string;
      tenantId: string;
      type: string;
      title: string;
      message: string;
      link?: string;
      read: boolean;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    }> = {}
  ) => ({
    id: 'notif-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    type: 'INFO',
    title: 'Test Notification 1',
    message: 'Test message 1',
    link: '/test/1',
    read: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  });

  const buildUser = (
    overrides: Partial<{ id: string; email: string | null; name: string | null }> = {}
  ) => ({
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  });

  const buildDigestPreference = (
    overrides: Partial<{ userId: string; tenantId: string; emailDigestFrequency: string; emailEnabled: boolean }> = {}
  ) => ({
    userId: 'user-1',
    tenantId: 'tenant-1',
    emailEnabled: true,
    emailDigestFrequency: 'daily',
    ...overrides,
  });

  const buildEmailSendResult = (
    overrides: Partial<{ success: boolean; to: string; subject: string; messageId?: string }> = {}
  ) => ({
    success: true,
    to: 'test@example.com',
    subject: 'Your daily notification digest',
    messageId: 'message-1',
    ...overrides,
  });

  const getSendEmailCall = () => {
    const call = mockEmailService.sendEmail.mock.calls[0];
    expect(call).toBeDefined();
    const [to, subject, text, options] = call!;
    return {
      to,
      subject,
      text: text as string,
      options: options as { html?: string; tenantId?: string; userId?: string },
    };
  };

  beforeEach(() => {
    mockNotificationRepo = mockDeep<NotificationRepository>();
    mockEmailService = mockDeep<EmailService>();

    service = new EmailDigestService(mockNotificationRepo, mockEmailService);
    getUsersForDigestSpy = jest.spyOn(
      NotificationPreferenceRepository.prototype,
      'getUsersForDigest'
    );

    mockedPrisma.user.findFirst.mockReset();
    mockedPrisma.notificationDigest.findFirst.mockReset();
    mockedPrisma.notificationDigest.create.mockReset();
    mockedPrisma.notificationDigest.update.mockReset();
    mockedPrisma.notificationDigest.findMany.mockReset();

    mockedPrisma.user.findFirst.mockResolvedValue(buildUser());
    mockedPrisma.notificationDigest.findFirst.mockResolvedValue(null);
    mockedPrisma.notificationDigest.create.mockResolvedValue({});
    mockedPrisma.notificationDigest.update.mockResolvedValue({});
    mockedPrisma.notificationDigest.findMany.mockResolvedValue([]);
    mockEmailService.sendEmail.mockResolvedValue(buildEmailSendResult() as any);

    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockNotificationRepo);
    mockReset(mockEmailService);
    getUsersForDigestSpy.mockRestore();
  });

  describe('sendDailyDigests', () => {
    it('should send daily digests to users', async () => {
      getUsersForDigestSpy.mockResolvedValue([
        buildDigestPreference({ userId: 'user-1', tenantId: 'tenant-1', emailDigestFrequency: 'daily' }),
        buildDigestPreference({ userId: 'user-2', tenantId: 'tenant-2', emailDigestFrequency: 'daily' }),
      ] as any);
      mockNotificationRepo.findByUser.mockResolvedValue([buildNotification()] as any);

      const result = await service.sendDailyDigests();

      expect(getUsersForDigestSpy).toHaveBeenCalledWith('daily');
      expect(mockNotificationRepo.findByUser).toHaveBeenNthCalledWith(1, {
        userId: 'user-1',
        tenantId: 'tenant-1',
        read: false,
        limit: 100,
      });
      expect(mockNotificationRepo.findByUser).toHaveBeenNthCalledWith(2, {
        userId: 'user-2',
        tenantId: 'tenant-2',
        read: false,
        limit: 100,
      });
      expect(result).toBe(2);
    });

    it('should handle per-user errors gracefully', async () => {
      getUsersForDigestSpy.mockResolvedValue([
        buildDigestPreference({ userId: 'user-1', tenantId: 'tenant-1' }),
      ] as any);
      mockNotificationRepo.findByUser.mockRejectedValue(new Error('Database error'));

      const result = await service.sendDailyDigests();

      expect(result).toBe(0);
    });
  });

  describe('sendWeeklyDigests', () => {
    it('should send weekly digests to users', async () => {
      getUsersForDigestSpy.mockResolvedValue([
        buildDigestPreference({ userId: 'user-1', tenantId: 'tenant-1', emailDigestFrequency: 'weekly' }),
      ] as any);
      mockNotificationRepo.findByUser.mockResolvedValue([buildNotification()] as any);

      const result = await service.sendWeeklyDigests();

      expect(getUsersForDigestSpy).toHaveBeenCalledWith('weekly');
      expect(result).toBe(1);
    });
  });

  describe('sendDigestToUser', () => {
    it('should send digest email to a user with recent notifications', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([
        buildNotification(),
        buildNotification({
          id: 'notif-2',
          type: 'SUCCESS',
          title: 'Test Notification 2',
          message: 'Test message 2',
          link: '/test/2',
        }),
      ] as any);

      const result = await service.sendDigestToUser('user-1', 'daily', 'tenant-1');
      const emailCall = getSendEmailCall();

      expect(mockNotificationRepo.findByUser).toHaveBeenCalledWith({
        userId: 'user-1',
        tenantId: 'tenant-1',
        read: false,
        limit: 100,
      });
      expect(mockedPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-1', tenantId: 'tenant-1' },
        select: { email: true, name: true },
      });
      expect(emailCall.to).toBe('test@example.com');
      expect(emailCall.subject).toBe('Your daily notification digest');
      expect(emailCall.text).toContain('Hi Test User');
      expect(emailCall.options).toEqual(
        expect.objectContaining({
          html: expect.stringContaining('Test User'),
          tenantId: 'tenant-1',
          userId: 'user-1',
        })
      );
      expect(result).toBe(true);
    });

    it('should not send email if there are no notifications in range', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([
        buildNotification({
          createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        }),
      ] as any);

      const result = await service.sendDigestToUser('user-1', 'weekly', 'tenant-1');

      expect(result).toBe(false);
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should not send email if user is not found', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([buildNotification()] as any);
      mockedPrisma.user.findFirst.mockResolvedValue(null);

      const result = await service.sendDigestToUser('user-1', 'daily', 'tenant-1');

      expect(result).toBe(false);
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should not send email if user has no email address', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([buildNotification()] as any);
      mockedPrisma.user.findFirst.mockResolvedValue(buildUser({ email: null }));

      const result = await service.sendDigestToUser('user-1', 'daily', 'tenant-1');

      expect(result).toBe(false);
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should generate correct HTML for different notification types', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([
        buildNotification({ type: 'INFO' }),
        buildNotification({
          id: 'notif-2',
          type: 'SUCCESS',
          title: 'Success Notification',
        }),
      ] as any);

      await service.sendDigestToUser('user-1', 'daily', 'tenant-1');

      const emailCall = getSendEmailCall();
      expect(emailCall.options.html).toContain('INFO');
      expect(emailCall.options.html).toContain('SUCCESS');
      expect(emailCall.options.html).toContain('Test Notification 1');
      expect(emailCall.options.html).toContain('Success Notification');
    });
  });

  describe('getDueDigests', () => {
    it('should return digests that are due', async () => {
      mockedPrisma.notificationDigest.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          frequency: 'daily',
          tenantId: 'tenant-1',
          nextSendAt: new Date(now.getTime() - 60 * 60 * 1000),
        },
        {
          userId: 'user-2',
          frequency: 'weekly',
          tenantId: 'tenant-2',
          nextSendAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      ]);

      const result = await service.getDueDigests();

      expect(result).toEqual([
        { userId: 'user-1', frequency: 'daily', tenantId: 'tenant-1' },
        { userId: 'user-2', frequency: 'weekly', tenantId: 'tenant-2' },
      ]);
      expect(mockedPrisma.notificationDigest.findMany).toHaveBeenCalledWith({
        where: {
          nextSendAt: {
            lte: expect.any(Date),
          },
        },
      });
    });

    it('should return an empty array if no digests are due', async () => {
      mockedPrisma.notificationDigest.findMany.mockResolvedValue([]);

      const result = await service.getDueDigests();

      expect(result).toEqual([]);
    });
  });

  describe('time range calculations', () => {
    it('should filter hourly digests to only recent notifications', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([
        buildNotification({ title: 'Recent Hourly', createdAt: new Date(Date.now() - 30 * 60 * 1000) }),
        buildNotification({
          id: 'notif-old',
          title: 'Old Hourly',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        }),
      ] as any);

      await service.sendDigestToUser('user-1', 'hourly', 'tenant-1');

      const emailCall = getSendEmailCall();
      expect(emailCall.options.html).toContain('Recent Hourly');
      expect(emailCall.options.html).not.toContain('Old Hourly');
    });

    it('should filter daily digests to only recent notifications', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([
        buildNotification({ title: 'Recent Daily', createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) }),
        buildNotification({
          id: 'notif-old',
          title: 'Old Daily',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        }),
      ] as any);

      await service.sendDigestToUser('user-1', 'daily', 'tenant-1');

      const emailCall = getSendEmailCall();
      expect(emailCall.options.html).toContain('Recent Daily');
      expect(emailCall.options.html).not.toContain('Old Daily');
    });

    it('should filter weekly digests to only recent notifications', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([
        buildNotification({ title: 'Recent Weekly', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }),
        buildNotification({
          id: 'notif-old',
          title: 'Old Weekly',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        }),
      ] as any);

      await service.sendDigestToUser('user-1', 'weekly', 'tenant-1');

      const emailCall = getSendEmailCall();
      expect(emailCall.options.html).toContain('Recent Weekly');
      expect(emailCall.options.html).not.toContain('Old Weekly');
    });
  });

  describe('notification grouping', () => {
    it('should group notifications by type', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([
        buildNotification({ type: 'INFO', title: 'Info One' }),
        buildNotification({ id: 'notif-2', type: 'INFO', title: 'Info Two' }),
        buildNotification({ id: 'notif-3', type: 'SUCCESS', title: 'Success' }),
      ] as any);

      await service.sendDigestToUser('user-1', 'daily', 'tenant-1');

      const emailCall = getSendEmailCall();
      const html = emailCall.options.html ?? '';

      expect(html).toContain('badge-info');
      expect(html).toContain('badge-success');
      expect(html).toContain('2 notifications');
      expect(html).toContain('1 notification');
    });
  });

  describe('HTML generation', () => {
    it('should generate valid HTML with the user name', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([
        buildNotification(),
        buildNotification({ id: 'notif-2', title: 'Another Notification' }),
      ] as any);

      await service.sendDigestToUser('user-1', 'daily', 'tenant-1');

      const emailCall = getSendEmailCall();
      expect(emailCall.options.html).toContain('Test User');
      expect(emailCall.options.html).toContain('<!DOCTYPE html>');
      expect(emailCall.options.html).toContain('</html>');
    });

    it('should include notification count in the header', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([
        buildNotification(),
        buildNotification({ id: 'notif-2', title: 'Another Notification' }),
      ] as any);

      await service.sendDigestToUser('user-1', 'daily', 'tenant-1');

      const emailCall = getSendEmailCall();
      expect(emailCall.options.html).toContain('2 new notifications');
    });

    it('should include links to notifications and preferences', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([buildNotification()] as any);

      await service.sendDigestToUser('user-1', 'daily', 'tenant-1');

      const emailCall = getSendEmailCall();
      expect(emailCall.options.html).toContain('/notifications');
      expect(emailCall.options.html).toContain('View All Notifications');
      expect(emailCall.options.html).toContain('/settings/notifications');
    });
  });

  describe('digest record updates', () => {
    it('should create a digest record after first send', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([buildNotification()] as any);
      mockedPrisma.notificationDigest.findFirst.mockResolvedValue(null);

      await service.sendDigestToUser('user-1', 'daily', 'tenant-1');

      expect(mockedPrisma.notificationDigest.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          frequency: 'daily',
          lastSentAt: expect.any(Date),
          nextSendAt: expect.any(Date),
        },
      });
    });

    it('should update an existing digest record after send', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([buildNotification()] as any);
      mockedPrisma.notificationDigest.findFirst.mockResolvedValue({
        id: 'digest-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        frequency: 'daily',
      });

      await service.sendDigestToUser('user-1', 'daily', 'tenant-1');

      expect(mockedPrisma.notificationDigest.update).toHaveBeenCalledWith({
        where: { id: 'digest-1' },
        data: {
          lastSentAt: expect.any(Date),
          nextSendAt: expect.any(Date),
        },
      });
    });
  });
});
