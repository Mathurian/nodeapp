/**
 * User Service
 * Business logic for user management
 */

import { User, UserRole, PrismaClient, Prisma } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcrypt';
import { BaseService, ConflictError, ValidationError, NotFoundError } from './BaseService';
import { UserRepository } from '../repositories/UserRepository';
import { invalidateCache, userCache } from '../utils/cache';
import { EmailService } from './EmailService';
import { PaginationOptions, PaginatedResponse } from '../utils/pagination';
import { validatePassword, isPasswordSimilarToUserInfo } from '../utils/passwordValidator';
import { env } from '../config/env';

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  preferredName?: string;
  role: string | UserRole;
  gender?: string;
  pronouns?: string;
  phone?: string;
  address?: string;
  bio?: string;
  judgeNumber?: string;
  judgeLevel?: string;
  isHeadJudge?: boolean;
  contestantNumber?: number;
  age?: number;
  school?: string;
  grade?: string;
  parentGuardian?: string;
  parentPhone?: string;
  contestAssignment?: string;
  categoryAssignment?: string;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
  preferredName?: string;
  role?: string | UserRole;
  isActive?: boolean;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  bio?: string;
  pronouns?: string;
  gender?: string;
  judgeNumber?: string;
  judgeLevel?: string;
  isHeadJudge?: boolean;
  contestantNumber?: number;
  age?: number;
  school?: string;
  grade?: string;
  parentGuardian?: string;
  parentPhone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface UserImageUploadDTO {
  userId: string;
  imagePath: string;
}

export interface UserStats {
  totalAssignments: number;
  eventsParticipated: number;
  [key: string]: number | undefined;
}

export interface AggregateUserStats {
  totalUsers: number;
  usersByRole: Record<string, number>;
  recentLogins: number;
  lastWeek: number;
}

export type UserWithRelations = User & {
  judge: Prisma.JudgeGetPayload<{
    select: {
      id: true;
      name: true;
      judgeNumber: true;
    };
  }> | null;
  contestant: Prisma.ContestantGetPayload<{
    select: {
      id: true;
      name: true;
      contestantNumber: true;
    };
  }> | null;
  lastLogin?: Date | null;
}

