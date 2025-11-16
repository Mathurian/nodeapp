/**
 * FileController Unit Tests
 * Comprehensive test coverage for FileController endpoints
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { FileController } from '../../../src/controllers/fileController';
import { FileService } from '../../../src/services/FileService';
import { sendSuccess } from '../../../src/utils/responseHelpers';
import { container } from 'tsyringe';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/services/FileService');

describe('FileController', () => {
  let controller: FileController;
  let mockFileService: jest.Mocked<FileService>;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock sendSuccess helper
    (sendSuccess as jest.Mock).mockImplementation((res, data, message, status = 200) => {
      return res.status(status).json({ success: true, data, message });
    });

    // Create mock service
    mockFileService = {
      listFiles: jest.fn(),
      getFilePath: jest.fn(),
      deleteFile: jest.fn(),
    } as any;

    // Mock prisma
    mockPrisma = mockDeep<PrismaClient>();

    // Mock container
    (container.resolve as jest.Mock) = jest.fn((service) => {
      if (service === 'PrismaClient') return mockPrisma;
      return mockFileService;
    });

    controller = new FileController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: 'ADMIN' },
      file: undefined,
      files: undefined,
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      download: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('listFiles', () => {
    it('should list files without directory filter', async () => {
      const mockFiles = [
        { filename: 'file1.pdf', size: 1024 },
        { filename: 'file2.jpg', size: 2048 },
      ];
      mockFileService.listFiles.mockResolvedValue(mockFiles as any);

      await controller.listFiles(mockReq as Request, mockRes as Response, mockNext);

      expect(mockFileService.listFiles).toHaveBeenCalledWith(undefined);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockFiles);
    });

    it('should list files with directory filter', async () => {
      mockReq.query = { directory: 'uploads' };
      const mockFiles = [{ filename: 'file3.doc', size: 512 }];
      mockFileService.listFiles.mockResolvedValue(mockFiles as any);

      await controller.listFiles(mockReq as Request, mockRes as Response, mockNext);

      expect(mockFileService.listFiles).toHaveBeenCalledWith('uploads');
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('List error');
      mockFileService.listFiles.mockRejectedValue(error);

      await controller.listFiles(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      mockReq.params = { filename: 'test.pdf' };
      mockFileService.getFilePath.mockResolvedValue('/uploads/test.pdf');

      await controller.downloadFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockFileService.getFilePath).toHaveBeenCalledWith('test.pdf');
      expect(mockRes.download).toHaveBeenCalledWith('/uploads/test.pdf', 'test.pdf');
    });

    it('should call next with error when file not found', async () => {
      mockReq.params = { filename: 'missing.pdf' };
      const error = new Error('File not found');
      mockFileService.getFilePath.mockRejectedValue(error);

      await controller.downloadFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockReq.params = { filename: 'old.pdf' };
      mockFileService.deleteFile.mockResolvedValue(undefined);

      await controller.deleteFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockFileService.deleteFile).toHaveBeenCalledWith('old.pdf');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, null, 'File deleted');
    });

    it('should call next with error when delete fails', async () => {
      mockReq.params = { filename: 'locked.pdf' };
      const error = new Error('Delete failed');
      mockFileService.deleteFile.mockRejectedValue(error);

      await controller.deleteFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAllFiles', () => {
    it('should return paginated files with default pagination', async () => {
      const mockFiles = [{ id: 'file-1', filename: 'test.pdf' }];
      mockPrisma.file.findMany.mockResolvedValue(mockFiles as any);
      mockPrisma.file.count.mockResolvedValue(1);

      await controller.getAllFiles(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 })
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          files: mockFiles,
          pagination: expect.objectContaining({ page: 1, limit: 50 }),
        })
      );
    });

    it('should filter by category and eventId', async () => {
      mockReq.query = { category: 'DOCUMENT', eventId: 'event-1', page: '2', limit: '10' };
      mockPrisma.file.findMany.mockResolvedValue([]);
      mockPrisma.file.count.mockResolvedValue(0);

      await controller.getAllFiles(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'DOCUMENT', eventId: 'event-1' },
          skip: 10,
          take: 10,
        })
      );
    });

    it('should call next with error when query fails', async () => {
      const error = new Error('Database error');
      mockPrisma.file.findMany.mockRejectedValue(error);

      await controller.getAllFiles(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('uploadFiles', () => {
    it('should upload multiple files successfully', async () => {
      mockReq.files = [
        { filename: 'file1.pdf', originalname: 'original1.pdf', mimetype: 'application/pdf', size: 1024, path: '/uploads/file1.pdf' },
        { filename: 'file2.jpg', originalname: 'original2.jpg', mimetype: 'image/jpeg', size: 2048, path: '/uploads/file2.jpg' },
      ] as Express.Multer.File[];
      mockReq.body = { category: 'DOCUMENT', eventId: 'event-1', isPublic: 'true' };

      mockPrisma.file.create
        .mockResolvedValueOnce({ id: 'file-1', filename: 'file1.pdf' } as any)
        .mockResolvedValueOnce({ id: 'file-2', filename: 'file2.jpg' } as any);

      await controller.uploadFiles(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.file.create).toHaveBeenCalledTimes(2);
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ count: 2 }),
        'Files uploaded successfully',
        201
      );
    });

    it('should return 401 when user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.files = [{ filename: 'test.pdf' }] as Express.Multer.File[];

      await controller.uploadFiles(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'User not authenticated', 401);
    });

    it('should return 400 when no files provided', async () => {
      mockReq.files = [];

      await controller.uploadFiles(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'No files provided', 400);
    });

    it('should call next with error when upload fails', async () => {
      mockReq.files = [{ filename: 'test.pdf', originalname: 'test.pdf', mimetype: 'application/pdf', size: 1024, path: '/uploads/test.pdf' }] as Express.Multer.File[];
      const error = new Error('Upload failed');
      mockPrisma.file.create.mockRejectedValue(error);

      await controller.uploadFiles(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getFileById', () => {
    it('should return file by ID', async () => {
      mockReq.params = { id: 'file-1' };
      const mockFile = { id: 'file-1', filename: 'test.pdf', user: { id: 'user-1', name: 'John' } };
      mockPrisma.file.findUnique.mockResolvedValue(mockFile as any);

      await controller.getFileById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.file.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'file-1' } })
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockFile);
    });

    it('should return 404 when file not found', async () => {
      mockReq.params = { id: 'missing-file' };
      mockPrisma.file.findUnique.mockResolvedValue(null);

      await controller.getFileById(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'File not found', 404);
    });

    it('should call next with error when query fails', async () => {
      mockReq.params = { id: 'file-1' };
      const error = new Error('Query error');
      mockPrisma.file.findUnique.mockRejectedValue(error);

      await controller.getFileById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateFile', () => {
    it('should update file successfully', async () => {
      mockReq.params = { id: 'file-1' };
      mockReq.body = { category: 'IMAGE', isPublic: true, metadata: { tags: ['test'] } };
      
      mockPrisma.file.findUnique.mockResolvedValue({ id: 'file-1' } as any);
      mockPrisma.file.update.mockResolvedValue({ id: 'file-1', category: 'IMAGE' } as any);

      await controller.updateFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.file.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'file-1' },
          data: expect.objectContaining({ category: 'IMAGE', isPublic: true }),
        })
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, expect.anything(), 'File updated successfully');
    });

    it('should return 404 when file not found', async () => {
      mockReq.params = { id: 'missing-file' };
      mockReq.body = { category: 'IMAGE' };
      mockPrisma.file.findUnique.mockResolvedValue(null);

      await controller.updateFile(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'File not found', 404);
    });

    it('should call next with error when update fails', async () => {
      mockReq.params = { id: 'file-1' };
      mockReq.body = { category: 'IMAGE' };
      mockPrisma.file.findUnique.mockResolvedValue({ id: 'file-1' } as any);
      const error = new Error('Update failed');
      mockPrisma.file.update.mockRejectedValue(error);

      await controller.updateFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getFileStats', () => {
    it('should return file statistics', async () => {
      mockPrisma.file.count.mockResolvedValue(100);
      mockPrisma.file.aggregate.mockResolvedValue({ _sum: { size: 1048576 } } as any);
      mockPrisma.file.groupBy.mockResolvedValue([
        { category: 'DOCUMENT', _count: { id: 50 }, _sum: { size: 524288 } },
      ] as any);
      mockPrisma.file.findMany.mockResolvedValue([
        { id: 'file-1', filename: 'recent.pdf', size: 1024, uploadedAt: new Date(), user: { id: 'user-1', name: 'John' } },
      ] as any);

      await controller.getFileStats(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          totalFiles: 100,
          totalSize: 1048576,
          totalSizeMB: '1.00',
        })
      );
    });

    it('should call next with error when stats query fails', async () => {
      const error = new Error('Stats error');
      mockPrisma.file.count.mockRejectedValue(error);

      await controller.getFileStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('upload', () => {
    it('should upload single file successfully', async () => {
      mockReq.file = {
        filename: 'test.pdf',
        originalname: 'original.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        path: '/uploads/test.pdf',
      } as Express.Multer.File;
      mockReq.body = { category: 'DOCUMENT', eventId: 'event-1', isPublic: 'true' };

      mockPrisma.file.create.mockResolvedValue({ id: 'file-1', filename: 'test.pdf' } as any);

      await controller.upload(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filename: 'test.pdf',
            uploadedBy: 'user-1',
            isPublic: true,
          }),
        })
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, expect.anything(), 'File uploaded successfully', 201);
    });

    it('should return 401 when user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.file = { filename: 'test.pdf' } as Express.Multer.File;

      await controller.upload(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'User not authenticated', 401);
    });

    it('should return 400 when no file provided', async () => {
      mockReq.file = undefined;

      await controller.upload(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'No file provided', 400);
    });

    it('should call next with error when upload fails', async () => {
      mockReq.file = { filename: 'test.pdf', originalname: 'test.pdf', mimetype: 'application/pdf', size: 1024, path: '/uploads/test.pdf' } as Express.Multer.File;
      const error = new Error('Upload failed');
      mockPrisma.file.create.mockRejectedValue(error);

      await controller.upload(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
