/**
 * AuthService Unit Tests
 * Comprehensive tests for authentication service
 */

import 'reflect-metadata';
import { AuthService } from '../../../src/services/AuthService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Mock external dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('crypto');
jest.mock('../../../src/utils/cache', () => ({
  userCache: {
    invalidate: jest.fn()
  }
}));
jest.mock('../../../src/middleware/permissions', () => ({
  PERMISSIONS: {
    MANAGE_USERS: ['SUPER_ADMIN', 'ADMIN'],
    VIEW_RESULTS: ['JUDGE', 'CONTESTANT']
  },
  getRolePermissions: jest.fn((role: string) => {
    if (role === 'ADMIN') return ['MANAGE_USERS', 'MANAGE_EVENTS'];
    if (role === 'JUDGE') return ['SUBMIT_SCORES', 'VIEW_RESULTS'];
    return [];
  }),
  isAdmin: jest.fn((role: string) => role === 'ADMIN' || role === 'SUPER_ADMIN')
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
  const mockJwt = jwt as jest.Mocked<typeof jwt>;
  const mockCrypto = crypto as jest.Mocked<typeof crypto>;

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
    contestantNumber: null,
    contestantAge: null,
    contestantSchool: null,
    contestantBio: null,
    judgeBio: 'Experienced judge',
    judgeSpecialties: ['Dance', 'Music'],
    judgeCertifications: ['Level 1'],
    gender: 'MALE',
    pronouns: 'he/him',
    judge: { id: 'judge-1', name: 'Test Judge' },
    contestant: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new AuthService(mockPrisma as any);
    jest.clearAllMocks();
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
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('mock-jwt-token' as never);

      const result = await service.login(credentials, '127.0.0.1', 'Mozilla/5.0');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: credentials.email },
        include: { judge: true, contestant: true }
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(credentials.password, mockUser.password);
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
        service.login({ email: '', password: 'password' })
      ).rejects.toThrow('Email and password are required');
    });

    it('should throw error when password is missing', async () => {
      await expect(
        service.login({ email: 'test@example.com', password: '' })
      ).rejects.toThrow('Email and password are required');
    });

    it('should throw error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error when password is incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error when account is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false
      } as any);
      mockBcrypt.compare.mockResolvedValue(true as never);

      await expect(service.login(credentials)).rejects.toThrow('Account is inactive');
    });

    it('should generate token with correct payload', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('token' as never);

      await service.login(credentials);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          sessionVersion: mockUser.sessionVersion
        },
        expect.any(String),
        { expiresIn: expect.any(String) }
      );
    });

    it('should use longer expiration for admin users', async () => {
      const adminUser = { ...mockUser, role: 'ADMIN' };
      mockPrisma.user.findUnique.mockResolvedValue(adminUser as any);
      mockPrisma.user.update.mockResolvedValue(adminUser as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('token' as never);

      await service.login(credentials);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        { expiresIn: '1h' }
      );
    });

    it('should log login activity', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('token' as never);

      await service.login(credentials, '192.168.1.1', 'Chrome');

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
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.activityLog.create.mockRejectedValue(new Error('Logging failed'));
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('token' as never);

      const result = await service.login(credentials);

      expect(result.token).toBe('token');
    });

    it('should include user profile data in response', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('token' as never);

      const result = await service.login(credentials);

      expect(result.user).toMatchObject({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        judgeBio: mockUser.judgeBio,
        judgeSpecialties: mockUser.judgeSpecialties
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile with permissions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.getProfile('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { judge: true, contestant: true }
      });
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
        sessionVersion: 1
      };
      mockJwt.verify.mockReturnValue(payload as never);

      const result = service.verifyToken('valid-token');

      expect(mockJwt.verify).toHaveBeenCalled();
      expect(result).toEqual(payload);
    });

    it('should throw error for invalid token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      expect(() => service.verifyToken('invalid-token')).toThrow('Invalid or expired token');
    });

    it('should throw error for expired token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => service.verifyToken('expired-token')).toThrow('Invalid or expired token');
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate reset token for valid email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockCrypto.randomBytes.mockReturnValue({
        toString: () => 'random-token-hex'
      } as any);

      const result = await service.generatePasswordResetToken('test@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(result).toBe('random-token-hex');
    });

    it('should throw error for non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.generatePasswordResetToken('nonexistent@example.com')
      ).rejects.toThrow('User not found');
    });
  });

  describe('validatePasswordResetToken', () => {
    it('should return userId for valid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
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
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockCrypto.randomBytes.mockReturnValue({
        toString: () => 'reset-token'
      } as any);
      const token = await service.generatePasswordResetToken('test@example.com');

      // Reset password
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockBcrypt.hash.mockResolvedValue('hashed-new-password' as never);

      await service.resetPassword(token, 'newPassword123');

      expect(mockBcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
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
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockCrypto.randomBytes.mockReturnValue({
        toString: () => 'one-time-token'
      } as any);
      const token = await service.generatePasswordResetToken('test@example.com');

      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockBcrypt.hash.mockResolvedValue('hashed' as never);

      await service.resetPassword(token, 'newPassword');

      // Try to use token again
      await expect(
        service.resetPassword(token, 'anotherPassword')
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should increment session version on password reset', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockCrypto.randomBytes.mockReturnValue({
        toString: () => 'reset-token-2'
      } as any);
      const token = await service.generatePasswordResetToken('test@example.com');

      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockBcrypt.hash.mockResolvedValue('hashed' as never);

      await service.resetPassword(token, 'newPassword');

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
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockBcrypt.hash.mockResolvedValue('new-hashed-password' as never);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);

      await service.changePassword('user-1', 'currentPassword', 'newPassword');

      expect(mockBcrypt.compare).toHaveBeenCalledWith('currentPassword', mockUser.password);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
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
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.changePassword('user-1', 'wrongPassword', 'newPassword')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should increment session version on password change', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockBcrypt.hash.mockResolvedValue('hashed' as never);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);

      await service.changePassword('user-1', 'current', 'new');

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
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, role: 'ADMIN' } as any);

      const result = await service.hasPermission('user-1', 'MANAGE_USERS');

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
