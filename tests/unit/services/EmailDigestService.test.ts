/**
 * EmailDigestService Unit Tests
 * Comprehensive tests for email digest functionality
 */

import 'reflect-metadata';
import { EmailDigestService } from '../../../src/services/EmailDigestService';
import { NotificationRepository } from '../../../src/repositories/NotificationRepository';
import { NotificationPreferenceRepository } from '../../../src/repositories/NotificationPreferenceRepository';
import { EmailService } from '../../../src/services/EmailService';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import prisma from '../../../src/config/database';

// Mock prisma
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn()
    },
    notificationDigest: {
      upsert: jest.fn(),
      findMany: jest.fn()
    }
  }
}));

describe('EmailDigestService', () => {
  let service: EmailDigestService;
  let mockNotificationRepo: DeepMockProxy<NotificationRepository>;
  let mockPreferenceRepo: DeepMockProxy<NotificationPreferenceRepository>;
  let mockEmailService: DeepMockProxy<EmailService>;

  const mockNotifications = [
    {
      id: 'notif-1',
      userId: 'user-1',
      type: 'INFO',
      title: 'Test Notification 1',
      message: 'Test message 1',
      link: '/test/1',
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'notif-2',
      userId: 'user-1',
      type: 'SUCCESS',
      title: 'Test Notification 2',
      message: 'Test message 2',
      link: '/test/2',
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User'
  };

  beforeEach(() => {
    mockNotificationRepo = mockDeep<NotificationRepository>();
    mockPreferenceRepo = mockDeep<NotificationPreferenceRepository>();
    mockEmailService = mockDeep<EmailService>();

    service = new EmailDigestService(
      mockNotificationRepo,
      mockPreferenceRepo,
      mockEmailService
    );

    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockNotificationRepo);
    mockReset(mockPreferenceRepo);
    mockReset(mockEmailService);
  });

  describe('sendDailyDigests', () => {
    it('should send daily digests to users', async () => {
      const preferences = [
        { userId: 'user-1', frequency: 'daily', emailDigest: true },
        { userId: 'user-2', frequency: 'daily', emailDigest: true }
      ];

      mockPreferenceRepo.getUsersForDigest.mockResolvedValue(preferences as any);
      mockNotificationRepo.findByUser.mockResolvedValue(mockNotifications as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockEmailService.sendEmail.mockResolvedValue(undefined);
      (prisma.notificationDigest.upsert as jest.Mock).mockResolvedValue({});

      const result = await service.sendDailyDigests();

      expect(mockPreferenceRepo.getUsersForDigest).toHaveBeenCalledWith('daily');
      expect(result).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      const preferences = [
        { userId: 'user-1', frequency: 'daily', emailDigest: true }
      ];

      mockPreferenceRepo.getUsersForDigest.mockResolvedValue(preferences as any);
      mockNotificationRepo.findByUser.mockRejectedValue(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.sendDailyDigests();

      expect(result).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('sendWeeklyDigests', () => {
    it('should send weekly digests to users', async () => {
      const preferences = [
        { userId: 'user-1', frequency: 'weekly', emailDigest: true }
      ];

      mockPreferenceRepo.getUsersForDigest.mockResolvedValue(preferences as any);
      mockNotificationRepo.findByUser.mockResolvedValue(mockNotifications as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockEmailService.sendEmail.mockResolvedValue(undefined);
      (prisma.notificationDigest.upsert as jest.Mock).mockResolvedValue({});

      const result = await service.sendWeeklyDigests();

      expect(mockPreferenceRepo.getUsersForDigest).toHaveBeenCalledWith('weekly');
      expect(result).toBe(1);
    });
  });

  describe('sendDigestToUser', () => {
    it('should send digest email to user with notifications', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue(mockNotifications as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockEmailService.sendEmail.mockResolvedValue(undefined);
      (prisma.notificationDigest.upsert as jest.Mock).mockResolvedValue({});

      const result = await service.sendDigestToUser('user-1', 'daily');

      expect(mockNotificationRepo.findByUser).toHaveBeenCalledWith({
        userId: 'user-1',
        read: false,
        since: expect.any(Date),
        limit: 100
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { email: true, name: true }
      });

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Your daily notification digest',
        html: expect.stringContaining('Test User')
      });

      expect(result).toBe(true);
    });

    it('should not send email if no notifications', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([]);

      const result = await service.sendDigestToUser('user-1', 'daily');

      expect(result).toBe(false);
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should not send email if user not found', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue(mockNotifications as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.sendDigestToUser('user-1', 'daily');

      expect(result).toBe(false);
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should not send email if user has no email', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue(mockNotifications as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: null,
        name: 'Test User'
      });

      const result = await service.sendDigestToUser('user-1', 'daily');

      expect(result).toBe(false);
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should generate correct HTML for different notification types', async () => {
      const mixedNotifications = [
        { ...mockNotifications[0], type: 'INFO' },
        { ...mockNotifications[1], type: 'SUCCESS' }
      ];

      mockNotificationRepo.findByUser.mockResolvedValue(mixedNotifications as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockEmailService.sendEmail.mockResolvedValue(undefined);
      (prisma.notificationDigest.upsert as jest.Mock).mockResolvedValue({});

      await service.sendDigestToUser('user-1', 'daily');

      const emailCall = mockEmailService.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('INFO');
      expect(emailCall.html).toContain('SUCCESS');
      expect(emailCall.html).toContain('Test Notification 1');
      expect(emailCall.html).toContain('Test Notification 2');
    });
  });

  describe('getDueDigests', () => {
    it('should return digests that are due', async () => {
      const dueDigests = [
        {
          userId: 'user-1',
          frequency: 'daily',
          lastSentAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
          nextSendAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
        },
        {
          userId: 'user-2',
          frequency: 'weekly',
          lastSentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          nextSendAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ];

      (prisma.notificationDigest.findMany as jest.Mock).mockResolvedValue(dueDigests);

      const result = await service.getDueDigests();

      expect(result).toEqual([
        { userId: 'user-1', frequency: 'daily' },
        { userId: 'user-2', frequency: 'weekly' }
      ]);

      expect(prisma.notificationDigest.findMany).toHaveBeenCalledWith({
        where: {
          nextSendAt: {
            lte: expect.any(Date)
          }
        }
      });
    });

    it('should return empty array if no digests due', async () => {
      (prisma.notificationDigest.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getDueDigests();

      expect(result).toEqual([]);
    });
  });

  describe('time range calculations', () => {
    it('should calculate correct time range for hourly digest', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([]);

      await service.sendDigestToUser('user-1', 'hourly');

      const callArgs = mockNotificationRepo.findByUser.mock.calls[0][0];
      const since = callArgs.since as Date;
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

      expect(since.getTime()).toBeGreaterThanOrEqual(hourAgo.getTime() - 1000);
      expect(since.getTime()).toBeLessThanOrEqual(hourAgo.getTime() + 1000);
    });

    it('should calculate correct time range for daily digest', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([]);

      await service.sendDigestToUser('user-1', 'daily');

      const callArgs = mockNotificationRepo.findByUser.mock.calls[0][0];
      const since = callArgs.since as Date;
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      expect(since.getTime()).toBeGreaterThanOrEqual(dayAgo.getTime() - 1000);
      expect(since.getTime()).toBeLessThanOrEqual(dayAgo.getTime() + 1000);
    });

    it('should calculate correct time range for weekly digest', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue([]);

      await service.sendDigestToUser('user-1', 'weekly');

      const callArgs = mockNotificationRepo.findByUser.mock.calls[0][0];
      const since = callArgs.since as Date;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      expect(since.getTime()).toBeGreaterThanOrEqual(weekAgo.getTime() - 1000);
      expect(since.getTime()).toBeLessThanOrEqual(weekAgo.getTime() + 1000);
    });
  });

  describe('notification grouping', () => {
    it('should group notifications by type', async () => {
      const mixedNotifications = [
        { ...mockNotifications[0], type: 'INFO' },
        { ...mockNotifications[1], type: 'INFO' },
        { id: 'notif-3', type: 'SUCCESS', title: 'Success', message: 'msg', createdAt: new Date() }
      ];

      mockNotificationRepo.findByUser.mockResolvedValue(mixedNotifications as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockEmailService.sendEmail.mockResolvedValue(undefined);
      (prisma.notificationDigest.upsert as jest.Mock).mockResolvedValue({});

      await service.sendDigestToUser('user-1', 'daily');

      const emailCall = mockEmailService.sendEmail.mock.calls[0][0];
      const html = emailCall.html;

      // Should have separate sections for INFO and SUCCESS
      expect(html).toContain('badge-info');
      expect(html).toContain('badge-success');
      expect(html).toContain('2 notification'); // INFO group
      expect(html).toContain('1 notification'); // SUCCESS group
    });
  });

  describe('HTML generation', () => {
    it('should generate valid HTML with user name', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue(mockNotifications as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockEmailService.sendEmail.mockResolvedValue(undefined);
      (prisma.notificationDigest.upsert as jest.Mock).mockResolvedValue({});

      await service.sendDigestToUser('user-1', 'daily');

      const emailCall = mockEmailService.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('Test User');
      expect(emailCall.html).toContain('<!DOCTYPE html>');
      expect(emailCall.html).toContain('</html>');
    });

    it('should include notification count in header', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue(mockNotifications as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockEmailService.sendEmail.mockResolvedValue(undefined);
      (prisma.notificationDigest.upsert as jest.Mock).mockResolvedValue({});

      await service.sendDigestToUser('user-1', 'daily');

      const emailCall = mockEmailService.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('2 new notifications');
    });

    it('should include link to view all notifications', async () => {
      process.env.FRONTEND_URL = 'https://example.com';

      mockNotificationRepo.findByUser.mockResolvedValue(mockNotifications as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockEmailService.sendEmail.mockResolvedValue(undefined);
      (prisma.notificationDigest.upsert as jest.Mock).mockResolvedValue({});

      await service.sendDigestToUser('user-1', 'daily');

      const emailCall = mockEmailService.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('https://example.com/notifications');
      expect(emailCall.html).toContain('View All Notifications');
    });
  });

  describe('digest record updates', () => {
    it('should update digest record after sending', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue(mockNotifications as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockEmailService.sendEmail.mockResolvedValue(undefined);
      (prisma.notificationDigest.upsert as jest.Mock).mockResolvedValue({});

      await service.sendDigestToUser('user-1', 'daily');

      expect(prisma.notificationDigest.upsert).toHaveBeenCalledWith({
        where: {
          userId_frequency: {
            userId: 'user-1',
            frequency: 'daily'
          }
        },
        create: {
          userId: 'user-1',
          frequency: 'daily',
          lastSentAt: expect.any(Date),
          nextSendAt: expect.any(Date)
        },
        update: {
          lastSentAt: expect.any(Date),
          nextSendAt: expect.any(Date)
        }
      });
    });
  });
});
