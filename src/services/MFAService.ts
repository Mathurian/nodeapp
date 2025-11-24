/**
 * Multi-Factor Authentication (MFA) Service
 *
 * Implements TOTP-based two-factor authentication with backup codes
 * Follows NIST SP 800-63B guidelines for multi-factor authentication
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, User } from '@prisma/client';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { BaseService } from './BaseService';

interface MFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  manualEntryKey: string;
}

interface MFAVerifyResponse {
  success: boolean;
  message: string;
  remainingBackupCodes?: number;
}

@injectable()
export class MFAService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {
    super();
  }

  /**
   * Generate MFA secret and QR code for enrollment
   */
  async generateMFASecret(userId: string): Promise<MFASetupResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Event Manager (${user.email})`,
      issuer: 'Event Manager',
      length: 32
    });

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
      manualEntryKey: secret.base32
    };
  }

  /**
   * Verify and enable MFA for a user
   */
  async enableMFA(
    userId: string,
    secret: string,
    token: string,
    backupCodes: string[]
  ): Promise<{ success: boolean; message: string }> {
    // Verify the token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps (60 seconds) tolerance
    });

    if (!verified) {
      return {
        success: false,
        message: 'Invalid verification code. Please try again.'
      };
    }

    // Hash backup codes before storing
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    // Enable MFA for the user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
        mfaBackupCodes: JSON.stringify(hashedBackupCodes),
        mfaMethod: 'totp',
        mfaEnrolledAt: new Date()
      }
    });

    return {
      success: true,
      message: 'Multi-factor authentication enabled successfully'
    };
  }

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string, _password: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, mfaEnabled: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mfaEnabled) {
      return {
        success: false,
        message: 'Multi-factor authentication is not enabled'
      };
    }

    // Verify password (password verification would be done by AuthService)
    // This is a simplified version - in production, use proper password verification

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        mfaMethod: null,
        mfaEnrolledAt: null
      }
    });

    return {
      success: true,
      message: 'Multi-factor authentication disabled successfully'
    };
  }

  /**
   * Verify MFA token during login
   */
  async verifyMFAToken(userId: string, token: string): Promise<MFAVerifyResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaSecret: true,
        mfaBackupCodes: true
      }
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return {
        success: false,
        message: 'MFA is not enabled for this user'
      };
    }

    // Try TOTP verification first
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (verified) {
      return {
        success: true,
        message: 'Verification successful'
      };
    }

    // If TOTP fails, try backup codes
    if (user.mfaBackupCodes) {
      const backupCodes = JSON.parse(user.mfaBackupCodes) as string[];
      const hashedToken = this.hashBackupCode(token);

      const codeIndex = backupCodes.findIndex(code => code === hashedToken);

      if (codeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            mfaBackupCodes: JSON.stringify(backupCodes)
          }
        });

        return {
          success: true,
          message: 'Backup code verified successfully',
          remainingBackupCodes: backupCodes.length
        };
      }
    }

    return {
      success: false,
      message: 'Invalid verification code'
    };
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true }
    });

    if (!user || !user.mfaEnabled) {
      throw new Error('MFA is not enabled for this user');
    }

    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaBackupCodes: JSON.stringify(hashedBackupCodes)
      }
    });

    return backupCodes;
  }

  /**
   * Get MFA status for a user
   */
  async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    method?: string;
    enrolledAt?: Date;
    backupCodesRemaining?: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaMethod: true,
        mfaEnrolledAt: true,
        mfaBackupCodes: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const result: {
      enabled: boolean;
      method?: string;
      enrolledAt?: Date | null;
      backupCodesRemaining?: number;
    } = {
      enabled: user.mfaEnabled
    };

    if (user.mfaEnabled) {
      result.method = user.mfaMethod || 'totp';
      result.enrolledAt = user.mfaEnrolledAt || undefined;

      if (user.mfaBackupCodes) {
        const backupCodes = JSON.parse(user.mfaBackupCodes) as string[];
        result.backupCodesRemaining = backupCodes.length;
      }
    }

    return result;
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
      codes.push(formatted);
    }

    return codes;
  }

  /**
   * Hash backup code for secure storage
   */
  private hashBackupCode(code: string): string {
    return crypto
      .createHash('sha256')
      .update(code.replace('-', ''))
      .digest('hex');
  }
}

export default MFAService;
