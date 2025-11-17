"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const tsyringe_1 = require("tsyringe");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const node_cache_1 = __importDefault(require("node-cache"));
const client_1 = require("@prisma/client");
const permissions_1 = require("../middleware/permissions");
const cache_1 = require("../utils/cache");
const passwordValidator_1 = require("../utils/passwordValidator");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const RESET_TOKEN_TTL_SECONDS = 10 * 60;
let AuthService = class AuthService {
    prisma;
    resetTokenCache;
    constructor(prisma) {
        this.prisma = prisma;
        this.resetTokenCache = new node_cache_1.default({
            stdTTL: RESET_TOKEN_TTL_SECONDS,
            checkperiod: 120
        });
    }
    async login(credentials, ipAddress, userAgent) {
        const { email, password } = credentials;
        if (!email || !password) {
            throw new Error('Email and password are required');
        }
        const user = await this.prisma.user.findFirst({
            where: { email }
        });
        if (!user || !await bcryptjs_1.default.compare(password, user.password)) {
            throw new Error('Invalid credentials');
        }
        if (!user.isActive) {
            throw new Error('Account is inactive');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });
        cache_1.userCache.invalidate(user.id);
        const tokenExpiresIn = (user.role === 'ADMIN' || user.role === 'ORGANIZER')
            ? '1h'
            : JWT_EXPIRES_IN;
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            sessionVersion: user.sessionVersion
        };
        const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: tokenExpiresIn });
        const permissions = (0, permissions_1.getRolePermissions)(user.role);
        const hasAdminAccess = (0, permissions_1.isAdmin)(user.role);
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
        }
        catch (logError) {
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
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new Error('User not found');
        }
        const permissions = (0, permissions_1.getRolePermissions)(user.role);
        const hasAdminAccess = (0, permissions_1.isAdmin)(user.role);
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
    async getPermissions(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new Error('User not found');
        }
        const permissions = (0, permissions_1.getRolePermissions)(user.role);
        const hasAdminAccess = (0, permissions_1.isAdmin)(user.role);
        return {
            role: user.role,
            permissions,
            hasAdminAccess,
            permissionsMatrix: permissions_1.PERMISSIONS
        };
    }
    verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
    async generatePasswordResetToken(email) {
        const user = await this.prisma.user.findFirst({
            where: { email }
        });
        if (!user) {
            throw new Error('User not found');
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        this.resetTokenCache.set(resetToken, user.id);
        return resetToken;
    }
    validatePasswordResetToken(token) {
        return this.resetTokenCache.get(token);
    }
    async resetPassword(token, newPassword) {
        const userId = this.validatePasswordResetToken(token);
        if (!userId) {
            throw new Error('Invalid or expired reset token');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new Error('User not found');
        }
        const validation = (0, passwordValidator_1.validatePassword)(newPassword);
        if (!validation.isValid) {
            throw new Error(`Password does not meet complexity requirements: ${validation.errors.join(', ')}`);
        }
        if ((0, passwordValidator_1.isPasswordSimilarToUserInfo)(newPassword, {
            name: user.name,
            email: user.email
        })) {
            throw new Error('Password is too similar to your personal information');
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                sessionVersion: { increment: 1 }
            }
        });
        this.resetTokenCache.del(token);
        cache_1.userCache.invalidate(userId);
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new Error('User not found');
        }
        if (!await bcryptjs_1.default.compare(currentPassword, user.password)) {
            throw new Error('Current password is incorrect');
        }
        const validation = (0, passwordValidator_1.validatePassword)(newPassword);
        if (!validation.isValid) {
            throw new Error(`Password does not meet complexity requirements: ${validation.errors.join(', ')}`);
        }
        if ((0, passwordValidator_1.isPasswordSimilarToUserInfo)(newPassword, {
            name: user.name,
            email: user.email
        })) {
            throw new Error('Password is too similar to your personal information');
        }
        if (await bcryptjs_1.default.compare(newPassword, user.password)) {
            throw new Error('New password must be different from current password');
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                sessionVersion: { increment: 1 }
            }
        });
        cache_1.userCache.invalidate(userId);
    }
    async invalidateAllSessions(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                sessionVersion: { increment: 1 }
            }
        });
        cache_1.userCache.invalidate(userId);
    }
    async hasPermission(userId, permission) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return false;
        }
        const permissions = (0, permissions_1.getRolePermissions)(user.role);
        return permissions.includes(permission);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], AuthService);
//# sourceMappingURL=AuthService.js.map