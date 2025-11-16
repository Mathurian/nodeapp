import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { FileService } from '../services/FileService';
import { successResponse, sendSuccess } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class FileController {
  private fileService: FileService;
  private prisma: PrismaClient;

  constructor() {
    this.fileService = container.resolve(FileService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  listFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { directory } = req.query;
      const files = await this.fileService.listFiles(directory as string | undefined);
      return sendSuccess(res, files);
    } catch (error) {
      next(error);
    }
  };

  downloadFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filename } = req.params;
      const filePath = await this.fileService.getFilePath(filename);
      res.download(filePath, filename);
    } catch (error) {
      next(error);
    }
  };

  deleteFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filename } = req.params;
      await this.fileService.deleteFile(filename);
      return sendSuccess(res, null, 'File deleted');
    } catch (error) {
      next(error);
    }
  };

  getAllFiles = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const category = req.query.category as string | undefined;
      const eventId = req.query.eventId as string | undefined;

      const skip = (page - 1) * limit;
      const where: any = {};

      if (category) where.category = category;
      if (eventId) where.eventId = eventId;

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
        }
      });
    } catch (error) {
      next(error);
    }
  };

  uploadFiles = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        return sendSuccess(res, {}, 'User not authenticated', 401);
      }

      const files = req.files as Express.Multer.File[] | undefined;
      const { category, eventId, contestId, categoryId, isPublic } = req.body;

      if (!files || files.length === 0) {
        return sendSuccess(res, {}, 'No files provided', 400);
      }

      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          return this.prisma.file.create({
            data: {
              tenantId: req.user!.tenantId,
              filename: file.filename,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              path: file.path,
              category: category || 'OTHER',
              uploadedBy: req.user!.id,
              isPublic: isPublic === 'true',
              ...(eventId && { eventId }),
              ...(contestId && { contestId }),
              ...(categoryId && { categoryId })
            }
          });
        })
      );

      return sendSuccess(res, {
        files: uploadedFiles,
        count: uploadedFiles.length
      }, 'Files uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getFileById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;

      const file = await this.prisma.file.findUnique({
        where: { id },
        // include removed - no relations in schema
      });

      if (!file) {
        return sendSuccess(res, {}, 'File not found', 404);
      }

      return sendSuccess(res, file);
    } catch (error) {
      next(error);
    }
  };

  updateFile = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { category, isPublic, metadata } = req.body;

      const existing = await this.prisma.file.findUnique({
        where: { id }
      });

      if (!existing) {
        return sendSuccess(res, {}, 'File not found', 404);
      }

      const updateData: any = {};
      if (category !== undefined) updateData.category = category;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (metadata !== undefined) updateData.metadata = JSON.stringify(metadata);

      const file = await this.prisma.file.update({
        where: { id },
        data: updateData
        // include removed - no relations in schema
      });

      return sendSuccess(res, file, 'File updated successfully');
    } catch (error) {
      next(error);
    }
  };

  getFileStats = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const [
        totalFiles,
        totalSize,
        byCategory,
        recentUploads
      ] = await Promise.all([
        this.prisma.file.count(),
        this.prisma.file.aggregate({
          _sum: { size: true }
        }),
        this.prisma.file.groupBy({
          by: ['category'],
          _count: { id: true },
          _sum: { size: true }
        }),
        this.prisma.file.findMany({
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
      next(error);
    }
  };

  upload = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        return sendSuccess(res, {}, 'User not authenticated', 401);
      }

      const file = req.file as Express.Multer.File | undefined;
      const { category, eventId, isPublic, metadata } = req.body;

      if (!file) {
        return sendSuccess(res, {}, 'No file provided', 400);
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

      return sendSuccess(res, uploadedFile, 'File uploaded successfully', 201);
    } catch (error) {
      next(error);
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
