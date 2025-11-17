"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordWithToken = exports.forgotPassword = exports.logout = exports.changePassword = exports.resetPassword = exports.requestPasswordReset = exports.getPermissions = exports.getProfile = exports.login = exports.AuthController = void 0;
const tsyringe_1 = require("tsyringe");
const AuthService_1 = require("../services/AuthService");
const responseHelpers_1 = require("../utils/responseHelpers");
const logger_1 = require("../utils/logger");
class AuthController {
    authService;
    constructor() {
        this.authService = tsyringe_1.container.resolve(AuthService_1.AuthService);
    }
    login = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auth');
        try {
            const { email, password } = req.body;
            log.debug('Login attempt', { email });
            if (!email || !password) {
                log.warn('Login failed: missing credentials', { email });
                return (0, responseHelpers_1.sendBadRequest)(res, 'Email and password are required');
            }
            const ipAddress = req.ip || req.connection?.remoteAddress;
            const userAgent = req.get('User-Agent');
            const result = await this.authService.login({ email, password }, ipAddress, userAgent);
            log.info('Login successful', {
                userId: result.user.id,
                email: result.user.email,
                role: result.user.role
            });
            res.cookie('access_token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000,
                path: '/',
            });
            return (0, responseHelpers_1.sendSuccess)(res, { user: result.user }, 'Login successful');
        }
        catch (error) {
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
                return (0, responseHelpers_1.sendUnauthorized)(res, 'Invalid credentials');
            }
            if (error.message === 'Account is inactive') {
                return (0, responseHelpers_1.sendUnauthorized)(res, 'Account is inactive');
            }
            next(error);
        }
    };
    getProfile = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auth');
        try {
            const userId = req.user?.id;
            if (!userId) {
                return (0, responseHelpers_1.sendUnauthorized)(res, 'User not authenticated');
            }
            log.debug('Fetching user profile', { userId });
            const profile = await this.authService.getProfile(userId);
            log.debug('Profile fetched successfully', { userId, role: profile.role });
            return (0, responseHelpers_1.sendSuccess)(res, profile, 'Profile retrieved successfully');
        }
        catch (error) {
            log.error('Profile error', {
                error: error.message,
                stack: error.stack,
                userId: req.user?.id
            });
            if (error.message === 'User not found') {
                return (0, responseHelpers_1.sendNotFound)(res, 'User not found');
            }
            next(error);
        }
    };
    getPermissions = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auth');
        try {
            const userId = req.user?.id;
            if (!userId) {
                return (0, responseHelpers_1.sendUnauthorized)(res, 'User not authenticated');
            }
            log.debug('Fetching user permissions', { userId });
            const permissions = await this.authService.getPermissions(userId);
            log.debug('Permissions fetched successfully', { userId, role: permissions.role });
            return (0, responseHelpers_1.sendSuccess)(res, permissions, 'Permissions retrieved successfully');
        }
        catch (error) {
            log.error('Get permissions error', {
                error: error.message,
                stack: error.stack,
                userId: req.user?.id
            });
            if (error.message === 'User not found') {
                return (0, responseHelpers_1.sendNotFound)(res, 'User not found');
            }
            next(error);
        }
    };
    requestPasswordReset = async (req, res) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auth');
        try {
            const { email } = req.body;
            if (!email) {
                return (0, responseHelpers_1.sendBadRequest)(res, 'Email is required');
            }
            log.debug('Password reset requested', { email });
            const resetToken = await this.authService.generatePasswordResetToken(email);
            log.info('Password reset token generated', { email });
            return (0, responseHelpers_1.sendSuccess)(res, { resetToken }, 'Password reset instructions sent to email');
        }
        catch (error) {
            log.error('Password reset request error', {
                error: error.message,
                email: req.body?.email
            });
            return (0, responseHelpers_1.sendSuccess)(res, {}, 'If the email exists, password reset instructions have been sent');
        }
    };
    resetPassword = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auth');
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                return (0, responseHelpers_1.sendBadRequest)(res, 'Token and new password are required');
            }
            log.debug('Password reset attempt');
            await this.authService.resetPassword(token, newPassword);
            log.info('Password reset successful');
            return (0, responseHelpers_1.sendSuccess)(res, {}, 'Password reset successfully');
        }
        catch (error) {
            log.error('Password reset error', { error: error.message });
            if (error.message === 'Invalid or expired reset token') {
                return (0, responseHelpers_1.sendBadRequest)(res, 'Invalid or expired reset token');
            }
            next(error);
        }
    };
    changePassword = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auth');
        try {
            const userId = req.user?.id;
            const { currentPassword, newPassword } = req.body;
            if (!userId) {
                return (0, responseHelpers_1.sendUnauthorized)(res, 'User not authenticated');
            }
            if (!currentPassword || !newPassword) {
                return (0, responseHelpers_1.sendBadRequest)(res, 'Current password and new password are required');
            }
            log.debug('Password change attempt', { userId });
            await this.authService.changePassword(userId, currentPassword, newPassword);
            log.info('Password changed successfully', { userId });
            return (0, responseHelpers_1.sendSuccess)(res, {}, 'Password changed successfully');
        }
        catch (error) {
            log.error('Password change error', {
                error: error.message,
                userId: req.user?.id
            });
            if (error.message === 'Current password is incorrect') {
                return (0, responseHelpers_1.sendBadRequest)(res, 'Current password is incorrect');
            }
            next(error);
        }
    };
    logout = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auth');
        try {
            const userId = req.user?.id;
            if (userId) {
                log.debug('User logout', { userId });
                const { PrismaClient } = require('@prisma/client');
                const prisma = new PrismaClient();
                try {
                    await prisma.activityLog.create({
                        data: {
                            userId,
                            userName: req.user?.name || 'Unknown',
                            userRole: req.user?.role || 'UNKNOWN',
                            action: 'LOGOUT',
                            resourceType: 'AUTH',
                            ipAddress: req.ip || 'unknown',
                            userAgent: req.get('User-Agent') || 'unknown',
                            details: {
                                timestamp: new Date().toISOString()
                            }
                        }
                    });
                }
                catch (logError) {
                    console.error('Failed to log logout activity:', logError);
                }
                log.info('User logged out successfully', { userId });
            }
            res.clearCookie('access_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
            });
            return (0, responseHelpers_1.sendSuccess)(res, {}, 'Logged out successfully');
        }
        catch (error) {
            log.error('Logout error', { error: error.message });
            next(error);
        }
    };
}
exports.AuthController = AuthController;
const controller = new AuthController();
exports.login = controller.login;
exports.getProfile = controller.getProfile;
exports.getPermissions = controller.getPermissions;
exports.requestPasswordReset = controller.requestPasswordReset;
exports.resetPassword = controller.resetPassword;
exports.changePassword = controller.changePassword;
exports.logout = controller.logout;
exports.forgotPassword = controller.requestPasswordReset;
exports.resetPasswordWithToken = controller.resetPassword;
exports.default = controller;
//# sourceMappingURL=authController.js.map