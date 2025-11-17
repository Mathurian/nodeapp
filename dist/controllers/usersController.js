"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBulkUploadTemplate = exports.bulkDeleteUsers = exports.bulkUploadUsers = exports.uploadUserBioFile = exports.updateUserRoleFields = exports.getCSVTemplate = exports.importUsersFromCSV = exports.uploadUserImage = exports.getUserStats = exports.removeAllUsersByRole = exports.bulkRemoveUsers = exports.updateLastLogin = exports.getUsersByRole = exports.resetPassword = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = exports.UsersController = void 0;
const tsyringe_1 = require("tsyringe");
const UserService_1 = require("../services/UserService");
const AssignmentService_1 = require("../services/AssignmentService");
const responseHelpers_1 = require("../utils/responseHelpers");
const cache_1 = require("../utils/cache");
const logger_1 = require("../utils/logger");
class UsersController {
    userService;
    assignmentService;
    prisma;
    constructor() {
        this.userService = tsyringe_1.container.resolve(UserService_1.UserService);
        this.assignmentService = tsyringe_1.container.resolve(AssignmentService_1.AssignmentService);
        this.prisma = tsyringe_1.container.resolve('PrismaClient');
    }
    getAllUsers = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'users');
        try {
            log.debug('Fetching all users');
            const users = await this.userService.getAllUsersWithRelations();
            log.info('Users retrieved successfully', { count: users.length });
            (0, responseHelpers_1.sendSuccess)(res, { data: users });
        }
        catch (error) {
            log.error('Get users error', { error: error.message });
            return next(error);
        }
    };
    getUserById = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'users');
        try {
            const id = req.params.id;
            log.debug('Fetching user by ID', { userId: id });
            const user = await this.userService.getUserByIdWithRelations(id);
            if (!user) {
                log.warn('User not found', { userId: id });
                (0, responseHelpers_1.sendNotFound)(res, 'User not found');
                return;
            }
            log.debug('User retrieved successfully', { userId: id, email: user.email });
            (0, responseHelpers_1.sendSuccess)(res, { data: user });
        }
        catch (error) {
            log.error('Get user error', { error: error.message, userId: req.params.id });
            return next(error);
        }
    };
    createUser = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'users');
        try {
            const data = req.body;
            log.info('User creation requested', {
                email: data.email,
                role: data.role,
                name: data.name
            });
            if (!data.name || !data.email || !data.password || !data.role) {
                log.warn('User creation failed: missing required fields');
                (0, responseHelpers_1.sendError)(res, 'Name, email, password, and role are required', 400);
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                log.warn('User creation failed: invalid email format', { email: data.email });
                (0, responseHelpers_1.sendError)(res, 'Invalid email format', 400);
                return;
            }
            const validRoles = ['ADMIN', 'ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'];
            if (!validRoles.includes(data.role)) {
                log.warn('User creation failed: invalid role', { role: data.role });
                (0, responseHelpers_1.sendError)(res, 'Invalid role', 400);
                return;
            }
            const existingUser = await this.prisma.user.findUnique({
                where: { tenantId_email: { tenantId: req.tenantId, email: data.email } }
            });
            if (existingUser) {
                log.warn('User creation failed: email already exists', { email: data.email });
                (0, responseHelpers_1.sendError)(res, 'User with this email already exists', 400);
                return;
            }
            const userData = {
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
            if (data.role === 'JUDGE') {
                userData.judgeBio = data.bio || null;
                userData.judgeCertifications = data.judgeLevel || null;
            }
            else if (data.role === 'CONTESTANT') {
                userData.contestantBio = data.bio || null;
                userData.contestantNumber = data.contestantNumber || null;
                userData.contestantAge = data.age ? parseInt(String(data.age)) : null;
                userData.contestantSchool = data.school || null;
            }
            const user = await this.userService.createUser(userData);
            if (data.role === 'JUDGE') {
                log.debug('Creating judge record', { userId: user.id });
                const judge = await this.prisma.judge.create({
                    data: {
                        tenantId: req.tenantId,
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
            }
            else if (data.role === 'CONTESTANT') {
                log.debug('Creating contestant record', { userId: user.id });
                const contestant = await this.prisma.contestant.create({
                    data: {
                        tenantId: req.tenantId,
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
            const createdUser = await this.prisma.user.findUnique({
                where: { id: user.id },
                include: {
                    judge: true,
                    contestant: true
                }
            });
            log.info('User created successfully', { userId: user.id, email: data.email, role: data.role });
            (0, responseHelpers_1.sendCreated)(res, createdUser);
        }
        catch (error) {
            log.error('Create user error', { error: error.message, email: req.body.email });
            if (error.code === 'P2002') {
                (0, responseHelpers_1.sendError)(res, 'User with this email already exists', 400);
            }
            else {
                return next(error);
            }
        }
    };
    updateUser = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'users');
        try {
            const id = req.params.id;
            const data = req.body;
            log.info('User update requested', { userId: id });
            const currentUser = await this.prisma.user.findUnique({
                where: { id }
            });
            if (!currentUser) {
                log.warn('User update failed: user not found', { userId: id });
                (0, responseHelpers_1.sendNotFound)(res, 'User not found');
                return;
            }
            log.debug('Building user update data', {
                userId: id,
                roleChanged: data.role !== currentUser.role,
                oldRole: currentUser.role,
                newRole: data.role
            });
            const userData = {};
            if (data.name !== undefined)
                userData.name = data.name;
            if (data.email !== undefined)
                userData.email = data.email;
            if (data.role !== undefined)
                userData.role = data.role;
            if (data.phone !== undefined)
                userData.phone = data.phone || null;
            if (data.address !== undefined)
                userData.address = data.address || null;
            if (data.city !== undefined)
                userData.city = data.city || null;
            if (data.state !== undefined)
                userData.state = data.state || null;
            if (data.country !== undefined)
                userData.country = data.country || null;
            if (data.bio !== undefined)
                userData.bio = data.bio || null;
            if (data.preferredName !== undefined)
                userData.preferredName = data.preferredName || null;
            if (data.pronouns !== undefined)
                userData.pronouns = data.pronouns || null;
            if (data.gender !== undefined)
                userData.gender = data.gender || null;
            if (data.isActive !== undefined)
                userData.isActive = data.isActive;
            if (data.role === 'JUDGE') {
                if (data.bio !== undefined)
                    userData.judgeBio = data.bio || null;
                if (data.judgeLevel !== undefined)
                    userData.judgeCertifications = data.judgeLevel || null;
            }
            else if (data.role === 'CONTESTANT') {
                if (data.bio !== undefined)
                    userData.contestantBio = data.bio || null;
                if (data.contestantNumber !== undefined)
                    userData.contestantNumber = data.contestantNumber || null;
                if (data.age !== undefined)
                    userData.contestantAge = data.age ? parseInt(String(data.age)) : null;
                if (data.school !== undefined)
                    userData.contestantSchool = data.school || null;
            }
            log.debug('Updating user record', { userId: id });
            const user = await this.prisma.user.update({
                where: { id },
                data: userData,
                include: {
                    judge: true,
                    contestant: true
                }
            });
            cache_1.userCache.invalidate(id);
            log.info('User record updated', { userId: id, email: user.email });
            if (currentUser.role === 'JUDGE' && data.isHeadJudge !== undefined && currentUser.judgeId) {
                log.debug('Updating judge head judge status', { userId: id, judgeId: currentUser.judgeId, isHeadJudge: data.isHeadJudge });
                await this.prisma.judge.update({
                    where: { id: currentUser.judgeId },
                    data: { isHeadJudge: data.isHeadJudge }
                });
            }
            log.info('User updated successfully', { userId: id, email: user.email });
            (0, responseHelpers_1.sendSuccess)(res, user);
        }
        catch (error) {
            log.error('Update user error', { error: error.message, userId: req.params.id });
            return next(error);
        }
    };
    deleteUser = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'users');
        try {
            const id = req.params.id;
            log.info('User deletion requested', { userId: id });
            const userToDelete = await this.prisma.user.findUnique({
                where: { id },
                select: { id: true, email: true, name: true, role: true }
            });
            if (!userToDelete) {
                log.warn('User deletion failed: user not found', { userId: id });
                (0, responseHelpers_1.sendNotFound)(res, 'User not found');
                return;
            }
            log.debug('Deleting user record', { userId: id, email: userToDelete.email });
            await this.userService.deleteUser(id);
            log.info('User deleted successfully', { userId: id, email: userToDelete.email, role: userToDelete.role });
            (0, responseHelpers_1.sendNoContent)(res);
        }
        catch (error) {
            log.error('Delete user error', { error: error.message, userId: req.params.id });
            return next(error);
        }
    };
    resetPassword = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'users');
        try {
            const id = req.params.id;
            const { newPassword } = req.body;
            if (!newPassword) {
                (0, responseHelpers_1.sendError)(res, 'New password is required', 400);
                return;
            }
            await this.userService.resetUserPassword(id, newPassword);
            log.info('Password reset successfully', { userId: id });
            (0, responseHelpers_1.sendSuccess)(res, null, 'Password reset successfully');
        }
        catch (error) {
            log.error('Reset password error', { error: error.message, userId: req.params.id });
            return next(error);
        }
    };
    getUsersByRole = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'users');
        try {
            const role = req.params.role;
            const validRoles = ['ADMIN', 'ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'];
            if (!validRoles.includes(role)) {
                (0, responseHelpers_1.sendError)(res, 'Invalid role', 400);
                return;
            }
            const users = await this.prisma.user.findMany({
                where: { role: role },
                include: {
                    judge: true,
                    contestant: true
                },
                orderBy: { createdAt: 'desc' }
            });
            log.info('Users by role retrieved', { role, count: users.length });
            (0, responseHelpers_1.sendSuccess)(res, users);
        }
        catch (error) {
            log.error('Get users by role error', { error: error.message, role: req.params.role });
            return next(error);
        }
    };
    updateLastLogin = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'users');
        try {
            const id = req.params.id;
            const user = await this.userService.updateLastLogin(id);
            (0, responseHelpers_1.sendSuccess)(res, {
                id: user.id,
                name: user.name,
                email: user.email,
                lastLoginAt: user.lastLoginAt
            });
        }
        catch (error) {
            log.error('Update last login error', { error: error.message, userId: req.params.id });
            if (error.code === 'P2025') {
                (0, responseHelpers_1.sendNotFound)(res, 'User not found');
            }
            else {
                return next(error);
            }
        }
    };
    bulkRemoveUsers = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'users');
        try {
            const { userIds } = req.body;
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                (0, responseHelpers_1.sendError)(res, 'User IDs array is required', 400);
                return;
            }
            const result = await this.userService.bulkDeleteUsers(userIds);
            log.info('Bulk remove users completed', { deletedCount: result.deletedCount });
            (0, responseHelpers_1.sendSuccess)(res, {
                message: `${result.deletedCount} users deleted successfully`,
                deletedCount: result.deletedCount
            });
        }
        catch (error) {
            log.error('Bulk remove users error', { error: error.message });
            return next(error);
        }
    };
    removeAllUsersByRole = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'users');
        try {
            const role = req.params.role;
            const result = await this.userService.deleteUsersByRole(role);
            log.info('Remove users by role completed', { role, deletedCount: result.deletedCount });
            (0, responseHelpers_1.sendSuccess)(res, {
                message: `${result.deletedCount} ${role} users deleted successfully`,
                deletedCount: result.deletedCount
            });
        }
        catch (error) {
            log.error('Remove all users by role error', { error: error.message, role: req.params.role });
            return next(error);
        }
    };
    getUserStats = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'users');
        try {
            const stats = await this.userService.getAggregateUserStats();
            log.info('User stats retrieved', { totalUsers: stats.totalUsers });
            (0, responseHelpers_1.sendSuccess)(res, stats);
        }
        catch (error) {
            log.error('Get user stats error', { error: error.message });
            return next(error);
        }
    };
    uploadUserImage = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'users');
        try {
            const id = req.params.id;
            const requestingUserId = req.user?.id || '';
            const requestingUserRole = req.user?.role || '';
            log.info('User image upload requested', {
                userId: id,
                requestingUserId,
                requestingUserRole,
                fileSize: req.file?.size,
                mimetype: req.file?.mimetype
            });
            if (requestingUserId !== id && !['ADMIN', 'ORGANIZER', 'BOARD'].includes(requestingUserRole)) {
                log.warn('User image upload denied: insufficient permissions', { userId: id, requestingUserId, requestingUserRole });
                (0, responseHelpers_1.sendError)(res, 'You do not have permission to upload images for this user', 403);
                return;
            }
            if (!req.file) {
                log.warn('User image upload failed: no file provided', { userId: id });
                (0, responseHelpers_1.sendError)(res, 'No image file provided', 400);
                return;
            }
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(req.file.mimetype)) {
                log.warn('User image upload failed: invalid file type', { userId: id, mimetype: req.file.mimetype });
                (0, responseHelpers_1.sendError)(res, 'Invalid file type. Only JPEG, PNG, and GIF are allowed.', 400);
                return;
            }
            const imagePath = `/uploads/users/${req.file.filename}`;
            log.debug('Updating user with image path', { userId: id, imagePath });
            const user = await this.userService.updateUserImage(id, imagePath);
            log.info('User image uploaded successfully', { userId: id, imagePath });
            (0, responseHelpers_1.sendSuccess)(res, {
                message: 'Image uploaded successfully',
                imagePath,
                user
            });
        }
        catch (error) {
            log.error('Upload user image error', { error: error.message, userId: req.params.id });
            return next(error);
        }
    };
    importUsersFromCSV = async (req, res, next) => {
        try {
            return this.bulkUploadUsers(req, res, next);
        }
        catch (error) {
            return next(error);
        }
    };
    getCSVTemplate = async (req, res, next) => {
        try {
            return this.getBulkUploadTemplate(req, res, next);
        }
        catch (error) {
            return next(error);
        }
    };
    updateUserRoleFields = async (req, res, next) => {
        try {
            const log = (0, logger_1.createRequestLogger)(req, 'users');
            const { id } = req.params;
            const roleFieldsData = req.body;
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'User ID is required', 400);
            }
            log.info('Updating user role-specific fields', { userId: id });
            const currentUser = await this.prisma.user.findUnique({
                where: { id }
            });
            if (!currentUser) {
                return (0, responseHelpers_1.sendNotFound)(res, 'User not found');
            }
            const updateData = {};
            if (currentUser.role === 'JUDGE') {
                if (roleFieldsData.judgeBio !== undefined)
                    updateData.judgeBio = roleFieldsData.judgeBio;
                if (roleFieldsData.judgeCertifications !== undefined)
                    updateData.judgeCertifications = roleFieldsData.judgeCertifications;
                if (currentUser.judgeId) {
                    const judgeUpdateData = {};
                    if (roleFieldsData.bio !== undefined)
                        judgeUpdateData.bio = roleFieldsData.bio;
                    if (roleFieldsData.isHeadJudge !== undefined)
                        judgeUpdateData.isHeadJudge = roleFieldsData.isHeadJudge;
                    if (roleFieldsData.gender !== undefined)
                        judgeUpdateData.gender = roleFieldsData.gender;
                    if (roleFieldsData.pronouns !== undefined)
                        judgeUpdateData.pronouns = roleFieldsData.pronouns;
                    if (Object.keys(judgeUpdateData).length > 0) {
                        await this.prisma.judge.update({
                            where: { id: currentUser.judgeId },
                            data: judgeUpdateData
                        });
                        log.debug('Updated judge record', { judgeId: currentUser.judgeId });
                    }
                }
            }
            else if (currentUser.role === 'CONTESTANT') {
                if (roleFieldsData.contestantBio !== undefined)
                    updateData.contestantBio = roleFieldsData.contestantBio;
                if (roleFieldsData.contestantNumber !== undefined)
                    updateData.contestantNumber = roleFieldsData.contestantNumber;
                if (roleFieldsData.contestantAge !== undefined)
                    updateData.contestantAge = roleFieldsData.contestantAge;
                if (roleFieldsData.contestantSchool !== undefined)
                    updateData.contestantSchool = roleFieldsData.contestantSchool;
                if (currentUser.contestantId) {
                    const contestantUpdateData = {};
                    if (roleFieldsData.bio !== undefined)
                        contestantUpdateData.bio = roleFieldsData.bio;
                    if (roleFieldsData.contestantNumber !== undefined)
                        contestantUpdateData.contestantNumber = roleFieldsData.contestantNumber;
                    if (roleFieldsData.gender !== undefined)
                        contestantUpdateData.gender = roleFieldsData.gender;
                    if (roleFieldsData.pronouns !== undefined)
                        contestantUpdateData.pronouns = roleFieldsData.pronouns;
                    if (Object.keys(contestantUpdateData).length > 0) {
                        await this.prisma.contestant.update({
                            where: { id: currentUser.contestantId },
                            data: contestantUpdateData
                        });
                        log.debug('Updated contestant record', { contestantId: currentUser.contestantId });
                    }
                }
            }
            if (Object.keys(updateData).length > 0) {
                const updatedUser = await this.prisma.user.update({
                    where: { id },
                    data: updateData,
                    include: {
                        judge: true,
                        contestant: true
                    }
                });
                cache_1.userCache.invalidate(id);
                log.info('User role fields updated successfully', { userId: id, role: currentUser.role });
                return (0, responseHelpers_1.sendSuccess)(res, updatedUser, 'Role-specific fields updated successfully');
            }
            else {
                log.info('No role fields to update', { userId: id });
                return (0, responseHelpers_1.sendSuccess)(res, currentUser, 'No changes to update');
            }
        }
        catch (error) {
            const log = (0, logger_1.createRequestLogger)(req, 'users');
            log.error('Update user role fields error', { error: error.message, userId: req.params.id });
            return next(error);
        }
    };
    uploadUserBioFile = async (req, res, next) => {
        try {
            const log = (0, logger_1.createRequestLogger)(req, 'users');
            const { id } = req.params;
            const requestingUserId = req.user?.id || '';
            const requestingUserRole = req.user?.role || '';
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'User ID is required', 400);
            }
            log.info('User bio file upload requested', {
                userId: id,
                requestingUserId,
                requestingUserRole,
                fileSize: req.file?.size,
                mimetype: req.file?.mimetype
            });
            if (requestingUserId !== id && !['ADMIN', 'ORGANIZER', 'BOARD'].includes(requestingUserRole)) {
                log.warn('User bio file upload denied: insufficient permissions', { userId: id, requestingUserId, requestingUserRole });
                return (0, responseHelpers_1.sendError)(res, 'You do not have permission to upload bio files for this user', 403);
            }
            if (!req.file) {
                log.warn('User bio file upload failed: no file provided', { userId: id });
                return (0, responseHelpers_1.sendError)(res, 'No file provided', 400);
            }
            const allowedTypes = [
                'text/plain',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            if (!allowedTypes.includes(req.file.mimetype)) {
                log.warn('User bio file upload failed: invalid file type', { userId: id, mimetype: req.file.mimetype });
                return (0, responseHelpers_1.sendError)(res, 'Invalid file type. Only TXT, PDF, and DOCX files are allowed.', 400);
            }
            const bioFilePath = `/uploads/bios/${req.file.filename}`;
            log.debug('Updating user with bio file path', { userId: id, bioFilePath });
            const currentUser = await this.prisma.user.findUnique({
                where: { id },
                include: {
                    judge: true,
                    contestant: true
                }
            });
            if (!currentUser) {
                return (0, responseHelpers_1.sendNotFound)(res, 'User not found');
            }
            const updateData = {
                bio: `[Bio file uploaded: ${bioFilePath}]`
            };
            if (currentUser.role === 'JUDGE') {
                updateData.judgeBio = `[Bio file: ${bioFilePath}]`;
            }
            else if (currentUser.role === 'CONTESTANT') {
                updateData.contestantBio = `[Bio file: ${bioFilePath}]`;
            }
            const updatedUser = await this.prisma.user.update({
                where: { id },
                data: updateData,
                include: {
                    judge: true,
                    contestant: true
                }
            });
            cache_1.userCache.invalidate(id);
            log.info('User bio file uploaded successfully', { userId: id, bioFilePath });
            return (0, responseHelpers_1.sendSuccess)(res, {
                message: 'Bio file uploaded successfully',
                bioFilePath,
                user: updatedUser
            });
        }
        catch (error) {
            const log = (0, logger_1.createRequestLogger)(req, 'users');
            log.error('Upload user bio file error', { error: error.message, userId: req.params.id });
            return next(error);
        }
    };
    bulkUploadUsers = async (req, res, next) => {
        try {
            const log = (0, logger_1.createRequestLogger)(req, 'users');
            if (!req.file) {
                log.warn('Bulk upload failed: No file provided');
                return (0, responseHelpers_1.sendError)(res, 'No file provided', 400);
            }
            log.debug('Processing bulk upload', { filename: req.file.originalname, size: req.file.size });
            const csvContent = req.file.buffer.toString('utf-8');
            const lines = csvContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
            if (lines.length < 2) {
                log.warn('Bulk upload failed: CSV file is empty or has no data rows');
                return (0, responseHelpers_1.sendError)(res, 'CSV file must contain at least a header row and one data row', 400);
            }
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const requiredHeaders = ['name', 'email', 'password', 'role'];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                log.warn('Bulk upload failed: Missing required headers', { missingHeaders });
                return (0, responseHelpers_1.sendError)(res, `Missing required headers: ${missingHeaders.join(', ')}`, 400);
            }
            const results = {
                success: 0,
                failed: 0,
                errors: []
            };
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line)
                    continue;
                try {
                    const values = this.parseCSVLine(line);
                    if (values.length !== headers.length) {
                        results.failed++;
                        results.errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
                        continue;
                    }
                    const userData = {};
                    headers.forEach((header, index) => {
                        const value = values[index]?.trim() || '';
                        if (value) {
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
                    if (!userData.name || !userData.email || !userData.password || !userData.role) {
                        results.failed++;
                        results.errors.push(`Row ${i + 1}: Missing required fields`);
                        continue;
                    }
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(userData.email)) {
                        results.failed++;
                        results.errors.push(`Row ${i + 1}: Invalid email format`);
                        continue;
                    }
                    const validRoles = ['ADMIN', 'ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'];
                    if (!validRoles.includes(userData.role)) {
                        results.failed++;
                        results.errors.push(`Row ${i + 1}: Invalid role "${userData.role}"`);
                        continue;
                    }
                    const existingUser = await this.prisma.user.findUnique({
                        where: { tenantId_email: { tenantId: req.tenantId, email: userData.email } }
                    });
                    if (existingUser) {
                        results.failed++;
                        results.errors.push(`Row ${i + 1}: Email already exists`);
                        continue;
                    }
                    const createUserData = {
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
                    if (userData.role === 'JUDGE') {
                        createUserData.judgeBio = userData.bio || null;
                        createUserData.judgeCertifications = userData.judgeLevel || null;
                    }
                    else if (userData.role === 'CONTESTANT') {
                        createUserData.contestantBio = userData.bio || null;
                        createUserData.contestantNumber = userData.contestantNumber || null;
                        createUserData.contestantAge = userData.age ? parseInt(String(userData.age)) : null;
                        createUserData.contestantSchool = userData.school || null;
                    }
                    const user = await this.userService.createUser(createUserData);
                    let judgeId = null;
                    let contestantId = null;
                    if (userData.role === 'JUDGE') {
                        const judge = await this.prisma.judge.create({
                            data: {
                                tenantId: req.tenantId,
                                name: userData.name,
                                email: userData.email,
                                gender: userData.gender || null,
                                pronouns: userData.pronouns || null,
                                bio: userData.bio || null,
                                isHeadJudge: userData.isHeadJudge || false
                            }
                        });
                        judgeId = judge.id;
                        await this.prisma.user.update({
                            where: { id: user.id },
                            data: { judgeId: judge.id }
                        });
                    }
                    else if (userData.role === 'CONTESTANT') {
                        const contestant = await this.prisma.contestant.create({
                            data: {
                                tenantId: req.tenantId,
                                name: userData.name,
                                email: userData.email,
                                contestantNumber: userData.contestantNumber ? parseInt(String(userData.contestantNumber)) : null,
                                bio: userData.bio || null,
                                gender: userData.gender || null,
                                pronouns: userData.pronouns || null
                            }
                        });
                        contestantId = contestant.id;
                        await this.prisma.user.update({
                            where: { id: user.id },
                            data: { contestantId: contestant.id }
                        });
                    }
                    const userId = req.user?.id || '';
                    if (userData.role === 'JUDGE' && judgeId && (userData.contestId || userData.categoryId)) {
                        try {
                            if (userData.categoryId) {
                                await this.assignmentService.createAssignment({
                                    judgeId,
                                    categoryId: userData.categoryId
                                }, userId);
                                log.debug('Judge assigned to category', { judgeId, categoryId: userData.categoryId });
                            }
                            else if (userData.contestId) {
                                const categories = await this.prisma.category.findMany({
                                    where: { contestId: userData.contestId }
                                });
                                for (const category of categories) {
                                    try {
                                        await this.assignmentService.createAssignment({
                                            judgeId,
                                            categoryId: category.id,
                                            contestId: userData.contestId
                                        }, userId);
                                    }
                                    catch (err) {
                                        if (!err.message?.includes('already exists')) {
                                            throw err;
                                        }
                                    }
                                }
                                log.debug('Judge assigned to all categories in contest', { judgeId, contestId: userData.contestId, categoryCount: categories.length });
                            }
                        }
                        catch (assignmentError) {
                            log.warn('Failed to assign judge', { judgeId, error: assignmentError.message });
                            results.errors.push(`Row ${i + 1}: User created but assignment failed: ${assignmentError.message}`);
                        }
                    }
                    else if (userData.role === 'CONTESTANT' && contestantId && (userData.contestId || userData.categoryId)) {
                        try {
                            if (userData.categoryId) {
                                await this.assignmentService.assignContestantToCategory(userData.categoryId, contestantId);
                                log.debug('Contestant assigned to category', { contestantId, categoryId: userData.categoryId });
                            }
                            else if (userData.contestId) {
                                const categories = await this.prisma.category.findMany({
                                    where: { contestId: userData.contestId }
                                });
                                for (const category of categories) {
                                    try {
                                        await this.assignmentService.assignContestantToCategory(category.id, contestantId);
                                    }
                                    catch (err) {
                                        if (!err.message?.includes('already assigned')) {
                                            throw err;
                                        }
                                    }
                                }
                                log.debug('Contestant assigned to all categories in contest', { contestantId, contestId: userData.contestId, categoryCount: categories.length });
                            }
                        }
                        catch (assignmentError) {
                            log.warn('Failed to assign contestant', { contestantId, error: assignmentError.message });
                            results.errors.push(`Row ${i + 1}: User created but assignment failed: ${assignmentError.message}`);
                        }
                    }
                    results.success++;
                    log.debug('User created from bulk upload', { email: userData.email, role: userData.role });
                }
                catch (error) {
                    results.failed++;
                    const errorMsg = error.message || 'Unknown error';
                    results.errors.push(`Row ${i + 1}: ${errorMsg}`);
                    log.warn('Failed to create user from bulk upload', { row: i + 1, error: errorMsg });
                }
            }
            log.info('Bulk upload completed', { success: results.success, failed: results.failed });
            return (0, responseHelpers_1.sendSuccess)(res, results, `Bulk upload completed: ${results.success} succeeded, ${results.failed} failed`);
        }
        catch (error) {
            const log = (0, logger_1.createRequestLogger)(req, 'users');
            log.error('Bulk upload error', { error: error.message });
            return next(error);
        }
    };
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                }
                else {
                    inQuotes = !inQuotes;
                }
            }
            else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            }
            else {
                current += char;
            }
        }
        values.push(current);
        return values;
    }
    bulkDeleteUsers = async (req, res, next) => {
        try {
            const { userIds, forceDeleteAdmin } = req.body;
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                return (0, responseHelpers_1.sendBadRequest)(res, 'User IDs array is required');
            }
            const log = (0, logger_1.createRequestLogger)(req, 'users');
            log.debug('Bulk deleting users', {
                userIdCount: userIds.length,
                userIds,
                forceDeleteAdmin: forceDeleteAdmin,
                forceDeleteAdminType: typeof forceDeleteAdmin,
                forceDeleteAdminValue: forceDeleteAdmin === true,
                requestBody: JSON.stringify(req.body)
            });
            const result = await this.userService.bulkDeleteUsers(userIds, forceDeleteAdmin === true);
            log.info('Bulk delete completed', { deletedCount: result.deletedCount });
            return (0, responseHelpers_1.sendSuccess)(res, result, `Successfully deleted ${result.deletedCount} user(s)`);
        }
        catch (error) {
            const log = (0, logger_1.createRequestLogger)(req, 'users');
            log.error('Bulk delete failed', { error: error.message, stack: error.stack });
            return next(error);
        }
    };
    getBulkUploadTemplate = async (req, res, next) => {
        try {
            const log = (0, logger_1.createRequestLogger)(req, 'users');
            log.debug('Generating universal bulk upload template');
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
            const exampleRows = [
                ['John Doe', 'judge@example.com', 'SecurePass123!', 'JUDGE', '', '', '', '555-0001', '', 'Experienced judge', 'J001', 'EXPERT', 'false', '', '', '', '', '', '', 'contest-id-here', 'category-id-here'],
                ['Jane Smith', 'contestant@example.com', 'SecurePass123!', 'CONTESTANT', '', '', '', '555-0002', '123 Main St', 'Great student', '', '', '', 'C001', '15', 'Parent Name', '555-0003', 'High School', '10', 'contest-id-here', 'category-id-here'],
                ['Admin User', 'admin@example.com', 'SecurePass123!', 'ADMIN', '', '', '', '555-0004', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ];
            const csvContent = instructions + '\n' +
                headers.join(',') + '\n' +
                exampleRows.map(row => row.join(',')).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="bulk-upload-template-universal.csv"');
            log.info('Universal bulk upload template generated');
            res.send(csvContent);
        }
        catch (error) {
            const log = (0, logger_1.createRequestLogger)(req, 'users');
            log.error('Get bulk upload template error', { error: error.message });
            return next(error);
        }
    };
}
exports.UsersController = UsersController;
const controller = new UsersController();
exports.getAllUsers = controller.getAllUsers;
exports.getUserById = controller.getUserById;
exports.createUser = controller.createUser;
exports.updateUser = controller.updateUser;
exports.deleteUser = controller.deleteUser;
exports.resetPassword = controller.resetPassword;
exports.getUsersByRole = controller.getUsersByRole;
exports.updateLastLogin = controller.updateLastLogin;
exports.bulkRemoveUsers = controller.bulkRemoveUsers;
exports.removeAllUsersByRole = controller.removeAllUsersByRole;
exports.getUserStats = controller.getUserStats;
exports.uploadUserImage = controller.uploadUserImage;
exports.importUsersFromCSV = controller.importUsersFromCSV;
exports.getCSVTemplate = controller.getCSVTemplate;
exports.updateUserRoleFields = controller.updateUserRoleFields;
exports.uploadUserBioFile = controller.uploadUserBioFile;
exports.bulkUploadUsers = controller.bulkUploadUsers;
exports.bulkDeleteUsers = controller.bulkDeleteUsers;
exports.getBulkUploadTemplate = controller.getBulkUploadTemplate;
//# sourceMappingURL=usersController.js.map