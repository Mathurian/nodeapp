"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFileAccess = exports.checkSharingPermission = exports.checkUploadPermission = exports.getRoleFilePermissions = exports.checkFilePermission = exports.checkFileAccess = void 0;
const prisma = require('../utils/prisma');
const checkFileAccess = (requiredPermission = 'READ') => {
    return async (req, res, next) => {
        try {
            const { fileId } = req.params;
            if (!req.user) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }
            const userId = req.user.id;
            const userRole = req.user.role;
            if (!fileId) {
                res.status(400).json({ error: 'File ID is required' });
                return;
            }
            const file = await prisma.file.findUnique({
                where: { id: fileId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            preferredName: true,
                            email: true,
                            role: true
                        }
                    }
                }
            });
            if (!file) {
                res.status(404).json({ error: 'File not found' });
                return;
            }
            const hasAccess = await checkFilePermission(file, userId, userRole, requiredPermission);
            if (!hasAccess.allowed) {
                res.status(403).json({
                    error: 'Access denied',
                    reason: hasAccess.reason
                });
                return;
            }
            req.fileInfo = file;
            next();
        }
        catch (error) {
            console.error('File access control error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
};
exports.checkFileAccess = checkFileAccess;
const checkFilePermission = async (file, userId, userRole, permission) => {
    if (['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
        return { allowed: true, reason: 'Admin access granted' };
    }
    if (file.uploadedBy === userId) {
        return { allowed: true, reason: 'File owner access granted' };
    }
    if (file.isPublic && permission === 'READ') {
        return { allowed: true, reason: 'Public file access granted' };
    }
    const rolePermissions = await getRoleFilePermissions(userRole, file.category);
    if (rolePermissions.includes(permission)) {
        return { allowed: true, reason: 'Role-based access granted' };
    }
    return { allowed: false, reason: 'Insufficient permissions' };
};
exports.checkFilePermission = checkFilePermission;
const getRoleFilePermissions = async (userRole, fileCategory) => {
    const permissions = {
        ADMIN: ['READ', 'WRITE', 'DELETE', 'ADMIN'],
        ORGANIZER: ['READ', 'WRITE', 'DELETE', 'ADMIN'],
        BOARD: ['READ', 'WRITE', 'DELETE', 'ADMIN'],
        AUDITOR: ['READ'],
        TALLY_MASTER: ['READ'],
        JUDGE: ['READ'],
        EMCEE: ['READ'],
        CONTESTANT: ['READ']
    };
    const categoryPermissions = {
        CONTESTANT_IMAGE: {
            ADMIN: ['READ', 'WRITE', 'DELETE'],
            JUDGE: ['READ'],
            EMCEE: ['READ'],
            AUDITOR: ['READ'],
            TALLY_MASTER: ['READ']
        },
        JUDGE_IMAGE: {
            ADMIN: ['READ', 'WRITE', 'DELETE'],
            EMCEE: ['READ'],
            AUDITOR: ['READ'],
            TALLY_MASTER: ['READ']
        },
        DOCUMENT: {
            ADMIN: ['READ', 'WRITE', 'DELETE'],
            AUDITOR: ['READ'],
            TALLY_MASTER: ['READ'],
            JUDGE: ['READ']
        },
        TEMPLATE: {
            ADMIN: ['READ', 'WRITE', 'DELETE'],
            EMCEE: ['READ'],
            AUDITOR: ['READ'],
            TALLY_MASTER: ['READ']
        },
        REPORT: {
            ADMIN: ['READ', 'WRITE', 'DELETE'],
            AUDITOR: ['READ'],
            TALLY_MASTER: ['READ'],
            BOARD: ['READ', 'WRITE', 'DELETE']
        }
    };
    const basePermissions = permissions[userRole] || [];
    const categorySpecificPermissions = categoryPermissions[fileCategory]?.[userRole] || [];
    return [...new Set([...basePermissions, ...categorySpecificPermissions])];
};
exports.getRoleFilePermissions = getRoleFilePermissions;
const checkUploadPermission = async (req, res, next) => {
    try {
        const { category } = req.body;
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const userRole = req.user.role;
        const uploadPermissions = {
            ORGANIZER: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
            BOARD: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
            AUDITOR: ['DOCUMENT', 'REPORT', 'OTHER'],
            TALLY_MASTER: ['DOCUMENT', 'REPORT', 'OTHER'],
            JUDGE: ['DOCUMENT', 'OTHER'],
            EMCEE: ['TEMPLATE', 'OTHER'],
            CONTESTANT: ['OTHER']
        };
        const allowedCategories = uploadPermissions[userRole] || [];
        if (!allowedCategories.includes(category)) {
            res.status(403).json({
                error: 'Upload denied',
                reason: `You are not allowed to upload files of category: ${category}`
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Upload permission check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.checkUploadPermission = checkUploadPermission;
const checkSharingPermission = async (req, res, next) => {
    try {
        const { fileId } = req.params;
        const { isPublic } = req.body;
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const userId = req.user.id;
        const userRole = req.user.role;
        const file = await prisma.file.findUnique({
            where: { id: fileId }
        });
        if (!file) {
            res.status(404).json({ error: 'File not found' });
            return;
        }
        if (file.uploadedBy !== userId && !['ORGANIZER', 'BOARD'].includes(userRole)) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        if (isPublic && !['ORGANIZER', 'BOARD'].includes(userRole)) {
            res.status(403).json({
                error: 'Permission denied',
                reason: 'Only administrators can make files public'
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Sharing permission check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.checkSharingPermission = checkSharingPermission;
const getUserFileAccess = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const userId = req.user.id;
        const userRole = req.user.role;
        const accessSummary = {
            canUpload: await getUploadableCategories(userRole),
            canView: await getViewableCategories(userRole),
            canManage: await getManageableCategories(userRole),
            totalFiles: await prisma.file.count({
                where: {
                    OR: [
                        { uploadedBy: userId },
                        { isPublic: true }
                    ]
                }
            }),
            ownedFiles: await prisma.file.count({
                where: { uploadedBy: userId }
            })
        };
        res.json(accessSummary);
    }
    catch (error) {
        console.error('Get user file access error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getUserFileAccess = getUserFileAccess;
const getUploadableCategories = async (userRole) => {
    const uploadPermissions = {
        ORGANIZER: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
        BOARD: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
        AUDITOR: ['DOCUMENT', 'REPORT', 'OTHER'],
        TALLY_MASTER: ['DOCUMENT', 'REPORT', 'OTHER'],
        JUDGE: ['DOCUMENT', 'OTHER'],
        EMCEE: ['TEMPLATE', 'OTHER'],
        CONTESTANT: ['OTHER']
    };
    return uploadPermissions[userRole] || [];
};
const getViewableCategories = async (userRole) => {
    const viewPermissions = {
        ORGANIZER: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
        BOARD: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
        AUDITOR: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'OTHER'],
        TALLY_MASTER: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'OTHER'],
        JUDGE: ['CONTESTANT_IMAGE', 'DOCUMENT', 'OTHER'],
        EMCEE: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'TEMPLATE', 'OTHER'],
        CONTESTANT: ['OTHER']
    };
    return viewPermissions[userRole] || [];
};
const getManageableCategories = async (userRole) => {
    const managePermissions = {
        ORGANIZER: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
        BOARD: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
        AUDITOR: ['DOCUMENT', 'REPORT'],
        TALLY_MASTER: ['DOCUMENT', 'REPORT'],
        JUDGE: ['DOCUMENT'],
        EMCEE: ['TEMPLATE'],
        CONTESTANT: []
    };
    return managePermissions[userRole] || [];
};
//# sourceMappingURL=fileAccessControl.js.map