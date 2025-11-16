"use strict";
/**
 * User Service
 * Business logic for user management
 */
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const tsyringe_1 = require("tsyringe");
const bcrypt_1 = __importDefault(require("bcrypt"));
const BaseService_1 = require("./BaseService");
const cache_1 = require("../utils/cache");
let UserService = (() => {
    let _classDecorators = [(0, tsyringe_1.injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseService_1.BaseService;
    var UserService = _classThis = class extends _classSuper {
        constructor(userRepository, prisma) {
            super();
            this.userRepository = userRepository;
            this.prisma = prisma;
        }
        /**
         * Get all users
         */
        async getAllUsers() {
            try {
                const users = await this.userRepository.findAll();
                return users.map(user => this.sanitizeUser(user));
            }
            catch (error) {
                this.handleError(error, { method: 'getAllUsers' });
            }
        }
        /**
         * Get active users
         */
        async getActiveUsers() {
            try {
                const users = await this.userRepository.findActiveUsers();
                return users.map(user => this.sanitizeUser(user));
            }
            catch (error) {
                this.handleError(error, { method: 'getActiveUsers' });
            }
        }
        /**
         * Get user by ID
         */
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
        /**
         * Get user by name
         */
        async getUserByName(name) {
            try {
                const user = await this.userRepository.findByName(name);
                return user ? this.sanitizeUser(user) : null;
            }
            catch (error) {
                this.handleError(error, { method: 'getUserByName', name });
            }
        }
        /**
         * Get user by email
         */
        async getUserByEmail(email) {
            try {
                const user = await this.userRepository.findByEmail(email);
                return user ? this.sanitizeUser(user) : null;
            }
            catch (error) {
                this.handleError(error, { method: 'getUserByEmail', email });
            }
        }
        /**
         * Get users by role
         */
        async getUsersByRole(role) {
            try {
                const users = await this.userRepository.findByRole(role);
                return users.map(user => this.sanitizeUser(user));
            }
            catch (error) {
                this.handleError(error, { method: 'getUsersByRole', role });
            }
        }
        /**
         * Create a new user
         */
        async createUser(data) {
            try {
                // Validate required fields
                this.validateRequired(data, ['name', 'email', 'password', 'role']);
                // Validate email format
                if (!this.isValidEmail(data.email)) {
                    throw new BaseService_1.ValidationError('Invalid email format');
                }
                // Validate password strength
                if (data.password.length < 8) {
                    throw new BaseService_1.ValidationError('Password must be at least 8 characters long');
                }
                // Check if name already exists
                const existingUser = await this.userRepository.findByName(data.name);
                if (existingUser) {
                    throw new BaseService_1.ConflictError('Name already exists');
                }
                // Check if email already exists
                const existingEmail = await this.userRepository.findByEmail(data.email);
                if (existingEmail) {
                    throw new BaseService_1.ConflictError('Email already exists');
                }
                // Hash password
                const hashedPassword = await bcrypt_1.default.hash(data.password, 10);
                // Create user
                const user = await this.userRepository.create({
                    name: data.name,
                    email: data.email,
                    password: hashedPassword,
                    preferredName: data.preferredName,
                    role: data.role,
                    isActive: true
                });
                this.logInfo('User created', { userId: user.id, name: user.name });
                // Invalidate cache
                await (0, cache_1.invalidateCache)('users:*');
                return this.sanitizeUser(user);
            }
            catch (error) {
                this.handleError(error, { method: 'createUser', name: data.name });
            }
        }
        /**
         * Update user
         */
        async updateUser(userId, data) {
            try {
                // Check if user exists
                const user = await this.userRepository.findById(userId);
                this.assertExists(user, 'User', userId);
                // If updating name, check if it's available
                if (data.name && data.name !== user.name) {
                    const existingUser = await this.userRepository.findByName(data.name);
                    if (existingUser) {
                        throw new BaseService_1.ConflictError('Name already exists');
                    }
                }
                // If updating email, check if it's available
                if (data.email && data.email !== user.email) {
                    if (!this.isValidEmail(data.email)) {
                        throw new BaseService_1.ValidationError('Invalid email format');
                    }
                    const existingEmail = await this.userRepository.findByEmail(data.email);
                    if (existingEmail) {
                        throw new BaseService_1.ConflictError('Email already exists');
                    }
                }
                // Update user
                const updatedUser = await this.userRepository.update(userId, data);
                this.logInfo('User updated', { userId, name: updatedUser.name });
                // Invalidate cache
                await (0, cache_1.invalidateCache)('users:*');
                await (0, cache_1.invalidateCache)(`user:${userId}`);
                return this.sanitizeUser(updatedUser);
            }
            catch (error) {
                this.handleError(error, { method: 'updateUser', userId });
            }
        }
        /**
         * Change user password
         */
        async changePassword(userId, data) {
            try {
                this.validateRequired(data, ['currentPassword', 'newPassword']);
                // Get user with password
                const user = await this.userRepository.findById(userId);
                this.assertExists(user, 'User', userId);
                // Verify current password
                const isValidPassword = await bcrypt_1.default.compare(data.currentPassword, user.password);
                if (!isValidPassword) {
                    throw new BaseService_1.ValidationError('Current password is incorrect');
                }
                // Validate new password
                if (data.newPassword.length < 8) {
                    throw new BaseService_1.ValidationError('New password must be at least 8 characters long');
                }
                // Hash new password
                const hashedPassword = await bcrypt_1.default.hash(data.newPassword, 10);
                // Update password
                await this.userRepository.updatePassword(userId, hashedPassword);
                this.logInfo('Password changed', { userId });
                // Invalidate cache
                await (0, cache_1.invalidateCache)(`user:${userId}`);
            }
            catch (error) {
                this.handleError(error, { method: 'changePassword', userId });
            }
        }
        /**
         * Toggle user active status
         */
        async toggleUserActiveStatus(userId) {
            try {
                const user = await this.userRepository.toggleActiveStatus(userId);
                this.logInfo('User active status toggled', { userId, isActive: user.isActive });
                // Invalidate cache
                await (0, cache_1.invalidateCache)('users:*');
                await (0, cache_1.invalidateCache)(`user:${userId}`);
                return this.sanitizeUser(user);
            }
            catch (error) {
                this.handleError(error, { method: 'toggleUserActiveStatus', userId });
            }
        }
        /**
         * Delete user
         */
        async deleteUser(userId) {
            try {
                const user = await this.userRepository.findById(userId);
                this.assertExists(user, 'User', userId);
                await this.userRepository.delete(userId);
                this.logInfo('User deleted', { userId });
                // Invalidate cache
                await (0, cache_1.invalidateCache)('users:*');
                await (0, cache_1.invalidateCache)(`user:${userId}`);
            }
            catch (error) {
                this.handleError(error, { method: 'deleteUser', userId });
            }
        }
        /**
         * Search users
         */
        async searchUsers(query) {
            try {
                const users = await this.userRepository.searchUsers(query);
                return users.map(user => this.sanitizeUser(user));
            }
            catch (error) {
                this.handleError(error, { method: 'searchUsers', query });
            }
        }
        /**
         * Get user statistics
         */
        async getUserStats(userId) {
            try {
                return await this.userRepository.getUserStats(userId);
            }
            catch (error) {
                this.handleError(error, { method: 'getUserStats', userId });
            }
        }
        /**
         * Validate email format
         */
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        /**
         * Remove sensitive data from user object
         */
        sanitizeUser(user) {
            const { password, ...sanitized } = user;
            return sanitized;
        }
        /**
         * Update user image path
         */
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
        /**
         * Reset user password (admin function)
         */
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
        /**
         * Update user last login timestamp
         */
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
        /**
         * Bulk delete users by IDs
         */
        async bulkDeleteUsers(userIds) {
            try {
                if (!userIds || userIds.length === 0) {
                    throw new BaseService_1.ValidationError('User IDs array is required');
                }
                // Prevent deletion of admin/organizer users - filter them out
                const adminUsers = await this.prisma.user.findMany({
                    where: {
                        id: { in: userIds },
                        role: { in: ['ADMIN', 'ORGANIZER'] }
                    },
                    select: { id: true }
                });
                if (adminUsers.length > 0) {
                    const adminUserIds = adminUsers.map(u => u.id);
                    throw new BaseService_1.ValidationError(`Cannot delete admin/organizer users. Found ${adminUsers.length} protected user(s): ${adminUserIds.join(', ')}`);
                }
                // Filter out any non-existent users and proceed with deletion
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
                // Use a transaction to handle all deletions and related records
                this.logInfo('Starting bulk delete transaction', {
                    userIds: existingUserIds,
                    count: existingUserIds.length
                });
                const result = await this.prisma.$transaction(async (tx) => {
                    // Handle relations that don't have cascade delete
                    // Set nullable foreign keys to null
                    await tx.activityLog.updateMany({
                        where: { userId: { in: existingUserIds } },
                        data: { userId: null }
                    });
                    await tx.systemSetting.updateMany({
                        where: { updatedBy: { in: existingUserIds } },
                        data: { updatedBy: null }
                    });
                    await tx.backupLog.updateMany({
                        where: { createdById: { in: existingUserIds } },
                        data: { createdById: null }
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
                    // Delete records where foreign keys are NOT nullable
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
                    // Now delete the users (cascade will handle other relations)
                    const deleteResult = await tx.user.deleteMany({
                        where: { id: { in: existingUserIds } }
                    });
                    return deleteResult;
                });
                this.logInfo('Bulk delete transaction completed', {
                    deletedCount: result.count,
                    requestedIds: existingUserIds
                });
                // Verify deletion actually occurred
                if (result.count === 0) {
                    this.logWarn('No users were deleted', {
                        requestedIds: userIds,
                        existingIds: existingUserIds
                    });
                    throw new BaseService_1.ValidationError('No users were deleted. This may be due to foreign key constraints or the users may have already been deleted.');
                }
                // Double-check that users were actually deleted
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
        /**
         * Delete all users by role
         */
        async deleteUsersByRole(role) {
            try {
                const validRoles = ['JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR'];
                if (!validRoles.includes(role.toUpperCase())) {
                    throw new BaseService_1.ValidationError('Invalid role for bulk deletion');
                }
                // Prevent deletion of admin/organizer users
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
        /**
         * Get aggregate user statistics
         */
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
                                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
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
        /**
         * Get users with relations (judge, contestant)
         */
        async getAllUsersWithRelations() {
            try {
                const users = await this.prisma.user.findMany({
                    include: {
                        judge: true,
                        contestant: true
                    },
                    orderBy: { createdAt: 'desc' }
                });
                // Map lastLoginAt to lastLogin for frontend compatibility
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
        /**
         * Get user by ID with relations
         */
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
    __setFunctionName(_classThis, "UserService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UserService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UserService = _classThis;
})();
exports.UserService = UserService;
