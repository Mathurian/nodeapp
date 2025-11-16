/**
 * FileManagementService Unit Tests
 * Comprehensive tests for file management operations
 */

import 'reflect-metadata';
import { FileManagementService } from '../../../src/services/FileManagementService';
import { NotFoundError } from '../../../src/services/BaseService';
import * as fs from 'fs/promises';

// Mock fs module
jest.mock('fs/promises');

describe('FileManagementService', () => {
  let service: FileManagementService;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    service = new FileManagementService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FileManagementService);
    });
  });

  describe('getFileInfo', () => {
    const mockStats = {
      size: 1024,
      birthtime: new Date('2025-01-01'),
      mtime: new Date('2025-01-15'),
      isFile: () => true,
      isDirectory: () => false,
    };

    it('should return file information', async () => {
      mockFs.stat.mockResolvedValue(mockStats as any);

      const result = await service.getFileInfo('test-file.pdf');

      expect(result).toEqual({
        name: 'test-file.pdf',
        size: 1024,
        created: mockStats.birthtime,
        modified: mockStats.mtime,
      });
    });

    it('should handle large files', async () => {
      const largeStats = { ...mockStats, size: 5 * 1024 * 1024 * 1024 };
      mockFs.stat.mockResolvedValue(largeStats as any);

      const result = await service.getFileInfo('large.mp4');
      expect(result.size).toBe(5 * 1024 * 1024 * 1024);
    });

    it('should throw NotFoundError when file does not exist', async () => {
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));

      await expect(service.getFileInfo('missing.pdf')).rejects.toThrow(NotFoundError);
    });

    it('should handle permission errors', async () => {
      mockFs.stat.mockRejectedValue(new Error('EACCES'));

      await expect(service.getFileInfo('restricted.pdf')).rejects.toThrow(NotFoundError);
    });

    it('should handle special characters in filename', async () => {
      mockFs.stat.mockResolvedValue(mockStats as any);

      const result = await service.getFileInfo('file with spaces.pdf');
      expect(result.name).toBe('file with spaces.pdf');
    });

    it('should handle zero-byte files', async () => {
      const emptyStats = { ...mockStats, size: 0 };
      mockFs.stat.mockResolvedValue(emptyStats as any);

      const result = await service.getFileInfo('empty.txt');
      expect(result.size).toBe(0);
    });

    it('should handle files in subdirectories', async () => {
      mockFs.stat.mockResolvedValue(mockStats as any);

      const result = await service.getFileInfo('subdir/file.pdf');
      expect(result.name).toBe('subdir/file.pdf');
    });
  });

  describe('moveFile', () => {
    it('should move file successfully', async () => {
      mockFs.rename.mockResolvedValue(undefined);

      const result = await service.moveFile('old.pdf', 'new.pdf');

      expect(result).toEqual({
        success: true,
        newPath: 'new.pdf',
      });
      expect(mockFs.rename).toHaveBeenCalled();
    });

    it('should move file to subdirectory', async () => {
      mockFs.rename.mockResolvedValue(undefined);

      const result = await service.moveFile('file.pdf', 'archive/file.pdf');
      expect(result.newPath).toBe('archive/file.pdf');
    });

    it('should throw error when source does not exist', async () => {
      mockFs.rename.mockRejectedValue(new Error('ENOENT'));

      await expect(service.moveFile('missing.pdf', 'new.pdf')).rejects.toThrow();
    });

    it('should throw error for permission issues', async () => {
      mockFs.rename.mockRejectedValue(new Error('EACCES'));

      await expect(service.moveFile('file.pdf', 'restricted/new.pdf')).rejects.toThrow();
    });

    it('should throw error for cross-device move', async () => {
      mockFs.rename.mockRejectedValue(new Error('EXDEV'));

      await expect(service.moveFile('file.pdf', '/other/file.pdf')).rejects.toThrow();
    });

    it('should handle files with special characters', async () => {
      mockFs.rename.mockResolvedValue(undefined);

      const result = await service.moveFile('old name.pdf', 'new name.pdf');
      expect(result.success).toBe(true);
    });

    it('should throw error for disk full', async () => {
      mockFs.rename.mockRejectedValue(new Error('ENOSPC'));

      await expect(service.moveFile('file.pdf', 'new.pdf')).rejects.toThrow();
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      mockFs.copyFile.mockResolvedValue(undefined);

      const result = await service.copyFile('source.pdf', 'copy.pdf');

      expect(result).toEqual({
        success: true,
        newPath: 'copy.pdf',
      });
      expect(mockFs.copyFile).toHaveBeenCalled();
    });

    it('should copy file to subdirectory', async () => {
      mockFs.copyFile.mockResolvedValue(undefined);

      const result = await service.copyFile('file.pdf', 'backup/file.pdf');
      expect(result.newPath).toBe('backup/file.pdf');
    });

    it('should throw error when source does not exist', async () => {
      mockFs.copyFile.mockRejectedValue(new Error('ENOENT'));

      await expect(service.copyFile('missing.pdf', 'copy.pdf')).rejects.toThrow();
    });

    it('should throw error for permission issues', async () => {
      mockFs.copyFile.mockRejectedValue(new Error('EACCES'));

      await expect(service.copyFile('file.pdf', 'restricted/copy.pdf')).rejects.toThrow();
    });

    it('should throw error for insufficient space', async () => {
      mockFs.copyFile.mockRejectedValue(new Error('ENOSPC'));

      await expect(service.copyFile('large.pdf', 'copy.pdf')).rejects.toThrow();
    });

    it('should handle copying large files', async () => {
      mockFs.copyFile.mockResolvedValue(undefined);

      const result = await service.copyFile('large-5gb.mp4', 'copy-5gb.mp4');
      expect(result.success).toBe(true);
    });

    it('should handle concurrent copy operations', async () => {
      mockFs.copyFile.mockResolvedValue(undefined);

      const promises = [
        service.copyFile('file1.pdf', 'copy1.pdf'),
        service.copyFile('file2.pdf', 'copy2.pdf'),
        service.copyFile('file3.pdf', 'copy3.pdf'),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach(r => expect(r.success).toBe(true));
    });

    it('should throw error for read-only filesystem', async () => {
      mockFs.copyFile.mockRejectedValue(new Error('EROFS'));

      await expect(service.copyFile('file.pdf', 'readonly/copy.pdf')).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely long filenames', async () => {
      const longName = 'a'.repeat(255) + '.pdf';
      mockFs.stat.mockResolvedValue({
        size: 1024,
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      const result = await service.getFileInfo(longName);
      expect(result.name).toBe(longName);
    });

    it('should handle filenames with dots', async () => {
      mockFs.stat.mockResolvedValue({
        size: 1024,
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      const result = await service.getFileInfo('file.name.with.dots.pdf');
      expect(result.name).toBe('file.name.with.dots.pdf');
    });

    it('should handle files without extension', async () => {
      mockFs.stat.mockResolvedValue({
        size: 512,
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      const result = await service.getFileInfo('README');
      expect(result.name).toBe('README');
    });

    it('should handle corrupted files', async () => {
      mockFs.stat.mockRejectedValue(new Error('EIO'));

      await expect(service.getFileInfo('corrupted.pdf')).rejects.toThrow();
    });

    it('should handle network delays', async () => {
      mockFs.stat.mockImplementation(() =>
        new Promise((resolve) =>
          setTimeout(() => resolve({
            size: 1024,
            birthtime: new Date(),
            mtime: new Date(),
          } as any), 50)
        )
      );

      const result = await service.getFileInfo('network-file.pdf');
      expect(result.name).toBe('network-file.pdf');
    });
  });

  describe('File Types', () => {
    beforeEach(() => {
      mockFs.stat.mockResolvedValue({
        size: 1024,
        birthtime: new Date(),
        mtime: new Date(),
      } as any);
    });

    it('should handle PDF files', async () => {
      const result = await service.getFileInfo('document.pdf');
      expect(result.name).toContain('.pdf');
    });

    it('should handle image files', async () => {
      const result = await service.getFileInfo('photo.jpg');
      expect(result.name).toContain('.jpg');
    });

    it('should handle video files', async () => {
      const result = await service.getFileInfo('video.mp4');
      expect(result.name).toContain('.mp4');
    });

    it('should handle archive files', async () => {
      const result = await service.getFileInfo('archive.zip');
      expect(result.name).toContain('.zip');
    });
  });
});
