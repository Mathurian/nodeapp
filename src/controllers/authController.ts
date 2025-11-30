/**
 * Auth Controller - TypeScript
 * Handles HTTP requests for authentication
 * Delegates business logic to AuthService
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthController');
import { container } from 'tsyringe';
import { AuthService } from '../services/AuthService';
import { AuditLogService } from '../services/AuditLogService';
import { sendSuccess, sendUnauthorized, sendBadRequest, sendNotFound } from '../utils/responseHelpers';
import { createRequestLogger } from '../utils/logger';
import { env } from '../config/env';

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
      const tenantId = req.tenantId;

      if (!tenantId) {
        log.warn('Login failed: missing tenant context');
        return sendBadRequest(res, 'Tenant context is required');
      }

      const result = await this.authService.login(
        { email, password },
        tenantId,
        ipAddress,
        userAgent
      );

      log.info('Login successful', {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role
      });

      // Audit log: successful login
      try {
        const auditLogService = container.resolve(AuditLogService);
        await auditLogService.logAuth({
          action: 'login',
          userId: result.user.id,
          userName: result.user.email,
          req,
          tenantId: tenantId,
          metadata: { role: result.user.role }
        });
      } catch (auditError) {
        log.error('Failed to log authentication audit', { error: auditError });
      }

      // Set token as httpOnly cookie instead of returning it
      res.cookie('access_token', result.token, {
        httpOnly: true, // Prevents XSS attacks by making cookie inaccessible to JavaScript
        secure: env.isProduction(), // HTTPS only in production
        sameSite: 'strict', // CSRF protection
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      // Return user data only (not the token)
      return sendSuccess(res, { user: result.user }, 'Login successful');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      log.error('Login error', {
        error: errorMessage,
        stack: errorStack,
        email: req.body?.email,
        origin: req.headers?.origin,
        host: req.headers?.host,
        userAgent: req.headers?.['user-agent'],
        ip: req.ip || req.connection?.remoteAddress,
        csrfHeader: req.headers?.['x-csrf-token'] ? 'present' : 'missing',
        csrfCookie: req.cookies?.['_csrf'] ? 'present' : 'missing'
      });

      // Log to console for debugging
      logger.error('Login error details', {
        error: errorMessage,
        origin: req.headers?.origin,
        host: req.headers?.host,
        ip: req.ip,
        hasCsrfToken: !!req.headers?.['x-csrf-token'],
        hasCsrfCookie: !!req.cookies?.['_csrf'],
        email: req.body?.email
      });

      if (errorMessage === 'Invalid credentials') {
        // Audit log: failed login attempt
        try {
          const auditLogService = container.resolve(AuditLogService);
          const tenantId = req.tenantId || 'default_tenant';
          await auditLogService.logAuth({
            action: 'failed_login',
            userName: req.body?.email,
            req,
            tenantId: tenantId,
            metadata: { reason: 'Invalid credentials' }
          });
        } catch (auditError) {
          log.error('Failed to log failed login audit', { error: auditError });
        }
        return sendUnauthorized(res, 'Invalid credentials');
      }

      if (errorMessage === 'Account is inactive') {
        // Audit log: failed login attempt (inactive account)
        try {
          const auditLogService = container.resolve(AuditLogService);
          const tenantId = req.tenantId || 'default_tenant';
          await auditLogService.logAuth({
            action: 'failed_login',
            userName: req.body?.email,
            req,
            tenantId: tenantId,
            metadata: { reason: 'Account is inactive' }
          });
        } catch (auditError) {
          log.error('Failed to log failed login audit', { error: auditError });
        }
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
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res, 'User not authenticated');
      }

      log.debug('Fetching user profile', { userId });

      const profile = await this.authService.getProfile(userId);

      log.debug('Profile fetched successfully', { userId, role: profile.role });

      return sendSuccess(res, profile, 'Profile retrieved successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      log.error('Profile error', {
        error: errorMessage,
        stack: errorStack,
        userId: req.user?.id
      });

      if (errorMessage === 'User not found') {
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
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res, 'User not authenticated');
      }

      log.debug('Fetching user permissions', { userId });

      const permissions = await this.authService.getPermissions(userId);

      log.debug('Permissions fetched successfully', { userId, role: permissions.role });

      return sendSuccess(res, permissions, 'Permissions retrieved successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      log.error('Get permissions error', {
        error: errorMessage,
        stack: errorStack,
        userId: req.user?.id
      });

      if (errorMessage === 'User not found') {
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

      // Audit log: password reset request
      try {
        const auditLogService = container.resolve(AuditLogService);
        const tenantId = (req as any).tenantId || 'default_tenant';
        await auditLogService.logAuth({
          action: 'password_reset',
          userName: email,
          req,
          tenantId: tenantId,
          metadata: { action_type: 'request' }
        });
      } catch (auditError) {
        log.error('Failed to log password reset request audit', { error: auditError });
      }

      // Token sent via email only - never expose in response
      log.info('Password reset token generated', { email });

      return sendSuccess(
        res,
        {}, // Empty object - token only sent via email for security
        'If the email exists, password reset instructions have been sent'
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Password reset request error', {
        error: errorMessage,
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

      // Audit log: password reset completion
      try {
        const auditLogService = container.resolve(AuditLogService);
        const tenantId = (req as any).tenantId || 'default_tenant';
        await auditLogService.logAuth({
          action: 'password_reset',
          req,
          tenantId: tenantId,
          metadata: { action_type: 'completion' }
        });
      } catch (auditError) {
        log.error('Failed to log password reset completion audit', { error: auditError });
      }

      log.info('Password reset successful');

      return sendSuccess(res, {}, 'Password reset successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Password reset error', { error: errorMessage });

      if (errorMessage === 'Invalid or expired reset token') {
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
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return sendUnauthorized(res, 'User not authenticated');
      }

      if (!currentPassword || !newPassword) {
        return sendBadRequest(res, 'Current password and new password are required');
      }

      log.debug('Password change attempt', { userId });

      await this.authService.changePassword(userId, currentPassword, newPassword);

      // Audit log: password change
      try {
        const auditLogService = container.resolve(AuditLogService);
        const tenantId = (req as any).tenantId || 'default_tenant';
        await auditLogService.logAuth({
          action: 'password_reset',
          userId: userId,
          userName: req.user?.name || req.user?.email,
          req,
          tenantId: tenantId,
          metadata: { action_type: 'change', initiated_by_user: true }
        });
      } catch (auditError) {
        log.error('Failed to log password change audit', { error: auditError });
      }

      log.info('Password changed successfully', { userId });

      return sendSuccess(res, {}, 'Password changed successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Password change error', {
        error: errorMessage,
        userId: req.user?.id
      });

      if (errorMessage === 'Current password is incorrect') {
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
      const userId = req.user?.id;

      if (userId) {
        log.debug('User logout', { userId });

        // Audit log: logout
        try {
          const auditLogService = container.resolve(AuditLogService);
          const tenantId = (req as any).tenantId || 'default_tenant';
          await auditLogService.logAuth({
            action: 'logout',
            userId: userId,
            userName: req.user?.name || req.user?.email,
            req,
            tenantId: tenantId,
            metadata: { role: req.user?.role }
          });
        } catch (auditError) {
          log.error('Failed to log logout audit', { error: auditError });
        }

        log.info('User logged out successfully', { userId });
      }

      // Clear the httpOnly cookie
      res.clearCookie('access_token', {
        httpOnly: true,
        secure: env.isProduction(),
        sameSite: 'strict',
        path: '/',
      });

      return sendSuccess(res, {}, 'Logged out successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Logout error', { error: errorMessage });
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
