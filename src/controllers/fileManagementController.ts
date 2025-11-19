import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { FileManagementService } from '../services/FileManagementService';
import { sendSuccess } from '../utils/responseHelpers';
import { PrismaClient, Prisma, FileCategory } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';

interface FileAnalyticsByCategory {
  [category: string]: {
    count: number;
    size: number;
  };
}

interface FileAnalyticsByMimeType {
  [mimeType: string]: {
    count: number;
    size: number;
  };
}

interface FileAnalyticsByDay {
  [day: string]: {
    count: number;
    size: number;
  };
}

interface FileAnalyticsByUser {
  [userId: string]: {
    count: number;
    size: number;
  };
}

interface TopUploader {
  userId: string;
  count: number;
  size: number;
}

interface BulkOperationResult {
  processed: number;
  failed: number;
  total: number;
}

export class FileManagementController {
  private fileManagementService: FileManagementService;
  private prisma: PrismaClient;

  constructor() {
    this.fileManagementService = container.resolve(FileManagementService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getFileInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filename } = req.params;
      const info = await this.fileManagementService.getFileInfo(filename!);
      return sendSuccess(res, info);
    } catch (error) {
      return next(error);
    }
  };

  moveFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filename } = req.params;
      const { newPath } = req.body;
      const result = await this.fileManagementService.moveFile(filename!, newPath);
      return sendSuccess(res, result, 'File moved');
    } catch (error) {
      return next(error);
    }
  };

  copyFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filename } = req.params;
      const { newPath } = req.body;
      const result = await this.fileManagementService.copyFile(filename!, newPath);
      return sendSuccess(res, result, 'File copied');
    } catch (error) {
      return next(error);
    }
  };

  getFilesWithFilters = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const skip = (page - 1) * limit;

      // Advanced filtering options
      const category = req.query['category'] as FileCategory | undefined;
      const eventId = req.query['eventId'] as string | undefined;
      const contestId = req.query['contestId'] as string | undefined;
      const categoryId = req.query['categoryId'] as string | undefined;
      const isPublic = req.query['isPublic'] as string | undefined;
      const uploadedBy = req.query['uploadedBy'] as string | undefined;
      const mimeType = req.query['mimeType'] as string | undefined;
      const minSize = req.query['minSize'] ? parseInt(req.query['minSize'] as string) : undefined;
      const maxSize = req.query['maxSize'] ? parseInt(req.query['maxSize'] as string) : undefined;
      const search = req.query['search'] as string | undefined;
      const startDate = req.query['startDate'] as string | undefined;
      const endDate = req.query['endDate'] as string | undefined;

      const where: Prisma.FileWhereInput = {};

      if (category) where.category = category;
      if (eventId) where.eventId = eventId;
      if (contestId) where.contestId = contestId;
      if (categoryId) where.categoryId = categoryId;
      if (isPublic !== undefined) where.isPublic = isPublic === 'true';
      if (uploadedBy) where.uploadedBy = uploadedBy;
      if (mimeType) where.mimeType = { contains: mimeType };

      // Size range filtering
      if (minSize !== undefined || maxSize !== undefined) {
        where.size = {};
        if (minSize !== undefined) where.size.gte = minSize;
        if (maxSize !== undefined) where.size.lte = maxSize;
      }

      // Search in filename and originalName
      if (search) {
        where.OR = [
          { filename: { contains: search, mode: 'insensitive' } },
          { originalName: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Date range filtering
      if (startDate || endDate) {
        where.uploadedAt = {};
        if (startDate) where.uploadedAt.gte = new Date(startDate);
        if (endDate) where.uploadedAt.lte = new Date(endDate);
      }

      const [files, total] = await Promise.all([
        this.prisma.file.findMany({
          where,
          // include removed - no relations in schema
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
        },
        filters: {
          category, eventId, contestId, categoryId, isPublic, uploadedBy,
          mimeType, minSize, maxSize, search, startDate, endDate
        }
      });
    } catch (error) {
      return next(error);
    }
  };

  bulkFileOperations = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { operation, fileIds, options } = req.body;

      if (!operation || !fileIds || !Array.isArray(fileIds)) {
        return sendSuccess(res, {}, 'operation and fileIds array are required', 400);
      }

      if (fileIds.length === 0) {
        return sendSuccess(res, { processed: 0 }, 'No files to process');
      }

      let result: BulkOperationResult = { processed: 0, failed: 0, total: fileIds.length };

      switch (operation) {
        case 'delete':
          // Bulk delete files
          const deleteResult = await this.prisma.file.deleteMany({
            where: {
              id: { in: fileIds }
            }
          });
          result.processed = deleteResult.count;
          result.failed = fileIds.length - deleteResult.count;
          break;

        case 'update':
          // Bulk update file metadata
          if (!options) {
            return sendSuccess(res, {}, 'options object is required for update operation', 400);
          }
          const updateData: Prisma.FileUpdateInput = {};
          if (options.category !== undefined) updateData.category = options.category;
          if (options.isPublic !== undefined) updateData.isPublic = options.isPublic;
          if (options.eventId !== undefined) updateData.eventId = options.eventId;
          if (options.contestId !== undefined) updateData.contestId = options.contestId;
          if (options.categoryId !== undefined) updateData.categoryId = options.categoryId;

          const updateResult = await this.prisma.file.updateMany({
            where: {
              id: { in: fileIds }
            },
            data: updateData
          });
          result.processed = updateResult.count;
          result.failed = fileIds.length - updateResult.count;
          break;

        case 'move':
        case 'copy':
          // Use FileManagementService for move/copy operations
          const operations = await Promise.allSettled(
            fileIds.map(async (fileId: string) => {
              const file = await this.prisma.file.findUnique({ where: { id: fileId } });
              if (!file) throw new Error(`File ${fileId} not found`);

              if (operation === 'move') {
                return await this.fileManagementService.moveFile(file.filename, options.newPath);
              } else {
                return await this.fileManagementService.copyFile(file.filename, options.newPath);
              }
            })
          );
          result.processed = operations.filter(op => op.status === 'fulfilled').length;
          result.failed = operations.filter(op => op.status === 'rejected').length;
          break;

        default:
          return sendSuccess(res, {}, 'Invalid operation. Supported: delete, update, move, copy', 400);
      }

      return sendSuccess(res, result, `Bulk ${operation} operation completed`);
    } catch (error) {
      return next(error);
    }
  };

  getFileSearchSuggestions = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { query } = req.query;
      const limit = parseInt(req.query['limit'] as string) || 10;

      if (!query || typeof query !== 'string') {
        return sendSuccess(res, [], 'query parameter is required');
      }

      // Search for file suggestions based on filename and originalName
      const suggestions = await this.prisma.file.findMany({
        where: {
          OR: [
            { filename: { contains: query, mode: 'insensitive' } },
            { originalName: { contains: query, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          uploadedAt: true,
          category: true
        },
        take: limit,
        orderBy: { uploadedAt: 'desc' }
      });

      return sendSuccess(res, suggestions);
    } catch (error) {
      return next(error);
    }
  };

  getFileAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const days = parseInt(req.query['days'] as string) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get files uploaded in the time range
      const files = await this.prisma.file.findMany({
        where: {
          uploadedAt: { gte: since }
        },
        select: {
          id: true,
          size: true,
          category: true,
          mimeType: true,
          uploadedAt: true,
          uploadedBy: true
        }
      });

      // Calculate analytics
      const analytics = {
        timeRange: { days, since },
        totalFiles: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        totalSizeMB: (files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2),

        byCategory: files.reduce((acc: FileAnalyticsByCategory, file) => {
          const cat = file.category || 'UNKNOWN';
          if (!acc[cat]) {
            acc[cat] = { count: 0, size: 0 };
          }
          acc[cat].count++;
          acc[cat].size += file.size;
          return acc;
        }, {}),

        byMimeType: files.reduce((acc: FileAnalyticsByMimeType, file) => {
          const mime = file.mimeType || 'unknown';
          if (!acc[mime]) {
            acc[mime] = { count: 0, size: 0 };
          }
          acc[mime].count++;
          acc[mime].size += file.size;
          return acc;
        }, {}),

        uploadsByDay: files.reduce((acc: FileAnalyticsByDay, file) => {
          const day = file.uploadedAt.toISOString().split('T')[0]!;
          if (!acc[day]) {
            acc[day] = { count: 0, size: 0 };
          }
          acc[day].count++;
          acc[day].size += file.size;
          return acc;
        }, {}),

        topUploaders: Object.entries(
          files.reduce((acc: FileAnalyticsByUser, file) => {
            const userId = file.uploadedBy;
            if (!acc[userId]) {
              acc[userId] = { count: 0, size: 0 };
            }
            acc[userId].count++;
            acc[userId].size += file.size;
            return acc;
          }, {})
        )
          .map(([userId, stats]: [string, { count: number; size: number }]): TopUploader => ({ userId, ...stats }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      };

      return sendSuccess(res, analytics);
    } catch (error) {
      return next(error);
    }
  };

  checkFileIntegrity = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;

      const file = await this.prisma.file.findUnique({
        where: { id }
      });

      if (!file) {
        return sendSuccess(res, {}, 'File not found', 404);
      }

      // Check if file exists on disk
      const fileExists = fs.existsSync(file.path);

      if (!fileExists) {
        return sendSuccess(res, {
          id: file.id,
          filename: file.filename,
          integrity: 'FAILED',
          reason: 'File not found on disk',
          expectedPath: file.path
        });
      }

      // Calculate current checksum if stored checksum exists
      let checksumMatch = null;
      let currentChecksum = null;

      if (file.checksum) {
        const fileBuffer = fs.readFileSync(file.path);
        currentChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        checksumMatch = currentChecksum === file.checksum;
      }

      // Check file size
      const stats = fs.statSync(file.path);
      const sizeMatch = stats.size === file.size;

      const integrity = fileExists && sizeMatch && (checksumMatch === null || checksumMatch)
        ? 'OK'
        : 'FAILED';

      return sendSuccess(res, {
        id: file.id,
        filename: file.filename,
        integrity,
        checks: {
          fileExists,
          sizeMatch,
          expectedSize: file.size,
          actualSize: stats.size,
          checksumMatch,
          expectedChecksum: file.checksum,
          currentChecksum
        }
      });
    } catch (error) {
      return next(error);
    }
  };

  bulkCheckFileIntegrity = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { fileIds } = req.body;

      if (!fileIds || !Array.isArray(fileIds)) {
        return sendSuccess(res, {}, 'fileIds array is required', 400);
      }

      if (fileIds.length === 0) {
        return sendSuccess(res, { checked: 0, results: [] }, 'No files to check');
      }

      // Check integrity for each file
      const results = await Promise.allSettled(
        fileIds.map(async (fileId: string) => {
          const file = await this.prisma.file.findUnique({ where: { id: fileId } });

          if (!file) {
            return {
              id: fileId,
              integrity: 'NOT_FOUND',
              reason: 'File record not found in database'
            };
          }

          const fileExists = fs.existsSync(file.path);

          if (!fileExists) {
            return {
              id: file.id,
              filename: file.filename,
              integrity: 'FAILED',
              reason: 'File not found on disk'
            };
          }

          const stats = fs.statSync(file.path);
          const sizeMatch = stats.size === file.size;

          let checksumMatch = null;
          if (file.checksum) {
            const fileBuffer = fs.readFileSync(file.path);
            const currentChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            checksumMatch = currentChecksum === file.checksum;
          }

          const integrity = fileExists && sizeMatch && (checksumMatch === null || checksumMatch)
            ? 'OK'
            : 'FAILED';

          return {
            id: file.id,
            filename: file.filename,
            integrity,
            sizeMatch,
            checksumMatch
          };
        })
      );

      const processedResults = results.map((r, index) => {
        if (r.status === 'fulfilled') {
          return r.value;
        } else {
          return {
            id: fileIds[index],
            integrity: 'ERROR',
            reason: r.reason?.toString() || 'Unknown error'
          };
        }
      });

      const summary = {
        total: fileIds.length,
        ok: processedResults.filter((r: any) => r.integrity === 'OK').length,
        failed: processedResults.filter((r: any) => r.integrity === 'FAILED').length,
        notFound: processedResults.filter((r: any) => r.integrity === 'NOT_FOUND').length,
        errors: processedResults.filter((r: any) => r.integrity === 'ERROR').length
      };

      return sendSuccess(res, {
        summary,
        results: processedResults
      });
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new FileManagementController();
export const getFileInfo = controller.getFileInfo;
export const moveFile = controller.moveFile;
export const copyFile = controller.copyFile;
export const getFilesWithFilters = controller.getFilesWithFilters;
export const bulkFileOperations = controller.bulkFileOperations;
export const getFileSearchSuggestions = controller.getFileSearchSuggestions;
export const getFileAnalytics = controller.getFileAnalytics;
export const checkFileIntegrity = controller.checkFileIntegrity;
export const bulkCheckFileIntegrity = controller.bulkCheckFileIntegrity;
