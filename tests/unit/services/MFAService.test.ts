/**
 * MFAService Unit Tests
 * Comprehensive tests for Multi-Factor Authentication service
 */

import 'reflect-metadata';
import { MFAService } from '../../../src/services/MFAService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

// Mock external dependencies
jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('crypto');

describe('MFAService', () => {
  let service: MFAService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  const mockSpeakeasy = speakeasy as jest.Mocked<typeof speakeasy>;
  const mockQRCode = QRCode as jest.Mocked<typeof QRCode>;
  const mockCrypto = crypto as jest.Mocked<typeof crypto>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedpassword',
    role: 'USER',
    isActive: true,
    mfaEnabled: false,
    mfaSecret: null,
    mfaBackupCodes: null,
    mfaMethod: null,
    mfaEnrolledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new MFAService(mockPrisma);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('generateMFASecret', () => {
    it('should generate MFA secret with QR code and backup codes', async () => {
      const mockSecret = {
        base32: 'TESTSECRET12345',
        otpauth_url: 'otpauth://totp/EventManager:test@example.com?secret=TESTSECRET12345&issuer=EventManager'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockSpeakeasy.generateSecret.mockReturnValue(mockSecret as any);
      mockQRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqrcode');

      const mockRandomBytes = jest.fn()
        .mockReturnValueOnce(Buffer.from('12345678'))
        .mockReturnValueOnce(Buffer.from('abcdefgh'))
        .mockReturnValueOnce(Buffer.from('11111111'))
        .mockReturnValueOnce(Buffer.from('22222222'))
        .mockReturnValueOnce(Buffer.from('33333333'))
        .mockReturnValueOnce(Buffer.from('44444444'))
        .mockReturnValueOnce(Buffer.from('55555555'))
        .mockReturnValueOnce(Buffer.from('66666666'))
        .mockReturnValueOnce(Buffer.from('77777777'))
        .mockReturnValueOnce(Buffer.from('88888888'));

      (crypto.randomBytes as jest.Mock) = mockRandomBytes;

      const result = await service.generateMFASecret('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { email: true, name: true }
      });

      expect(mockSpeakeasy.generateSecret).toHaveBeenCalledWith({
        name: 'Event Manager (test@example.com)',
        issuer: 'Event Manager',
        length: 32
      });

      expect(mockQRCode.toDataURL).toHaveBeenCalledWith(mockSecret.otpauth_url);

      expect(result).toEqual({
        secret: 'TESTSECRET12345',
        qrCode: 'data:image/png;base64,mockqrcode',
        backupCodes: expect.any(Array),
        manualEntryKey: 'TESTSECRET12345'
      });

      expect(result.backupCodes).toHaveLength(10);
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.generateMFASecret('invalid-user'))
        .rejects.toThrow('User not found');
    });
  });

  describe('enableMFA', () => {
    it('should enable MFA with valid token', async () => {
      const backupCodes = ['1234-5678', 'ABCD-EFGH'];

      (mockSpeakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const mockHash = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          digest: jest.fn().mockReturnValue('hashedcode')
        })
      });
      (crypto.createHash as jest.Mock) = mockHash;

      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'TESTSECRET',
        mfaMethod: 'totp'
      } as any);

      const result = await service.enableMFA('user-1', 'TESTSECRET', '123456', backupCodes);

      expect(mockSpeakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'TESTSECRET',
        encoding: 'base32',
        token: '123456',
        window: 2
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          mfaEnabled: true,
          mfaSecret: 'TESTSECRET',
          mfaBackupCodes: expect.any(String),
          mfaMethod: 'totp',
          mfaEnrolledAt: expect.any(Date)
        }
      });

      expect(result).toEqual({
        success: true,
        message: 'Multi-factor authentication enabled successfully'
      });
    });

    it('should fail with invalid token', async () => {
      (mockSpeakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await service.enableMFA('user-1', 'TESTSECRET', 'invalid', []);

      expect(result).toEqual({
        success: false,
        message: 'Invalid verification code. Please try again.'
      });

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('disableMFA', () => {
    it('should disable MFA successfully', async () => {
      const userWithMFA = {
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'TESTSECRET',
        mfaMethod: 'totp'
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithMFA as any);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false
      } as any);

      const result = await service.disableMFA('user-1', 'password123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: null,
          mfaMethod: null,
          mfaEnrolledAt: null
        }
      });

      expect(result).toEqual({
        success: true,
        message: 'Multi-factor authentication disabled successfully'
      });
    });

    it('should fail if MFA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.disableMFA('user-1', 'password123');

      expect(result).toEqual({
        success: false,
        message: 'Multi-factor authentication is not enabled'
      });

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.disableMFA('invalid-user', 'password'))
        .rejects.toThrow('User not found');
    });
  });

  describe('verifyMFAToken', () => {
    it('should verify valid TOTP token', async () => {
      const userWithMFA = {
        mfaEnabled: true,
        mfaSecret: 'TESTSECRET',
        mfaBackupCodes: JSON.stringify(['hashedcode1', 'hashedcode2'])
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithMFA as any);
      (mockSpeakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await service.verifyMFAToken('user-1', '123456');

      expect(result).toEqual({
        success: true,
        message: 'Verification successful'
      });
    });

    it('should verify valid backup code and remove it', async () => {
      const mockHash = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          digest: jest.fn().mockReturnValue('hashedbackupcode')
        })
      });
      (crypto.createHash as jest.Mock) = mockHash;

      const userWithMFA = {
        mfaEnabled: true,
        mfaSecret: 'TESTSECRET',
        mfaBackupCodes: JSON.stringify(['hashedbackupcode', 'anothercode'])
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithMFA as any);
      (mockSpeakeasy.totp.verify as jest.Mock).mockReturnValue(false);
      mockPrisma.user.update.mockResolvedValue({} as any);

      const result = await service.verifyMFAToken('user-1', '1234-5678');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          mfaBackupCodes: JSON.stringify(['anothercode'])
        }
      });

      expect(result).toEqual({
        success: true,
        message: 'Backup code verified successfully',
        remainingBackupCodes: 1
      });
    });

    it('should fail with invalid token and no valid backup codes', async () => {
      const mockHash = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          digest: jest.fn().mockReturnValue('wronghash')
        })
      });
      (crypto.createHash as jest.Mock) = mockHash;

      const userWithMFA = {
        mfaEnabled: true,
        mfaSecret: 'TESTSECRET',
        mfaBackupCodes: JSON.stringify(['hashedcode1'])
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithMFA as any);
      (mockSpeakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await service.verifyMFAToken('user-1', 'invalid');

      expect(result).toEqual({
        success: false,
        message: 'Invalid verification code'
      });
    });

    it('should fail if MFA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null
      } as any);

      const result = await service.verifyMFAToken('user-1', '123456');

      expect(result).toEqual({
        success: false,
        message: 'MFA is not enabled for this user'
      });
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should generate new backup codes', async () => {
      const userWithMFA = {
        mfaEnabled: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithMFA as any);

      const mockRandomBytes = jest.fn()
        .mockReturnValueOnce(Buffer.from('12345678'))
        .mockReturnValueOnce(Buffer.from('abcdefgh'))
        .mockReturnValueOnce(Buffer.from('11111111'))
        .mockReturnValueOnce(Buffer.from('22222222'))
        .mockReturnValueOnce(Buffer.from('33333333'))
        .mockReturnValueOnce(Buffer.from('44444444'))
        .mockReturnValueOnce(Buffer.from('55555555'))
        .mockReturnValueOnce(Buffer.from('66666666'))
        .mockReturnValueOnce(Buffer.from('77777777'))
        .mockReturnValueOnce(Buffer.from('88888888'));

      (crypto.randomBytes as jest.Mock) = mockRandomBytes;

      const mockHash = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          digest: jest.fn().mockReturnValue('hashedcode')
        })
      });
      (crypto.createHash as jest.Mock) = mockHash;

      mockPrisma.user.update.mockResolvedValue({} as any);

      const result = await service.regenerateBackupCodes('user-1');

      expect(result).toHaveLength(10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          mfaBackupCodes: expect.any(String)
        }
      });
    });

    it('should throw error if MFA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaEnabled: false
      } as any);

      await expect(service.regenerateBackupCodes('user-1'))
        .rejects.toThrow('MFA is not enabled for this user');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.regenerateBackupCodes('invalid-user'))
        .rejects.toThrow('MFA is not enabled for this user');
    });
  });

  describe('getMFAStatus', () => {
    it('should return status for user with MFA enabled', async () => {
      const userWithMFA = {
        mfaEnabled: true,
        mfaMethod: 'totp',
        mfaEnrolledAt: new Date('2024-01-01'),
        mfaBackupCodes: JSON.stringify(['code1', 'code2', 'code3'])
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithMFA as any);

      const result = await service.getMFAStatus('user-1');

      expect(result).toEqual({
        enabled: true,
        method: 'totp',
        enrolledAt: new Date('2024-01-01'),
        backupCodesRemaining: 3
      });
    });

    it('should return status for user with MFA disabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaEnabled: false,
        mfaMethod: null,
        mfaEnrolledAt: null,
        mfaBackupCodes: null
      } as any);

      const result = await service.getMFAStatus('user-1');

      expect(result).toEqual({
        enabled: false
      });
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMFAStatus('invalid-user'))
        .rejects.toThrow('User not found');
    });
  });
});
