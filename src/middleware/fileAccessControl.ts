import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('FileAccessControl');
const prisma = require('../utils/prisma')

// File access control middleware
const checkFileAccess = (requiredPermission = 'READ') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileId } = req.params;
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const userId = req.user.id;
      const userRole = req.user.role;

      if (!fileId) {
        res.status(400).json({ error: 'File ID is required' }); return;
      }

      // Get file information
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
      })

      if (!file) {
        res.status(404).json({ error: 'File not found' }); return;
      }

      // Check access permissions based on role and file ownership
      const hasAccess = await checkFilePermission(file, userId, userRole, requiredPermission)

      if (!hasAccess.allowed) {
        res.status(403).json({ 
          error: 'Access denied', 
          reason: hasAccess.reason 
        }); return;
      }

      // Add file information to request for use in controllers
      req.fileInfo = file
      next()
    } catch (error) {
      logger.error('File access control error', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

// Check file permission based on role and ownership
const checkFilePermission = async (file: any, userId: string, userRole: string, permission: string): Promise<{ allowed: boolean; reason: string }> => {
  // Admin roles have full access
  if (['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
    return { allowed: true, reason: 'Admin access granted' }
  }

  // File owner has full access
  if (file.uploadedBy === userId) {
    return { allowed: true, reason: 'File owner access granted' }
  }

  // Public files can be read by anyone
  if (file.isPublic && permission === 'READ') {
    return { allowed: true, reason: 'Public file access granted' }
  }

  // Check role-based permissions
  const rolePermissions = await getRoleFilePermissions(userRole, file.category)
  
  if (rolePermissions.includes(permission)) {
    return { allowed: true, reason: 'Role-based access granted' }
  }

  return { allowed: false, reason: 'Insufficient permissions' }
}

// Get file permissions for a specific role and file category
const getRoleFilePermissions = async (userRole: string, fileCategory: string): Promise<string[]> => {
  const permissions: Record<string, string[]> = {
    ADMIN: ['READ', 'WRITE', 'DELETE', 'ADMIN'],
    ORGANIZER: ['READ', 'WRITE', 'DELETE', 'ADMIN'],
    BOARD: ['READ', 'WRITE', 'DELETE', 'ADMIN'],
    AUDITOR: ['READ'],
    TALLY_MASTER: ['READ'],
    JUDGE: ['READ'],
    EMCEE: ['READ'],
    CONTESTANT: ['READ']
  }

  // Additional category-specific permissions
  const categoryPermissions: Record<string, Record<string, string[]>> = {
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
  }

  const basePermissions = permissions[userRole] || [];
  const categorySpecificPermissions = categoryPermissions[fileCategory]?.[userRole] || [];

  return [...new Set([...basePermissions, ...categorySpecificPermissions])]
}

// Check if user can upload files of a specific category
const checkUploadPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category } = req.body;
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const userRole = req.user.role;

    const uploadPermissions: Record<string, string[]> = {
      ORGANIZER: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
      BOARD: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
      AUDITOR: ['DOCUMENT', 'REPORT', 'OTHER'],
      TALLY_MASTER: ['DOCUMENT', 'REPORT', 'OTHER'],
      JUDGE: ['DOCUMENT', 'OTHER'],
      EMCEE: ['TEMPLATE', 'OTHER'],
      CONTESTANT: ['OTHER']
    }

    const allowedCategories = uploadPermissions[userRole] || []
    
    if (!allowedCategories.includes(category)) {
      res.status(403).json({ 
        error: 'Upload denied', 
        reason: `You are not allowed to upload files of category: ${category}` 
      }); return;
    }

    next()
  } catch (error) {
    logger.error('Upload permission check error', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Check file sharing permissions
const checkSharingPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    })

    if (!file) {
      res.status(404).json({ error: 'File not found' }); return;
    }

    // Only file owner or admin can change sharing settings
    if (file.uploadedBy !== userId && !['ORGANIZER', 'BOARD'].includes(userRole)) {
      res.status(403).json({ error: 'Access denied' }); return;
    }

    // Check if user has permission to make files public
    if (isPublic && !['ORGANIZER', 'BOARD'].includes(userRole)) {
      res.status(403).json({ 
        error: 'Permission denied', 
        reason: 'Only administrators can make files public' 
      }); return;
    }

    next()
  } catch (error) {
    logger.error('Sharing permission check error', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get user's file access summary
const getUserFileAccess = async (req: Request, res: Response): Promise<void> => {
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
    }

    res.json(accessSummary)
  } catch (error) {
    logger.error('Get user file access error', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Helper functions
const getUploadableCategories = async (userRole: string): Promise<string[]> => {
  const uploadPermissions: Record<string, string[]> = {
    ORGANIZER: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
    BOARD: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
    AUDITOR: ['DOCUMENT', 'REPORT', 'OTHER'],
    TALLY_MASTER: ['DOCUMENT', 'REPORT', 'OTHER'],
    JUDGE: ['DOCUMENT', 'OTHER'],
    EMCEE: ['TEMPLATE', 'OTHER'],
    CONTESTANT: ['OTHER']
  }

  return uploadPermissions[userRole] || []
}

const getViewableCategories = async (userRole: string): Promise<string[]> => {
  const viewPermissions: Record<string, string[]> = {
    ORGANIZER: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
    BOARD: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
    AUDITOR: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'OTHER'],
    TALLY_MASTER: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'OTHER'],
    JUDGE: ['CONTESTANT_IMAGE', 'DOCUMENT', 'OTHER'],
    EMCEE: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'TEMPLATE', 'OTHER'],
    CONTESTANT: ['OTHER']
  }

  return viewPermissions[userRole] || []
}

const getManageableCategories = async (userRole: string): Promise<string[]> => {
  const managePermissions: Record<string, string[]> = {
    ORGANIZER: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
    BOARD: ['CONTESTANT_IMAGE', 'JUDGE_IMAGE', 'DOCUMENT', 'TEMPLATE', 'REPORT', 'BACKUP', 'OTHER'],
    AUDITOR: ['DOCUMENT', 'REPORT'],
    TALLY_MASTER: ['DOCUMENT', 'REPORT'],
    JUDGE: ['DOCUMENT'],
    EMCEE: ['TEMPLATE'],
    CONTESTANT: []
  }

  return managePermissions[userRole] || []
}

export { 
  checkFileAccess,
  checkFilePermission,
  getRoleFilePermissions,
  checkUploadPermission,
  checkSharingPermission,
  getUserFileAccess
 }
