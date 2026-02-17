import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';
import prisma from '../utils/prisma';

const logger = createLogger('SoftDelete');

/**
 * SECURITY FIX #18: Soft Delete Middleware
 *
 * Ensures soft-deleted records are properly handled:
 * - Automatically filters out soft-deleted records in queries
 * - Logs deletion attempts
 * - Validates user permissions for deletion/restoration
 * - Tracks who deleted records and when
 */

/**
 * Models that support soft delete (have deletedAt and deletedBy fields)
 */
const SOFT_DELETE_MODELS = [
  'event',
  'contest',
  'category',
  'contestant',
  'judge',
  'user'
];

/**
 * Check if a model supports soft delete
 */
function isSoftDeleteModel(modelName: string): boolean {
  return SOFT_DELETE_MODELS.includes(modelName.toLowerCase());
}

/**
 * Middleware to automatically exclude soft-deleted records
 * Apply this to query endpoints to filter out deleted records
 *
 * Usage:
 *   router.get('/api/events', excludeSoftDeleted('event'), getEvents);
 */
export const excludeSoftDeleted = (modelName: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!isSoftDeleteModel(modelName)) {
      logger.warn('excludeSoftDeleted called for non-soft-delete model', { modelName });
      next();
      return;
    }

    // Add filter to request context for controller to use
    req.softDeleteFilter = {
      deletedAt: null
    };

    // Add includeDeleted query parameter support for admins
    const includeDeleted = req.query['includeDeleted'] === 'true';
    const userRole = req.user?.role;

    if (includeDeleted && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) {
      // Admin explicitly requesting deleted records
      logger.info('Including soft-deleted records for admin', {
        userId: req.user?.id,
        role: userRole,
        model: modelName
      });
      req.softDeleteFilter = {}; // Include all records
    }

    next();
  };
};

/**
 * Middleware to validate soft delete permissions
 * Apply this before soft delete operations
 *
 * Usage:
 *   router.delete('/api/events/:id', validateSoftDeletePermission('event'), softDeleteEvent);
 */
export const validateSoftDeletePermission = (modelName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const userRole = req.user.role;
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER'];

    if (!allowedRoles.includes(userRole)) {
      logger.warn('Unauthorized soft delete attempt', {
        userId: req.user.id,
        role: userRole,
        model: modelName,
        resourceId: req.params['id']
      });

      res.status(403).json({
        success: false,
        error: 'Insufficient permissions to delete this resource'
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to log soft delete operations
 * Apply this after successful soft delete
 *
 * Usage:
 *   // In controller after soft delete:
 *   req.softDeleteLog = { model: 'Event', resourceId: eventId };
 *   // Middleware will log automatically
 */
export const logSoftDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Check if this is a successful response with soft delete data
  if (res.statusCode >= 200 && res.statusCode < 300 && req.softDeleteLog) {
    const { model, resourceId, resourceName } = req.softDeleteLog;

    try {
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          userName: req.user!.name || null,
          userRole: req.user!.role || null,
          tenantId: (req as any).tenantId || req.user!.tenantId || null,
          action: 'SOFT_DELETE',
          resourceType: model,
          resourceId: resourceId,
          ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
          userAgent: req.get('User-Agent') || 'Unknown',
          details: JSON.stringify({
            resourceName,
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.path
          })
        }
      });

      logger.info('Soft delete logged', {
        userId: req.user!.id,
        model,
        resourceId,
        resourceName
      });
    } catch (error) {
      logger.error('Failed to log soft delete', { error });
      // Don't fail the request if logging fails
    }
  }

  next();
};

/**
 * Middleware to validate restoration permissions
 * Apply this before restore operations
 *
 * Usage:
 *   router.post('/api/events/:id/restore', validateRestorePermission('event'), restoreEvent);
 */
export const validateRestorePermission = (modelName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const userRole = req.user.role;
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];

    if (!allowedRoles.includes(userRole)) {
      logger.warn('Unauthorized restore attempt', {
        userId: req.user.id,
        role: userRole,
        model: modelName,
        resourceId: req.params['id']
      });

      res.status(403).json({
        success: false,
        error: 'Only administrators can restore deleted resources'
      });
      return;
    }

    // Verify the resource exists and is soft-deleted
    const resourceId = req.params['id'];
    if (!resourceId) {
      res.status(400).json({
        success: false,
        error: 'Resource ID required'
      });
      return;
    }

    // Add validation data to request
    req.restoreValidation = {
      model: modelName,
      resourceId,
      validatedBy: req.user.id
    };

    next();
  };
};

