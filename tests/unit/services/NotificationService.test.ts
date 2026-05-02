import 'reflect-metadata';

import { beforeEach, describe, expect, it } from '@jest/globals';
import { Notification } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { Server as SocketIOServer } from 'socket.io';
import { NotificationRepository } from '../../../src/repositories/NotificationRepository';
import { NotificationService } from '../../../src/services/NotificationService';
import { PushNotificationService } from '../../../src/services/PushNotificationService';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepository: DeepMockProxy<NotificationRepository>;
  let mockPushNotificationService: DeepMockProxy<PushNotificationService>;
  let mockIo: DeepMockProxy<SocketIOServer>;

  const BASE_TIME = new Date('2026-02-25T12:00:00.000Z');
  const TEST_TENANT_ID = 'tenant-1';
  const TEST_USER_ID = 'user-1';

  const buildNotification = (overrides: Partial<Notification> = {}): Notification => ({
    id: 'notif-1',
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    type: 'SUCCESS',
    title: 'Test Notification',
    message: 'This is a test notification',
    link: '/dashboard',
    read: false,
    readAt: null,
    metadata: null,
    sentBy: null,
    deletedAt: null,
    emailSent: false,
    emailSentAt: null,
    pushSent: false,
    pushSentAt: null,
    templateId: null,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = mockDeep<NotificationRepository>();
    mockPushNotificationService = mockDeep<PushNotificationService>();
    mockIo = mockDeep<SocketIOServer>();

    service = new NotificationService(mockRepository, mockPushNotificationService);
    mockPushNotificationService.dispatchToUsers.mockResolvedValue({
      enabled: true,
      totalUsers: 1,
      eligibleUsers: 1,
      subscriptionsAttempted: 1,
      deliveredEndpoints: 1,
      deliveredUsers: [TEST_USER_ID],
      invalidatedEndpoints: 0,
      failedEndpoints: 0,
    });
  });

  afterEach(() => {
    mockReset(mockRepository);
    mockReset(mockPushNotificationService);
    mockReset(mockIo);
  });

  describe('setSocketIO', () => {
    it('stores the socket server instance', () => {
      service.setSocketIO(mockIo);
      expect((service as any).io).toBe(mockIo);
    });
  });

  describe('createNotification', () => {
    it('creates the notification, emits websocket, and marks push delivery', async () => {
      const notification = buildNotification();
      mockRepository.create.mockResolvedValue(notification);
      mockRepository.markPushSentByIds.mockResolvedValue(1);
      mockIo.to.mockReturnValue(mockIo as any);
      service.setSocketIO(mockIo);

      const result = await service.createNotification({
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        type: 'SUCCESS',
        title: 'Test',
        message: 'Message',
        link: '/dashboard',
      });

      expect(result).toEqual(notification);
      expect(mockRepository.create).toHaveBeenCalledWith({
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        type: 'SUCCESS',
        title: 'Test',
        message: 'Message',
        link: '/dashboard',
      });
      expect(mockIo.to).toHaveBeenCalledWith(`user:${TEST_USER_ID}`);
      expect(mockIo.emit).toHaveBeenCalledWith('notification:new', notification);
      expect(mockPushNotificationService.dispatchToUsers).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        [TEST_USER_ID],
        {
          title: notification.title,
          message: notification.message,
          link: notification.link,
          notificationId: notification.id,
          type: notification.type,
        }
      );
      expect(mockRepository.markPushSentByIds).toHaveBeenCalledWith([notification.id]);
    });

    it('does not mark push delivery when the user was not delivered', async () => {
      mockRepository.create.mockResolvedValue(buildNotification());
      mockPushNotificationService.dispatchToUsers.mockResolvedValue({
        enabled: true,
        totalUsers: 1,
        eligibleUsers: 1,
        subscriptionsAttempted: 1,
        deliveredEndpoints: 0,
        deliveredUsers: [],
        invalidatedEndpoints: 0,
        failedEndpoints: 1,
      });

      await service.createNotification({
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        type: 'INFO',
        title: 'Test',
        message: 'Message',
      });

      expect(mockRepository.markPushSentByIds).not.toHaveBeenCalled();
    });

    it('swallows push dispatch errors', async () => {
      const notification = buildNotification();
      mockRepository.create.mockResolvedValue(notification);
      mockPushNotificationService.dispatchToUsers.mockRejectedValue(new Error('Push unavailable'));

      await expect(
        service.createNotification({
          tenantId: TEST_TENANT_ID,
          userId: TEST_USER_ID,
          type: 'INFO',
          title: 'Test',
          message: 'Message',
        })
      ).resolves.toEqual(notification);
    });
  });

  describe('broadcastNotification', () => {
    it('creates notifications for each user and emits websocket updates', async () => {
      const notifications = [
        buildNotification({ id: 'notif-1', userId: 'user-1' }),
        buildNotification({ id: 'notif-2', userId: 'user-2' }),
      ];
      mockRepository.createManyAndReturn.mockResolvedValue(notifications);
      mockRepository.markPushSentByIds.mockResolvedValue(2);
      mockIo.to.mockReturnValue(mockIo as any);
      service.setSocketIO(mockIo);

      const count = await service.broadcastNotification(['user-1', 'user-2'], {
        tenantId: TEST_TENANT_ID,
        type: 'SYSTEM',
        title: 'Maintenance',
        message: 'System maintenance scheduled',
        link: '/notifications',
      });

      expect(count).toBe(2);
      expect(mockRepository.createManyAndReturn).toHaveBeenCalledWith(['user-1', 'user-2'], {
        tenantId: TEST_TENANT_ID,
        type: 'SYSTEM',
        title: 'Maintenance',
        message: 'System maintenance scheduled',
        link: '/notifications',
      });
      expect(mockIo.to).toHaveBeenCalledTimes(2);
      expect(mockPushNotificationService.dispatchToUsers).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        ['user-1', 'user-2'],
        {
          title: 'Maintenance',
          message: 'System maintenance scheduled',
          link: '/notifications',
          type: 'SYSTEM',
        }
      );
      expect(mockRepository.markPushSentByIds).toHaveBeenCalledWith(['notif-1']);
    });
  });

  describe('read and delete operations', () => {
    it('gets user notifications with defaults', async () => {
      const notifications = [buildNotification()];
      mockRepository.findByUser.mockResolvedValue(notifications);

      const result = await service.getUserNotifications(TEST_USER_ID, TEST_TENANT_ID);

      expect(result).toEqual(notifications);
      expect(mockRepository.findByUser).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        limit: 50,
        offset: 0,
      });
    });

    it('marks a notification as read and emits websocket update', async () => {
      const notification = buildNotification({ read: true, readAt: BASE_TIME });
      mockRepository.markAsRead.mockResolvedValue(notification);
      mockIo.to.mockReturnValue(mockIo as any);
      service.setSocketIO(mockIo);

      const result = await service.markAsRead('notif-1', TEST_USER_ID, TEST_TENANT_ID);

      expect(result.read).toBe(true);
      expect(mockRepository.markAsRead).toHaveBeenCalledWith(
        'notif-1',
        TEST_USER_ID,
        TEST_TENANT_ID
      );
      expect(mockIo.emit).toHaveBeenCalledWith('notification:read', { id: 'notif-1' });
    });

    it('marks all notifications as read', async () => {
      mockRepository.markAllAsRead.mockResolvedValue(3);
      mockIo.to.mockReturnValue(mockIo as any);
      service.setSocketIO(mockIo);

      const count = await service.markAllAsRead(TEST_USER_ID, TEST_TENANT_ID);

      expect(count).toBe(3);
      expect(mockRepository.markAllAsRead).toHaveBeenCalledWith(TEST_USER_ID, TEST_TENANT_ID);
      expect(mockIo.emit).toHaveBeenCalledWith('notification:read-all');
    });

    it('soft deletes, restores, and permanently deletes notifications', async () => {
      const deleted = buildNotification({ deletedAt: BASE_TIME });
      mockRepository.delete.mockResolvedValue(deleted);
      mockRepository.restore.mockResolvedValue(buildNotification());
      mockIo.to.mockReturnValue(mockIo as any);
      service.setSocketIO(mockIo);

      await expect(
        service.deleteNotification('notif-1', TEST_USER_ID, TEST_TENANT_ID)
      ).resolves.toEqual(deleted);
      await expect(
        service.restoreNotification('notif-1', TEST_USER_ID, TEST_TENANT_ID)
      ).resolves.toEqual(expect.objectContaining({ id: 'notif-1' }));
      await expect(
        service.permanentlyDeleteNotification('notif-1', TEST_USER_ID, TEST_TENANT_ID)
      ).resolves.toBeUndefined();

      expect(mockRepository.permanentlyDelete).toHaveBeenCalledWith(
        'notif-1',
        TEST_USER_ID,
        TEST_TENANT_ID
      );
      expect(mockIo.emit).toHaveBeenCalledWith('notification:permanently-deleted', {
        id: 'notif-1',
      });
    });
  });

  describe('notification helpers', () => {
    it('creates report-ready notifications with the encoded report link', async () => {
      const notification = buildNotification({ link: '/reports?reportId=report%20123' });
      mockRepository.create.mockResolvedValue(notification);

      await service.notifyReportReady(TEST_TENANT_ID, TEST_USER_ID, 'Annual Report', 'report 123');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          userId: TEST_USER_ID,
          type: 'SUCCESS',
          title: 'Report Ready',
          link: '/reports?reportId=report%20123',
        })
      );
    });

    it('broadcasts system maintenance notifications', async () => {
      mockRepository.createManyAndReturn.mockResolvedValue([
        buildNotification({ id: 'notif-1', userId: 'user-1', type: 'SYSTEM' }),
      ]);

      const count = await service.notifySystemMaintenance(TEST_TENANT_ID, 'Window tonight', [
        'user-1',
      ]);

      expect(count).toBe(1);
      expect(mockRepository.createManyAndReturn).toHaveBeenCalledWith(['user-1'], {
        tenantId: TEST_TENANT_ID,
        type: 'SYSTEM',
        title: 'System Maintenance',
        message: 'Window tonight',
        link: '/notifications',
      });
    });
  });
});
