/**
 * UsersController Unit Tests
 * Comprehensive test coverage for user management controller
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { UsersController } from '../../../src/controllers/usersController';
import { UserService } from '../../../src/services/UserService';
import { AssignmentService } from '../../../src/services/AssignmentService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

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

// Mock cache
jest.mock('../../../src/utils/cache', () => ({
  userCache: {
    invalidate: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Mock response helpers - capture calls for verification
const mockSendSuccess = jest.fn((res, data) => res.status(200).json({ success: true, data }));
const mockSendCreated = jest.fn((res, data) => res.status(201).json({ success: true, data }));
const mockSendNoContent = jest.fn((res) => res.status(204).send());
const mockSendNotFound = jest.fn((res, message) => res.status(404).json({ success: false, message }));
const mockSendBadRequest = jest.fn((res, message) => res.status(400).json({ success: false, message }));
const mockSendError = jest.fn((res, message, statusCode = 500) => res.status(statusCode || 500).json({ success: false, message }));

jest.mock('../../../src/utils/responseHelpers', () => ({
  sendSuccess: (...args: any[]) => mockSendSuccess(...args),
  sendCreated: (...args: any[]) => mockSendCreated(...args),
  sendNoContent: (...args: any[]) => mockSendNoContent(...args),
  sendNotFound: (...args: any[]) => mockSendNotFound(...args),
  sendBadRequest: (...args: any[]) => mockSendBadRequest(...args),
  sendError: (...args: any[]) => mockSendError(...args),
}));

describe('UsersController', () => {
  let controller: UsersController;
  let mockUserService: DeepMockProxy<UserService>;
  let mockAssignmentService: DeepMockProxy<AssignmentService>;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Clear all mocks including response helpers FIRST
    jest.clearAllMocks();
    mockSendSuccess.mockClear();
    mockSendCreated.mockClear();
    mockSendNoContent.mockClear();
    mockSendNotFound.mockClear();
    mockSendBadRequest.mockClear();
    mockSendError.mockClear();

    mockUserService = mockDeep<UserService>();
    mockAssignmentService = mockDeep<AssignmentService>();
    mockPrisma = mockDeep<PrismaClient>();

    // Mock container.resolve to return our mock services
    const { container } = require('tsyringe');
    container.resolve.mockImplementation((token: any) => {
      if (token === UserService) return mockUserService;
      if (token === AssignmentService) return mockAssignmentService;
      if (token === 'PrismaClient') return mockPrisma;
      return null;
    });

    controller = new UsersController();

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 'admin-1', role: 'ADMIN' },
      ip: '127.0.0.1',
      file: undefined,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    mockReset(mockUserService);
    mockReset(mockAssignmentService);
    mockReset(mockPrisma);
  });

  describe('GET /api/users - getAllUsers', () => {
    it('should return all users successfully', async () => {
      const mockUsers = [
        { id: 'user-1', name: 'User 1', email: 'user1@test.com', role: 'ADMIN' },
        { id: 'user-2', name: 'User 2', email: 'user2@test.com', role: 'JUDGE' },
      ];

      mockUserService.getAllUsersWithRelations.mockResolvedValue(mockUsers as any);

      await controller.getAllUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.getAllUsersWithRelations).toHaveBeenCalled();
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, { data: mockUsers });
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockUserService.getAllUsersWithRelations.mockRejectedValue(error);

      await controller.getAllUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/users/:id - getUserById', () => {
    it('should return user by ID successfully', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      mockReq.params = { id: 'user-1' };
      mockUserService.getUserByIdWithRelations.mockResolvedValue(mockUser as any);

      await controller.getUserById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.getUserByIdWithRelations).toHaveBeenCalledWith('user-1');
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, { data: mockUser });
    });

    it('should return 404 if user not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockUserService.getUserByIdWithRelations.mockResolvedValue(null);

      await controller.getUserById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendNotFound).toHaveBeenCalledWith(mockRes, 'User not found');
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'user-1' };
      mockUserService.getUserByIdWithRelations.mockRejectedValue(error);

      await controller.getUserById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('POST /api/users - createUser', () => {
    const validUserData = {
      name: 'New User',
      email: 'newuser@test.com',
      password: 'Password123!',
      role: 'ADMIN',
    };

    it('should create user successfully', async () => {
      mockReq.body = validUserData;
      // First call to findUnique (email existence check) should return null
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockUserService.createUser.mockResolvedValue({ id: 'user-1', ...validUserData } as any);
      // Any subsequent findUnique calls return the created user
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', ...validUserData } as any);
      mockPrisma.judge.create.mockResolvedValue({ id: 'judge-1' } as any);

      await controller.createUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.createUser).toHaveBeenCalled();
      expect(mockSendCreated).toHaveBeenCalledWith(mockRes, expect.any(Object));
    });

    it('should return 400 if required fields are missing', async () => {
      mockReq.body = { name: 'Test' }; // Missing email, password, role

      await controller.createUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, expect.stringContaining('required'), 400);
    });

    it('should return 400 if email format is invalid', async () => {
      mockReq.body = {
        ...validUserData,
        email: 'invalid-email',
      };

      await controller.createUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'Invalid email format', 400);
    });

    it('should return 400 if role is invalid', async () => {
      mockReq.body = {
        ...validUserData,
        role: 'INVALID_ROLE',
      };

      await controller.createUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'Invalid role', 400);
    });

    it('should return 400 if email already exists', async () => {
      mockReq.body = validUserData;
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' } as any);

      await controller.createUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'User with this email already exists', 400);
    });

    it('should create user with JUDGE role and linked judge record', async () => {
      const judgeData = {
        ...validUserData,
        role: 'JUDGE',
        bio: 'Experienced judge',
        isHeadJudge: true,
      };

      mockReq.body = judgeData;
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockUserService.createUser.mockResolvedValue({ id: 'user-1' } as any);
      mockPrisma.judge.create.mockResolvedValue({ id: 'judge-1' } as any);
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1', judgeId: 'judge-1' } as any);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        judgeId: 'judge-1',
        judge: { id: 'judge-1' },
      } as any);

      await controller.createUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.judge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: judgeData.name,
            email: judgeData.email,
            isHeadJudge: true,
          }),
        })
      );
      expect(mockSendCreated).toHaveBeenCalledWith(mockRes, expect.any(Object));
    });

    it('should create user with CONTESTANT role and linked contestant record', async () => {
      const contestantData = {
        ...validUserData,
        role: 'CONTESTANT',
        contestantNumber: 101,
        bio: 'Great student',
      };

      mockReq.body = contestantData;
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockUserService.createUser.mockResolvedValue({ id: 'user-1' } as any);
      mockPrisma.contestant.create.mockResolvedValue({ id: 'contestant-1' } as any);
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1', contestantId: 'contestant-1' } as any);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        contestantId: 'contestant-1',
        contestant: { id: 'contestant-1' },
      } as any);

      await controller.createUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.contestant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: contestantData.name,
            email: contestantData.email,
            contestantNumber: 101,
          }),
        })
      );
      expect(mockSendCreated).toHaveBeenCalledWith(mockRes, expect.any(Object));
    });

    it('should handle P2002 (unique constraint) error', async () => {
      mockReq.body = validUserData;
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      const error: any = new Error('Unique constraint failed');
      error.code = 'P2002';
      mockUserService.createUser.mockRejectedValue(error);

      await controller.createUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'User with this email already exists', 400);
    });

    it('should handle other errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.body = validUserData;
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockUserService.createUser.mockRejectedValue(error);

      await controller.createUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('PUT /api/users/:id - updateUser', () => {
    const updateData = {
      name: 'Updated Name',
      phone: '555-1234',
    };

    it('should update user successfully', async () => {
      const currentUser = {
        id: 'user-1',
        name: 'Old Name',
        role: 'ADMIN',
        judgeId: null,
        contestantId: null,
      };

      const updatedUser = {
        ...currentUser,
        ...updateData,
      };

      mockReq.params = { id: 'user-1' };
      mockReq.body = updateData;
      mockPrisma.user.findUnique.mockResolvedValue(currentUser as any);
      mockPrisma.user.update.mockResolvedValue(updatedUser as any);

      await controller.updateUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
        })
      );
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, expect.any(Object));
    });

    it('should return 404 if user not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockReq.body = updateData;
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await controller.updateUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendNotFound).toHaveBeenCalledWith(mockRes, 'User not found');
    });

    it('should update role-specific fields for JUDGE', async () => {
      const currentUser = {
        id: 'user-1',
        role: 'JUDGE',
        judgeId: 'judge-1',
      };

      mockReq.params = { id: 'user-1' };
      mockReq.body = {
        bio: 'Updated bio',
        judgeLevel: 'EXPERT',
        role: 'JUDGE', // Required for role-specific field logic
      };

      mockPrisma.user.findUnique.mockResolvedValue(currentUser as any);
      mockPrisma.user.update.mockResolvedValue(currentUser as any);

      await controller.updateUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bio: 'Updated bio',
            judgeBio: 'Updated bio',
            judgeCertifications: 'EXPERT',
          }),
        })
      );
    });

    it('should update role-specific fields for CONTESTANT', async () => {
      const currentUser = {
        id: 'user-1',
        role: 'CONTESTANT',
        contestantId: 'contestant-1',
      };

      mockReq.params = { id: 'user-1' };
      mockReq.body = {
        bio: 'Updated bio',
        contestantNumber: 102,
        age: 16,
        role: 'CONTESTANT', // Required for role-specific field logic
      };

      mockPrisma.user.findUnique.mockResolvedValue(currentUser as any);
      mockPrisma.user.update.mockResolvedValue(currentUser as any);

      await controller.updateUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bio: 'Updated bio',
            contestantBio: 'Updated bio',
            contestantNumber: 102,
            contestantAge: 16,
          }),
        })
      );
    });

    it('should update judge isHeadJudge status when provided', async () => {
      const currentUser = {
        id: 'user-1',
        role: 'JUDGE',
        judgeId: 'judge-1',
      };

      mockReq.params = { id: 'user-1' };
      mockReq.body = { isHeadJudge: true };

      mockPrisma.user.findUnique.mockResolvedValue(currentUser as any);
      mockPrisma.user.update.mockResolvedValue(currentUser as any);
      mockPrisma.judge.update.mockResolvedValue({ id: 'judge-1', isHeadJudge: true } as any);

      await controller.updateUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.judge.update).toHaveBeenCalledWith({
        where: { id: 'judge-1' },
        data: { isHeadJudge: true },
      });
    });

    it('should invalidate user cache after update', async () => {
      const { userCache } = require('../../../src/utils/cache');
      const currentUser = { id: 'user-1', role: 'ADMIN' };

      mockReq.params = { id: 'user-1' };
      mockReq.body = updateData;
      mockPrisma.user.findUnique.mockResolvedValue(currentUser as any);
      mockPrisma.user.update.mockResolvedValue(currentUser as any);

      await controller.updateUser(mockReq as Request, mockRes as Response, mockNext);

      expect(userCache.invalidate).toHaveBeenCalledWith('user-1');
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'user-1' };
      mockReq.body = updateData;
      mockPrisma.user.findUnique.mockRejectedValue(error);

      await controller.updateUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('DELETE /api/users/:id - deleteUser', () => {
    it('should delete user successfully', async () => {
      const userToDelete = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
      };

      mockReq.params = { id: 'user-1' };
      mockPrisma.user.findUnique.mockResolvedValue(userToDelete as any);
      mockUserService.deleteUser.mockResolvedValue(undefined);

      await controller.deleteUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.deleteUser).toHaveBeenCalledWith('user-1');
      expect(mockSendNoContent).toHaveBeenCalledWith(mockRes);
    });

    it('should return 404 if user not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await controller.deleteUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendNotFound).toHaveBeenCalledWith(mockRes, 'User not found');
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'user-1' };
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' } as any);
      mockUserService.deleteUser.mockRejectedValue(error);

      await controller.deleteUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('PUT /api/users/:id/password - resetPassword', () => {
    it('should reset password successfully', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.body = { newPassword: 'NewPassword123!' };
      mockUserService.resetUserPassword.mockResolvedValue(undefined);

      await controller.resetPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.resetUserPassword).toHaveBeenCalledWith('user-1', 'NewPassword123!');
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, null, 'Password reset successfully');
    });

    it('should return 400 if newPassword is missing', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.body = {};

      await controller.resetPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'New password is required', 400);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'user-1' };
      mockReq.body = { newPassword: 'NewPassword123!' };
      mockUserService.resetUserPassword.mockRejectedValue(error);

      await controller.resetPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/users/role/:role - getUsersByRole', () => {
    it('should return users by role successfully', async () => {
      const mockUsers = [
        { id: 'user-1', role: 'JUDGE', name: 'Judge 1' },
        { id: 'user-2', role: 'JUDGE', name: 'Judge 2' },
      ];

      mockReq.params = { role: 'JUDGE' };
      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);

      await controller.getUsersByRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'JUDGE' },
        })
      );
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, expect.any(Object));
    });

    it('should return 400 for invalid role', async () => {
      mockReq.params = { role: 'INVALID_ROLE' };

      await controller.getUsersByRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'Invalid role', 400);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { role: 'JUDGE' };
      mockPrisma.user.findMany.mockRejectedValue(error);

      await controller.getUsersByRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('PATCH /api/users/:id/last-login - updateLastLogin', () => {
    it('should update last login successfully', async () => {
      const updatedUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        lastLoginAt: new Date(),
      };

      mockReq.params = { id: 'user-1' };
      mockUserService.updateLastLogin.mockResolvedValue(updatedUser as any);

      await controller.updateLastLogin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.updateLastLogin).toHaveBeenCalledWith('user-1');
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, expect.any(Object));
    });

    it('should return 404 if user not found (P2025 error)', async () => {
      const error: any = new Error('Record not found');
      error.code = 'P2025';

      mockReq.params = { id: 'nonexistent' };
      mockUserService.updateLastLogin.mockRejectedValue(error);

      await controller.updateLastLogin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendNotFound).toHaveBeenCalledWith(mockRes, 'User not found');
    });

    it('should handle other errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'user-1' };
      mockUserService.updateLastLogin.mockRejectedValue(error);

      await controller.updateLastLogin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('POST /api/users/bulk-remove - bulkRemoveUsers', () => {
    it('should bulk remove users successfully', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      mockReq.body = { userIds };
      mockUserService.bulkDeleteUsers.mockResolvedValue({ deletedCount: 3 } as any);

      await controller.bulkRemoveUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.bulkDeleteUsers).toHaveBeenCalledWith(userIds);
      expect(mockSendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          deletedCount: 3,
        })
      );
    });

    it('should return 400 if userIds is missing', async () => {
      mockReq.body = {};

      await controller.bulkRemoveUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'User IDs array is required', 400);
    });

    it('should return 400 if userIds is not an array', async () => {
      mockReq.body = { userIds: 'not-an-array' };

      await controller.bulkRemoveUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'User IDs array is required', 400);
    });

    it('should return 400 if userIds is empty array', async () => {
      mockReq.body = { userIds: [] };

      await controller.bulkRemoveUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'User IDs array is required', 400);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.body = { userIds: ['user-1'] };
      mockUserService.bulkDeleteUsers.mockRejectedValue(error);

      await controller.bulkRemoveUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('DELETE /api/users/role/:role - removeAllUsersByRole', () => {
    it('should remove all users by role successfully', async () => {
      mockReq.params = { role: 'CONTESTANT' };
      mockUserService.deleteUsersByRole.mockResolvedValue({ deletedCount: 5 } as any);

      await controller.removeAllUsersByRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.deleteUsersByRole).toHaveBeenCalledWith('CONTESTANT');
      expect(mockSendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          deletedCount: 5,
        })
      );
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { role: 'JUDGE' };
      mockUserService.deleteUsersByRole.mockRejectedValue(error);

      await controller.removeAllUsersByRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/users/stats - getUserStats', () => {
    it('should return user statistics successfully', async () => {
      const mockStats = {
        totalUsers: 100,
        activeUsers: 85,
        byRole: {
          ADMIN: 5,
          JUDGE: 20,
          CONTESTANT: 60,
          ORGANIZER: 10,
          EMCEE: 5,
        },
      };

      mockUserService.getAggregateUserStats.mockResolvedValue(mockStats as any);

      await controller.getUserStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.getAggregateUserStats).toHaveBeenCalled();
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, expect.any(Object));
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockUserService.getAggregateUserStats.mockRejectedValue(error);

      await controller.getUserStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('POST /api/users/:id/image - uploadUserImage', () => {
    it('should upload user image successfully', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };

      mockReq.params = { id: 'user-1' };
      mockReq.user = { id: 'user-1', role: 'ADMIN' };
      mockReq.file = mockFile as any;

      const updatedUser = {
        id: 'user-1',
        imagePath: '/uploads/users/test-image.jpg',
      };

      mockUserService.updateUserImage.mockResolvedValue(updatedUser as any);

      await controller.uploadUserImage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.updateUserImage).toHaveBeenCalledWith(
        'user-1',
        '/uploads/users/test-image.jpg'
      );
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, expect.any(Object));
    });

    it('should return 403 if user lacks permission to upload for others', async () => {
      mockReq.params = { id: 'user-2' };
      mockReq.user = { id: 'user-1', role: 'JUDGE' }; // Not ADMIN/ORGANIZER/BOARD
      mockReq.file = { filename: 'test.jpg', mimetype: 'image/jpeg' } as any;

      await controller.uploadUserImage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'You do not have permission to upload images for this user', 403);
    });

    it('should allow user to upload their own image', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.user = { id: 'user-1', role: 'CONTESTANT' };
      mockReq.file = { filename: 'test.jpg', mimetype: 'image/jpeg', size: 1024 } as any;

      mockUserService.updateUserImage.mockResolvedValue({ id: 'user-1' } as any);

      await controller.uploadUserImage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, expect.any(Object));
    });

    it('should return 400 if no file provided', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.user = { id: 'user-1', role: 'ADMIN' };
      mockReq.file = undefined;

      await controller.uploadUserImage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'No image file provided', 400);
    });

    it('should return 400 if file type is invalid', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.user = { id: 'user-1', role: 'ADMIN' };
      mockReq.file = { filename: 'test.pdf', mimetype: 'application/pdf' } as any;

      await controller.uploadUserImage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'Invalid file type. Only JPEG, PNG, and GIF are allowed.', 400);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Upload error');
      mockReq.params = { id: 'user-1' };
      mockReq.user = { id: 'user-1', role: 'ADMIN' };
      mockReq.file = { filename: 'test.jpg', mimetype: 'image/jpeg' } as any;
      mockUserService.updateUserImage.mockRejectedValue(error);

      await controller.uploadUserImage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('PATCH /api/users/:id/role-fields - updateUserRoleFields', () => {
    it('should update JUDGE role-specific fields successfully', async () => {
      const currentUser = {
        id: 'user-1',
        role: 'JUDGE',
        judgeId: 'judge-1',
      };

      const roleFieldsData = {
        judgeBio: 'Updated judge bio',
        judgeCertifications: 'EXPERT',
        isHeadJudge: true,
      };

      mockReq.params = { id: 'user-1' };
      mockReq.body = roleFieldsData;
      mockPrisma.user.findUnique.mockResolvedValue(currentUser as any);
      mockPrisma.judge.update.mockResolvedValue({ id: 'judge-1' } as any);
      mockPrisma.user.update.mockResolvedValue({ ...currentUser, ...roleFieldsData } as any);

      await controller.updateUserRoleFields(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.judge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'judge-1' },
          data: expect.objectContaining({ isHeadJudge: true }),
        })
      );
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, expect.any(Object), 'Role-specific fields updated successfully');
    });

    it('should update CONTESTANT role-specific fields successfully', async () => {
      const currentUser = {
        id: 'user-1',
        role: 'CONTESTANT',
        contestantId: 'contestant-1',
      };

      const roleFieldsData = {
        contestantBio: 'Updated contestant bio',
        contestantNumber: 105,
        contestantAge: 17,
      };

      mockReq.params = { id: 'user-1' };
      mockReq.body = roleFieldsData;
      mockPrisma.user.findUnique.mockResolvedValue(currentUser as any);
      mockPrisma.contestant.update.mockResolvedValue({ id: 'contestant-1' } as any);
      mockPrisma.user.update.mockResolvedValue({ ...currentUser, ...roleFieldsData } as any);

      await controller.updateUserRoleFields(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.contestant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contestant-1' },
          data: expect.objectContaining({ contestantNumber: 105 }),
        })
      );
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, expect.any(Object), 'Role-specific fields updated successfully');
    });

    it('should return 400 if user ID is missing', async () => {
      mockReq.params = {};
      mockReq.body = { judgeBio: 'test' };

      await controller.updateUserRoleFields(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'User ID is required', 400);
    });

    it('should return 404 if user not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockReq.body = { judgeBio: 'test' };
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await controller.updateUserRoleFields(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendNotFound).toHaveBeenCalledWith(mockRes, 'User not found');
    });

    it('should return success with no changes if no role fields provided', async () => {
      const currentUser = { id: 'user-1', role: 'ADMIN' };
      mockReq.params = { id: 'user-1' };
      mockReq.body = {};
      mockPrisma.user.findUnique.mockResolvedValue(currentUser as any);

      await controller.updateUserRoleFields(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, expect.any(Object), 'No changes to update');
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'user-1' };
      mockReq.body = { judgeBio: 'test' };
      mockPrisma.user.findUnique.mockRejectedValue(error);

      await controller.updateUserRoleFields(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('POST /api/users/:id/bio-file - uploadUserBioFile', () => {
    it('should upload bio file successfully', async () => {
      const mockFile = {
        filename: 'bio.pdf',
        mimetype: 'application/pdf',
        size: 2048,
      };

      const currentUser = {
        id: 'user-1',
        role: 'JUDGE',
        judgeId: 'judge-1',
      };

      mockReq.params = { id: 'user-1' };
      mockReq.user = { id: 'user-1', role: 'JUDGE' };
      mockReq.file = mockFile as any;

      mockPrisma.user.findUnique.mockResolvedValue(currentUser as any);
      mockPrisma.user.update.mockResolvedValue(currentUser as any);

      await controller.uploadUserBioFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            bio: expect.stringContaining('/uploads/bios/'),
          }),
        })
      );
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, expect.any(Object));
    });

    it('should return 400 if user ID is missing', async () => {
      mockReq.params = {};
      mockReq.file = { filename: 'bio.pdf', mimetype: 'application/pdf' } as any;

      await controller.uploadUserBioFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'User ID is required', 400);
    });

    it('should return 403 if user lacks permission', async () => {
      mockReq.params = { id: 'user-2' };
      mockReq.user = { id: 'user-1', role: 'CONTESTANT' };
      mockReq.file = { filename: 'bio.pdf', mimetype: 'application/pdf' } as any;

      await controller.uploadUserBioFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'You do not have permission to upload bio files for this user', 403);
    });

    it('should return 400 if no file provided', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.user = { id: 'user-1', role: 'ADMIN' };
      mockReq.file = undefined;

      await controller.uploadUserBioFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'No file provided', 400);
    });

    it('should return 400 if file type is invalid', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.user = { id: 'user-1', role: 'ADMIN' };
      mockReq.file = { filename: 'bio.jpg', mimetype: 'image/jpeg' } as any;

      await controller.uploadUserBioFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'Invalid file type. Only TXT, PDF, and DOCX files are allowed.', 400);
    });

    it('should return 404 if user not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockReq.user = { id: 'admin-1', role: 'ADMIN' };
      mockReq.file = { filename: 'bio.pdf', mimetype: 'application/pdf' } as any;

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await controller.uploadUserBioFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendNotFound).toHaveBeenCalledWith(mockRes, 'User not found');
    });
  });

  describe('POST /api/users/bulk-upload - bulkUploadUsers', () => {
    it('should process bulk upload successfully', async () => {
      const csvContent = `name,email,password,role
John Doe,john@test.com,Pass123!,ADMIN
Jane Smith,jane@test.com,Pass456!,JUDGE`;

      mockReq.file = {
        buffer: Buffer.from(csvContent),
        originalname: 'users.csv',
        size: csvContent.length,
      } as any;

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockUserService.createUser.mockResolvedValue({ id: 'user-1' } as any);

      await controller.bulkUploadUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          success: expect.any(Number),
          failed: expect.any(Number),
        }),
        expect.stringContaining('Bulk upload completed')
      );
    });

    it('should return 400 if no file provided', async () => {
      mockReq.file = undefined;

      await controller.bulkUploadUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'No file provided', 400);
    });

    it('should return 400 if CSV is empty', async () => {
      mockReq.file = {
        buffer: Buffer.from(''),
        originalname: 'empty.csv',
      } as any;

      await controller.bulkUploadUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 'CSV file must contain at least a header row and one data row', 400);
    });

    it('should return 400 if required headers are missing', async () => {
      const csvContent = `name,email
John Doe,john@test.com`;

      mockReq.file = {
        buffer: Buffer.from(csvContent),
        originalname: 'invalid.csv',
      } as any;

      await controller.bulkUploadUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, expect.stringContaining('Missing required headers'), 400);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Processing error');
      const csvContent = `name,email,password,role
John Doe,john@test.com,Pass123!,ADMIN`;

      mockReq.file = {
        buffer: Buffer.from(csvContent),
        originalname: 'users.csv',
      } as any;

      // Simulate fatal error during CSV parsing that escapes row-level error handling
      // Mock a method that's called outside the row processing loop
      const originalToString = Buffer.prototype.toString;
      Buffer.prototype.toString = function() {
        if (this === mockReq.file.buffer) {
          throw error;
        }
        return originalToString.call(this);
      };

      await controller.bulkUploadUsers(mockReq as Request, mockRes as Response, mockNext);

      // Restore the original toString
      Buffer.prototype.toString = originalToString;

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('POST /api/users/bulk-delete - bulkDeleteUsers', () => {
    it('should bulk delete users successfully', async () => {
      const userIds = ['user-1', 'user-2'];
      mockReq.body = { userIds, forceDeleteAdmin: false };
      mockUserService.bulkDeleteUsers.mockResolvedValue({ deletedCount: 2 } as any);

      await controller.bulkDeleteUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.bulkDeleteUsers).toHaveBeenCalledWith(userIds, false);
      expect(mockSendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ deletedCount: 2 }),
        expect.stringContaining('Successfully deleted')
      );
    });

    it('should bulk delete users with forceDeleteAdmin flag', async () => {
      const userIds = ['admin-1', 'user-1'];
      mockReq.body = { userIds, forceDeleteAdmin: true };
      mockUserService.bulkDeleteUsers.mockResolvedValue({ deletedCount: 2 } as any);

      await controller.bulkDeleteUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.bulkDeleteUsers).toHaveBeenCalledWith(userIds, true);
    });

    it('should return 400 if userIds is missing', async () => {
      mockReq.body = {};

      await controller.bulkDeleteUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendBadRequest).toHaveBeenCalledWith(mockRes, 'User IDs array is required');
    });

    it('should return 400 if userIds is not an array', async () => {
      mockReq.body = { userIds: 'not-an-array' };

      await controller.bulkDeleteUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendBadRequest).toHaveBeenCalledWith(mockRes, 'User IDs array is required');
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Delete error');
      mockReq.body = { userIds: ['user-1'] };
      mockUserService.bulkDeleteUsers.mockRejectedValue(error);

      await controller.bulkDeleteUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/users/bulk-upload-template - getBulkUploadTemplate', () => {
    it('should generate CSV template successfully', async () => {
      await controller.getBulkUploadTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment')
      );
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('name,email,password,role'));
    });

    it('should include all required headers in template', async () => {
      await controller.getBulkUploadTemplate(mockReq as Request, mockRes as Response, mockNext);

      const csvContent = (mockRes.send as jest.Mock).mock.calls[0][0];
      expect(csvContent).toContain('name');
      expect(csvContent).toContain('email');
      expect(csvContent).toContain('password');
      expect(csvContent).toContain('role');
      expect(csvContent).toContain('judgeNumber');
      expect(csvContent).toContain('contestantNumber');
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Template generation error');
      mockRes.setHeader = jest.fn().mockImplementation(() => {
        throw error;
      });

      await controller.getBulkUploadTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('POST /api/users/import-csv - importUsersFromCSV', () => {
    it('should delegate to bulkUploadUsers', async () => {
      const csvContent = 'name,email,password,role\nTest,test@test.com,Pass123!,ADMIN';
      mockReq.file = {
        buffer: Buffer.from(csvContent),
        originalname: 'users.csv',
      } as any;

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockUserService.createUser.mockResolvedValue({ id: 'user-1' } as any);

      await controller.importUsersFromCSV(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.any(Object),
        expect.stringContaining('Bulk upload completed')
      );
    });
  });

  describe('GET /api/users/csv-template - getCSVTemplate', () => {
    it('should delegate to getBulkUploadTemplate', async () => {
      await controller.getCSVTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    });
  });
});
