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
exports.UserService = void 0;
const client_1 = require("@prisma/client");
const tsyringe_1 = require("tsyringe");
const bcrypt_1 = __importDefault(require("bcrypt"));
const BaseService_1 = require("./BaseService");
const UserRepository_1 = require("../repositories/UserRepository");
const cache_1 = require("../utils/cache");
let UserService = class UserService extends BaseService_1.BaseService {
    userRepository;
    prisma;
    constructor(userRepository, prisma) {
        super();
        this.userRepository = userRepository;
        this.prisma = prisma;
    }
    async getAllUsers() {
        try {
            const users = await this.userRepository.findAll();
            return users.map(user => this.sanitizeUser(user));
        }
        catch (error) {
            this.handleError(error, { method: 'getAllUsers' });
        }
    }
    async getActiveUsers() {
        try {
            const users = await this.userRepository.findActiveUsers();
            return users.map(user => this.sanitizeUser(user));
        }
        catch (error) {
            this.handleError(error, { method: 'getActiveUsers' });
        }
    }
    async getUserById(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            this.assertExists(user, 'User', userId);
            return this.sanitizeUser(user);
        }
        catch (error) {
            this.handleError(error, { method: 'getUserById', userId });
        }
    }
    async getUserByName(name) {
        try {
            const user = await this.userRepository.findByName(name);
            return user ? this.sanitizeUser(user) : null;
        }
        catch (error) {
            this.handleError(error, { method: 'getUserByName', name });
        }
    }
    async getUserByEmail(email) {
        try {
            const user = await this.userRepository.findByEmail(email);
            return user ? this.sanitizeUser(user) : null;
        }
        catch (error) {
            this.handleError(error, { method: 'getUserByEmail', email });
        }
    }
    async getUsersByRole(role) {
        try {
            const users = await this.userRepository.findByRole(role);
            return users.map(user => this.sanitizeUser(user));
        }
        catch (error) {
            this.handleError(error, { method: 'getUsersByRole', role });
        }
    }
    async createUser(data) {
        try {
            this.validateRequired(data, ['name', 'email', 'password', 'role']);
            if (!this.isValidEmail(data.email)) {
                throw new BaseService_1.ValidationError('Invalid email format');
            }
            if (data.password.length < 8) {
                throw new BaseService_1.ValidationError('Password must be at least 8 characters long');
            }
            const existingUser = await this.userRepository.findByName(data.name);
            if (existingUser) {
                throw new BaseService_1.ConflictError('Name already exists');
            }
            const existingEmail = await this.userRepository.findByEmail(data.email);
            if (existingEmail) {
                throw new BaseService_1.ConflictError('Email already exists');
            }
            const hashedPassword = await bcrypt_1.default.hash(data.password, 10);
            const user = await this.userRepository.create({
                name: data.name,
                email: data.email,
                password: hashedPassword,
                preferredName: data.preferredName,
                role: data.role,
                isActive: true
            });
            this.logInfo('User created', { userId: user.id, name: user.name });
            await (0, cache_1.invalidateCache)('users:*');
            return this.sanitizeUser(user);
        }
        catch (error) {
            this.handleError(error, { method: 'createUser', name: data.name });
        }
    }
    async updateUser(userId, data) {
        try {
            const user = await this.userRepository.findById(userId);
            this.assertExists(user, 'User', userId);
            if (data.name && data.name !== user.name) {
                const existingUser = await this.userRepository.findByName(data.name);
                if (existingUser) {
                    throw new BaseService_1.ConflictError('Name already exists');
                }
            }
            if (data.email && data.email !== user.email) {
                if (!this.isValidEmail(data.email)) {
                    throw new BaseService_1.ValidationError('Invalid email format');
                }
                const existingEmail = await this.userRepository.findByEmail(data.email);
                if (existingEmail) {
                    throw new BaseService_1.ConflictError('Email already exists');
                }
            }
            const updatedUser = await this.userRepository.update(userId, data);
            this.logInfo('User updated', { userId, name: updatedUser.name });
            await (0, cache_1.invalidateCache)('users:*');
            await (0, cache_1.invalidateCache)(`user:${userId}`);
            return this.sanitizeUser(updatedUser);
        }
        catch (error) {
            this.handleError(error, { method: 'updateUser', userId });
        }
    }
    async changePassword(userId, data) {
        try {
            this.validateRequired(data, ['currentPassword', 'newPassword']);
            const user = await this.userRepository.findById(userId);
            this.assertExists(user, 'User', userId);
            const isValidPassword = await bcrypt_1.default.compare(data.currentPassword, user.password);
            if (!isValidPassword) {
                throw new BaseService_1.ValidationError('Current password is incorrect');
            }
            if (data.newPassword.length < 8) {
                throw new BaseService_1.ValidationError('New password must be at least 8 characters long');
            }
            const hashedPassword = await bcrypt_1.default.hash(data.newPassword, 10);
            await this.userRepository.updatePassword(userId, hashedPassword);
            this.logInfo('Password changed', { userId });
            await (0, cache_1.invalidateCache)(`user:${userId}`);
        }
        catch (error) {
            this.handleError(error, { method: 'changePassword', userId });
        }
    }
    async toggleUserActiveStatus(userId) {
        try {
            const user = await this.userRepository.toggleActiveStatus(userId);
            this.logInfo('User active status toggled', { userId, isActive: user.isActive });
            await (0, cache_1.invalidateCache)('users:*');
            await (0, cache_1.invalidateCache)(`user:${userId}`);
            return this.sanitizeUser(user);
        }
        catch (error) {
            this.handleError(error, { method: 'toggleUserActiveStatus', userId });
        }
    }
    async deleteUser(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            this.assertExists(user, 'User', userId);
            await this.userRepository.delete(userId);
            this.logInfo('User deleted', { userId });
            await (0, cache_1.invalidateCache)('users:*');
            await (0, cache_1.invalidateCache)(`user:${userId}`);
        }
        catch (error) {
            this.handleError(error, { method: 'deleteUser', userId });
        }
    }
    async searchUsers(query) {
        try {
            const users = await this.userRepository.searchUsers(query);
            return users.map(user => this.sanitizeUser(user));
        }
        catch (error) {
            this.handleError(error, { method: 'searchUsers', query });
        }
    }
    async getUserStats(userId) {
        try {
            return await this.userRepository.getUserStats(userId);
        }
        catch (error) {
            this.handleError(error, { method: 'getUserStats', userId });
        }
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    sanitizeUser(user) {
        const { password, ...sanitized } = user;
        return sanitized;
    }
    async updateUserImage(userId, imagePath) {
        try {
            const user = await this.userRepository.findById(userId);
            this.assertExists(user, 'User', userId);
            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: { imagePath }
            });
            cache_1.userCache.invalidate(userId);
            this.logInfo('User image updated', { userId, imagePath });
            return this.sanitizeUser(updatedUser);
        }
        catch (error) {
            this.handleError(error, { method: 'updateUserImage', userId });
        }
    }
    async resetUserPassword(userId, newPassword) {
        try {
            const user = await this.userRepository.findById(userId);
            this.assertExists(user, 'User', userId);
            const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
            await this.userRepository.updatePassword(userId, hashedPassword);
            cache_1.userCache.invalidate(userId);
            this.logInfo('User password reset', { userId });
        }
        catch (error) {
            this.handleError(error, { method: 'resetUserPassword', userId });
        }
    }
    async updateLastLogin(userId) {
        try {
            const user = await this.userRepository.updateLastLogin(userId);
            cache_1.userCache.invalidate(userId);
            return this.sanitizeUser(user);
        }
        catch (error) {
            this.handleError(error, { method: 'updateLastLogin', userId });
        }
    }
    async bulkDeleteUsers(userIds, forceDeleteAdmin = false) {
        try {
            if (!userIds || userIds.length === 0) {
                throw new BaseService_1.ValidationError('User IDs array is required');
            }
            const adminUsers = await this.prisma.user.findMany({
                where: {
                    id: { in: userIds },
                    role: { in: ['ADMIN', 'ORGANIZER'] }
                },
                select: { id: true, role: true }
            });
            if (adminUsers.length > 0 && !forceDeleteAdmin) {
                const adminUserIds = adminUsers.map(u => u.id);
                throw new BaseService_1.ValidationError(`Cannot delete admin/organizer users. Found ${adminUsers.length} protected user(s): ${adminUserIds.join(', ')}. Use forceDeleteAdmin flag to override.`);
            }
            const existingUsers = await this.prisma.user.findMany({
                where: {
                    id: { in: userIds }
                },
                select: { id: true }
            });
            const existingUserIds = existingUsers.map(u => u.id);
            const notFoundIds = userIds.filter(id => !existingUserIds.includes(id));
            if (existingUserIds.length === 0) {
                throw new BaseService_1.NotFoundError('Users', 'No users found with the provided IDs');
            }
            this.logInfo('Starting bulk delete transaction', {
                userIds: existingUserIds,
                count: existingUserIds.length,
                forceDeleteAdmin
            });
            const result = await this.prisma.$transaction(async (tx) => {
                await tx.activityLog.updateMany({
                    where: { userId: { in: existingUserIds } },
                    data: { userId: null }
                });
                await tx.systemSetting.updateMany({
                    where: { updatedBy: { in: existingUserIds } },
                    data: { updatedBy: null }
                });
                await tx.categoryType.updateMany({
                    where: { createdById: { in: existingUserIds } },
                    data: { createdById: null }
                });
                await tx.performanceLog.updateMany({
                    where: { userId: { in: existingUserIds } },
                    data: { userId: null }
                });
                await tx.certification.updateMany({
                    where: { userId: { in: existingUserIds } },
                    data: { userId: null }
                });
                await tx.judgeUncertificationRequest.updateMany({
                    where: { approvedBy: { in: existingUserIds } },
                    data: { approvedBy: null }
                });
                await tx.judgeUncertificationRequest.updateMany({
                    where: { rejectedBy: { in: existingUserIds } },
                    data: { rejectedBy: null }
                });
                await tx.eventTemplate.deleteMany({
                    where: { createdBy: { in: existingUserIds } }
                });
                await tx.emailTemplate.deleteMany({
                    where: { createdBy: { in: existingUserIds } }
                });
                await tx.deductionRequest.deleteMany({
                    where: { requestedById: { in: existingUserIds } }
                });
                await tx.deductionApproval.deleteMany({
                    where: { approvedById: { in: existingUserIds } }
                });
                await tx.reportInstance.deleteMany({
                    where: { generatedById: { in: existingUserIds } }
                });
                const deleteResult = await tx.user.deleteMany({
                    where: { id: { in: existingUserIds } }
                });
                return deleteResult;
            });
            this.logInfo('Bulk delete transaction completed', {
                deletedCount: result.count,
                requestedIds: existingUserIds
            });
            if (result.count === 0) {
                this.logWarn('No users were deleted', {
                    requestedIds: userIds,
                    existingIds: existingUserIds
                });
                throw new BaseService_1.ValidationError('No users were deleted. This may be due to foreign key constraints or the users may have already been deleted.');
            }
            const remainingUsers = await this.prisma.user.findMany({
                where: { id: { in: existingUserIds } },
                select: { id: true, name: true, email: true }
            });
            if (remainingUsers.length > 0) {
                this.logWarn('Some users were not deleted', { remainingUsers });
                throw new BaseService_1.ValidationError(`Failed to delete ${remainingUsers.length} user(s). They may be protected or have active constraints.`);
            }
            await (0, cache_1.invalidateCache)('users:*');
            this.logInfo('Bulk delete users', {
                deletedCount: result.count,
                requestedCount: userIds.length,
                notFoundCount: notFoundIds.length,
                notFoundIds
            });
            if (notFoundIds.length > 0) {
                this.logWarn('Some user IDs were not found', { notFoundIds });
            }
            return { deletedCount: result.count };
        }
        catch (error) {
            this.handleError(error, { method: 'bulkDeleteUsers', userIds });
        }
    }
    async deleteUsersByRole(role) {
        try {
            const validRoles = ['JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR'];
            if (!validRoles.includes(role.toUpperCase())) {
                throw new BaseService_1.ValidationError('Invalid role for bulk deletion');
            }
            if (role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'ORGANIZER') {
                throw new BaseService_1.ValidationError('Cannot delete admin or organizer users');
            }
            const result = await this.prisma.user.deleteMany({
                where: { role: role.toUpperCase() }
            });
            await (0, cache_1.invalidateCache)('users:*');
            this.logInfo('Delete users by role', { role, deletedCount: result.count });
            return { deletedCount: result.count };
        }
        catch (error) {
            this.handleError(error, { method: 'deleteUsersByRole', role });
        }
    }
    async getAggregateUserStats() {
        try {
            const [totalUsers, usersByRole, recentLogins] = await Promise.all([
                this.prisma.user.count(),
                this.prisma.user.groupBy({
                    by: ['role'],
                    _count: { role: true }
                }),
                this.prisma.user.count({
                    where: {
                        lastLoginAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                })
            ]);
            const roleStats = usersByRole.reduce((acc, item) => {
                acc[item.role] = item._count.role;
                return acc;
            }, {});
            return {
                totalUsers,
                usersByRole: roleStats,
                recentLogins,
                lastWeek: recentLogins
            };
        }
        catch (error) {
            this.handleError(error, { method: 'getAggregateUserStats' });
        }
    }
    async getAllUsersWithRelations() {
        try {
            const users = await this.prisma.user.findMany({
                include: {
                    judge: true,
                    contestant: true
                },
                orderBy: { createdAt: 'desc' }
            });
            const mappedUsers = users.map(user => ({
                ...this.sanitizeUser(user),
                lastLogin: user.lastLoginAt || null
            }));
            return mappedUsers;
        }
        catch (error) {
            this.handleError(error, { method: 'getAllUsersWithRelations' });
        }
    }
    async getUserByIdWithRelations(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    judge: true,
                    contestant: true
                }
            });
            this.assertExists(user, 'User', userId);
            return this.sanitizeUser(user);
        }
        catch (error) {
            this.handleError(error, { method: 'getUserByIdWithRelations', userId });
        }
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(UserRepository_1.UserRepository)),
    __param(1, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [UserRepository_1.UserRepository,
        client_1.PrismaClient])
], UserService);
//# sourceMappingURL=UserService.js.map