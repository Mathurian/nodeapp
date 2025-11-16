/**
 * NotificationsController Unit Tests
 * Comprehensive test coverage for NotificationsController endpoints
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { NotificationsController } from '../../../src/controllers/notificationsController';
import { NotificationService } from '../../../src/services/NotificationService';
import { sendSuccess } from '../../../src/utils/responseHelpers';
import { container } from 'tsyringe';

// Mock dependencies
jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/services/NotificationService');

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock sendSuccess helper
    (sendSuccess as jest.Mock).mockImplementation((res, data, message, status = 200) => {
      return res.status(status).json({ success: true, data, message });
    });

    // Create mock service
    mockNotificationService = {
      getUserNotifications: jest.fn(),
      createNotification: jest.fn(),
      deleteNotification: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
    } as any;

    // Mock container
    (container.resolve as jest.Mock) = jest.fn(() => mockNotificationService);

    controller = new NotificationsController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: 'ADMIN' },
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getAllNotifications', () => {
    it('should return all user notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          title: 'New Score',
          message: 'You received a new score',
          type: 'INFO',
          isRead: false,
          createdAt: new Date(),
        },
        {
          id: 'notif-2',
          userId: 'user-1',
          title: 'Winner Announced',
          message: 'Winners have been announced',
          type: 'SUCCESS',
          isRead: true,
          createdAt: new Date(),
        },
      ];

      mockNotificationService.getUserNotifications.mockResolvedValue(mockNotifications as any);

      await controller.getAllNotifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('user-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockNotifications);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockNotificationService.getUserNotifications.mockRejectedValue(error);

      await controller.getAllNotifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getNotificationById', () => {
    it('should return 501 not implemented', async () => {
      mockReq.params = { id: 'notif-1' };

      await controller.getNotificationById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(501);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not implemented' });
    });

    it('should call next with error if exception occurs', async () => {
      const error = new Error('Unexpected error');
      mockReq.params = { id: 'notif-1' };

      // Force an error by making status throw
      mockRes.status = jest.fn().mockImplementation(() => {
        throw error;
      });

      await controller.getNotificationById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const notificationData = {
        title: 'New Notification',
        message: 'This is a test notification',
        type: 'INFO',
      };

      const mockNotification = {
        id: 'notif-3',
        userId: 'user-1',
        ...notificationData,
        isRead: false,
        createdAt: new Date(),
      };

      mockReq.body = notificationData;
      mockNotificationService.createNotification.mockResolvedValue(mockNotification as any);

      await controller.createNotification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        ...notificationData,
        userId: 'user-1',
      });
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockNotification,
        'Notification created successfully',
        201
      );
    });

    it('should include userId from authenticated user', async () => {
      mockReq.body = {
        title: 'Test',
        message: 'Test message',
      };
      mockReq.user = { id: 'user-123', role: 'JUDGE' };

      mockNotificationService.createNotification.mockResolvedValue({
        id: 'notif-4',
        userId: 'user-123',
        title: 'Test',
        message: 'Test message',
      } as any);

      await controller.createNotification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Creation failed');
      mockReq.body = { title: 'Test', message: 'Test' };
      mockNotificationService.createNotification.mockRejectedValue(error);

      await controller.createNotification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateNotification', () => {
    it('should return 501 not implemented', async () => {
      mockReq.params = { id: 'notif-1' };
      mockReq.body = { isRead: true };

      await controller.updateNotification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(501);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not implemented' });
    });

    it('should call next with error if exception occurs', async () => {
      const error = new Error('Unexpected error');
      mockReq.params = { id: 'notif-1' };

      mockRes.status = jest.fn().mockImplementation(() => {
        throw error;
      });

      await controller.updateNotification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      mockReq.params = { id: 'notif-1' };
      mockNotificationService.deleteNotification.mockResolvedValue(undefined);

      await controller.deleteNotification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith('notif-1', 'user-1');
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should use authenticated user ID', async () => {
      mockReq.params = { id: 'notif-2' };
      mockReq.user = { id: 'user-456', role: 'CONTESTANT' };
      mockNotificationService.deleteNotification.mockResolvedValue(undefined);

      await controller.deleteNotification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith('notif-2', 'user-456');
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Delete failed');
      mockReq.params = { id: 'notif-1' };
      mockNotificationService.deleteNotification.mockRejectedValue(error);

      await controller.deleteNotification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      mockReq.params = { id: 'notif-1' };
      mockNotificationService.markAsRead.mockResolvedValue(undefined);

      await controller.markAsRead(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('notif-1', 'user-1');
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        null,
        'Notification marked as read'
      );
    });

    it('should use authenticated user ID', async () => {
      mockReq.params = { id: 'notif-3' };
      mockReq.user = { id: 'user-789', role: 'JUDGE' };
      mockNotificationService.markAsRead.mockResolvedValue(undefined);

      await controller.markAsRead(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('notif-3', 'user-789');
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Mark as read failed');
      mockReq.params = { id: 'notif-1' };
      mockNotificationService.markAsRead.mockRejectedValue(error);

      await controller.markAsRead(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue(5);

      await controller.markAllAsRead(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('user-1');
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        { count: 5 },
        'All notifications marked as read'
      );
    });

    it('should handle zero notifications', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue(0);

      await controller.markAllAsRead(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('user-1');
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        { count: 0 },
        'All notifications marked as read'
      );
    });

    it('should use authenticated user ID', async () => {
      mockReq.user = { id: 'user-999', role: 'ADMIN' };
      mockNotificationService.markAllAsRead.mockResolvedValue(3);

      await controller.markAllAsRead(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('user-999');
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Mark all as read failed');
      mockNotificationService.markAllAsRead.mockRejectedValue(error);

      await controller.markAllAsRead(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
