/**
 * FileService Unit Tests
 * Comprehensive tests for file operations
 */

import 'reflect-metadata';
import { FileService } from '../../../src/services/FileService';
import { promises as fs } from 'fs';
import * as path from 'path';
import { NotFoundError } from '../../../src/services/BaseService';

// Mock fs and path
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    access: jest.fn(),
    unlink: jest.fn()
  }
}));

describe('FileService', () => {
  let service: FileService;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    service = new FileService();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FileService);
    });
  });

  describe('listFiles', () => {
    it('should list files in the default upload directory', async () => {
      const mockFiles = [
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'file2.pdf', isDirectory: () => false },
        { name: 'subfolder', isDirectory: () => true }
      ];
      mockFs.readdir.mockResolvedValue(mockFiles as any);

      const result = await service.listFiles();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: 'file1.txt',
        isDirectory: false,
        path: 'file1.txt'
      });
      expect(result[1]).toEqual({
        name: 'file2.pdf',
        isDirectory: false,
        path: 'file2.pdf'
      });
      expect(result[2]).toEqual({
        name: 'subfolder',
        isDirectory: true,
        path: 'subfolder'
      });
    });

    it('should list files in a specific subdirectory', async () => {
      const mockFiles = [
        { name: 'document.pdf', isDirectory: () => false },
        { name: 'image.jpg', isDirectory: () => false }
      ];
      mockFs.readdir.mockResolvedValue(mockFiles as any);

      const result = await service.listFiles('documents');

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('documents/document.pdf');
      expect(result[1].path).toBe('documents/image.jpg');
      expect(mockFs.readdir).toHaveBeenCalledWith(
        expect.stringContaining('documents'),
        { withFileTypes: true }
      );
    });

    it('should return empty array when directory is empty', async () => {
      mockFs.readdir.mockResolvedValue([] as any);

      const result = await service.listFiles();

      expect(result).toEqual([]);
    });

    it('should handle mixed file types', async () => {
      const mockFiles = [
        { name: 'file.txt', isDirectory: () => false },
        { name: 'folder1', isDirectory: () => true },
        { name: 'file.pdf', isDirectory: () => false },
        { name: 'folder2', isDirectory: () => true }
      ];
      mockFs.readdir.mockResolvedValue(mockFiles as any);

      const result = await service.listFiles();

      expect(result).toHaveLength(4);
      expect(result.filter(f => f.isDirectory)).toHaveLength(2);
      expect(result.filter(f => !f.isDirectory)).toHaveLength(2);
    });

    it('should throw error when directory does not exist', async () => {
      mockFs.readdir.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      await expect(service.listFiles('nonexistent')).rejects.toThrow('Failed to list files');
    });

    it('should throw error when permission denied', async () => {
      mockFs.readdir.mockRejectedValue(new Error('EACCES: permission denied'));

      await expect(service.listFiles()).rejects.toThrow('Failed to list files');
    });

    it('should handle deeply nested directories', async () => {
      const mockFiles = [
        { name: 'deep-file.txt', isDirectory: () => false }
      ];
      mockFs.readdir.mockResolvedValue(mockFiles as any);

      const result = await service.listFiles('level1/level2/level3');

      expect(result[0].path).toBe('level1/level2/level3/deep-file.txt');
    });

    it('should handle files with special characters', async () => {
      const mockFiles = [
        { name: 'file with spaces.txt', isDirectory: () => false },
        { name: 'file_with_underscores.pdf', isDirectory: () => false },
        { name: 'file-with-dashes.jpg', isDirectory: () => false }
      ];
      mockFs.readdir.mockResolvedValue(mockFiles as any);

      const result = await service.listFiles();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('file with spaces.txt');
      expect(result[1].name).toBe('file_with_underscores.pdf');
      expect(result[2].name).toBe('file-with-dashes.jpg');
    });

    it('should handle hidden files', async () => {
      const mockFiles = [
        { name: '.hidden-file', isDirectory: () => false },
        { name: 'visible-file.txt', isDirectory: () => false }
      ];
      mockFs.readdir.mockResolvedValue(mockFiles as any);

      const result = await service.listFiles();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('.hidden-file');
    });
  });

  describe('getFilePath', () => {
    it('should return file path when file exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await service.getFilePath('test.txt');

      expect(result).toContain('test.txt');
      expect(mockFs.access).toHaveBeenCalledWith(expect.stringContaining('test.txt'));
    });

    it('should throw NotFoundError when file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      await expect(service.getFilePath('nonexistent.txt')).rejects.toThrow(NotFoundError);
    });

    it('should construct correct path for subdirectory files', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await service.getFilePath('subfolder/document.pdf');

      expect(result).toContain('subfolder');
      expect(result).toContain('document.pdf');
    });

    it('should handle file paths with multiple levels', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await service.getFilePath('level1/level2/file.txt');

      expect(result).toContain('level1/level2/file.txt');
    });

    it('should throw NotFoundError with file name in message', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      try {
        await service.getFilePath('missing.txt');
        fail('Should have thrown NotFoundError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.message).toContain('missing.txt');
      }
    });

    it('should handle files with special characters in path', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await service.getFilePath('folder with spaces/file (1).txt');

      expect(result).toContain('folder with spaces');
      expect(result).toContain('file (1).txt');
    });

    it('should throw error when permission denied', async () => {
      mockFs.access.mockRejectedValue(new Error('EACCES: permission denied'));

      await expect(service.getFilePath('protected.txt')).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      await service.deleteFile('test.txt');

      expect(mockFs.access).toHaveBeenCalled();
      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('test.txt'));
    });

    it('should throw error when file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      await expect(service.deleteFile('nonexistent.txt')).rejects.toThrow(NotFoundError);
      expect(mockFs.unlink).not.toHaveBeenCalled();
    });

    it('should delete file in subdirectory', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      await service.deleteFile('subfolder/document.pdf');

      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('subfolder/document.pdf'));
    });

    it('should handle deletion errors', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.unlink.mockRejectedValue(new Error('EACCES: permission denied'));

      await expect(service.deleteFile('protected.txt')).rejects.toThrow('permission denied');
    });

    it('should verify file exists before attempting deletion', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      await expect(service.deleteFile('missing.txt')).rejects.toThrow(NotFoundError);
      expect(mockFs.unlink).not.toHaveBeenCalled();
    });

    it('should delete file with special characters', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      await service.deleteFile('file with spaces (1).txt');

      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('file with spaces (1).txt'));
    });

    it('should delete hidden file', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      await service.deleteFile('.hidden-file');

      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('.hidden-file'));
    });

    it('should handle deeply nested file deletion', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      await service.deleteFile('level1/level2/level3/file.txt');

      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('level1/level2/level3/file.txt'));
    });
  });

  describe('error handling', () => {
    it('should provide meaningful error messages for list failures', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Disk I/O error'));

      try {
        await service.listFiles();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Failed to list files');
        expect(error.message).toContain('Disk I/O error');
      }
    });

    it('should handle null or undefined directory gracefully', async () => {
      const mockFiles = [{ name: 'file.txt', isDirectory: () => false }];
      mockFs.readdir.mockResolvedValue(mockFiles as any);

      const result = await service.listFiles(undefined);

      expect(result).toHaveLength(1);
    });

    it('should handle empty filename', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      await expect(service.getFilePath('')).rejects.toThrow(NotFoundError);
    });
  });

  describe('integration scenarios', () => {
    it('should list, verify, and delete file in sequence', async () => {
      // List files
      mockFs.readdir.mockResolvedValue([
        { name: 'to-delete.txt', isDirectory: () => false }
      ] as any);
      const files = await service.listFiles();
      expect(files).toHaveLength(1);

      // Verify file exists
      mockFs.access.mockResolvedValue(undefined);
      const filePath = await service.getFilePath('to-delete.txt');
      expect(filePath).toContain('to-delete.txt');

      // Delete file
      mockFs.unlink.mockResolvedValue(undefined);
      await service.deleteFile('to-delete.txt');
      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('should handle listing multiple directories', async () => {
      mockFs.readdir
        .mockResolvedValueOnce([{ name: 'file1.txt', isDirectory: () => false }] as any)
        .mockResolvedValueOnce([{ name: 'file2.pdf', isDirectory: () => false }] as any);

      const files1 = await service.listFiles('dir1');
      const files2 = await service.listFiles('dir2');

      expect(files1[0].path).toBe('dir1/file1.txt');
      expect(files2[0].path).toBe('dir2/file2.pdf');
    });
  });
});
