/**
 * Authentication Middleware Tests
 * Tests for JWT authentication and session management
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import {
  generateToken,
  generateExpiredToken,
  generateInvalidToken,
  mockResponse,
  mockNext,
  createMockRequest,
} from '../../helpers/authHelpers';
import { createMockUser } from '../../helpers/mockData';
import prisma from '../../../src/utils/prisma';
import { userCache } from '../../../src/utils/cache';

// Mock dependencies
jest.mock('../../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../../src/utils/cache', () => ({
  userCache: {
    getById: jest.fn(),
    setById: jest.fn(),
    invalidate: jest.fn(),
  },
}));

// Import after mocks
import authenticateToken from '../../../src/middleware/auth';

describe('Authentication Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    req = createMockRequest();
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
  });

  describe('Token Validation', () => {
    it('should reject requests without authorization header', async () => {
      await authenticateToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests with malformed authorization header', async () => {
      req.headers = { authorization: 'InvalidFormat' };

      await authenticateToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid tokens', async () => {
      const invalidToken = generateInvalidToken();
      req.headers = { authorization: `Bearer ${invalidToken}` };

      await authenticateToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired tokens', async () => {
      const expiredToken = generateExpiredToken('user-123', UserRole.ADMIN);
      req.headers = { authorization: `Bearer ${expiredToken}` };

      await authenticateToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid tokens', async () => {
      const userId = 'user-123';
      const token = generateToken(userId, UserRole.ADMIN);
      const mockUser = createMockUser({ id: userId, role: UserRole.ADMIN });

      req.headers = { authorization: `Bearer ${token}` };
      (userCache.getById as jest.Mock).mockReturnValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(mockUser);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('User Lookup', () => {
    it('should use cached user when available', async () => {
      const userId = 'user-123';
      const token = generateToken(userId, UserRole.ADMIN);
      const mockUser = createMockUser({ id: userId });

      req.headers = { authorization: `Bearer ${token}` };
      (userCache.getById as jest.Mock).mockReturnValue(mockUser);

      await authenticateToken(req as Request, res as Response, next);

      expect(userCache.getById).toHaveBeenCalledWith(userId);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(mockUser);
    });

    it('should fetch from database on cache miss', async () => {
      const userId = 'user-123';
      const token = generateToken(userId, UserRole.ADMIN);
      const mockUser = createMockUser({ id: userId });

      req.headers = { authorization: `Bearer ${token}` };
      (userCache.getById as jest.Mock).mockReturnValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(req as Request, res as Response, next);

      expect(userCache.getById).toHaveBeenCalledWith(userId);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          judge: true,
          contestant: true,
        },
      });
      expect(userCache.setById).toHaveBeenCalledWith(userId, mockUser, 3600);
      expect(next).toHaveBeenCalled();
    });

    it('should reject if user not found in database', async () => {
      const userId = 'nonexistent-user';
      const token = generateToken(userId, UserRole.ADMIN);

      req.headers = { authorization: `Bearer ${token}` };
      (userCache.getById as jest.Mock).mockReturnValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authenticateToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Session Version Validation', () => {
    it('should reject tokens with mismatched session version', async () => {
      const userId = 'user-123';
      const token = generateToken(userId, UserRole.ADMIN, 1);
      const mockUser = createMockUser({
        id: userId,
        sessionVersion: 2, // Different from token
      });

      req.headers = { authorization: `Bearer ${token}` };
      (userCache.getById as jest.Mock).mockReturnValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(req as Request, res as Response, next);

      expect(userCache.invalidate).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Session expired',
        message: 'Your session has been invalidated. Please log in again.',
        code: 'SESSION_VERSION_MISMATCH',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept tokens with matching session version', async () => {
      const userId = 'user-123';
      const token = generateToken(userId, UserRole.ADMIN, 2);
      const mockUser = createMockUser({
        id: userId,
        sessionVersion: 2,
      });

      req.headers = { authorization: `Bearer ${token}` };
      (userCache.getById as jest.Mock).mockReturnValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(mockUser);
    });

    it('should handle missing session version in token (default to 1)', async () => {
      const userId = 'user-123';
      const secret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
      // Create token without sessionVersion
      const token = jwt.sign({ userId, role: UserRole.ADMIN }, secret);

      const mockUser = createMockUser({
        id: userId,
        sessionVersion: 1,
      });

      req.headers = { authorization: `Bearer ${token}` };
      (userCache.getById as jest.Mock).mockReturnValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Role-Based Authentication', () => {
    const roles: UserRole[] = [
      UserRole.ADMIN,
      UserRole.JUDGE,
      UserRole.CONTESTANT,
      UserRole.EMCEE,
      UserRole.TALLY_MASTER,
      UserRole.AUDITOR,
    ];

    roles.forEach((role) => {
      it(`should authenticate ${role} users`, async () => {
        const userId = 'user-123';
        const token = generateToken(userId, role);
        const mockUser = createMockUser({ id: userId, role });

        req.headers = { authorization: `Bearer ${token}` };
        (userCache.getById as jest.Mock).mockReturnValue(null);
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        await authenticateToken(req as Request, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual(mockUser);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const userId = 'user-123';
      const token = generateToken(userId, UserRole.ADMIN);

      req.headers = { authorization: `Bearer ${token}` };
      (userCache.getById as jest.Mock).mockReturnValue(null);
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await authenticateToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle JWT verification errors', async () => {
      req.headers = { authorization: 'Bearer corrupted-token' };

      await authenticateToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Cache Behavior', () => {
    it('should invalidate cache on session version mismatch', async () => {
      const userId = 'user-123';
      const token = generateToken(userId, UserRole.ADMIN, 1);
      const mockUser = createMockUser({
        id: userId,
        sessionVersion: 2,
      });

      req.headers = { authorization: `Bearer ${token}` };
      (userCache.getById as jest.Mock).mockReturnValue(mockUser);

      await authenticateToken(req as Request, res as Response, next);

      expect(userCache.invalidate).toHaveBeenCalledWith(userId);
    });

    it('should cache user after successful database lookup', async () => {
      const userId = 'user-123';
      const token = generateToken(userId, UserRole.ADMIN);
      const mockUser = createMockUser({ id: userId });

      req.headers = { authorization: `Bearer ${token}` };
      (userCache.getById as jest.Mock).mockReturnValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(req as Request, res as Response, next);

      expect(userCache.setById).toHaveBeenCalledWith(userId, mockUser, 3600);
    });
  });
});
