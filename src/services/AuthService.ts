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
}

@injectable()
export class AuthService {
  private resetTokenCache: NodeCache;

  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(EmailService) private emailService: EmailService
  ) {
    this.resetTokenCache = new NodeCache({
      stdTTL: RESET_TOKEN_TTL_SECONDS,
      checkperiod: 120
    });
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

    // Find user with related data including tenant info
    // If logging in from default tenant context (e.g., /login without slug),
    // first try to find the user by email in any tenant
    let user = await this.prisma.user.findFirst({
      where: {
        email,
        tenantId
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    // If not found in specified tenant and we're using default tenant,
    // try to find user by email in any active tenant
    if (!user && tenantId === 'default_tenant') {
      user = await this.prisma.user.findFirst({
        where: {
          email,
          isActive: true,
          tenant: { isActive: true }
        },
        include: {
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

    // Update last login timestamp
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

    const token = jwt.sign(payload, JWT_SECRET as string, { expiresIn: tokenExpiresIn } as any);

    // Get user permissions
    const permissions = getRolePermissions(user.role);
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

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user: UserBasic | null = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const permissions = getRolePermissions(user.role);
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
      imagePath: user.imagePath
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

    const permissions = getRolePermissions(user.role);
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

    const permissions = getRolePermissions(user.role);
    return permissions.includes(permission);
  }
}