@injectable()
export class UserService extends BaseService {
  constructor(
    @inject(UserRepository) private userRepository: UserRepository,
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(EmailService) private emailService: EmailService
  ) {
    super();
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const users = await this.userRepository.findAll();
      return users.map(user => this.sanitizeUser(user)) as any;
    } catch (error) {
      this.handleError(error, { method: 'getAllUsers' });
    }
  }

  /**
   * Get active users
   */
  async getActiveUsers(): Promise<User[]> {
    try {
      const users = await this.userRepository.findActiveUsers();
      return users.map(user => this.sanitizeUser(user)) as any;
    } catch (error) {
      this.handleError(error, { method: 'getActiveUsers' });
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    try {
      const user = await this.userRepository.findById(userId);
      this.assertExists(user, 'User', userId);
      return this.sanitizeUser(user) as any;
    } catch (error) {
      this.handleError(error, { method: 'getUserById', userId });
    }
  }

  /**
   * Get user by name
   */
  async getUserByName(name: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findByName(name);
      return user ? this.sanitizeUser(user) as any : null;
    } catch (error) {
      this.handleError(error, { method: 'getUserByName', name });
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findByEmail(email);
      return user ? this.sanitizeUser(user) as any : null;
    } catch (error) {
      this.handleError(error, { method: 'getUserByEmail', email });
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const users = await this.userRepository.findByRole(role);
      return users.map(user => this.sanitizeUser(user)) as any;
    } catch (error) {
      this.handleError(error, { method: 'getUsersByRole', role });
    }
  }

  /**
   * Get all users with pagination
   */
  async getAllUsersPaginated(paginationOptions?: PaginationOptions): Promise<PaginatedResponse<User>> {
    try {
      const page = paginationOptions?.page || 1;
      const limit = Math.min(paginationOptions?.limit || 50, 100);

      const result = await this.userRepository.findAllPaginated({ page, limit });

      return {
        data: result.data.map(user => this.sanitizeUser(user)) as any,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasNextPage,
          hasPrevious: result.hasPrevPage
        }
      };
    } catch (error) {
      this.handleError(error, { method: 'getAllUsersPaginated', paginationOptions });
    }
  }

  /**
   * Get active users with pagination
   */
  async getActiveUsersPaginated(paginationOptions?: PaginationOptions): Promise<PaginatedResponse<User>> {
    try {
      const page = paginationOptions?.page || 1;
      const limit = Math.min(paginationOptions?.limit || 50, 100);

      const result = await this.userRepository.findActiveUsersPaginated({ page, limit });

      return {
        data: result.data.map(user => this.sanitizeUser(user)) as any,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasNextPage,
          hasPrevious: result.hasPrevPage
        }
      };
    } catch (error) {
      this.handleError(error, { method: 'getActiveUsersPaginated', paginationOptions });
    }
  }

  /**
   * Get users by role with pagination
   */
  async getUsersByRolePaginated(role: string, paginationOptions?: PaginationOptions): Promise<PaginatedResponse<User>> {
    try {
      const page = paginationOptions?.page || 1;
      const limit = Math.min(paginationOptions?.limit || 50, 100);

      const result = await this.userRepository.findByRolePaginated(role, { page, limit });

      return {
        data: result.data.map(user => this.sanitizeUser(user)) as any,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasNextPage,
          hasPrevious: result.hasPrevPage
        }
      };
    } catch (error) {
      this.handleError(error, { method: 'getUsersByRolePaginated', role, paginationOptions });
    }
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserDTO): Promise<User> {
    try {
      // Validate required fields
      this.validateRequired(data as unknown as Record<string, unknown>, ['name', 'email', 'password', 'role']);

      // Validate email format
      if (!this.isValidEmail(data.email)) {
        throw new ValidationError('Invalid email format');
      }

      // P2-5: Validate password strength using comprehensive password policy
      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.isValid) {
        throw new ValidationError(
          `Password does not meet complexity requirements: ${passwordValidation.errors.join(', ')}`
        );
      }

      // P2-5: Check if password is too similar to user information
      if (isPasswordSimilarToUserInfo(data.password, {
        name: data.name,
        email: data.email
      })) {
        throw new ValidationError('Password is too similar to your personal information');
      }

      // Check if name already exists
      const existingUser = await this.userRepository.findByName(data.name);
      if (existingUser) {
        throw new ConflictError('Name already exists');
      }

      // Check if email already exists
      const existingEmail = await this.userRepository.findByEmail(data.email);
      if (existingEmail) {
        throw new ConflictError('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

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

      // Send welcome email (non-blocking - don't wait for completion)
      this.emailService.sendWelcomeEmail(
        user.email,
        user.preferredName || user.name,
        `${env.get('FRONTEND_URL')}/verify-email?userId=${user.id}`
      ).catch(error => {
        console.error('Failed to send welcome email:', error);
        // Don't throw - user creation should succeed even if email fails
      });

      // Invalidate cache
      await invalidateCache('users:*');

      return this.sanitizeUser(user) as any;
    } catch (error) {
      this.handleError(error, { method: 'createUser', name: data.name });
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: UpdateUserDTO): Promise<User> {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(userId);
      this.assertExists(user, 'User', userId);

      // If updating name, check if it's available
      if (data.name && data.name !== user.name) {
        const existingUser = await this.userRepository.findByName(data.name);
        if (existingUser) {
          throw new ConflictError('Name already exists');
        }
      }

      // If updating email, check if it's available
      if (data.email && data.email !== user.email) {
        if (!this.isValidEmail(data.email)) {
          throw new ValidationError('Invalid email format');
        }

        const existingEmail = await this.userRepository.findByEmail(data.email);
        if (existingEmail) {
          throw new ConflictError('Email already exists');
        }
      }

      // Update user
      const updatedUser = await this.userRepository.update(userId, data as any);

      this.logInfo('User updated', { userId, name: updatedUser.name });

      // Invalidate cache
      await invalidateCache('users:*');
      await invalidateCache(`user:${userId}`);

      return this.sanitizeUser(updatedUser) as any;
    } catch (error) {
      this.handleError(error, { method: 'updateUser', userId });
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, data: ChangePasswordDTO): Promise<void> {
    try {
      this.validateRequired(data as unknown as Record<string, unknown>, ['currentPassword', 'newPassword']);

      // Get user with password
      const user = await this.userRepository.findById(userId);
      this.assertExists(user, 'User', userId);

      // Verify current password
      const isValidPassword = await bcrypt.compare(data.currentPassword, user.password);
      if (!isValidPassword) {
        throw new ValidationError('Current password is incorrect');
      }

      // P2-5: Validate new password using comprehensive password policy
      const passwordValidation = validatePassword(data.newPassword);
      if (!passwordValidation.isValid) {
        throw new ValidationError(
          `Password does not meet complexity requirements: ${passwordValidation.errors.join(', ')}`
        );
      }

      // P2-5: Check if password is too similar to user information
      if (isPasswordSimilarToUserInfo(data.newPassword, {
        name: user.name,
        email: user.email
      })) {
        throw new ValidationError('Password is too similar to your personal information');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(data.newPassword, 10);

      // Update password
      await this.userRepository.updatePassword(userId, hashedPassword);

      this.logInfo('Password changed', { userId });

      // Invalidate cache
      await invalidateCache(`user:${userId}`);
    } catch (error) {
      this.handleError(error, { method: 'changePassword', userId });
    }
  }

  /**
   * Toggle user active status
   */
  async toggleUserActiveStatus(userId: string): Promise<User> {
    try {
      const user = await this.userRepository.toggleActiveStatus(userId);

      this.logInfo('User active status toggled', { userId, isActive: user.isActive });

      // Invalidate cache
      await invalidateCache('users:*');
      await invalidateCache(`user:${userId}`);

      return this.sanitizeUser(user) as any;
    } catch (error) {
      this.handleError(error, { method: 'toggleUserActiveStatus', userId });
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      this.assertExists(user, 'User', userId);

      await this.userRepository.delete(userId);

      this.logInfo('User deleted', { userId });

      // Invalidate cache
      await invalidateCache('users:*');
      await invalidateCache(`user:${userId}`);
    } catch (error) {
      this.handleError(error, { method: 'deleteUser', userId });
    }
  }

  /**
   * Search users
   */
  async searchUsers(query: string): Promise<User[]> {
    try {
      const users = await this.userRepository.searchUsers(query);
      return users.map(user => this.sanitizeUser(user)) as any;
    } catch (error) {
      this.handleError(error, { method: 'searchUsers', query });
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      return await this.userRepository.getUserStats(userId);
    } catch (error) {
      this.handleError(error, { method: 'getUserStats', userId });
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Remove sensitive data from user object
   */
  protected override sanitizeUser<T extends Record<string, unknown>>(user: T): Omit<T, 'password' | 'resetToken' | 'resetTokenExpiry'> {
    const { password, resetToken, resetTokenExpiry, ...sanitized } = user as T & {
      password?: unknown;
      resetToken?: unknown;
      resetTokenExpiry?: unknown;
    };
    return sanitized as Omit<T, 'password' | 'resetToken' | 'resetTokenExpiry'>;
  }

  /**
   * Update user image path
   */
  async updateUserImage(userId: string, imagePath: string): Promise<User> {
    try {
      const user = await this.userRepository.findById(userId);
      this.assertExists(user, 'User', userId);

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { imagePath }
      });

      userCache.invalidate(userId);
      this.logInfo('User image updated', { userId, imagePath });

      return this.sanitizeUser(updatedUser) as any;
    } catch (error) {
      this.handleError(error, { method: 'updateUserImage', userId });
    }
  }

  /**
   * Reset user password (admin function)
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      this.assertExists(user, 'User', userId);

      // P2-5: Validate new password using comprehensive password policy
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new ValidationError(
          `Password does not meet complexity requirements: ${passwordValidation.errors.join(', ')}`
        );
      }

      // P2-5: Check if password is too similar to user information
      if (isPasswordSimilarToUserInfo(newPassword, {
        name: user.name,
        email: user.email
      })) {
        throw new ValidationError('Password is too similar to your personal information');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await this.userRepository.updatePassword(userId, hashedPassword);

      userCache.invalidate(userId);
      this.logInfo('User password reset', { userId });
    } catch (error) {
      this.handleError(error, { method: 'resetUserPassword', userId });
    }
  }

  /**
   * Update user last login timestamp
   */
  async updateLastLogin(userId: string): Promise<User> {
    try {
      const user = await this.userRepository.updateLastLogin(userId);
      userCache.invalidate(userId);
      return this.sanitizeUser(user) as any;
    } catch (error) {
      this.handleError(error, { method: 'updateLastLogin', userId });
    }
  }

  /**
   * Bulk delete users by IDs (including admin/organizer if force flag is set)
   */
  async bulkDeleteUsers(userIds: string[], forceDeleteAdmin: boolean = false): Promise<{ deletedCount: number }> {
    try {
      if (!userIds || userIds.length === 0) {
        throw new ValidationError('User IDs array is required');
      }

      // Check for admin/organizer users
      const adminUsers = await this.prisma.user.findMany({
        where: {
          id: { in: userIds },
          role: { in: ['ADMIN', 'ORGANIZER'] }
        },
        select: { id: true, role: true }
      });

      // Prevent deletion of admin/organizer users unless force flag is set
      if (adminUsers.length > 0 && !forceDeleteAdmin) {
        const adminUserIds = adminUsers.map(u => u.id);
        throw new ValidationError(
          `Cannot delete admin/organizer users. Found ${adminUsers.length} protected user(s): ${adminUserIds.join(', ')}. Use forceDeleteAdmin flag to override.`
        );
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
        throw new NotFoundError('Users', 'No users found with the provided IDs');
      }

      // Use a transaction to handle all deletions and related records
      this.logInfo('Starting bulk delete transaction', {
        userIds: existingUserIds,
        count: existingUserIds.length,
        forceDeleteAdmin
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

        // BackupLog doesn't have createdById field
        // await tx.backupLog.updateMany({
        //   where: { createdById: { in: existingUserIds } },
        //   data: { createdById: null }
        // });

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
        throw new ValidationError(
          'No users were deleted. This may be due to foreign key constraints or the users may have already been deleted.'
        );
      }

      // Double-check that users were actually deleted
      const remainingUsers = await this.prisma.user.findMany({
        where: { id: { in: existingUserIds } },
        select: { id: true, name: true, email: true }
      });

      if (remainingUsers.length > 0) {
        this.logWarn('Some users were not deleted', { remainingUsers });
        throw new ValidationError(
          `Failed to delete ${remainingUsers.length} user(s). They may be protected or have active constraints.`
        );
      }

      await invalidateCache('users:*');
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
    } catch (error) {
      this.handleError(error, { method: 'bulkDeleteUsers', userIds });
    }
  }

  /**
   * Delete all users by role
   */
  async deleteUsersByRole(role: string): Promise<{ deletedCount: number }> {
    try {
      const validRoles = ['JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR'];
      if (!validRoles.includes(role.toUpperCase())) {
        throw new ValidationError('Invalid role for bulk deletion');
      }

      // Prevent deletion of admin/organizer users
      if (role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'ORGANIZER') {
        throw new ValidationError('Cannot delete admin or organizer users');
      }

      const result = await this.prisma.user.deleteMany({
        where: { role: role.toUpperCase() as UserRole }
      });

      await invalidateCache('users:*');
      this.logInfo('Delete users by role', { role, deletedCount: result.count });

      return { deletedCount: result.count };
    } catch (error) {
      this.handleError(error, { method: 'deleteUsersByRole', role });
    }
  }

  /**
   * Get aggregate user statistics
   */
  async getAggregateUserStats(): Promise<AggregateUserStats> {
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

      const roleStats = usersByRole.reduce((acc: Record<string, number>, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalUsers,
        usersByRole: roleStats,
        recentLogins,
        lastWeek: recentLogins
      };
    } catch (error) {
      this.handleError(error, { method: 'getAggregateUserStats' });
    }
  }

  /**
   * Get users with relations (judge, contestant)
   */
  async getAllUsersWithRelations(): Promise<UserWithRelations[]> {
    try {
      const users = await this.prisma.user.findMany({
        include: {
          judge: true,
          contestant: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Map lastLoginAt to lastLogin for frontend compatibility
      const mappedUsers: UserWithRelations[] = users.map(user => ({
        ...this.sanitizeUser(user),
        judge: user.judge ? { ...user.judge, judgeNumber: undefined } : user.judge,
        contestant: user.contestant,
        lastLogin: user.lastLoginAt || null
      })) as any;

      return mappedUsers;
    } catch (error) {
      this.handleError(error, { method: 'getAllUsersWithRelations' });
    }
  }

  /**
   * Get user by ID with relations
   */
  async getUserByIdWithRelations(userId: string): Promise<UserWithRelations> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          judge: true,
          contestant: true
        }
      });

      this.assertExists(user, 'User', userId);

      return {
        ...this.sanitizeUser(user!),
        judge: user!.judge ? { ...user!.judge, judgeNumber: undefined } : user!.judge,
        contestant: user!.contestant
      } as any;
    } catch (error) {
      this.handleError(error, { method: 'getUserByIdWithRelations', userId });
    }
  }
}
