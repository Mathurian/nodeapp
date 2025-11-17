/**
 * Auth Service
 * Handles authentication business logic including login, token management,
 * password resets, and permission checks
 */

import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import NodeCache from 'node-cache';
import { PrismaClient } from '@prisma/client';
import { PERMISSIONS, getRolePermissions, isAdmin } from '../middleware/permissions';
import { userCache } from '../utils/cache';
import { validatePassword, isPasswordSimilarToUserInfo } from '../utils/passwordValidator';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const RESET_TOKEN_TTL_SECONDS = 10 * 60; // 10 minutes

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResult {
  token: string;
  user: any;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionVersion: number;
}

@injectable()
export class AuthService {
  private resetTokenCache: NodeCache;

  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {
    this.resetTokenCache = new NodeCache({
      stdTTL: RESET_TOKEN_TTL_SECONDS,
      checkperiod: 120
    });
  }

  /**
   * Authenticate user and generate JWT token
   */
  async login(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    const { email, password } = credentials;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user with related data
    // Note: For multi-tenancy, we should ideally pass tenantId here
    // For now, find by email (this may need tenant context in production)
    const user = await this.prisma.user.findFirst({
      where: { email }
    });

    // Validate credentials
    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Invalidate user cache
    userCache.invalidate(user.id);

    // Determine token expiration (admin/organizer get longer sessions)
    const tokenExpiresIn = (user.role === 'ADMIN' || user.role === 'ORGANIZER')
      ? '1h'
      : JWT_EXPIRES_IN;

    // Generate JWT token
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: tokenExpiresIn } as any);

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
      console.error('Failed to log login activity:', logError);
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
        tenantId: user.tenantId
      }
    };
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
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
      pronouns: user.pronouns
    };
  }

  /**
   * Get user permissions
   */
  async getPermissions(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
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
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { email }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    this.resetTokenCache.set(resetToken, user.id);

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
    const user = await this.prisma.user.findUnique({
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        sessionVersion: { increment: 1 }
      }
    });

    // Invalidate the token after use
    this.resetTokenCache.del(token);
    userCache.invalidate(userId);
  }

  /**
   * Change user password (authenticated)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        sessionVersion: { increment: 1 }
      }
    });

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
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return false;
    }

    const permissions = getRolePermissions(user.role);
    return permissions.includes(permission);
  }
}
