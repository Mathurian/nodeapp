/**
 * NotificationService Unit Tests
 * Comprehensive tests for notification service
 */

import 'reflect-metadata';
import { NotificationService } from '../../../src/services/NotificationService';
import { NotificationRepository } from '../../../src/repositories/NotificationRepository';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { Server as SocketIOServer } from 'socket.io';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepository: DeepMockProxy<NotificationRepository>;
  let mockIo: DeepMockProxy<SocketIOServer>;

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'SUCCESS' as const,
    title: 'Test Notification',
    message: 'This is a test notification',
    link: '/dashboard',
    read: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = mockDeep<NotificationRepository>();
    mockIo = mockDeep<SocketIOServer>();
    service = new NotificationService(mockRepository as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockRepository);
    mockReset(mockIo);
  });

  describe('setSocketIO', () => {
    it('should set Socket.IO instance', () => {
      service.setSocketIO(mockIo as any);
      expect(service['io']).toBe(mockIo);
    });
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      mockRepository.create.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        userId: 'user-1',
        type: 'SUCCESS',
        title: 'Test',
        message: 'Message',
      });

      expect(result).toEqual(mockNotification);
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'SUCCESS',
        title: 'Test',
        message: 'Message',
      });
    });

    it('should emit real-time notification when socket is set', async () => {
      service.setSocketIO(mockIo as any);
      mockRepository.create.mockResolvedValue(mockNotification);
      mockIo.to.mockReturnValue(mockIo as any);

      await service.createNotification({
        userId: 'user-1',
        type: 'INFO',
        title: 'Test',
        message: 'Message',
      });

      expect(mockIo.to).toHaveBeenCalledWith('user:user-1');
      expect(mockIo.emit).toHaveBeenCalledWith('notification:new', mockNotification);
    });

    it('should not emit when socket is not set', async () => {
      mockRepository.create.mockResolvedValue(mockNotification);

      await service.createNotification({
        userId: 'user-1',
        type: 'INFO',
        title: 'Test',
        message: 'Message',
      });

      expect(mockIo.to).not.toHaveBeenCalled();
    });

    it('should create notification with optional link', async () => {
      const withLink = { ...mockNotification, link: '/custom-link' };
      mockRepository.create.mockResolvedValue(withLink);

      const result = await service.createNotification({
        userId: 'user-1',
        type: 'INFO',
        title: 'Test',
        message: 'Message',
        link: '/custom-link',
      });

      expect(result.link).toBe('/custom-link');
    });
  });

  describe('broadcastNotification', () => {
    it('should broadcast notification to multiple users', async () => {
      service.setSocketIO(mockIo as any);
      mockRepository.createMany.mockResolvedValue(3);
      mockIo.to.mockReturnValue(mockIo as any);

      const count = await service.broadcastNotification(['user-1', 'user-2', 'user-3'], {
        type: 'SYSTEM',
        title: 'Maintenance',
        message: 'System maintenance scheduled',
      });

      expect(count).toBe(3);
      expect(mockRepository.createMany).toHaveBeenCalledWith(['user-1', 'user-2', 'user-3'], {
        type: 'SYSTEM',
        title: 'Maintenance',
        message: 'System maintenance scheduled',
      });
      expect(mockIo.to).toHaveBeenCalledTimes(3);
    });

    it('should broadcast to empty user list', async () => {
      mockRepository.createMany.mockResolvedValue(0);

      const count = await service.broadcastNotification([], {
        type: 'INFO',
        title: 'Test',
        message: 'Message',
      });

      expect(count).toBe(0);
    });

    it('should broadcast without socket', async () => {
      mockRepository.createMany.mockResolvedValue(2);

      const count = await service.broadcastNotification(['user-1', 'user-2'], {
        type: 'INFO',
        title: 'Test',
        message: 'Message',
      });

      expect(count).toBe(2);
      expect(mockIo.to).not.toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications with defaults', async () => {
      mockRepository.findByUser.mockResolvedValue([mockNotification]);

      const result = await service.getUserNotifications('user-1');

      expect(result).toEqual([mockNotification]);
      expect(mockRepository.findByUser).toHaveBeenCalledWith({
        userId: 'user-1',
        limit: 50,
        offset: 0,
      });
    });

    it('should get user notifications with custom limit and offset', async () => {
      mockRepository.findByUser.mockResolvedValue([mockNotification]);

      await service.getUserNotifications('user-1', 20, 10);

      expect(mockRepository.findByUser).toHaveBeenCalledWith({
        userId: 'user-1',
        limit: 20,
        offset: 10,
      });
    });

    it('should return empty array when no notifications', async () => {
      mockRepository.findByUser.mockResolvedValue([]);

      const result = await service.getUserNotifications('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread notification count', async () => {
      mockRepository.getUnreadCount.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(5);
      expect(mockRepository.getUnreadCount).toHaveBeenCalledWith('user-1');
    });

    it('should return zero when no unread notifications', async () => {
      mockRepository.getUnreadCount.mockResolvedValue(0);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      service.setSocketIO(mockIo as any);
      const readNotification = { ...mockNotification, read: true };
      mockRepository.markAsRead.mockResolvedValue(readNotification);
      mockIo.to.mockReturnValue(mockIo as any);

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result.read).toBe(true);
      expect(mockRepository.markAsRead).toHaveBeenCalledWith('notif-1', 'user-1');
      expect(mockIo.to).toHaveBeenCalledWith('user:user-1');
      expect(mockIo.emit).toHaveBeenCalledWith('notification:read', { id: 'notif-1' });
    });

    it('should mark as read without socket', async () => {
      const readNotification = { ...mockNotification, read: true };
      mockRepository.markAsRead.mockResolvedValue(readNotification);

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result.read).toBe(true);
      expect(mockIo.to).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      service.setSocketIO(mockIo as any);
      mockRepository.markAllAsRead.mockResolvedValue(5);
      mockIo.to.mockReturnValue(mockIo as any);

      const count = await service.markAllAsRead('user-1');

      expect(count).toBe(5);
      expect(mockRepository.markAllAsRead).toHaveBeenCalledWith('user-1');
      expect(mockIo.to).toHaveBeenCalledWith('user:user-1');
      expect(mockIo.emit).toHaveBeenCalledWith('notification:read-all');
    });

    it('should return zero when no notifications to mark', async () => {
      mockRepository.markAllAsRead.mockResolvedValue(0);

      const count = await service.markAllAsRead('user-1');

      expect(count).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      service.setSocketIO(mockIo as any);
      mockRepository.delete.mockResolvedValue(mockNotification);
      mockIo.to.mockReturnValue(mockIo as any);

      const result = await service.deleteNotification('notif-1', 'user-1');

      expect(result).toEqual(mockNotification);
      expect(mockRepository.delete).toHaveBeenCalledWith('notif-1', 'user-1');
      expect(mockIo.emit).toHaveBeenCalledWith('notification:deleted', { id: 'notif-1' });
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should cleanup old notifications with default days', async () => {
      mockRepository.deleteOldRead.mockResolvedValue(10);

      const count = await service.cleanupOldNotifications('user-1');

      expect(count).toBe(10);
      expect(mockRepository.deleteOldRead).toHaveBeenCalledWith('user-1', 30);
    });

    it('should cleanup with custom days', async () => {
      mockRepository.deleteOldRead.mockResolvedValue(5);

      const count = await service.cleanupOldNotifications('user-1', 60);

      expect(count).toBe(5);
      expect(mockRepository.deleteOldRead).toHaveBeenCalledWith('user-1', 60);
    });
  });

  describe('notifyScoreSubmitted', () => {
    it('should create score submitted notification', async () => {
      mockRepository.create.mockResolvedValue(mockNotification);

      const result = await service.notifyScoreSubmitted('user-1', 'John Doe', 'Dance');

      expect(result).toEqual(mockNotification);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'SUCCESS',
          title: 'Score Submitted',
          message: expect.stringContaining('John Doe'),
          message: expect.stringContaining('Dance'),
        })
      );
    });
  });

  describe('notifyContestCertified', () => {
    it('should create contest certified notification', async () => {
      mockRepository.create.mockResolvedValue(mockNotification);

      const result = await service.notifyContestCertified('user-1', 'Solo Dance');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SUCCESS',
          title: 'Contest Certified',
          message: expect.stringContaining('Solo Dance'),
        })
      );
    });
  });

  describe('notifyAssignmentChange', () => {
    it('should notify assignment assigned', async () => {
      mockRepository.create.mockResolvedValue(mockNotification);

      await service.notifyAssignmentChange('user-1', 'Dance Contest', 'assigned');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INFO',
          title: 'New Assignment',
          message: expect.stringContaining('assigned'),
        })
      );
    });

    it('should notify assignment removed', async () => {
      mockRepository.create.mockResolvedValue(mockNotification);

      await service.notifyAssignmentChange('user-1', 'Dance Contest', 'removed');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INFO',
          title: 'Assignment Removed',
          message: expect.stringContaining('removed'),
        })
      );
    });
  });

  describe('notifyReportReady', () => {
    it('should create report ready notification', async () => {
      mockRepository.create.mockResolvedValue(mockNotification);

      await service.notifyReportReady('user-1', 'Annual Report', 'report-123');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SUCCESS',
          title: 'Report Ready',
          link: '/reports/report-123',
        })
      );
    });
  });

  describe('notifyCertificationRequired', () => {
    it('should notify certification required for level 1', async () => {
      mockRepository.create.mockResolvedValue(mockNotification);

      await service.notifyCertificationRequired('user-1', 'Dance Contest', 1);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'WARNING',
          message: expect.stringContaining('Judge Review'),
        })
      );
    });

    it('should notify certification required for level 2', async () => {
      mockRepository.create.mockResolvedValue(mockNotification);

      await service.notifyCertificationRequired('user-1', 'Dance Contest', 2);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Tally Master Review'),
        })
      );
    });

    it('should notify certification required for level 3', async () => {
      mockRepository.create.mockResolvedValue(mockNotification);

      await service.notifyCertificationRequired('user-1', 'Dance Contest', 3);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Board Approval'),
        })
      );
    });
  });

  describe('notifyRoleChange', () => {
    it('should create role change notification', async () => {
      mockRepository.create.mockResolvedValue(mockNotification);

      await service.notifyRoleChange('user-1', 'ADMIN');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INFO',
          title: 'Role Updated',
          message: expect.stringContaining('ADMIN'),
        })
      );
    });
  });

  describe('notifyEventStatusChange', () => {
    it('should create event status change notification', async () => {
      mockRepository.create.mockResolvedValue(mockNotification);

      await service.notifyEventStatusChange('user-1', 'Summer Festival', 'ACTIVE');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INFO',
          title: 'Event Status Changed',
          message: expect.stringContaining('ACTIVE'),
        })
      );
    });
  });

  describe('notifySystemMaintenance', () => {
    it('should broadcast system maintenance notification', async () => {
      mockRepository.createMany.mockResolvedValue(3);

      const count = await service.notifySystemMaintenance('Maintenance at 2AM', [
        'user-1',
        'user-2',
        'user-3',
      ]);

      expect(count).toBe(3);
      expect(mockRepository.createMany).toHaveBeenCalledWith(['user-1', 'user-2', 'user-3'], {
        type: 'SYSTEM',
        title: 'System Maintenance',
        message: 'Maintenance at 2AM',
      });
    });
  });

  describe('notifyError', () => {
    it('should create error notification', async () => {
      mockRepository.create.mockResolvedValue(mockNotification);

      await service.notifyError('user-1', 'Error Title', 'Error message');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ERROR',
          title: 'Error Title',
          message: 'Error message',
        })
      );
    });
  });
});
