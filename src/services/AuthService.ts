/**
 * Auth Service
 * Handles authentication business logic including login, token management,
 * password resets, and permission checks
 */

import { injectable, inject, container } from 'tsyringe';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import NodeCache from 'node-cache';
import { PrismaClient, Prisma } from '@prisma/client';
import { PERMISSIONS, getRolePermissions, isAdmin } from '../middleware/permissions';
import { userCache } from '../utils/cache';
import { validatePassword, isPasswordSimilarToUserInfo } from '../utils/passwordValidator';
import { EmailService } from './EmailService';
import { ErrorLogService } from './ErrorLogService';
import { MFAService } from './MFAService';
import { SMSService } from './SMSService';
import { env } from '../config/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthService');

const JWT_SECRET = env.get('JWT_SECRET');
const JWT_EXPIRES_IN = env.get('JWT_EXPIRES_IN');
const RESET_TOKEN_TTL_SECONDS = 10 * 60; // 10 minutes

// Prisma payload types
type UserBasic = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    preferredName: true;
    email: true;
    password: true;
    role: true;
    sessionVersion: true;
    isActive: true;
    judgeId: true;
    contestantId: true;
    gender: true;
    pronouns: true;
    tenantId: true;
    imagePath: true;
  };
}>;

interface LoginCredentials {
  email: string;
  password: string;
}

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
}

interface UserProfile {
  id: string;
  name: string;
  preferredName: string | null;
  email: string;
  role: string;
  sessionVersion: number;
  permissions: string[];
  hasAdminAccess: boolean;
  judgeId: string | null;
  contestantId: string | null;
  gender: string | null;
  pronouns: string | null;
  imagePath: string | null;
  tenantId?: string;
  tenant?: TenantInfo | null;
}

interface LoginResult {
  token: string;
  user: UserProfile;
  requiresMFA?: boolean;
  requiresMFASetup?: boolean;
  mfaProviders?: string[];
  tempToken?: string;
  message?: string;
}

interface UserPermissions {
  role: string;
  permissions: string[];
  hasAdminAccess: boolean;
  permissionsMatrix: typeof PERMISSIONS;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionVersion: number;
  tenantId: string;
  tempAuth?: boolean;
}

interface TenantMFAPolicy {
  enabled: boolean;
  providers: string[];
}

interface MfaChallengeRecord {
  code: string;
  userId: string;
  provider: 'SMS' | 'EMAIL';
}

interface InvitationRegistrationTokenPayload {
  type: 'INVITE_REGISTRATION';
  userId: string;
  tenantId: string;
  email: string;
}

