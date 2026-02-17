import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { FileService } from '../services/FileService';
import { AuditLogService } from '../services/AuditLogService';
import { sendSuccess, sendNotFound, sendBadRequest, sendUnauthorized} from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('FileController');

export class FileController {
  private fileService: FileService;
  private prisma: PrismaClient;

  constructor() {
    this.fileService = container.resolve(FileService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  listFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { directory } = req.query;
      const files = await this.fileService.listFiles(directory as string | undefined);
      return sendSuccess(res, files);
    } catch (error) {
      return next(error);
    }
  };

  downloadFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { filename } = req.params;
      const filePath = await this.fileService.getFilePath(filename!);

      // Audit log: file download
      try {
        const auditLogService = container.resolve(AuditLogService);
        const tenantId = req.tenantId || req.user?.tenantId || 'default_tenant';
        await auditLogService.logFileAccess({
          action: 'download',
          fileName: filename!,
          req,
          tenantId: tenantId,
          metadata: { filePath }
        });
      } catch (auditError) {
        logger.error('Failed to log file download audit', { error: auditError });
      }

      res.download(filePath, filename!);
    } catch (error) {
      return next(error);
    }
  };

  deleteFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { filename } = req.params;
      await this.fileService.deleteFile(filename!);

      // Audit log: file deletion
      try {
        const auditLogService = container.resolve(AuditLogService);
        const tenantId = req.tenantId || req.user?.tenantId || 'default_tenant';
        await auditLogService.logFileAccess({
          action: 'delete',
          fileName: filename!,
          req,
          tenantId: tenantId,
          metadata: {}
        });
      } catch (auditError) {
        logger.error('Failed to log file deletion audit', { error: auditError });
      }

      return sendSuccess(res, null, 'File deleted');
    } catch (error) {
      return next(error);
    }
  };

  getAllFiles = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const category = req.query['category'] as string | undefined;
      const eventId = req.query['eventId'] as string | undefined;
      const tenantId = req.tenantId || req.user.tenantId;

      const skip = (page - 1) * limit;
      const where: any = { tenantId };

      if (category) where.category = category;
      if (eventId) where.eventId = eventId;

      const [files, total] = await Promise.all([
        this.prisma.file.findMany({
          where,
          skip,
          take: limit,
          orderBy: { uploadedAt: 'desc' }
        }),
        this.prisma.file.count({ where })
      ]);

      return sendSuccess(res, {
        files,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total
        }
      });
    } catch (error) {
      return next(error);
    }
  };

  uploadFiles = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        return sendUnauthorized(res, 'User not authenticated');
      }

      const files = req.files as Express.Multer.File[] | undefined;
      const { category, eventId, contestId, categoryId, isPublic } = req.body;

      if (!files || files.length === 0) {
        return sendBadRequest(res, 'No files provided');
      }

      const tenantId = req.user.tenantId;
      const userId = req.user.id;

      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          return this.prisma.file.create({
            data: {
              tenantId: tenantId,
              filename: file.filename,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              path: file.path,
              category: category || 'OTHER',
              uploadedBy: userId,
              isPublic: isPublic === 'true',
              ...(eventId && { eventId }),
              ...(contestId && { contestId }),
              ...(categoryId && { categoryId })
            }
          });
        })
      );

      // Audit log: file uploads
      try {
        const auditLogService = container.resolve(AuditLogService);
        for (const uploadedFile of uploadedFiles) {
          await auditLogService.logFileAccess({
            action: 'upload',
            fileName: uploadedFile.originalName,
            fileId: uploadedFile.id,
            req,
            tenantId: tenantId,
            metadata: {
              fileSize: uploadedFile.size,
              mimeType: uploadedFile.mimeType,
              category: uploadedFile.category
            }
          });
        }
      } catch (auditError) {
        logger.error('Failed to log file upload audit', { error: auditError });
      }

      return sendSuccess(res, {
        files: uploadedFiles,
        count: uploadedFiles.length
      }, 'Files uploaded successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  getFileById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;

      const file = await this.prisma.file.findFirst({
        where: {
          id,
          tenantId: req.user!.tenantId
        }
      });

      if (!file) {
        return sendNotFound(res, 'File not found');
      }

      return sendSuccess(res, file);
    } catch (error) {
      return next(error);
    }
  };

  updateFile = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { id } = req.params;
      const { category, isPublic, metadata } = req.body;

      const existing = await this.prisma.file.findFirst({
        where: {
          id,
          tenantId: req.user!.tenantId
        }
      });

      if (!existing) {
        return sendNotFound(res, 'File not found');
      }

      const updateData: any = {};
      if (category !== undefined) updateData.category = category;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (metadata !== undefined) updateData.metadata = JSON.stringify(metadata);

      const file = await this.prisma.file.update({
        where: { id },
        data: updateData
      });

      return sendSuccess(res, file, 'File updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  getFileStats = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }
      const tenantId = req.tenantId || req.user.tenantId;

      const [
        totalFiles,
        totalSize,
        byCategory,
        recentUploads
      ] = await Promise.all([
        this.prisma.file.count({ where: { tenantId } }),
        this.prisma.file.aggregate({
          where: { tenantId },
          _sum: { size: true }
        }),
        this.prisma.file.groupBy({
          where: { tenantId },
          by: ['category'],
          _count: { id: true },
          _sum: { size: true }
        }),
        this.prisma.file.findMany({
          where: { tenantId },
          take: 10,
          orderBy: { uploadedAt: 'desc' },
          select: {
            id: true,
            filename: true,
            originalName: true,
            size: true,
            uploadedAt: true
          }
        })
      ]);

      const stats = {
        totalFiles,
        totalSize: totalSize._sum.size || 0,
        totalSizeMB: ((totalSize._sum.size || 0) / 1024 / 1024).toFixed(2),
        byCategory: byCategory.map(cat => ({
          category: cat.category,
          count: cat._count.id,
          size: cat._sum.size || 0,
          sizeMB: ((cat._sum.size || 0) / 1024 / 1024).toFixed(2)
        })),
        recentUploads
      };

      return sendSuccess(res, stats);
    } catch (error) {
      return next(error);
    }
  };

  upload = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        return sendUnauthorized(res, 'User not authenticated');
      }

      const file = req.file as Express.Multer.File | undefined;
      const { category, eventId, isPublic, metadata } = req.body;

      if (!file) {
        return sendBadRequest(res, 'No file provided');
      }

      const uploadedFile = await this.prisma.file.create({
        data: {
          tenantId: req.user.tenantId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          category: category || 'OTHER',
          uploadedBy: req.user.id,
          isPublic: isPublic === 'true',
          ...(eventId && { eventId }),
          ...(metadata && { metadata: JSON.stringify(metadata) })
        }
      });

      // Audit log: file upload
      try {
        const auditLogService = container.resolve(AuditLogService);
        await auditLogService.logFileAccess({
          action: 'upload',
          fileName: uploadedFile.originalName,
          fileId: uploadedFile.id,
          req,
          tenantId: req.user.tenantId,
          metadata: {
            fileSize: uploadedFile.size,
            mimeType: uploadedFile.mimeType,
            category: uploadedFile.category
          }
        });
      } catch (auditError) {
        logger.error('Failed to log file upload audit', { error: auditError });
      }

      return sendSuccess(res, uploadedFile, 'File uploaded successfully', 201);
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new FileController();
export const listFiles = controller.listFiles;
export const downloadFile = controller.downloadFile;
export const deleteFile = controller.deleteFile;
export const getAllFiles = controller.getAllFiles;
export const uploadFiles = controller.uploadFiles;
export const getFileById = controller.getFileById;
export const updateFile = controller.updateFile;
export const getFileStats = controller.getFileStats;
export const upload = controller.upload;
