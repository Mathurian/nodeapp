/**
 * Auth Controller - TypeScript
 * Handles HTTP requests for authentication
 * Delegates business logic to AuthService
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { AuthService } from '../services/AuthService';
import { sendSuccess, sendUnauthorized, sendBadRequest, sendNotFound } from '../utils/responseHelpers';
import { createRequestLogger } from '../utils/logger';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = container.resolve(AuthService);
  }

  /**
   * Login user and generate JWT token
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const log = createRequestLogger(req, 'auth');

    try {
      const { email, password } = req.body;

      log.debug('Login attempt', { email });

      if (!email || !password) {
        log.warn('Login failed: missing credentials', { email });
        return sendBadRequest(res, 'Email and password are required');
      }

      const ipAddress = req.ip || req.connection?.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await this.authService.login(
        { email, password },
        ipAddress,
        userAgent
      );

      log.info('Login successful', {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role
      });

      // Set token as httpOnly cookie instead of returning it
      res.cookie('access_token', result.token, {
        httpOnly: true, // Prevents XSS attacks by making cookie inaccessible to JavaScript
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // CSRF protection
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      // Return user data only (not the token)
      return sendSuccess(res, { user: result.user }, 'Login successful');
    } catch (error: any) {
      log.error('Login error', {
        error: error.message,
        stack: error.stack,
        email: req.body?.email,
        origin: req.headers?.origin,
        host: req.headers?.host,
        userAgent: req.headers?.['user-agent'],
        ip: req.ip || req.connection?.remoteAddress,
        csrfHeader: req.headers?.['x-csrf-token'] ? 'present' : 'missing',
        csrfCookie: req.cookies?._csrf ? 'present' : 'missing'
      });

      // Log to console for debugging
      console.error('Login error details:', {
        error: error.message,
        origin: req.headers?.origin,
        host: req.headers?.host,
        ip: req.ip,
        hasCsrfToken: !!req.headers?.['x-csrf-token'],
        hasCsrfCookie: !!req.cookies?._csrf,
        email: req.body?.email
      });

      if (error.message === 'Invalid credentials') {
        return sendUnauthorized(res, 'Invalid credentials');
      }

      if (error.message === 'Account is inactive') {
        return sendUnauthorized(res, 'Account is inactive');
      }

      return next(error);
    }
  };

  /**
   * Get current user profile
   */
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const log = createRequestLogger(req, 'auth');

    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return sendUnauthorized(res, 'User not authenticated');
      }

      log.debug('Fetching user profile', { userId });

      const profile = await this.authService.getProfile(userId);

      log.debug('Profile fetched successfully', { userId, role: profile.role });

      return sendSuccess(res, profile, 'Profile retrieved successfully');
    } catch (error: any) {
      log.error('Profile error', {
        error: error.message,
        stack: error.stack,
        userId: (req as any).user?.id
      });

      if (error.message === 'User not found') {
        return sendNotFound(res, 'User not found');
      }

      return next(error);
    }
  };

  /**
   * Get user permissions
   */
  getPermissions = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const log = createRequestLogger(req, 'auth');

    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return sendUnauthorized(res, 'User not authenticated');
      }

      log.debug('Fetching user permissions', { userId });

      const permissions = await this.authService.getPermissions(userId);

      log.debug('Permissions fetched successfully', { userId, role: permissions.role });

      return sendSuccess(res, permissions, 'Permissions retrieved successfully');
    } catch (error: any) {
      log.error('Get permissions error', {
        error: error.message,
        stack: error.stack,
        userId: (req as any).user?.id
      });

      if (error.message === 'User not found') {
        return sendNotFound(res, 'User not found');
      }

      return next(error);
    }
  };

  /**
   * Request password reset
   */
  requestPasswordReset = async (req: Request, res: Response): Promise<Response | void> => {
    const log = createRequestLogger(req, 'auth');

    try {
      const { email } = req.body;

      if (!email) {
        return sendBadRequest(res, 'Email is required');
      }

      log.debug('Password reset requested', { email });

      const resetToken = await this.authService.generatePasswordResetToken(email);

      // In production, send this via email
      // For now, return it (ONLY for development)
      log.info('Password reset token generated', { email });

      return sendSuccess(
        res,
        { resetToken }, // Remove this in production
        'Password reset instructions sent to email'
      );
    } catch (error: any) {
      log.error('Password reset request error', {
        error: error.message,
        email: req.body?.email
      });

      // Don't reveal if user exists or not
      return sendSuccess(
        res,
        {},
        'If the email exists, password reset instructions have been sent'
      );
    }
  };

  /**
   * Reset password using token
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const log = createRequestLogger(req, 'auth');

    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return sendBadRequest(res, 'Token and new password are required');
      }

      log.debug('Password reset attempt');

      await this.authService.resetPassword(token, newPassword);

      log.info('Password reset successful');

      return sendSuccess(res, {}, 'Password reset successfully');
    } catch (error: any) {
      log.error('Password reset error', { error: error.message });

      if (error.message === 'Invalid or expired reset token') {
        return sendBadRequest(res, 'Invalid or expired reset token');
      }

      return next(error);
    }
  };

  /**
   * Change password (authenticated user)
   */
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const log = createRequestLogger(req, 'auth');

    try {
      const userId = (req as any).user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return sendUnauthorized(res, 'User not authenticated');
      }

      if (!currentPassword || !newPassword) {
        return sendBadRequest(res, 'Current password and new password are required');
      }

      log.debug('Password change attempt', { userId });

      await this.authService.changePassword(userId, currentPassword, newPassword);

      log.info('Password changed successfully', { userId });

      return sendSuccess(res, {}, 'Password changed successfully');
    } catch (error: any) {
      log.error('Password change error', {
        error: error.message,
        userId: (req as any).user?.id
      });

      if (error.message === 'Current password is incorrect') {
        return sendBadRequest(res, 'Current password is incorrect');
      }

      return next(error);
    }
  };

  /**
   * Logout (invalidate session)
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const log = createRequestLogger(req, 'auth');

    try {
      const userId = (req as any).user?.id;

      if (userId) {
        log.debug('User logout', { userId });

        // Log logout activity
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        try {
          await prisma.activityLog.create({
            data: {
              userId,
              userName: (req as any).user?.name || 'Unknown',
              userRole: (req as any).user?.role || 'UNKNOWN',
              action: 'LOGOUT',
              resourceType: 'AUTH',
              ipAddress: req.ip || 'unknown',
              userAgent: req.get('User-Agent') || 'unknown',
              details: {
                timestamp: new Date().toISOString()
              }
            }
          });
        } catch (logError) {
          console.error('Failed to log logout activity:', logError);
        }

        log.info('User logged out successfully', { userId });
      }

      // Clear the httpOnly cookie
      res.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      return sendSuccess(res, {}, 'Logged out successfully');
    } catch (error: any) {
      log.error('Logout error', { error: error.message });
      return next(error);
    }
  };
}

// Export controller instance and methods
const controller = new AuthController();
export const login = controller.login;
export const getProfile = controller.getProfile;
export const getPermissions = controller.getPermissions;
export const requestPasswordReset = controller.requestPasswordReset;
export const resetPassword = controller.resetPassword;
export const changePassword = controller.changePassword;
export const logout = controller.logout;

// Aliases for backward compatibility with routes
export const forgotPassword = controller.requestPasswordReset;
export const resetPasswordWithToken = controller.resetPassword;

export default controller;
