/**
 * FileManagementService Unit Tests
 * Comprehensive tests for file management operations
 */

import 'reflect-metadata';
import { FileManagementService } from '../../../src/services/FileManagementService';
import { NotFoundError, ValidationError } from '../../../src/services/BaseService';
import * as fs from 'fs';

describe('FileManagementService', () => {
  let service: FileManagementService;
  let statSpy: jest.SpyInstance;
  let renameSpy: jest.SpyInstance;
  let copyFileSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new FileManagementService();
    statSpy = jest.spyOn(fs.promises, 'stat');
    renameSpy = jest.spyOn(fs.promises, 'rename');
    copyFileSpy = jest.spyOn(fs.promises, 'copyFile');
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
      statSpy.mockResolvedValue(mockStats as any);

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
      statSpy.mockResolvedValue(largeStats as any);

      const result = await service.getFileInfo('large.mp4');
      expect(result.size).toBe(5 * 1024 * 1024 * 1024);
    });

    it('should throw NotFoundError when file does not exist', async () => {
      statSpy.mockRejectedValue(new Error('ENOENT'));

      await expect(service.getFileInfo('missing.pdf')).rejects.toThrow(NotFoundError);
    });

    it('should handle permission errors', async () => {
      statSpy.mockRejectedValue(new Error('EACCES'));

      await expect(service.getFileInfo('restricted.pdf')).rejects.toThrow(NotFoundError);
    });

    it('should handle special characters in filename', async () => {
      statSpy.mockResolvedValue(mockStats as any);

      const result = await service.getFileInfo('file with spaces.pdf');
      expect(result.name).toBe('file with spaces.pdf');
    });
  });

  describe('moveFile', () => {
    it('should move file successfully', async () => {
      renameSpy.mockResolvedValue(undefined);

      const result = await service.moveFile('source.pdf', 'dest/target.pdf');

      expect(result).toEqual({
        success: true,
        newPath: 'dest/target.pdf'
      });
      expect(renameSpy).toHaveBeenCalled();
    });

    it('should handle move errors', async () => {
      renameSpy.mockRejectedValue(new Error('ENOENT'));

      await expect(service.moveFile('missing.pdf', 'dest.pdf')).rejects.toThrow();
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      copyFileSpy.mockResolvedValue(undefined);

      const result = await service.copyFile('source.pdf', 'copy.pdf');

      expect(result).toEqual({
        success: true,
        newPath: 'copy.pdf'
      });
      expect(copyFileSpy).toHaveBeenCalled();
    });

    it('should handle copy errors', async () => {
      copyFileSpy.mockRejectedValue(new Error('ENOENT'));

      await expect(service.copyFile('missing.pdf', 'dest.pdf')).rejects.toThrow();
    });
  });
});
