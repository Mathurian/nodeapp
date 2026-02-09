/**
 * Authentication Middleware Tests
 * Tests for JWT authentication and session management
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import {
  mockResponse,
  mockNext,
  createMockRequest,
} from '../../helpers/authHelpers';
import { createMockUser } from '../../helpers/mockData';

// Mock dependencies - must mock the correct path (config/database, not utils/prisma)
const mockFindFirst = jest.fn();
const mockFindUnique = jest.fn();

jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
  },
}));

const mockGetById = jest.fn();
const mockSetById = jest.fn();
const mockInvalidate = jest.fn();

jest.mock('../../../src/utils/cache', () => ({
  userCache: {
    getById: (...args: any[]) => mockGetById(...args),
    setById: (...args: any[]) => mockSetById(...args),
    invalidate: (...args: any[]) => mockInvalidate(...args),
  },
}));

// Mock the env module
jest.mock('../../../src/config/env', () => ({
  env: {
    isProduction: jest.fn(() => false),
  },
}));

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock tenant middleware
jest.mock('../../../src/middleware/tenantMiddleware', () => ({
  createTenantPrismaClient: jest.fn(),
}));

// Import after mocks
import { authenticateToken } from '../../../src/middleware/auth';

// Helper to generate tokens with tenantId (required by the middleware)
const generateToken = (
  userId: string,
  role: UserRole = UserRole.ADMIN,
  sessionVersion: number = 1,
  tenantId: string = 'tenant-123',
  expiresIn: string = '24h'
): string => {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
  return jwt.sign(
    {
      userId,
      tenantId,
      role,
      sessionVersion,
    },
    secret,
    { expiresIn }
  );
};

const generateExpiredToken = (
  userId: string,
  role: UserRole = UserRole.ADMIN,
  tenantId: string = 'tenant-123'
): string => {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
  return jwt.sign(
    {
      userId,
      tenantId,
      role,
      sessionVersion: 1,
    },
    secret,
    { expiresIn: '-1h' }
  );
};

const generateInvalidToken = (): string => {
  return 'invalid.token.here';
};

describe('Authentication Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest();
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
  });

  describe('Token Validation', () => {
    it('should reject requests without access token cookie', async () => {
      req.cookies = {};

      await authenticateToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid tokens', async () => {
      const invalidToken = generateInvalidToken();
      req.cookies = { access_token: invalidToken };

      await authenticateToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired tokens', async () => {
      const expiredToken = generateExpiredToken('user-123', UserRole.ADMIN);
      req.cookies = { access_token: expiredToken };

      await authenticateToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid tokens', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const token = generateToken(userId, UserRole.ADMIN, 1, tenantId);
      const mockUser = createMockUser({ id: userId, role: UserRole.ADMIN, tenantId } as any);

      req.cookies = { access_token: token };
      mockGetById.mockReturnValue(null);
      mockFindFirst.mockResolvedValue(mockUser);

      await authenticateToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(mockUser);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('User Lookup', () => {
    it('should use cached user when available and validate tenantId', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const token = generateToken(userId, UserRole.ADMIN, 1, tenantId);
      const mockUser = createMockUser({ id: userId, tenantId } as any);

      req.cookies = { access_token: token };
      mockGetById.mockReturnValue(mockUser);
      // For cached users, middleware checks sessionVersion from DB
      mockFindUnique.mockResolvedValue({ sessionVersion: 1 });

      await authenticateToken(req as Request, res as Response, next);

      expect(mockGetById).toHaveBeenCalledWith(userId);
      expect(mockFindFirst).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(mockUser);
    });

    it('should fetch from database on cache miss', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const token = generateToken(userId, UserRole.ADMIN, 1, tenantId);
      const mockUser = createMockUser({ id: userId, tenantId } as any);

      req.cookies = { access_token: token };
      mockGetById.mockReturnValue(null);
      mockFindFirst.mockResolvedValue(mockUser);

      await authenticateToken(req as Request, res as Response, next);

      expect(mockGetById).toHaveBeenCalledWith(userId);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: userId, tenantId },
        include: {
          judge: true,
          contestant: true,
        },
      });
      expect(mockSetById).toHaveBeenCalledWith(userId, mockUser, 3600);
      expect(next).toHaveBeenCalled();
    });

    it('should reject if user not found in database', async () => {
      const userId = 'nonexistent-user';
      const tenantId = 'tenant-123';
      const token = generateToken(userId, UserRole.ADMIN, 1, tenantId);

      req.cookies = { access_token: token };
      mockGetById.mockReturnValue(null);
      mockFindFirst.mockResolvedValue(null);

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
      const tenantId = 'tenant-123';
      const token = generateToken(userId, UserRole.ADMIN, 1, tenantId);
      const mockUser = createMockUser({
        id: userId,
        tenantId,
        sessionVersion: 2, // Different from token
      } as any);

      req.cookies = { access_token: token };
      mockGetById.mockReturnValue(null);
      mockFindFirst.mockResolvedValue(mockUser);

      await authenticateToken(req as Request, res as Response, next);

      expect(mockInvalidate).toHaveBeenCalledWith(userId);
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
      const tenantId = 'tenant-123';
      const token = generateToken(userId, UserRole.ADMIN, 2, tenantId);
      const mockUser = createMockUser({
        id: userId,
        tenantId,
        sessionVersion: 2,
      } as any);

      req.cookies = { access_token: token };
      mockGetById.mockReturnValue(null);
      mockFindFirst.mockResolvedValue(mockUser);

      await authenticateToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(mockUser);
    });

    it('should handle missing session version in token (default to 1)', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const secret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
      // Create token without sessionVersion
      const token = jwt.sign({ userId, tenantId, role: UserRole.ADMIN }, secret);

      const mockUser = createMockUser({
        id: userId,
        tenantId,
        sessionVersion: 1,
      } as any);

      req.cookies = { access_token: token };
      mockGetById.mockReturnValue(null);
      mockFindFirst.mockResolvedValue(mockUser);

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
        const tenantId = 'tenant-123';
        const token = generateToken(userId, role, 1, tenantId);
        const mockUser = createMockUser({ id: userId, role, tenantId } as any);

        req.cookies = { access_token: token };
        mockGetById.mockReturnValue(null);
        mockFindFirst.mockResolvedValue(mockUser);

        await authenticateToken(req as Request, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual(mockUser);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const token = generateToken(userId, UserRole.ADMIN, 1, tenantId);

      req.cookies = { access_token: token };
      mockGetById.mockReturnValue(null);
      mockFindFirst.mockRejectedValue(new Error('Database error'));

      await authenticateToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle JWT verification errors', async () => {
      req.cookies = { access_token: 'corrupted-token' };

      await authenticateToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Cache Behavior', () => {
    it('should invalidate cache on session version mismatch', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const token = generateToken(userId, UserRole.ADMIN, 1, tenantId);
      const mockUser = createMockUser({
        id: userId,
        tenantId,
        sessionVersion: 2,
      } as any);

      req.cookies = { access_token: token };
      mockGetById.mockReturnValue(mockUser);
      // Fresh session version check
      mockFindUnique.mockResolvedValue({ sessionVersion: 2 });

      await authenticateToken(req as Request, res as Response, next);

      expect(mockInvalidate).toHaveBeenCalledWith(userId);
    });

    it('should cache user after successful database lookup', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const token = generateToken(userId, UserRole.ADMIN, 1, tenantId);
      const mockUser = createMockUser({ id: userId, tenantId } as any);

      req.cookies = { access_token: token };
      mockGetById.mockReturnValue(null);
      mockFindFirst.mockResolvedValue(mockUser);

      await authenticateToken(req as Request, res as Response, next);

      expect(mockSetById).toHaveBeenCalledWith(userId, mockUser, 3600);
    });
  });

  describe('Token without tenantId', () => {
    it('should reject tokens without valid tenantId', async () => {
      const secret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
      // Create token without tenantId
      const token = jwt.sign({ userId: 'user-123', role: UserRole.ADMIN }, secret);

      req.cookies = { access_token: token };

      await authenticateToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid authentication token',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
