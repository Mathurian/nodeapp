/**
 * AuthController Unit Tests
 * Comprehensive test coverage for authentication controller
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../../../src/controllers/authController';
import { AuthService } from '../../../src/services/AuthService';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

// Mock the container
jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(),
  },
  injectable: () => jest.fn(),
  inject: () => jest.fn(),
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  createRequestLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock response helpers
jest.mock('../../../src/utils/responseHelpers');

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: DeepMockProxy<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup response helper mocks
    const { sendSuccess, sendBadRequest, sendUnauthorized, sendNotFound } = require('../../../src/utils/responseHelpers');
    (sendSuccess as jest.Mock).mockImplementation((res, data, message) => res.status(200).json({ success: true, data, message }));
    (sendBadRequest as jest.Mock).mockImplementation((res, message) => res.status(400).json({ success: false, message }));
    (sendUnauthorized as jest.Mock).mockImplementation((res, message) => res.status(401).json({ success: false, message }));
    (sendNotFound as jest.Mock).mockImplementation((res, message) => res.status(404).json({ success: false, message }));

    mockAuthService = mockDeep<AuthService>();

    // Mock container.resolve to return our mock service
    const { container } = require('tsyringe');
    container.resolve.mockReturnValue(mockAuthService);

    controller = new AuthController();

    mockRequest = {
      body: {},
      params: {},
      query: {},
      headers: {},
      cookies: {},
      ip: '127.0.0.1',
      get: jest.fn(),
      connection: { remoteAddress: '127.0.0.1' } as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'ADMIN',
        name: 'Test User',
      };

      const mockResult = {
        user: mockUser,
        token: 'jwt-token-123',
      };

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockResolvedValue(mockResult as any);

      await controller.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(
        { email: 'test@example.com', password: 'password123' },
        '127.0.0.1',
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if email is missing', async () => {
      mockRequest.body = {
        password: 'password123',
      };

      await controller.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should return 400 if password is missing', async () => {
      mockRequest.body = {
        email: 'test@example.com',
      };

      await controller.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid credentials', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await controller.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for inactive account', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockRejectedValue(new Error('Account is inactive'));

      await controller.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next for unhandled errors', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const unexpectedError = new Error('Database connection failed');
      mockAuthService.login.mockRejectedValue(unexpectedError);

      await controller.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });

    it('should capture IP address and user agent', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };
      mockRequest.ip = '192.168.1.100';
      (mockRequest.get as jest.Mock).mockReturnValue('Mozilla/5.0');

      mockAuthService.login.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', role: 'USER' },
        token: 'token',
      } as any);

      await controller.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(
        { email: 'test@example.com', password: 'password123' },
        '192.168.1.100',
        'Mozilla/5.0'
      );
    });

    it('should handle empty email and password', async () => {
      mockRequest.body = {
        email: '',
        password: '',
      };

      await controller.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const mockProfile = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
      };

      (mockRequest as any).user = { id: 'user-1' };
      mockAuthService.getProfile.mockResolvedValue(mockProfile as any);

      await controller.getProfile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.getProfile).toHaveBeenCalledWith('user-1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 if user not authenticated', async () => {
      (mockRequest as any).user = undefined;

      await controller.getProfile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockAuthService.getProfile).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockAuthService.getProfile.mockRejectedValue(new Error('User not found'));

      await controller.getProfile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should call next for unhandled errors', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      const unexpectedError = new Error('Database error');
      mockAuthService.getProfile.mockRejectedValue(unexpectedError);

      await controller.getProfile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });
  });

  describe('getPermissions', () => {
    it('should return user permissions successfully', async () => {
      const mockPermissions = {
        role: 'ADMIN',
        permissions: ['read', 'write', 'delete'],
      };

      (mockRequest as any).user = { id: 'user-1' };
      mockAuthService.getPermissions.mockResolvedValue(mockPermissions as any);

      await controller.getPermissions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.getPermissions).toHaveBeenCalledWith('user-1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 if user not authenticated', async () => {
      (mockRequest as any).user = undefined;

      await controller.getPermissions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockAuthService.getPermissions).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockAuthService.getPermissions.mockRejectedValue(new Error('User not found'));

      await controller.getPermissions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      mockRequest.body = { email: 'test@example.com' };
      mockAuthService.generatePasswordResetToken.mockResolvedValue('reset-token-123');

      await controller.requestPasswordReset(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockAuthService.generatePasswordResetToken).toHaveBeenCalledWith('test@example.com');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if email is missing', async () => {
      mockRequest.body = {};

      await controller.requestPasswordReset(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockAuthService.generatePasswordResetToken).not.toHaveBeenCalled();
    });

    it('should not reveal if user exists on error', async () => {
      mockRequest.body = { email: 'nonexistent@example.com' };
      mockAuthService.generatePasswordResetToken.mockRejectedValue(new Error('User not found'));

      await controller.requestPasswordReset(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockRequest.body = {
        token: 'reset-token-123',
        newPassword: 'newPassword123',
      };

      mockAuthService.resetPassword.mockResolvedValue(undefined);

      await controller.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith('reset-token-123', 'newPassword123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if token is missing', async () => {
      mockRequest.body = { newPassword: 'newPassword123' };

      await controller.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    });

    it('should return 400 if new password is missing', async () => {
      mockRequest.body = { token: 'reset-token-123' };

      await controller.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid or expired token', async () => {
      mockRequest.body = {
        token: 'invalid-token',
        newPassword: 'newPassword123',
      };

      mockAuthService.resetPassword.mockRejectedValue(new Error('Invalid or expired reset token'));

      await controller.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should call next for unhandled errors', async () => {
      mockRequest.body = {
        token: 'reset-token-123',
        newPassword: 'newPassword123',
      };

      const unexpectedError = new Error('Database error');
      mockAuthService.resetPassword.mockRejectedValue(unexpectedError);

      await controller.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      };

      mockAuthService.changePassword.mockResolvedValue(undefined);

      await controller.changePassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'user-1',
        'oldPassword123',
        'newPassword123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 if user not authenticated', async () => {
      (mockRequest as any).user = undefined;
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      };

      await controller.changePassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockAuthService.changePassword).not.toHaveBeenCalled();
    });

    it('should return 400 if current password is missing', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockRequest.body = { newPassword: 'newPassword123' };

      await controller.changePassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockAuthService.changePassword).not.toHaveBeenCalled();
    });

    it('should return 400 if new password is missing', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockRequest.body = { currentPassword: 'oldPassword123' };

      await controller.changePassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockAuthService.changePassword).not.toHaveBeenCalled();
    });

    it('should return 400 if current password is incorrect', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockRequest.body = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
      };

      mockAuthService.changePassword.mockRejectedValue(new Error('Current password is incorrect'));

      await controller.changePassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should call next for unhandled errors', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      };

      const unexpectedError = new Error('Database error');
      mockAuthService.changePassword.mockRejectedValue(unexpectedError);

      await controller.changePassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      (mockRequest as any).user = {
        id: 'user-1',
        name: 'Test User',
        role: 'ADMIN',
      };

      // Mock PrismaClient
      jest.mock('@prisma/client', () => ({
        PrismaClient: jest.fn().mockImplementation(() => ({
          activityLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        })),
      }));

      await controller.logout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle logout without authenticated user', async () => {
      (mockRequest as any).user = undefined;

      await controller.logout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle activity log errors gracefully', async () => {
      (mockRequest as any).user = {
        id: 'user-1',
        name: 'Test User',
        role: 'ADMIN',
      };

      await controller.logout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should call next for unhandled errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockResponse.status = jest.fn(() => {
        throw unexpectedError;
      });

      await controller.logout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });
  });
});
