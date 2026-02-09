/**
 * FileService Unit Tests
 * Comprehensive tests for file operations
 */

import 'reflect-metadata';
import { FileService } from '../../../src/services/FileService';
import { promises as fs } from 'fs';
import * as path from 'path';
import { NotFoundError } from '../../../src/services/BaseService';

describe('FileService', () => {
  let service: FileService;
  let readdirSpy: jest.SpyInstance;
  let accessSpy: jest.SpyInstance;
  let unlinkSpy: jest.SpyInstance;

  beforeEach(() => {
    readdirSpy = jest.spyOn(fs, 'readdir');
    accessSpy = jest.spyOn(fs, 'access');
    unlinkSpy = jest.spyOn(fs, 'unlink');

    service = new FileService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      readdirSpy.mockResolvedValue(mockFiles as any);

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
      readdirSpy.mockResolvedValue(mockFiles as any);

      const result = await service.listFiles('documents');

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe(path.join('documents', 'document.pdf'));
      expect(result[1].path).toBe(path.join('documents', 'image.jpg'));
    });

    it('should return empty array when directory is empty', async () => {
      readdirSpy.mockResolvedValue([]);

      const result = await service.listFiles();

      expect(result).toEqual([]);
    });

    it('should throw error when permission denied', async () => {
      readdirSpy.mockRejectedValue(new Error('EACCES: permission denied'));

      await expect(service.listFiles()).rejects.toThrow('Failed to list files');
    });

    it('should handle files with special characters', async () => {
      const mockFiles = [
        { name: 'file with spaces.txt', isDirectory: () => false },
        { name: "file'with'quotes.pdf", isDirectory: () => false }
      ];
      readdirSpy.mockResolvedValue(mockFiles as any);

      const result = await service.listFiles();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('file with spaces.txt');
      expect(result[1].name).toBe("file'with'quotes.pdf");
    });
  });

  describe('getFilePath', () => {
    it('should return file path when file exists', async () => {
      accessSpy.mockResolvedValue(undefined);

      const result = await service.getFilePath('test.pdf');

      expect(result).toContain('test.pdf');
      expect(accessSpy).toHaveBeenCalled();
    });

    it('should construct correct path for subdirectory files', async () => {
      accessSpy.mockResolvedValue(undefined);

      const result = await service.getFilePath('subdir/test.pdf');

      expect(result).toContain('subdir');
      expect(result).toContain('test.pdf');
    });

    it('should throw NotFoundError when file does not exist', async () => {
      accessSpy.mockRejectedValue(new Error('ENOENT'));

      await expect(service.getFilePath('nonexistent.pdf')).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      accessSpy.mockResolvedValue(undefined);
      unlinkSpy.mockResolvedValue(undefined);

      await service.deleteFile('test.pdf');

      expect(unlinkSpy).toHaveBeenCalled();
    });

    it('should delete file in subdirectory', async () => {
      accessSpy.mockResolvedValue(undefined);
      unlinkSpy.mockResolvedValue(undefined);

      await service.deleteFile('documents/report.pdf');

      expect(unlinkSpy).toHaveBeenCalled();
    });

    it('should throw error when file not found', async () => {
      accessSpy.mockRejectedValue(new Error('ENOENT'));

      await expect(service.deleteFile('nonexistent.pdf')).rejects.toThrow(NotFoundError);
    });
  });
});
