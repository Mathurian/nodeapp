import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { UploadService } from '../services/UploadService';
import { PermissionScopeService } from '../services/PermissionScopeService';
import { successResponse } from '../utils/responseHelpers';
import { resolveRequestTenantId } from '../utils/tenantContext';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Upload Controller
 * Handles file uploads
 */
export class UploadController {
  private uploadService: UploadService;
  private prisma: PrismaClient;
  private permissionScopeService: PermissionScopeService;

  constructor() {
    this.uploadService = container.resolve(UploadService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
    this.permissionScopeService = container.resolve(PermissionScopeService);
  }

  private async buildFileScopeWhere(req: Request, tenantId: string): Promise<Prisma.FileWhereInput | null> {
    if (!req.user) return null;

    const scope = await this.permissionScopeService.resolveUserScope(
      req.user.role,
      'files',
      tenantId,
      req.user
    );

    if (scope.tenantWide) return {};

    const eventIds = new Set(scope.eventIds);
    const contestIds = new Set(scope.contestIds);
    const categoryIds = new Set(scope.categoryIds);

    if (eventIds.size > 0) {
      const [contests, categories] = await Promise.all([
        this.prisma.contest.findMany({
          where: {
            tenantId,
            eventId: { in: Array.from(eventIds) },
          },
          select: { id: true },
        }),
        this.prisma.category.findMany({
          where: {
            tenantId,
            contest: {
              eventId: { in: Array.from(eventIds) },
            },
          },
          select: { id: true, contestId: true },
        }),
      ]);

      contests.forEach((contest) => contestIds.add(contest.id));
      categories.forEach((category) => {
        categoryIds.add(category.id);
        contestIds.add(category.contestId);
      });
    }

    const clauses: Prisma.FileWhereInput[] = [];
    if (categoryIds.size > 0) clauses.push({ categoryId: { in: Array.from(categoryIds) } });
    if (contestIds.size > 0) clauses.push({ contestId: { in: Array.from(contestIds) } });
    if (eventIds.size > 0) clauses.push({ eventId: { in: Array.from(eventIds) } });
    return clauses.length > 0 ? { OR: clauses } : null;
  }

  /**
   * Upload file
   */
  uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        res.status(400).json({ success: false, message: 'Tenant context is required' });
        return;
      }
      const scopeWhere = await this.buildFileScopeWhere(req, tenantId);
      if (scopeWhere && !('OR' in scopeWhere) && Object.keys(scopeWhere).length === 0) {
        // tenant-wide writers do not require additional linkage
      } else if (!scopeWhere) {
        res.status(403).json({ success: false, message: 'You do not have file scope access' });
        return;
      } else if (!req.body.eventId && !req.body.contestId && !req.body.categoryId) {
        res.status(400).json({ success: false, message: 'Scoped file uploads require an event, contest, or category association' });
        return;
      }
      const { category, eventId, contestId, categoryId } = req.body;
      const file = await this.uploadService.processUploadedFile(req.file!, userId, {
        category: category as any,
        eventId,
        contestId,
        categoryId,
        tenantId
      });
      successResponse(res, { file }, 'File uploaded successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Upload image
   */
  uploadImage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        res.status(400).json({ success: false, message: 'Tenant context is required' });
        return;
      }
      const { eventId, contestId, categoryId } = req.body;
      const image = await this.uploadService.processUploadedFile(req.file!, userId, {
        category: 'CONTESTANT_IMAGE' as any, // Default for images
        eventId,
        contestId,
        categoryId,
        tenantId
      });
      successResponse(res, { image }, 'Image uploaded successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete file
   */
  deleteFile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { fileId } = req.params;
      const tenantId = resolveRequestTenantId(req);
      if (!tenantId || !req.user) {
        res.status(400).json({ success: false, message: 'Tenant context is required' });
        return;
      }
      const scopeWhere = await this.buildFileScopeWhere(req, tenantId);
      const file = await this.prisma.file.findFirst({
        where: {
          id: fileId!,
          tenantId,
          ...(scopeWhere || {}),
        },
      });
      if (!file) {
        res.status(404).json({ success: false, message: 'File not found' });
        return;
      }
      await this.uploadService.deleteFile(fileId!);
      successResponse(res, null, 'File deleted successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get files
   */
  getFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        res.status(400).json({ success: false, message: 'Tenant context is required' });
        return;
      }

      const scopeWhere = await this.buildFileScopeWhere(req, tenantId);
      if (!scopeWhere) {
        res.json({ data: [] });
        return;
      }

      const files = await this.prisma.file.findMany({
        where: {
          tenantId,
          ...scopeWhere,
        },
        orderBy: {
          uploadedAt: 'desc',
        },
      });

      res.json({ data: files });
    } catch (error) {
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new UploadController();

export const uploadFile = controller.uploadFile;
export const uploadImage = controller.uploadImage;
export const deleteFile = controller.deleteFile;
export const getFiles = controller.getFiles;
