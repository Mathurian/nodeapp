/**
 * AuthService Unit Tests
 * Comprehensive tests for authentication service
 */

import 'reflect-metadata';
import { AuthService } from '../../../src/services/AuthService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import bcrypt from 'bcrypt';

// Mock bcrypt - use simple jest.mock with auto-mocking
jest.mock('bcrypt');

// Create references to mock functions for easier access
const mockBcryptCompare = bcrypt.compare as jest.Mock;
const mockBcryptHash = bcrypt.hash as jest.Mock;
const mockBcryptGenSalt = bcrypt.genSalt as jest.Mock;

// Use global jsonwebtoken mock from jest.globalMocks.ts
// The global mock is applied via setupFiles before this test loads
const mockJwt = jest.requireMock('jsonwebtoken') as { sign: jest.Mock; verify: jest.Mock; decode: jest.Mock };
const mockJwtSign = mockJwt.sign;
const mockJwtVerify = mockJwt.verify;

// Mock crypto locally - not globally mocked because it breaks other services
// that need real crypto operations (createCipheriv, etc.)
let cryptoRandomBytesReturn = { toString: () => 'mock-reset-token' };
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn(() => cryptoRandomBytesReturn),
  };
});
const mockCrypto = {
  randomBytes: (jest.requireMock('crypto') as typeof import('crypto')).randomBytes as jest.Mock,
  setReturnValue: (value: { toString: () => string }) => { cryptoRandomBytesReturn = value; },
};

// Mock modules
jest.mock('../../../src/utils/cache', () => ({
  userCache: {
    invalidate: jest.fn()
  }
}));

const mockValidatePassword = jest.fn((..._args: unknown[]) => ({ isValid: true, errors: [] }));
const mockIsPasswordSimilarToUserInfo = jest.fn((..._args: unknown[]) => false);
jest.mock('../../../src/utils/passwordValidator', () => ({
  validatePassword: (...args: unknown[]) => mockValidatePassword(...args),
  isPasswordSimilarToUserInfo: (...args: unknown[]) => mockIsPasswordSimilarToUserInfo(...args)
}));

// Create permission mocks container
const permissionMocks = {
  getRolePermissions: jest.fn(async (role: string, _tenantId?: string) => {
    if (role === 'ADMIN') return ['MANAGE_USERS', 'MANAGE_EVENTS'];
    if (role === 'JUDGE') return ['SUBMIT_SCORES', 'VIEW_RESULTS', 'scores:write'];
    return [];
  }),
  isAdmin: jest.fn((role: string) => role === 'ADMIN' || role === 'SUPER_ADMIN'),
};

jest.mock('../../../src/middleware/permissions', () => ({
  PERMISSIONS: {
    ADMIN: ['MANAGE_USERS', 'MANAGE_EVENTS', 'VIEW_RESULTS'],
    JUDGE: ['SUBMIT_SCORES', 'VIEW_RESULTS'],
    SUPER_ADMIN: ['*'],
  },
  getRolePermissions: (...args: unknown[]) => permissionMocks.getRolePermissions(args[0] as string, args[1] as string),
  isAdmin: (...args: unknown[]) => permissionMocks.isAdmin(args[0] as string),
  hasPermission: jest.fn(),
  hasPermissionAsync: jest.fn(),
  canAccessResource: jest.fn(),
  canAccessResourceAsync: jest.fn(),
  getRolePermissionsSync: jest.fn(),
  checkPermission: jest.fn(),
  ENABLE_DYNAMIC_PERMISSIONS: false,
}));

const mockGetRolePermissions = permissionMocks.getRolePermissions;
const mockIsAdmin = permissionMocks.isAdmin;

// Mock tsyringe container.resolve for ErrorLogService
jest.mock('tsyringe', () => {
  const actual = jest.requireActual('tsyringe');
  return {
    ...actual,
    container: {
      ...actual.container,
      resolve: jest.fn(() => ({
        logException: jest.fn().mockResolvedValue(undefined)
      }))
    }
  };
});

