/**
 * UploadController Unit Tests
 * Comprehensive test coverage for UploadController endpoints
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { UploadController } from '../../../src/controllers/uploadController';
import { UploadService } from '../../../src/services/UploadService';
import { successResponse } from '../../../src/utils/responseHelpers';
import { container } from 'tsyringe';

jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/services/UploadService');

describe('UploadController', () => {
  let controller: UploadController;
  let mockUploadService: jest.Mocked<UploadService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    (successResponse as jest.Mock).mockImplementation((res, data, message) => {
      return res.json({ success: true, data, message });
    });

    mockUploadService = {
      processUploadedFile: jest.fn(),
      deleteFile: jest.fn(),
      getFiles: jest.fn(),
    } as any;

    (container.resolve as jest.Mock) = jest.fn(() => mockUploadService);

    controller = new UploadController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: 'ADMIN' },
      file: undefined,
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      mockReq.file = {
        filename: 'test.pdf',
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;
      mockReq.body = { category: 'DOCUMENT', eventId: 'event-1' };

      const mockFile = { id: 'file-1', filename: 'test.pdf' };
      mockUploadService.processUploadedFile.mockResolvedValue(mockFile as any);

      await controller.uploadFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUploadService.processUploadedFile).toHaveBeenCalledWith(
        mockReq.file,
        'user-1',
        { category: 'DOCUMENT', eventId: 'event-1', contestId: undefined, categoryId: undefined }
      );
      expect(successResponse).toHaveBeenCalledWith(mockRes, { file: mockFile }, 'File uploaded successfully');
    });

    it('should upload file with all optional fields', async () => {
      mockReq.file = { filename: 'test.pdf' } as Express.Multer.File;
      mockReq.body = { category: 'DOCUMENT', eventId: 'event-1', contestId: 'contest-1', categoryId: 'cat-1' };

      mockUploadService.processUploadedFile.mockResolvedValue({ id: 'file-1' } as any);

      await controller.uploadFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUploadService.processUploadedFile).toHaveBeenCalledWith(
        mockReq.file,
        'user-1',
        { category: 'DOCUMENT', eventId: 'event-1', contestId: 'contest-1', categoryId: 'cat-1' }
      );
    });

    it('should use empty string when user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.file = { filename: 'test.pdf' } as Express.Multer.File;
      mockReq.body = { category: 'DOCUMENT' };

      mockUploadService.processUploadedFile.mockResolvedValue({ id: 'file-1' } as any);

      await controller.uploadFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUploadService.processUploadedFile).toHaveBeenCalledWith(
        mockReq.file,
        '',
        expect.any(Object)
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.file = { filename: 'test.pdf' } as Express.Multer.File;
      const error = new Error('Upload failed');
      mockUploadService.processUploadedFile.mockRejectedValue(error);

      await controller.uploadFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      mockReq.file = {
        filename: 'photo.jpg',
        originalname: 'portrait.jpg',
        mimetype: 'image/jpeg',
        size: 2048,
      } as Express.Multer.File;
      mockReq.body = { eventId: 'event-1', categoryId: 'cat-1' };

      const mockImage = { id: 'img-1', filename: 'photo.jpg' };
      mockUploadService.processUploadedFile.mockResolvedValue(mockImage as any);

      await controller.uploadImage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUploadService.processUploadedFile).toHaveBeenCalledWith(
        mockReq.file,
        'user-1',
        { category: 'CONTESTANT_IMAGE', eventId: 'event-1', contestId: undefined, categoryId: 'cat-1' }
      );
      expect(successResponse).toHaveBeenCalledWith(mockRes, { image: mockImage }, 'Image uploaded successfully');
    });

    it('should use CONTESTANT_IMAGE category by default', async () => {
      mockReq.file = { filename: 'photo.jpg' } as Express.Multer.File;
      mockReq.body = {};

      mockUploadService.processUploadedFile.mockResolvedValue({ id: 'img-1' } as any);

      await controller.uploadImage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUploadService.processUploadedFile).toHaveBeenCalledWith(
        mockReq.file,
        'user-1',
        expect.objectContaining({ category: 'CONTESTANT_IMAGE' })
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.file = { filename: 'photo.jpg' } as Express.Multer.File;
      const error = new Error('Image upload failed');
      mockUploadService.processUploadedFile.mockRejectedValue(error);

      await controller.uploadImage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockReq.params = { fileId: 'file-1' };
      mockUploadService.deleteFile.mockResolvedValue(undefined);

      await controller.deleteFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUploadService.deleteFile).toHaveBeenCalledWith('file-1');
      expect(successResponse).toHaveBeenCalledWith(mockRes, null, 'File deleted successfully');
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { fileId: 'file-1' };
      const error = new Error('Delete failed');
      mockUploadService.deleteFile.mockRejectedValue(error);

      await controller.deleteFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getFiles', () => {
    it('should get files for authenticated user', async () => {
      const mockFiles = [
        { id: 'file-1', filename: 'doc1.pdf' },
        { id: 'file-2', filename: 'doc2.pdf' },
      ];
      mockUploadService.getFiles.mockResolvedValue(mockFiles as any);

      await controller.getFiles(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUploadService.getFiles).toHaveBeenCalledWith('user-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockFiles);
    });

    it('should get files when user not authenticated', async () => {
      mockReq.user = undefined;
      mockUploadService.getFiles.mockResolvedValue([]);

      await controller.getFiles(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUploadService.getFiles).toHaveBeenCalledWith(undefined);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Query failed');
      mockUploadService.getFiles.mockRejectedValue(error);

      await controller.getFiles(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