@injectable()
export class AuthService {
  private resetTokenCache: NodeCache;
  private mfaChallengeCache: NodeCache;

  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(EmailService) private emailService: EmailService,
    @inject(MFAService) private mfaService: MFAService,
    @inject(SMSService) private smsService: SMSService
  ) {
    this.resetTokenCache = new NodeCache({
      stdTTL: RESET_TOKEN_TTL_SECONDS,
      checkperiod: 120
    });
    this.mfaChallengeCache = new NodeCache({
      stdTTL: 5 * 60,
      checkperiod: 120
    });
  }

  private async getSettingWithFallback(key: string, tenantId: string): Promise<string | null> {
    const tenantSetting = await this.prisma.systemSetting.findFirst({
      where: { key, tenantId }
    });
    if (tenantSetting?.value !== undefined && tenantSetting?.value !== null) {
      return tenantSetting.value;
    }

    const globalSetting = await this.prisma.systemSetting.findFirst({
      where: { key, tenantId: null }
    });
    return globalSetting?.value ?? null;
  }

  private normalizeProviders(raw: string | null): string[] {
    if (!raw) return ['TOTP'];
    const candidates = raw
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    const allowed = new Set(['TOTP', 'SMS', 'EMAIL']);
    const providers = candidates.filter((provider) => allowed.has(provider));
    return providers.length > 0 ? providers : ['TOTP'];
  }

  private async getTenantMfaPolicy(tenantId: string): Promise<TenantMFAPolicy> {
    const [newKey, legacyKey, providersRaw] = await Promise.all([
      this.getSettingWithFallback('security_mfaEnabled', tenantId),
      this.getSettingWithFallback('security_enableTwoFactor', tenantId),
      this.getSettingWithFallback('security_mfaProviders', tenantId),
    ]);

    const enabledRaw = (newKey ?? legacyKey ?? 'false').toLowerCase();
    return {
      enabled: enabledRaw === 'true',
      providers: this.normalizeProviders(providersRaw),
    };
  }

  private resolveAllowedMfaProviders(user: { mfaEnabled: boolean; mfaMethod?: string | null }, policy: TenantMFAPolicy): string[] {
    const providers = new Set<string>();
    if (policy.enabled) {
      policy.providers.forEach((provider) => providers.add(provider));
    }

    if (user.mfaEnabled) {
      providers.add((user.mfaMethod || 'TOTP').toUpperCase());
    }

    if (providers.size === 0) {
      providers.add('TOTP');
    }

    return Array.from(providers);
  }

  private getChallengeCacheKey(userId: string, provider: 'SMS' | 'EMAIL'): string {
    return `mfa_challenge:${userId}:${provider}`;
  }

  private generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * P2-5: Check if password was used in recent history
   * @param userId - User ID
   * @param newPassword - New password to check
   * @param historyLimit - Number of previous passwords to check (default: 5)
   * @returns true if password was used recently
   */
  private async isPasswordInHistory(userId: string, newPassword: string, historyLimit: number = 5): Promise<boolean> {
    const passwordHistories = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: historyLimit
    });

    for (const history of passwordHistories) {
      if (await bcrypt.compare(newPassword, history.password)) {
        return true;
      }
    }

    return false;
  }

  /**
   * P2-5: Save password to history
   * @param userId - User ID
   * @param hashedPassword - Hashed password to save
   */
  private async savePasswordToHistory(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.passwordHistory.create({
      data: {
        userId,
        password: hashedPassword
      }
    });

    // Keep only the last 10 password histories
    const allHistories = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 10
    });

    if (allHistories.length > 0) {
      await this.prisma.passwordHistory.deleteMany({
        where: {
          id: { in: allHistories.map(h => h.id) }
        }
      });
    }
  }

  /**
   * Authenticate user and generate JWT token
   */
  async login(credentials: LoginCredentials, tenantId: string, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    const { email, password } = credentials;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (!tenantId) {
      throw new Error('Tenant context is required');
    }

    // Find user with related data including tenant info and MFA fields
    // If logging in from default tenant context (e.g., /login without slug),
    // first try to find the user by email in any tenant
    let user = await this.prisma.user.findFirst({
      where: {
        email,
        tenantId
      },
      // Explicitly select MFA fields
      select: {
        id: true,
        name: true,
        preferredName: true,
        email: true,
        password: true,
        role: true,
        sessionVersion: true,
        isActive: true,
        judgeId: true,
        contestantId: true,
        gender: true,
        pronouns: true,
        tenantId: true,
        imagePath: true,
        mfaEnabled: true,
        mfaSecret: true,
        mfaMethod: true,
        phone: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    // If not found in specified tenant, try to find user by email in any active tenant
    // This enables automatic tenant discovery based on email
    if (!user) {
      // First, check if we're using the default tenant
      const defaultTenant = await this.prisma.tenant.findUnique({
        where: { slug: 'default' },
        select: { id: true }
      });

      // Only do cross-tenant search if we're logging in from default tenant context
      // This prevents cross-tenant authentication when accessing tenant-specific URLs
      if (defaultTenant && tenantId === defaultTenant.id) {
        user = await this.prisma.user.findFirst({
          where: {
            email,
            isActive: true,
            tenant: { isActive: true }
          },
        select: {
          id: true,
          name: true,
          preferredName: true,
          email: true,
          password: true,
          role: true,
          sessionVersion: true,
          isActive: true,
          judgeId: true,
          contestantId: true,
          gender: true,
          pronouns: true,
          tenantId: true,
          imagePath: true,
          mfaEnabled: true,
          mfaSecret: true,
          mfaMethod: true,
          phone: true,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
        });
      }
    }

    // Validate credentials
    if (!user || !await bcrypt.compare(password, user.password)) {
      // Log authentication failure to database
      try {
        const errorLogService = container.resolve(ErrorLogService);
        await errorLogService.logException(
          new Error('Invalid credentials'),
          'AuthService:login',
          {
            email,
            tenantId,
            ipAddress: ipAddress || 'unknown',
            userAgent: userAgent || 'unknown',
            reason: 'invalid_credentials',
          },
          tenantId
        );
      } catch (logError) {
        logger.error('Failed to log authentication error', { error: logError });
      }
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      // Log inactive account login attempt
      try {
        const errorLogService = container.resolve(ErrorLogService);
        await errorLogService.logException(
          new Error('Account is inactive'),
          'AuthService:login',
          {
            email,
            userId: user.id,
            tenantId,
            ipAddress: ipAddress || 'unknown',
            userAgent: userAgent || 'unknown',
            reason: 'inactive_account',
          },
          tenantId
        );
      } catch (logError) {
        logger.error('Failed to log authentication error', { error: logError });
      }
      throw new Error('Account is inactive');
    }

    const tenantMfaPolicy = await this.getTenantMfaPolicy(user.tenantId);
    const availableProviders = this.resolveAllowedMfaProviders(user, tenantMfaPolicy);
    const requiresTenantMfa = tenantMfaPolicy.enabled;
    const requiresMfaSetup = requiresTenantMfa && !user.mfaEnabled && !availableProviders.some((p) => p === 'SMS' || p === 'EMAIL');

    if (requiresTenantMfa && availableProviders.length === 0) {
      throw new Error('Tenant MFA policy requires at least one MFA provider.');
    }

    // Require MFA challenge if user MFA is enabled or tenant policy enforces MFA.
    if (user.mfaEnabled || requiresTenantMfa) {
      logger.info('MFA required for user', {
        userId: user.id,
        email: user.email,
        requiresTenantMfa,
        requiresMfaSetup,
      });

      // Generate temporary token (5 minute expiry) for MFA verification
      const tempPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionVersion: user.sessionVersion,
        tenantId: user.tenantId,
        tempAuth: true // Mark as temporary for MFA
      };

      const tempToken = jwt.sign(tempPayload, JWT_SECRET as string, { expiresIn: '5m' } as jwt.SignOptions);

      // Log MFA requirement
      try {
        await this.prisma.activityLog.create({
          data: {
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: 'MFA_REQUIRED',
            resourceType: 'AUTH',
            ipAddress: ipAddress || 'unknown',
            userAgent: userAgent || 'unknown',
            details: JSON.stringify({
              timestamp: new Date().toISOString(),
              email: user.email,
              mfaMethod: user.mfaMethod || 'totp'
            })
          }
        });
      } catch (logError) {
        logger.error('Failed to log MFA requirement', { error: logError });
      }

      return {
        token: tempToken,
        user: {
          id: user.id,
          name: user.name,
          preferredName: user.preferredName,
          email: user.email,
          role: user.role,
          sessionVersion: user.sessionVersion,
          permissions: [],
          hasAdminAccess: false,
          judgeId: user.judgeId,
          contestantId: user.contestantId,
          gender: user.gender,
          pronouns: user.pronouns,
          imagePath: user.imagePath,
          tenantId: user.tenantId,
          tenant: user.tenant ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug
          } : null
        },
        requiresMFA: true,
        requiresMFASetup: requiresMfaSetup,
        mfaProviders: availableProviders,
        tempToken: tempToken,
        message: requiresMfaSetup
          ? 'Tenant policy requires MFA enrollment before login. Complete setup to continue.'
          : 'Please provide MFA code to complete login'
      };
    }

    // Update last login timestamp (only if MFA not required or after MFA verification)
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Invalidate user cache
    userCache.invalidate(user.id);

    // Determine token expiration (super admin/admin/organizer get longer sessions)
    const tokenExpiresIn: string = (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'ORGANIZER')
      ? '1h'
      : (JWT_EXPIRES_IN as string);

    // Generate JWT token
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion,
      tenantId: user.tenantId
    };

    const token = jwt.sign(payload, JWT_SECRET as string, { expiresIn: tokenExpiresIn } as jwt.SignOptions);

    // Get user permissions
    const permissions = await getRolePermissions(user.role, user.tenantId);
    const hasAdminAccess = isAdmin(user.role);

    // Log login activity
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'LOGIN',
          resourceType: 'AUTH',
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          details: JSON.stringify({
            timestamp: new Date().toISOString(),
            email: user.email
          })
        }
      });
    } catch (logError) {
      // Don't fail login if logging fails
      logger.error('Failed to log login activity', { error: logError });
    }

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        preferredName: user.preferredName,
        email: user.email,
        role: user.role,
        sessionVersion: user.sessionVersion,
        permissions,
        hasAdminAccess,
        judgeId: user.judgeId,
        contestantId: user.contestantId,
        gender: user.gender,
        pronouns: user.pronouns,
        imagePath: user.imagePath,
        tenantId: user.tenantId,
        tenant: user.tenant ? {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug
        } : null
      }
    };
  }

  async requestMfaChallenge(tempToken: string, provider: 'SMS' | 'EMAIL'): Promise<{ provider: 'SMS' | 'EMAIL'; destination: string }> {
    if (!tempToken || !provider) {
      throw new Error('Temporary token and MFA provider are required');
    }

    let payload: TokenPayload;
    try {
      payload = jwt.verify(tempToken, JWT_SECRET as string) as TokenPayload;
    } catch {
      throw new Error('Invalid or expired MFA session');
    }

    if (!payload.tempAuth) {
      throw new Error('Invalid MFA session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        tenantId: true,
        isActive: true,
        mfaEnabled: true,
        mfaMethod: true
      }
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid MFA session');
    }

    const policy = await this.getTenantMfaPolicy(user.tenantId);
    const allowed = this.resolveAllowedMfaProviders(user, policy);
    if (!allowed.includes(provider)) {
      throw new Error(`${provider} is not allowed by tenant MFA policy.`);
    }

    const code = this.generateSixDigitCode();
    this.mfaChallengeCache.set(this.getChallengeCacheKey(user.id, provider), {
      code,
      userId: user.id,
      provider,
    } satisfies MfaChallengeRecord);

    if (provider === 'EMAIL') {
      await this.emailService.sendEmail(
        user.email,
        'Your MFA verification code',
        `Your Event Manager verification code is ${code}. It expires in 5 minutes.`
      );
      return { provider, destination: user.email };
    }

    if (!user.phone) {
      throw new Error('A phone number is required to use SMS MFA.');
    }

    await this.smsService.sendSMS(
      user.phone,
      `Your verification code is ${code}. It expires in 5 minutes.`
    );
    return { provider, destination: user.phone };
  }

  async completeMfaLogin(
    tempToken: string,
    verificationCode: string,
    provider: 'TOTP' | 'SMS' | 'EMAIL' = 'TOTP',
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    if (!tempToken || !verificationCode) {
      throw new Error('Temporary token and MFA verification code are required');
    }

    let payload: TokenPayload;
    try {
      payload = jwt.verify(tempToken, JWT_SECRET as string) as TokenPayload;
    } catch {
      throw new Error('Invalid or expired MFA session');
    }

    if (!payload.tempAuth) {
      throw new Error('Invalid MFA session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        preferredName: true,
        email: true,
        role: true,
        sessionVersion: true,
        isActive: true,
        judgeId: true,
        contestantId: true,
        gender: true,
        pronouns: true,
        imagePath: true,
        tenantId: true,
        mfaEnabled: true,
        mfaMethod: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid MFA session');
    }

    const tenantMfaPolicy = await this.getTenantMfaPolicy(user.tenantId);
    const allowedProviders = this.resolveAllowedMfaProviders(user, tenantMfaPolicy);
    const normalizedProvider = provider.toUpperCase() as 'TOTP' | 'SMS' | 'EMAIL';
    if (!allowedProviders.includes(normalizedProvider)) {
      throw new Error(`${normalizedProvider} is not allowed by tenant MFA policy.`);
    }

    if (normalizedProvider === 'TOTP') {
      if (!user.mfaEnabled) {
        throw new Error('TOTP MFA enrollment is required before completing login');
      }

      const verification = await this.mfaService.verifyMFAToken(user.id, verificationCode);
      if (!verification.success) {
        throw new Error(verification.message || 'MFA verification failed');
      }
    } else {
      const key = this.getChallengeCacheKey(user.id, normalizedProvider);
      const record = this.mfaChallengeCache.get<MfaChallengeRecord>(key);
      if (!record || record.code !== verificationCode.trim()) {
        throw new Error('Invalid or expired verification code');
      }
      this.mfaChallengeCache.del(key);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    userCache.invalidate(user.id);

    const tokenExpiresIn: string = (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'ORGANIZER')
      ? '1h'
      : (JWT_EXPIRES_IN as string);

    const fullPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion,
      tenantId: user.tenantId
    };

    const token = jwt.sign(fullPayload, JWT_SECRET as string, { expiresIn: tokenExpiresIn } as jwt.SignOptions);
    const profile = await this.getProfile(user.id);

    try {
      await this.prisma.activityLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'LOGIN',
          resourceType: 'AUTH',
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          details: JSON.stringify({
            timestamp: new Date().toISOString(),
            email: user.email,
            mfaCompleted: true
          })
        }
      });
    } catch (logError) {
      logger.error('Failed to log MFA-complete login activity', { error: logError });
    }

    return { token, user: profile };
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        preferredName: true,
        email: true,
        role: true,
        sessionVersion: true,
        judgeId: true,
        contestantId: true,
        gender: true,
        pronouns: true,
        imagePath: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const permissions = await getRolePermissions(user.role, user.tenantId);
    const hasAdminAccess = isAdmin(user.role);

    return {
      id: user.id,
      name: user.name,
      preferredName: user.preferredName,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion,
      permissions,
      hasAdminAccess,
      judgeId: user.judgeId,
      contestantId: user.contestantId,
      gender: user.gender,
      pronouns: user.pronouns,
      imagePath: user.imagePath,
      tenantId: user.tenantId,
      tenant: user.tenant ? {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug
      } : null
    };
  }

  /**
   * Get user permissions
   */
  async getPermissions(userId: string): Promise<UserPermissions> {
    const user: UserBasic | null = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const permissions = await getRolePermissions(user.role, user.tenantId);
    const hasAdminAccess = isAdmin(user.role);

    return {
      role: user.role,
      permissions,
      hasAdminAccess,
      permissionsMatrix: PERMISSIONS
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      // Log token verification failure
      try {
        const errorLogService = container.resolve(ErrorLogService);
        errorLogService.logException(
          error as Error,
          'AuthService:verifyToken',
          {
            tokenLength: token?.length,
            errorMessage: (error as Error).message,
          }
        ).catch(logError => {
          logger.error('Failed to log token verification error', { error: logError });
        });
      } catch (logError) {
        logger.error('Failed to log token verification error', { error: logError });
      }
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    const user: UserBasic | null = await this.prisma.user.findFirst({
      where: { email }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    this.resetTokenCache.set(resetToken, user.id);

    // Send password reset email (non-blocking)
    const resetUrl = `${env.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    this.emailService.sendPasswordResetEmail(
      user.email,
      user.preferredName || user.name,
      resetUrl
    ).catch(error => {
      logger.error('Failed to send password reset email', { error });
      // Don't throw - token generation should succeed even if email fails
    });

    return resetToken;
  }

  /**
   * Validate password reset token
   */
  validatePasswordResetToken(token: string): string | undefined {
    return this.resetTokenCache.get(token);
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = this.validatePasswordResetToken(token);

    if (!userId) {
      throw new Error('Invalid or expired reset token');
    }

    // Get user info for password similarity check
    const user: UserBasic | null = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate password complexity
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      throw new Error(`Password does not meet complexity requirements: ${validation.errors.join(', ')}`);
    }

    // Check if password is too similar to user information
    if (isPasswordSimilarToUserInfo(newPassword, {
      name: user.name,
      email: user.email
    })) {
      throw new Error('Password is too similar to your personal information');
    }

    // P2-5: Check password history
    if (await this.isPasswordInHistory(userId, newPassword, 5)) {
      throw new Error('Password has been used recently. Please choose a different password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        sessionVersion: { increment: 1 }
      }
    });

    // P2-5: Save password to history
    await this.savePasswordToHistory(userId, hashedPassword);

    // Invalidate the token after use
    this.resetTokenCache.del(token);
    userCache.invalidate(userId);
  }

  /**
   * Complete invitation-based registration (invite-only)
   */
  async completeInvitationRegistration(token: string, password: string): Promise<void> {
    let payload: InvitationRegistrationTokenPayload;

    try {
      payload = jwt.verify(token, JWT_SECRET) as InvitationRegistrationTokenPayload;
    } catch (_error) {
      throw new Error('Invalid or expired invitation token');
    }

    if (!payload || payload.type !== 'INVITE_REGISTRATION' || !payload.userId || !payload.tenantId) {
      throw new Error('Invalid invitation token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user || user.tenantId !== payload.tenantId || user.email !== payload.email) {
      throw new Error('Invitation user not found');
    }

    if (user.isActive) {
      throw new Error('Invitation has already been completed');
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      throw new Error(`Password does not meet complexity requirements: ${validation.errors.join(', ')}`);
    }

    if (isPasswordSimilarToUserInfo(password, {
      name: user.name,
      email: user.email
    })) {
      throw new Error('Password is too similar to your personal information');
    }

    if (await this.isPasswordInHistory(user.id, password, 5)) {
      throw new Error('Password has been used recently. Please choose a different password');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isActive: true,
        sessionVersion: { increment: 1 }
      }
    });

    await this.savePasswordToHistory(user.id, hashedPassword);
    userCache.invalidate(user.id);
  }

  /**
   * Change user password (authenticated)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user: UserBasic | null = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    if (!await bcrypt.compare(currentPassword, user.password)) {
      throw new Error('Current password is incorrect');
    }

    // Validate password complexity
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      throw new Error(`Password does not meet complexity requirements: ${validation.errors.join(', ')}`);
    }

    // Check if password is too similar to user information
    if (isPasswordSimilarToUserInfo(newPassword, {
      name: user.name,
      email: user.email
    })) {
      throw new Error('Password is too similar to your personal information');
    }

    // Check if new password is the same as current password
    if (await bcrypt.compare(newPassword, user.password)) {
      throw new Error('New password must be different from current password');
    }

    // P2-5: Check password history
    if (await this.isPasswordInHistory(userId, newPassword, 5)) {
      throw new Error('Password has been used recently. Please choose a different password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        sessionVersion: { increment: 1 }
      }
    });

    // P2-5: Save password to history
    await this.savePasswordToHistory(userId, hashedPassword);

    userCache.invalidate(userId);
  }

  /**
   * Invalidate all user sessions
   */
  async invalidateAllSessions(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        sessionVersion: { increment: 1 }
      }
    });

    userCache.invalidate(userId);
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user: UserBasic | null = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return false;
    }

    const permissions = await getRolePermissions(user.role, user.tenantId);
    return permissions.includes(permission);
  }
}