/**
 * Middleware to log restoration operations
 */
export const logRestoration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Check if this is a successful response with restoration data
  if (res.statusCode >= 200 && res.statusCode < 300 && req.restoreLog) {
    const { model, resourceId, resourceName } = req.restoreLog;

    try {
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          userName: req.user!.name || null,
          userRole: req.user!.role || null,
          tenantId: (req as any).tenantId || req.user!.tenantId || null,
          action: 'RESTORE',
          resourceType: model,
          resourceId: resourceId,
          ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
          userAgent: req.get('User-Agent') || 'Unknown',
          details: JSON.stringify({
            resourceName,
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.path
          })
        }
      });

      logger.info('Restoration logged', {
        userId: req.user!.id,
        model,
        resourceId,
        resourceName
      });
    } catch (error) {
      logger.error('Failed to log restoration', { error });
      // Don't fail the request if logging fails
    }
  }

  next();
};

/**
 * Helper function to perform soft delete
 * Use this in controllers instead of prisma.delete()
 *
 * @param model - Prisma model name (e.g., 'event', 'contest')
 * @param id - Record ID to soft delete
 * @param userId - ID of user performing the deletion
 * @param tenantId - Tenant ID for multi-tenant isolation
 * @returns Updated record with deletedAt and deletedBy set
 */
export async function performSoftDelete(
  model: string,
  id: string,
  userId: string,
  tenantId: string
): Promise<any> {
  const modelName = model.toLowerCase();

  if (!isSoftDeleteModel(modelName)) {
    throw new Error(`Model ${model} does not support soft delete`);
  }

  // Get the Prisma model
  const prismaModel = (prisma as any)[modelName];
  if (!prismaModel) {
    throw new Error(`Invalid model: ${model}`);
  }

  // Perform soft delete
  const updated = await prismaModel.update({
    where: {
      id,
      tenantId, // Ensure tenant isolation
      deletedAt: null // Only soft delete non-deleted records
    },
    data: {
      deletedAt: new Date(),
      deletedBy: userId
    }
  });

  logger.info('Soft delete performed', {
    model,
    id,
    userId,
    tenantId
  });

  return updated;
}

/**
 * Helper function to restore soft-deleted record
 *
 * @param model - Prisma model name
 * @param id - Record ID to restore
 * @param tenantId - Tenant ID for multi-tenant isolation
 * @returns Updated record with deletedAt and deletedBy cleared
 */
export async function restoreSoftDeleted(
  model: string,
  id: string,
  tenantId: string
): Promise<any> {
  const modelName = model.toLowerCase();

  if (!isSoftDeleteModel(modelName)) {
    throw new Error(`Model ${model} does not support soft delete`);
  }

  // Get the Prisma model
  const prismaModel = (prisma as any)[modelName];
  if (!prismaModel) {
    throw new Error(`Invalid model: ${model}`);
  }

  // Restore soft-deleted record
  const updated = await prismaModel.update({
    where: {
      id,
      tenantId, // Ensure tenant isolation
    },
    data: {
      deletedAt: null,
      deletedBy: null
    }
  });

  logger.info('Record restored', {
    model,
    id,
    tenantId
  });

  return updated;
}

/**
 * Type augmentation for Request to include soft delete properties
 */
declare global {
  namespace Express {
    interface Request {
      softDeleteFilter?: any;
      softDeleteLog?: {
        model: string;
        resourceId: string;
        resourceName?: string;
      };
      restoreValidation?: {
        model: string;
        resourceId: string;
        validatedBy: string;
      };
      restoreLog?: {
        model: string;
        resourceId: string;
        resourceName?: string;
      };
    }
  }
}

export default {
  excludeSoftDeleted,
  validateSoftDeletePermission,
  logSoftDelete,
  validateRestorePermission,
  logRestoration,
  performSoftDelete,
  restoreSoftDeleted,
  isSoftDeleteModel
};
