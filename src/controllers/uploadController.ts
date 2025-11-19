import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { UploadService } from '../services/UploadService';
import { successResponse } from '../utils/responseHelpers';

/**
 * Upload Controller
 * Handles file uploads
 */
export class UploadController {
  private uploadService: UploadService;

  constructor() {
    this.uploadService = container.resolve(UploadService);
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
      const tenantId = req.user?.tenantId || 'default_tenant';
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
      const tenantId = req.user?.tenantId || 'default_tenant';
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
      const userId = req.user?.id;
      const files = await this.uploadService.getFiles(userId);
      res.json(files);
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
