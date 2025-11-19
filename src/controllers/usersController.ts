/**
 * Users Controller
 * Handles HTTP requests for user management
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { UserService, CreateUserDTO, UpdateUserDTO } from '../services/UserService';
import { AssignmentService } from '../services/AssignmentService';
import { sendSuccess, sendCreated, sendError, sendNoContent, sendNotFound, sendBadRequest } from '../utils/responseHelpers';
import { PrismaClient, Prisma, User, Judge, Contestant } from '@prisma/client';
import { userCache } from '../utils/cache';
import { createRequestLogger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    tenantId: string;
  };
  tenantId?: string;
  file?: Express.Multer.File;
}

interface UserWithRelations extends User {
  judge?: Judge | null;
  contestant?: Contestant | null;
  email: string;
}

export class UsersController {
  private userService: UserService;
  private assignmentService: AssignmentService;
  private prisma: PrismaClient;

  constructor() {
    this.userService = container.resolve(UserService);
    this.assignmentService = container.resolve(AssignmentService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  /**
   * Get all users with relations
   */
  getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'users');
    try {
      log.debug('Fetching all users');
      const users = await this.userService.getAllUsersWithRelations();
      log.info('Users retrieved successfully', { count: users.length });
      sendSuccess(res, { data: users });
    } catch (error) {
      log.error('Get users error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Get user by ID
   */
  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'users');
    try {
      const id = req.params.id!;
      log.debug('Fetching user by ID', { userId: id });

      const user = await this.userService.getUserByIdWithRelations(id);

      if (!user) {
        log.warn('User not found', { userId: id });
        sendNotFound(res, 'User not found');
        return;
      }

      log.debug('User retrieved successfully', { userId: id, email: user.email });
      sendSuccess(res, { data: user });
    } catch (error) {
      log.error('Get user error', { error: (error as Error).message, userId: req.params.id });
      return next(error);
    }
  };

  /**
   * Create new user
   */
  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'users');
    try {
      const data: CreateUserDTO = req.body;

      log.info('User creation requested', {
        email: data.email,
        role: data.role,
        name: data.name
      });

      // Validate required fields
      if (!data.name || !data.email || !data.password || !data.role) {
        log.warn('User creation failed: missing required fields');
        sendError(res, 'Name, email, password, and role are required', 400);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        log.warn('User creation failed: invalid email format', { email: data.email });
        sendError(res, 'Invalid email format', 400);
        return;
      }

      // Validate role
      const validRoles = ['ADMIN', 'ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'];
      if (!validRoles.includes(data.role)) {
        log.warn('User creation failed: invalid role', { role: data.role });
        sendError(res, 'Invalid role', 400);
        return;
      }

      // Check if email already exists
      const authReq = req as AuthenticatedRequest;
      const existingUser = await this.prisma.user.findUnique({
        where: { tenantId_email: { tenantId: authReq.tenantId!, email: data.email  } }
      });

      if (existingUser) {
        log.warn('User creation failed: email already exists', { email: data.email });
        sendError(res, 'User with this email already exists', 400);
        return;
      }

      // Create user with role-specific data
      const userData: Partial<CreateUserDTO> & Record<string, string | number | boolean | null> = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        preferredName: data.preferredName || null,
        gender: data.gender || null,
        pronouns: data.pronouns || null,
        phone: data.phone || null,
        address: data.address || null,
        bio: data.bio || null,
        isActive: true
      };

      // Add role-specific fields
      if (data.role === 'JUDGE') {
        userData.judgeBio = data.bio || null;
        userData.judgeCertifications = data.judgeLevel || null;
      } else if (data.role === 'CONTESTANT') {
        userData.contestantBio = data.bio || null;
        userData.contestantNumber = data.contestantNumber || null;
        userData.contestantAge = data.age ? parseInt(String(data.age)) : null;
        userData.contestantSchool = data.school || null;
      }

      const user = await this.userService.createUser(userData as CreateUserDTO);

      // Create associated Judge or Contestant record if applicable
      if (data.role === 'JUDGE') {
        log.debug('Creating judge record', { userId: user.id });
        const authReq = req as AuthenticatedRequest;
        const judge = await this.prisma.judge.create({
          data: {
            tenantId: authReq.tenantId!,
            name: data.name,
            email: data.email,
            gender: data.gender || null,
            pronouns: data.pronouns || null,
            bio: data.bio || null,
            isHeadJudge: data.isHeadJudge || false
          }
        });

        await this.prisma.user.update({
          where: { id: user.id },
          data: { judgeId: judge.id }
        });
        log.info('Judge record created and linked', { userId: user.id, judgeId: judge.id });
      } else if (data.role === 'CONTESTANT') {
        log.debug('Creating contestant record', { userId: user.id });
        const authReq = req as AuthenticatedRequest;
        const contestant = await this.prisma.contestant.create({
          data: {
            tenantId: authReq.tenantId!,
            name: data.name,
            email: data.email,
            contestantNumber: data.contestantNumber ? parseInt(String(data.contestantNumber)) : null,
            bio: data.bio || null,
            gender: data.gender || null,
            pronouns: data.pronouns || null
          }
        });

        await this.prisma.user.update({
          where: { id: user.id },
          data: { contestantId: contestant.id }
        });
        log.info('Contestant record created and linked', { userId: user.id, contestantId: contestant.id });
      }

      // Fetch the updated user with relations
      const createdUser = await this.prisma.user.findUnique({
        where: { id: user.id }
      });

      log.info('User created successfully', { userId: user.id, email: data.email, role: data.role });
      sendCreated(res, createdUser);
    } catch (error) {
      log.error('Create user error', { error: (error as Error).message, email: req.body.email });
      const prismaError = error as Prisma.PrismaClientKnownRequestError;
      if (prismaError.code === 'P2002') {
        sendError(res, 'User with this email already exists', 400);
      } else {
        return next(error);
      }
    }
  };

  /**
   * Update user
   */
  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'users');
    try {
      const id = req.params.id!;
      const data: UpdateUserDTO = req.body;

      log.info('User update requested', { userId: id });

      // Get current user to check if they have a judgeId or contestantId
      const currentUser = await this.prisma.user.findUnique({
        where: { id }
      });

      if (!currentUser) {
        log.warn('User update failed: user not found', { userId: id });
        sendNotFound(res, 'User not found');
        return;
      }

      log.debug('Building user update data', {
        userId: id,
        roleChanged: data.role !== currentUser.role,
        oldRole: currentUser.role,
        newRole: data.role
      });

      const userData: Partial<UpdateUserDTO> & Record<string, string | number | boolean | null> = {};

      if (data.name !== undefined) userData.name = data.name;
      if (data.email !== undefined) userData.email = data.email;
      if (data.role !== undefined) userData.role = data.role;
      if (data.phone !== undefined) userData.phone = data.phone || null;
      if (data.address !== undefined) userData.address = data.address || null;
      if (data.city !== undefined) userData.city = data.city || null;
      if (data.state !== undefined) userData.state = data.state || null;
      if (data.country !== undefined) userData.country = data.country || null;
      if (data.bio !== undefined) userData.bio = data.bio || null;
      if (data.preferredName !== undefined) userData.preferredName = data.preferredName || null;
      if (data.pronouns !== undefined) userData.pronouns = data.pronouns || null;
      if (data.gender !== undefined) userData.gender = data.gender || null;
      if (data.isActive !== undefined) userData.isActive = data.isActive;

      // Add role-specific fields for User model
      if (data.role === 'JUDGE') {
        if (data.bio !== undefined) userData.judgeBio = data.bio || null;
        if (data.judgeLevel !== undefined) userData.judgeCertifications = data.judgeLevel || null;
      } else if (data.role === 'CONTESTANT') {
        if (data.bio !== undefined) userData.contestantBio = data.bio || null;
        if (data.contestantNumber !== undefined) userData.contestantNumber = data.contestantNumber || null;
        if (data.age !== undefined) userData.contestantAge = data.age ? parseInt(String(data.age)) : null;
        if (data.school !== undefined) userData.contestantSchool = data.school || null;
      }

      // Update user
      log.debug('Updating user record', { userId: id });
      const user = await this.prisma.user.update({
        where: { id },
        data: userData,
        include: {
          judge: true,
          contestant: true
        }
      }) as UserWithRelations;

      // Invalidate user cache after update
      userCache.invalidate(id);

      log.info('User record updated', { userId: id, email: user.email });

      // Update associated Judge record if user is a judge and isHeadJudge is provided
      if (currentUser.role === 'JUDGE' && data.isHeadJudge !== undefined && currentUser.judgeId) {
        log.debug('Updating judge head judge status', { userId: id, judgeId: currentUser.judgeId, isHeadJudge: data.isHeadJudge });
        await this.prisma.judge.update({
          where: { id: currentUser.judgeId },
          data: { isHeadJudge: data.isHeadJudge }
        });
      }

      log.info('User updated successfully', { userId: id, email: user.email });
      sendSuccess(res, user);
    } catch (error) {
      log.error('Update user error', { error: (error as Error).message, userId: req.params.id });
      return next(error);
    }
  };

  /**
   * Delete user
   */
  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'users');
    try {
      const id = req.params.id!;
      log.info('User deletion requested', { userId: id });

      // Fetch user before deletion for logging
      const userToDelete = await this.prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true, role: true }
      });

      if (!userToDelete) {
        log.warn('User deletion failed: user not found', { userId: id });
        sendNotFound(res, 'User not found');
        return;
      }

      log.debug('Deleting user record', { userId: id, email: userToDelete.email });
      await this.userService.deleteUser(id);

      log.info('User deleted successfully', { userId: id, email: userToDelete.email, role: userToDelete.role });
      sendNoContent(res);
    } catch (error) {
      log.error('Delete user error', { error: (error as Error).message, userId: req.params.id });
      return next(error);
    }
  };

  /**
   * Reset user password
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'users');
    try {
      const id = req.params.id!;
      const { newPassword } = req.body;

      if (!newPassword) {
        sendError(res, 'New password is required', 400);
        return;
      }

      await this.userService.resetUserPassword(id, newPassword);

      log.info('Password reset successfully', { userId: id });
      sendSuccess(res, null, 'Password reset successfully');
    } catch (error) {
      log.error('Reset password error', { error: (error as Error).message, userId: req.params.id });
      return next(error);
    }
  };

  /**
   * Get users by role
   */
  getUsersByRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'users');
    try {
      const role = req.params.role!;

      const validRoles = ['ADMIN', 'ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'];
      if (!validRoles.includes(role)) {
        sendError(res, 'Invalid role', 400);
        return;
      }

      const users = await this.prisma.user.findMany({
        where: { role: role as Prisma.EnumUserRoleFilter },
        include: {
          judge: true,
          contestant: true
        },
        orderBy: { createdAt: 'desc' }
      });

      log.info('Users by role retrieved', { role, count: users.length });
      sendSuccess(res, users);
    } catch (error) {
      log.error('Get users by role error', { error: (error as Error).message, role: req.params.role });
      return next(error);
    }
  };

  /**
   * Update user last login
   */
  updateLastLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'users');
    try {
      const id = req.params.id!;

      const user = await this.userService.updateLastLogin(id);

      sendSuccess(res, {
        id: user.id,
        name: user.name,
        email: user.email,
        lastLoginAt: user.lastLoginAt
      });
    } catch (error) {
      log.error('Update last login error', { error: (error as Error).message, userId: req.params.id });
      const prismaError = error as Prisma.PrismaClientKnownRequestError;
      if (prismaError.code === 'P2025') {
        sendNotFound(res, 'User not found');
      } else {
        return next(error);
      }
    }
  };

  /**
   * Bulk remove users
   */
  bulkRemoveUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'users');
    try {
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        sendError(res, 'User IDs array is required', 400);
        return;
      }

      const result = await this.userService.bulkDeleteUsers(userIds);

      log.info('Bulk remove users completed', { deletedCount: result.deletedCount });
      sendSuccess(res, {
        message: `${result.deletedCount} users deleted successfully`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      log.error('Bulk remove users error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Remove all users by role
   */
  removeAllUsersByRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'users');
    try {
      const role = req.params.role!;

      const result = await this.userService.deleteUsersByRole(role);

      log.info('Remove users by role completed', { role, deletedCount: result.deletedCount });
      sendSuccess(res, {
        message: `${result.deletedCount} ${role} users deleted successfully`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      log.error('Remove all users by role error', { error: (error as Error).message, role: req.params.role });
      return next(error);
    }
  };

  /**
   * Get user statistics
   */
  getUserStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'users');
    try {
      const stats = await this.userService.getAggregateUserStats();

      log.info('User stats retrieved', { totalUsers: stats.totalUsers });
      sendSuccess(res, stats);
    } catch (error) {
      log.error('Get user stats error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Upload user image
   */
  uploadUserImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'users');
    try {
      const authReq = req as AuthenticatedRequest;
      const id = authReq.params.id!;
      const requestingUserId = authReq.user?.id || '';
      const requestingUserRole = authReq.user?.role || '';

      log.info('User image upload requested', {
        userId: id,
        requestingUserId,
        requestingUserRole,
        fileSize: authReq.file?.size,
        mimetype: authReq.file?.mimetype
      });

      // Check permissions: user can upload their own image, or admin/organizer/board can upload for others
      if (requestingUserId !== id && !['ADMIN', 'ORGANIZER', 'BOARD'].includes(requestingUserRole)) {
        log.warn('User image upload denied: insufficient permissions', { userId: id, requestingUserId, requestingUserRole });
        sendError(res, 'You do not have permission to upload images for this user', 403);
        return;
      }

      if (!authReq.file) {
        log.warn('User image upload failed: no file provided', { userId: id });
        sendError(res, 'No image file provided', 400);
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(authReq.file.mimetype)) {
        log.warn('User image upload failed: invalid file type', { userId: id, mimetype: authReq.file.mimetype });
        sendError(res, 'Invalid file type. Only JPEG, PNG, and GIF are allowed.', 400);
        return;
      }

      const imagePath = `/uploads/users/${authReq.file.filename}`;
      log.debug('Updating user with image path', { userId: id, imagePath });

      // Update user with image path
      const user = await this.userService.updateUserImage(id, imagePath);

      log.info('User image uploaded successfully', { userId: id, imagePath });
      sendSuccess(res, {
        message: 'Image uploaded successfully',
        imagePath,
        user
      });
    } catch (error) {
      log.error('Upload user image error', { error: (error as Error).message, userId: req.params.id });
      return next(error);
    }
  };

  importUsersFromCSV = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // This is an alias for bulkUploadUsers - delegate to that method
      return this.bulkUploadUsers(req, res, next);
    } catch (error) {
      return next(error);
    }
  };

  getCSVTemplate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // This is an alias for getBulkUploadTemplate - delegate to that method
      return this.getBulkUploadTemplate(req, res, next);
    } catch (error) {
      return next(error);
    }
  };

  updateUserRoleFields = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const log = createRequestLogger(req, 'users');
      const authReq = req as AuthenticatedRequest;
      const { id } = authReq.params;
      const roleFieldsData = authReq.body;

      if (!id) {
        return sendError(res, 'User ID is required', 400);
      }

      log.info('Updating user role-specific fields', { userId: id });

      // Get current user to determine role
      const currentUser = await this.prisma.user.findUnique({
        where: { id }
      });

      if (!currentUser) {
        return sendNotFound(res, 'User not found');
      }

      const updateData: Partial<User> & Record<string, string | number | boolean | null> = {};

      // Update based on role
      if (currentUser.role === 'JUDGE') {
        if (roleFieldsData.judgeBio !== undefined) updateData.judgeBio = roleFieldsData.judgeBio;
        if (roleFieldsData.judgeCertifications !== undefined) updateData.judgeCertifications = roleFieldsData.judgeCertifications;

        // Also update linked Judge record if exists
        if (currentUser.judgeId) {
          const judgeUpdateData: Partial<Judge> & Record<string, string | boolean | null> = {};
          if (roleFieldsData.bio !== undefined) judgeUpdateData.bio = roleFieldsData.bio;
          if (roleFieldsData.isHeadJudge !== undefined) judgeUpdateData.isHeadJudge = roleFieldsData.isHeadJudge;
          if (roleFieldsData.gender !== undefined) judgeUpdateData.gender = roleFieldsData.gender;
          if (roleFieldsData.pronouns !== undefined) judgeUpdateData.pronouns = roleFieldsData.pronouns;

          if (Object.keys(judgeUpdateData).length > 0) {
            await this.prisma.judge.update({
              where: { id: currentUser.judgeId },
              data: judgeUpdateData
            });
            log.debug('Updated judge record', { judgeId: currentUser.judgeId });
          }
        }
      } else if (currentUser.role === 'CONTESTANT') {
        if (roleFieldsData.contestantBio !== undefined) updateData.contestantBio = roleFieldsData.contestantBio;
        if (roleFieldsData.contestantNumber !== undefined) updateData.contestantNumber = roleFieldsData.contestantNumber;
        if (roleFieldsData.contestantAge !== undefined) updateData.contestantAge = roleFieldsData.contestantAge;
        if (roleFieldsData.contestantSchool !== undefined) updateData.contestantSchool = roleFieldsData.contestantSchool;

        // Also update linked Contestant record if exists
        if (currentUser.contestantId) {
          const contestantUpdateData: Partial<Contestant> & Record<string, string | number | null> = {};
          if (roleFieldsData.bio !== undefined) contestantUpdateData.bio = roleFieldsData.bio;
          if (roleFieldsData.contestantNumber !== undefined) contestantUpdateData.contestantNumber = roleFieldsData.contestantNumber;
          if (roleFieldsData.gender !== undefined) contestantUpdateData.gender = roleFieldsData.gender;
          if (roleFieldsData.pronouns !== undefined) contestantUpdateData.pronouns = roleFieldsData.pronouns;

          if (Object.keys(contestantUpdateData).length > 0) {
            await this.prisma.contestant.update({
              where: { id: currentUser.contestantId },
              data: contestantUpdateData
            });
            log.debug('Updated contestant record', { contestantId: currentUser.contestantId });
          }
        }
      }

      // Update user record if there are changes
      if (Object.keys(updateData).length > 0) {
        const updatedUser = await this.prisma.user.update({
          where: { id },
          data: updateData,
          include: {
            judge: true,
            contestant: true
          }
        }) as UserWithRelations;

        // Invalidate cache
        userCache.invalidate(id);

        log.info('User role fields updated successfully', { userId: id, role: currentUser.role });
        return sendSuccess(res, updatedUser, 'Role-specific fields updated successfully');
      } else {
        log.info('No role fields to update', { userId: id });
        return sendSuccess(res, currentUser, 'No changes to update');
      }
    } catch (error) {
      const log = createRequestLogger(req, 'users');
      log.error('Update user role fields error', { error: (error as Error).message, userId: req.params.id });
      return next(error);
    }
  };

  uploadUserBioFile = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const log = createRequestLogger(req, 'users');
      const authReq = req as AuthenticatedRequest;
      const { id } = authReq.params;
      const requestingUserId = authReq.user?.id || '';
      const requestingUserRole = authReq.user?.role || '';

      if (!id) {
        return sendError(res, 'User ID is required', 400);
      }

      log.info('User bio file upload requested', {
        userId: id,
        requestingUserId,
        requestingUserRole,
        fileSize: req.file?.size,
        mimetype: req.file?.mimetype
      });

      // Check permissions: user can upload their own bio, or admin/organizer/board can upload for others
      if (requestingUserId !== id && !['ADMIN', 'ORGANIZER', 'BOARD'].includes(requestingUserRole)) {
        log.warn('User bio file upload denied: insufficient permissions', { userId: id, requestingUserId, requestingUserRole });
        return sendError(res, 'You do not have permission to upload bio files for this user', 403);
      }

      if (!authReq.file) {
        log.warn('User bio file upload failed: no file provided', { userId: id });
        return sendError(res, 'No file provided', 400);
      }

      // Validate file type (allow text, PDF, Word documents)
      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(authReq.file.mimetype)) {
        log.warn('User bio file upload failed: invalid file type', { userId: id, mimetype: authReq.file.mimetype });
        return sendError(res, 'Invalid file type. Only TXT, PDF, and DOCX files are allowed.', 400);
      }

      const bioFilePath = `/uploads/bios/${authReq.file.filename}`;
      log.debug('Updating user with bio file path', { userId: id, bioFilePath });

      // Get current user
      const currentUser = await this.prisma.user.findUnique({
        where: { id },
        include: {
          judge: true,
          contestant: true
        }
      }) as UserWithRelations | null;

      if (!currentUser) {
        return sendNotFound(res, 'User not found');
      }

      // Update user bio field with file path reference
      const updateData: Partial<User> & Record<string, string | null> = {
        bio: `[Bio file uploaded: ${bioFilePath}]`
      };

      if (currentUser.role === 'JUDGE') {
        updateData.judgeBio = `[Bio file: ${bioFilePath}]`;
      } else if (currentUser.role === 'CONTESTANT') {
        updateData.contestantBio = `[Bio file: ${bioFilePath}]`;
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          judge: true,
          contestant: true
        }
      }) as UserWithRelations;

      // Invalidate cache
      userCache.invalidate(id);

      log.info('User bio file uploaded successfully', { userId: id, bioFilePath });
      return sendSuccess(res, {
        message: 'Bio file uploaded successfully',
        bioFilePath,
        user: updatedUser
      });
    } catch (error) {
      const log = createRequestLogger(req, 'users');
      log.error('Upload user bio file error', { error: (error as Error).message, userId: req.params.id });
      return next(error);
    }
  };

  bulkUploadUsers = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const log = createRequestLogger(req, 'users');
      const authReq = req as AuthenticatedRequest;

      if (!authReq.file) {
        log.warn('Bulk upload failed: No file provided');
        return sendError(res, 'No file provided', 400);
      }

      log.debug('Processing bulk upload', { filename: authReq.file.originalname, size: authReq.file.size });

      // Parse CSV file
      const csvContent = authReq.file.buffer.toString('utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
      
      if (lines.length < 2) {
        log.warn('Bulk upload failed: CSV file is empty or has no data rows');
        return sendError(res, 'CSV file must contain at least a header row and one data row', 400);
      }

      // Parse header row
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['name', 'email', 'password', 'role'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        log.warn('Bulk upload failed: Missing required headers', { missingHeaders });
        return sendError(res, `Missing required headers: ${missingHeaders.join(', ')}`, 400);
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          // Parse CSV row (handle quoted values)
          const values = this.parseCSVLine(line);
          
          if (values.length !== headers.length) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
            continue;
          }

          // Build user data object
          const userData: Record<string, string | number | boolean | null> = {};
          headers.forEach((header, index) => {
            const value = values[index]?.trim() || '';
            if (value) {
              // Map CSV headers to user data fields
              switch (header) {
                case 'name':
                  userData.name = value;
                  break;
                case 'email':
                  userData.email = value;
                  break;
                case 'password':
                  userData.password = value;
                  break;
                case 'role':
                  userData.role = value.toUpperCase();
                  break;
                case 'preferredname':
                  userData.preferredName = value;
                  break;
                case 'pronouns':
                  userData.pronouns = value;
                  break;
                case 'gender':
                  userData.gender = value;
                  break;
                case 'phone':
                  userData.phone = value;
                  break;
                case 'address':
                  userData.address = value;
                  break;
                case 'bio':
                  userData.bio = value;
                  break;
                case 'judgenumber':
                  userData.judgeNumber = value;
                  break;
                case 'judgelevel':
                  userData.judgeLevel = value.toUpperCase();
                  break;
                case 'isheadjudge':
                  userData.isHeadJudge = value.toLowerCase() === 'true';
                  break;
                case 'contestantnumber':
                  userData.contestantNumber = value;
                  break;
                case 'age':
                  userData.age = parseInt(value, 10);
                  break;
                case 'parentguardian':
                  userData.parentGuardian = value;
                  break;
                case 'parentphone':
                  userData.parentPhone = value;
                  break;
                case 'school':
                  userData.school = value;
                  break;
                case 'grade':
                  userData.grade = value;
                  break;
                case 'contestid':
                  userData.contestId = value;
                  break;
                case 'categoryid':
                  userData.categoryId = value;
                  break;
              }
            }
          });

          // Validate required fields
          if (!userData.name || !userData.email || !userData.password || !userData.role) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: Missing required fields`);
            continue;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(userData.email)) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: Invalid email format`);
            continue;
          }

          // Validate role
          const validRoles = ['ADMIN', 'ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'];
          if (!validRoles.includes(userData.role)) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: Invalid role "${userData.role}"`);
            continue;
          }

          // Check if email already exists
          const existingUser = await this.prisma.user.findUnique({
            where: { tenantId_email: { tenantId: authReq.tenantId!, email: String(userData.email) } }
          });

          if (existingUser) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: Email already exists`);
            continue;
          }

          // Build user data object with role-specific fields
          const createUserData: Partial<CreateUserDTO> & Record<string, string | number | boolean | null> = {
            name: userData.name,
            email: userData.email,
            password: userData.password,
            role: userData.role,
            preferredName: userData.preferredName || null,
            gender: userData.gender || null,
            pronouns: userData.pronouns || null,
            phone: userData.phone || null,
            address: userData.address || null,
            bio: userData.bio || null,
            isActive: true
          };

          // Add role-specific fields to User model
          if (userData.role === 'JUDGE') {
            createUserData.judgeBio = userData.bio || null;
            createUserData.judgeCertifications = userData.judgeLevel || null;
          } else if (userData.role === 'CONTESTANT') {
            createUserData.contestantBio = userData.bio || null;
            createUserData.contestantNumber = userData.contestantNumber || null;
            createUserData.contestantAge = userData.age ? parseInt(String(userData.age)) : null;
            createUserData.contestantSchool = userData.school || null;
          }

          // Create user
          const user = await this.userService.createUser(createUserData);

          // Create associated Judge or Contestant record if applicable
          let judgeId: string | null = null;
          let contestantId: string | null = null;

          if (userData.role === 'JUDGE') {
            const judge = await this.prisma.judge.create({
              data: {
                tenantId: authReq.tenantId!,
                name: String(userData.name),
                email: String(userData.email),
                gender: userData.gender ? String(userData.gender) : null,
                pronouns: userData.pronouns ? String(userData.pronouns) : null,
                bio: userData.bio ? String(userData.bio) : null,
                isHeadJudge: Boolean(userData.isHeadJudge)
              }
            });

            judgeId = judge.id;
            await this.prisma.user.update({
              where: { id: user.id },
              data: { judgeId: judge.id }
            });
          } else if (userData.role === 'CONTESTANT') {
            const contestant = await this.prisma.contestant.create({
              data: {
                tenantId: authReq.tenantId!,
                name: String(userData.name),
                email: String(userData.email),
                contestantNumber: userData.contestantNumber ? parseInt(String(userData.contestantNumber)) : null,
                bio: userData.bio ? String(userData.bio) : null,
                gender: userData.gender ? String(userData.gender) : null,
                pronouns: userData.pronouns ? String(userData.pronouns) : null
              }
            });

            contestantId = contestant.id;
            await this.prisma.user.update({
              where: { id: user.id },
              data: { contestantId: contestant.id }
            });
          }

          // Handle assignments
          const userId = authReq.user?.id || '';
          if (userData.role === 'JUDGE' && judgeId && (userData.contestId || userData.categoryId)) {
            try {
              if (userData.categoryId) {
                // Assign to specific category
                await this.assignmentService.createAssignment({
                  judgeId,
                  categoryId: String(userData.categoryId)
                }, userId);
                log.debug('Judge assigned to category', { judgeId, categoryId: userData.categoryId });
              } else if (userData.contestId) {
                // Assign to all categories in contest
                const categories = await this.prisma.category.findMany({
                  where: { contestId: String(userData.contestId) }
                });
                for (const category of categories) {
                  try {
                    await this.assignmentService.createAssignment({
                      judgeId,
                      categoryId: category.id,
                      contestId: String(userData.contestId)
                    }, userId);
                  } catch (err) {
                    // Skip if already assigned
                    const error = err as Error;
                    if (!error.message?.includes('already exists')) {
                      throw err;
                    }
                  }
                }
                log.debug('Judge assigned to all categories in contest', { judgeId, contestId: userData.contestId, categoryCount: categories.length });
              }
            } catch (assignmentError) {
              // Log assignment error but don't fail user creation
              const error = assignmentError as Error;
              log.warn('Failed to assign judge', { judgeId, error: error.message });
              results.errors.push(`Row ${i + 1}: User created but assignment failed: ${error.message}`);
            }
          } else if (userData.role === 'CONTESTANT' && contestantId && (userData.contestId || userData.categoryId)) {
            try {
              if (userData.categoryId) {
                // Assign to specific category
                await this.assignmentService.assignContestantToCategory(String(userData.categoryId), contestantId);
                log.debug('Contestant assigned to category', { contestantId, categoryId: userData.categoryId });
              } else if (userData.contestId) {
                // Assign to all categories in contest
                const categories = await this.prisma.category.findMany({
                  where: { contestId: String(userData.contestId) }
                });
                for (const category of categories) {
                  try {
                    await this.assignmentService.assignContestantToCategory(category.id, contestantId);
                  } catch (err) {
                    // Skip if already assigned
                    const error = err as Error;
                    if (!error.message?.includes('already assigned')) {
                      throw err;
                    }
                  }
                }
                log.debug('Contestant assigned to all categories in contest', { contestantId, contestId: userData.contestId, categoryCount: categories.length });
              }
            } catch (assignmentError) {
              // Log assignment error but don't fail user creation
              const error = assignmentError as Error;
              log.warn('Failed to assign contestant', { contestantId, error: error.message });
              results.errors.push(`Row ${i + 1}: User created but assignment failed: ${error.message}`);
            }
          }

          results.success++;
          log.debug('User created from bulk upload', { email: userData.email, role: userData.role });

        } catch (error) {
          results.failed++;
          const err = error as Error;
          const errorMsg = err.message || 'Unknown error';
          results.errors.push(`Row ${i + 1}: ${errorMsg}`);
          log.warn('Failed to create user from bulk upload', { row: i + 1, error: errorMsg });
        }
      }

      log.info('Bulk upload completed', { success: results.success, failed: results.failed });
      return sendSuccess(res, results, `Bulk upload completed: ${results.success} succeeded, ${results.failed} failed`);
    } catch (error) {
      const log = createRequestLogger(req, 'users');
      log.error('Bulk upload error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    values.push(current);
    return values;
  }

  bulkDeleteUsers = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { userIds, forceDeleteAdmin } = authReq.body;
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return sendBadRequest(res, 'User IDs array is required');
      }

      const log = createRequestLogger(req, 'users');
      log.debug('Bulk deleting users', { 
        userIdCount: userIds.length,
        userIds,
        forceDeleteAdmin: forceDeleteAdmin,
        forceDeleteAdminType: typeof forceDeleteAdmin,
        forceDeleteAdminValue: forceDeleteAdmin === true,
        requestBody: JSON.stringify(authReq.body)
      });

      const result = await this.userService.bulkDeleteUsers(userIds, forceDeleteAdmin === true);
      
      log.info('Bulk delete completed', { deletedCount: result.deletedCount });

      return sendSuccess(res, result, `Successfully deleted ${result.deletedCount} user(s)`);
    } catch (error) {
      const log = createRequestLogger(req, 'users');
      const err = error as Error;
      log.error('Bulk delete failed', { error: err.message, stack: err.stack });
      return next(error);
    }
  };

  getBulkUploadTemplate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const log = createRequestLogger(req, 'users');
      
      log.debug('Generating universal bulk upload template');

      // Universal CSV template with all possible fields
      // Include instructions as comments at the top
      const instructions = [
        '# Bulk User Upload Template',
        '# Instructions:',
        '# - Required fields for ALL users: name, email, password, role',
        '# - Role must be one of: ADMIN, ORGANIZER, JUDGE, CONTESTANT, TALLY_MASTER, AUDITOR, BOARD, EMCEE',
        '# - JUDGE-specific fields: judgeNumber, judgeLevel, isHeadJudge (true/false)',
        '# - CONTESTANT-specific fields: contestantNumber, age, parentGuardian, parentPhone, school, grade',
        '# - Optional fields for all: bio, phone, address, preferredName, pronouns, gender',
        '# - Assignment fields: contestId (assigns to all categories in contest), categoryId (assigns to specific category)',
        '#   - For JUDGE: If contestId provided, assigns to all categories. If categoryId provided, assigns to that category.',
        '#   - For CONTESTANT: If categoryId provided, assigns to that category. If contestId provided, assigns to all categories.',
        '# - Leave fields empty if not applicable',
        '# - Remove these instruction lines before uploading',
        '#',
        '# Example:',
        '# name,email,password,role,judgeNumber,judgeLevel,isHeadJudge,contestantNumber,age,bio,phone,address',
        '# John Doe,john@example.com,SecurePass123!,JUDGE,J001,EXPERT,false,,,,,',
        '# Jane Smith,jane@example.com,SecurePass123!,CONTESTANT,,,C001,15,Great student,555-1234,123 Main St',
        '#',
      ].join('\n');

      // Define all possible CSV headers
      const headers = [
        'name',
        'email', 
        'password',
        'role',
        'preferredName',
        'pronouns',
        'gender',
        'phone',
        'address',
        'bio',
        'judgeNumber',
        'judgeLevel',
        'isHeadJudge',
        'contestantNumber',
        'age',
        'parentGuardian',
        'parentPhone',
        'school',
        'grade',
        'contestId',
        'categoryId'
      ];

      // Create example rows for different roles
      const exampleRows = [
        // Judge example with assignment
        ['John Doe', 'judge@example.com', 'SecurePass123!', 'JUDGE', '', '', '', '555-0001', '', 'Experienced judge', 'J001', 'EXPERT', 'false', '', '', '', '', '', '', 'contest-id-here', 'category-id-here'],
        // Contestant example with assignment
        ['Jane Smith', 'contestant@example.com', 'SecurePass123!', 'CONTESTANT', '', '', '', '555-0002', '123 Main St', 'Great student', '', '', '', 'C001', '15', 'Parent Name', '555-0003', 'High School', '10', 'contest-id-here', 'category-id-here'],
        // Admin example (no assignments)
        ['Admin User', 'admin@example.com', 'SecurePass123!', 'ADMIN', '', '', '', '555-0004', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ];

      // Build CSV content
      const csvContent = instructions + '\n' +
        headers.join(',') + '\n' +
        exampleRows.map(row => row.join(',')).join('\n');

      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bulk-upload-template-universal.csv"');
      
      log.info('Universal bulk upload template generated');
      res.send(csvContent);
    } catch (error) {
      const log = createRequestLogger(req, 'users');
      log.error('Get bulk upload template error', { error: (error as Error).message });
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new UsersController();

export const getAllUsers = controller.getAllUsers;
export const getUserById = controller.getUserById;
export const createUser = controller.createUser;
export const updateUser = controller.updateUser;
export const deleteUser = controller.deleteUser;
export const resetPassword = controller.resetPassword;
export const getUsersByRole = controller.getUsersByRole;
export const updateLastLogin = controller.updateLastLogin;
export const bulkRemoveUsers = controller.bulkRemoveUsers;
export const removeAllUsersByRole = controller.removeAllUsersByRole;
export const getUserStats = controller.getUserStats;
export const uploadUserImage = controller.uploadUserImage;
export const importUsersFromCSV = controller.importUsersFromCSV;
export const getCSVTemplate = controller.getCSVTemplate;
export const updateUserRoleFields = controller.updateUserRoleFields;
export const uploadUserBioFile = controller.uploadUserBioFile;
export const bulkUploadUsers = controller.bulkUploadUsers;
export const bulkDeleteUsers = controller.bulkDeleteUsers;
export const getBulkUploadTemplate = controller.getBulkUploadTemplate;