// Mock EmailService
const mockEmailService = {
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined)
};

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const tenantId = 'tenant-1';

  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    preferredName: 'Testy',
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    role: 'JUDGE',
    isActive: true,
    sessionVersion: 1,
    lastLoginAt: new Date('2024-01-01'),
    judgeId: 'judge-1',
    contestantId: null,
    gender: 'MALE',
    pronouns: 'he/him',
    tenantId: 'tenant-1',
    imagePath: null,
    mfaEnabled: false,
    mfaSecret: null,
    mfaMethod: null,
    tenant: { id: 'tenant-1', name: 'Test Tenant', slug: 'test' },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Only clear call counts, not implementations
    jest.clearAllMocks();
    mockPrisma = mockDeep<PrismaClient>();
    mockEmailService.sendPasswordResetEmail.mockReturnValue(Promise.resolve(undefined));

    // Reset permission mock implementation after clearAllMocks
    permissionMocks.getRolePermissions.mockImplementation(async (role: string, _tenantId?: string) => {
      if (role === 'ADMIN') return ['MANAGE_USERS', 'MANAGE_EVENTS'];
      if (role === 'JUDGE') return ['SUBMIT_SCORES', 'VIEW_RESULTS', 'scores:write'];
      return [];
    });

    // Reset crypto mock implementation after clearAllMocks
    mockCrypto.setReturnValue({ toString: () => 'mock-reset-token' });

    service = new AuthService(mockPrisma as any, mockEmailService as any, {} as any, {} as any);
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance with reset token cache', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AuthService);
    });
  });

  describe('login', () => {
    const credentials = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should successfully login with valid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);
      mockBcryptCompare.mockResolvedValue(true);
      mockJwtSign.mockReturnValue('mock-jwt-token');

      const result = await service.login(credentials, tenantId, '127.0.0.1', 'Mozilla/5.0');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: credentials.email, tenantId }
        })
      );
      expect(mockBcryptCompare).toHaveBeenCalledWith(credentials.password, mockUser.password);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) }
      });
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw error when email is missing', async () => {
      await expect(
        service.login({ email: '', password: 'password' }, tenantId)
      ).rejects.toThrow('Email and password are required');
    });

    it('should throw error when password is missing', async () => {
      await expect(
        service.login({ email: 'test@example.com', password: '' }, tenantId)
      ).rejects.toThrow('Email and password are required');
    });

    it('should throw error when tenantId is missing', async () => {
      await expect(
        service.login(credentials, '')
      ).rejects.toThrow('Tenant context is required');
    });

    it('should throw error when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(service.login(credentials, tenantId)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error when password is incorrect', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(service.login(credentials, tenantId)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error when account is inactive', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        isActive: false
      } as any);
      mockBcryptCompare.mockResolvedValue(true);

      await expect(service.login(credentials, tenantId)).rejects.toThrow('Account is inactive');
    });

    it('should generate token with correct payload', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);
      mockBcryptCompare.mockResolvedValue(true);
      mockJwtSign.mockReturnValue('token' as never);

      await service.login(credentials, tenantId);

      expect(mockJwtSign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          sessionVersion: mockUser.sessionVersion,
          tenantId: mockUser.tenantId
        },
        expect.any(String),
        { expiresIn: expect.any(String) }
      );
    });

    it('should use longer expiration for admin users', async () => {
      const adminUser = { ...mockUser, role: 'ADMIN' };
      mockPrisma.user.findFirst.mockResolvedValue(adminUser as any);
      mockPrisma.user.update.mockResolvedValue(adminUser as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);
      mockBcryptCompare.mockResolvedValue(true);
      mockJwtSign.mockReturnValue('token' as never);

      await service.login(credentials, tenantId);

      expect(mockJwtSign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        { expiresIn: '1h' }
      );
    });

    it('should log login activity', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);
      mockBcryptCompare.mockResolvedValue(true);
      mockJwtSign.mockReturnValue('token' as never);

      await service.login(credentials, tenantId, '192.168.1.1', 'Chrome');

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          userName: mockUser.name,
          userRole: mockUser.role,
          action: 'LOGIN',
          resourceType: 'AUTH',
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome'
        })
      });
    });

    it('should not fail login if activity logging fails', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.activityLog.create.mockRejectedValue(new Error('Logging failed'));
      mockBcryptCompare.mockResolvedValue(true);
      mockJwtSign.mockReturnValue('token' as never);

      const result = await service.login(credentials, tenantId);

      expect(result.token).toBe('token');
    });

    it('should include user profile data in response', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);
      mockBcryptCompare.mockResolvedValue(true);
      mockJwtSign.mockReturnValue('token' as never);

      const result = await service.login(credentials, tenantId);

      expect(result.user).toMatchObject({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        tenantId: mockUser.tenantId
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile with permissions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.getProfile('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'user-1' }
      }));
      expect(result).toMatchObject({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role
      });
    });

    it('should throw error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('invalid-id')).rejects.toThrow('User not found');
    });

    it('should include permissions and admin access', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.getProfile('user-1');

      expect(result.permissions).toBeDefined();
      expect(result.hasAdminAccess).toBeDefined();
    });
  });

  describe('getPermissions', () => {
    it('should return user permissions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.getPermissions('user-1');

      expect(result.role).toBe(mockUser.role);
      expect(result.permissions).toBeDefined();
      expect(result.hasAdminAccess).toBeDefined();
      expect(result.permissionsMatrix).toBeDefined();
    });

    it('should throw error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getPermissions('invalid-id')).rejects.toThrow('User not found');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const payload = {
        userId: 'user-1',
        email: 'test@example.com',
        role: 'JUDGE',
        sessionVersion: 1,
        tenantId: 'tenant-1'
      };
      mockJwtVerify.mockReturnValue(payload as never);

      const result = service.verifyToken('valid-token');

      expect(mockJwtVerify).toHaveBeenCalled();
      expect(result).toEqual(payload);
    });

    it('should throw error for invalid token', () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      expect(() => service.verifyToken('invalid-token')).toThrow('Invalid or expired token');
    });

    it('should throw error for expired token', () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => service.verifyToken('expired-token')).toThrow('Invalid or expired token');
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate reset token for valid email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await service.generatePasswordResetToken('test@example.com');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(service.validatePasswordResetToken(result)).toBe(mockUser.id);
    });

    it('should throw error for non-existent email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.generatePasswordResetToken('nonexistent@example.com')
      ).rejects.toThrow('User not found');
    });
  });

  describe('validatePasswordResetToken', () => {
    it('should return userId for valid token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockCrypto.randomBytes.mockReturnValue({
        toString: () => 'valid-token'
      } as any);

      const token = await service.generatePasswordResetToken('test@example.com');
      const userId = service.validatePasswordResetToken(token);

      expect(userId).toBe('user-1');
    });

    it('should return undefined for invalid token', () => {
      const result = service.validatePasswordResetToken('invalid-token');

      expect(result).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      // Generate a token first
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockCrypto.randomBytes.mockReturnValue({
        toString: () => 'reset-token'
      } as any);
      const token = await service.generatePasswordResetToken('test@example.com');

      // Reset password - findUnique is used to fetch user for password validation
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockBcryptHash.mockResolvedValue('hashed-new-password' as never);
      // Password history check
      mockPrisma.passwordHistory.findMany.mockResolvedValue([]);
      mockPrisma.passwordHistory.create.mockResolvedValue({} as any);

      await service.resetPassword(token, 'NewPassword123!');

      expect(mockBcryptHash).toHaveBeenCalledWith('NewPassword123!', 10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          password: 'hashed-new-password',
          sessionVersion: { increment: 1 }
        }
      });
    });

    it('should throw error for invalid reset token', async () => {
      await expect(
        service.resetPassword('invalid-token', 'newPassword')
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should invalidate token after use', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockCrypto.randomBytes.mockReturnValue({
        toString: () => 'one-time-token'
      } as any);
      const token = await service.generatePasswordResetToken('test@example.com');

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockBcryptHash.mockResolvedValue('hashed');
      mockPrisma.passwordHistory.findMany.mockResolvedValue([]);
      mockPrisma.passwordHistory.create.mockResolvedValue({} as any);

      await service.resetPassword(token, 'NewPassword123!');

      // Try to use token again
      await expect(
        service.resetPassword(token, 'AnotherPassword123!')
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should increment session version on password reset', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockCrypto.randomBytes.mockReturnValue({
        toString: () => 'reset-token-2'
      } as any);
      const token = await service.generatePasswordResetToken('test@example.com');

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockBcryptHash.mockResolvedValue('hashed');
      mockPrisma.passwordHistory.findMany.mockResolvedValue([]);
      mockPrisma.passwordHistory.create.mockResolvedValue({} as any);

      await service.resetPassword(token, 'NewPassword123!');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionVersion: { increment: 1 }
          })
        })
      );
    });
  });

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      // First compare is for current password verification, second is for same-password check
      mockBcryptCompare
        .mockResolvedValueOnce(true)   // current password matches
        .mockResolvedValueOnce(false);  // new password is different from current
      mockBcryptHash.mockResolvedValue('new-hashed-password');
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.passwordHistory.findMany.mockResolvedValue([]);
      mockPrisma.passwordHistory.create.mockResolvedValue({} as any);

      await service.changePassword('user-1', 'currentPassword', 'NewPassword123!');

      expect(mockBcryptCompare).toHaveBeenCalledWith('currentPassword', mockUser.password);
      expect(mockBcryptHash).toHaveBeenCalledWith('NewPassword123!', 10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          password: 'new-hashed-password',
          sessionVersion: { increment: 1 }
        }
      });
    });

    it('should throw error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('invalid-id', 'current', 'new')
      ).rejects.toThrow('User not found');
    });

    it('should throw error when current password is incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', 'wrongPassword', 'newPassword')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should increment session version on password change', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockBcryptCompare
        .mockResolvedValueOnce(true)   // current password matches
        .mockResolvedValueOnce(false);  // new password is different
      mockBcryptHash.mockResolvedValue('hashed');
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.passwordHistory.findMany.mockResolvedValue([]);
      mockPrisma.passwordHistory.create.mockResolvedValue({} as any);

      await service.changePassword('user-1', 'current', 'NewPassword123!');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionVersion: { increment: 1 }
          })
        })
      );
    });
  });

  describe('invalidateAllSessions', () => {
    it('should increment session version', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser as any);

      await service.invalidateAllSessions('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          sessionVersion: { increment: 1 }
        }
      });
    });
  });

  describe('hasPermission', () => {
    it('should return true for valid permission', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, role: 'JUDGE' } as any);

      const result = await service.hasPermission('user-1', 'scores:write');

      expect(result).toBe(true);
    });

    it('should return false for invalid permission', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.hasPermission('user-1', 'INVALID_PERMISSION');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.hasPermission('invalid-id', 'ANY_PERMISSION');

      expect(result).toBe(false);
    });
  });
});
