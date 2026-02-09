import 'reflect-metadata';
import { LogFilesService } from '../../../src/services/LogFilesService';
import { BadRequestError, NotFoundError } from '../../../src/services/BaseService';
import * as fs from 'fs';
import * as path from 'path';

describe('LogFilesService', () => {
  let service: LogFilesService;
  let mkdirSpy: jest.SpyInstance;
  let readdirSpy: jest.SpyInstance;
  let statSpy: jest.SpyInstance;
  let readFileSpy: jest.SpyInstance;
  let accessSpy: jest.SpyInstance;
  let unlinkSpy: jest.SpyInstance;

  // Helper to create mock Dirent objects
  const createDirent = (name: string, isDir = false) => ({
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
  });

  beforeEach(() => {
    mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
    readdirSpy = jest.spyOn(fs.promises, 'readdir').mockResolvedValue([]);
    statSpy = jest.spyOn(fs.promises, 'stat').mockResolvedValue({ size: 1024, mtime: new Date() } as any);
    readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue('');
    accessSpy = jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
    unlinkSpy = jest.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);

    service = new LogFilesService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(LogFilesService);
    });
  });

  describe('getLogFiles', () => {
    it('should return list of log files', async () => {
      const mockStats = { size: 1024, mtime: new Date('2024-01-15T10:00:00Z') };
      readdirSpy.mockResolvedValue([
        createDirent('app.log'),
        createDirent('error.log'),
        createDirent('access.log')
      ]);
      statSpy.mockResolvedValue(mockStats);

      const result = await service.getLogFiles();

      expect(result.files).toHaveLength(3);
      expect(result.files[0]).toMatchObject({
        name: expect.any(String),
        size: 1024,
        sizeFormatted: expect.any(String),
        modifiedAt: expect.any(String),
      });
    });

    it('should filter only .log files', async () => {
      readdirSpy.mockResolvedValue([
        createDirent('app.log'),
        createDirent('config.json'),
        createDirent('error.log'),
        createDirent('data.txt')
      ]);
      statSpy.mockResolvedValue({ size: 1024, mtime: new Date('2024-01-15T10:00:00Z') });

      const result = await service.getLogFiles();

      expect(result.files).toHaveLength(2);
      expect(result.files.every((f) => f.name.endsWith('.log'))).toBe(true);
    });

    it('should sort files by modified date descending', async () => {
      readdirSpy.mockResolvedValue([
        createDirent('old.log'),
        createDirent('recent.log'),
        createDirent('newest.log')
      ]);
      statSpy
        .mockResolvedValueOnce({ size: 1024, mtime: new Date('2024-01-10T10:00:00Z') })
        .mockResolvedValueOnce({ size: 2048, mtime: new Date('2024-01-15T10:00:00Z') })
        .mockResolvedValueOnce({ size: 512, mtime: new Date('2024-01-20T10:00:00Z') });

      const result = await service.getLogFiles();

      expect(result.files[0].name).toBe('newest.log');
      expect(result.files[2].name).toBe('old.log');
    });

    it('should format file sizes correctly', async () => {
      readdirSpy.mockResolvedValue([
        createDirent('small.log'),
        createDirent('medium.log'),
        createDirent('large.log')
      ]);
      statSpy
        .mockResolvedValueOnce({ size: 512, mtime: new Date() })
        .mockResolvedValueOnce({ size: 1024 * 500, mtime: new Date() })
        .mockResolvedValueOnce({ size: 1024 * 1024 * 10, mtime: new Date() });

      const result = await service.getLogFiles();

      expect(result.files.find((f) => f.name === 'small.log')?.sizeFormatted).toContain('Bytes');
      expect(result.files.find((f) => f.name === 'medium.log')?.sizeFormatted).toContain('KB');
      expect(result.files.find((f) => f.name === 'large.log')?.sizeFormatted).toContain('MB');
    });

    it('should create log directory if it does not exist', async () => {
      readdirSpy.mockResolvedValue([]);

      await service.getLogFiles();

      expect(mkdirSpy).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ recursive: true }));
    });

    it('should throw error if directory creation fails', async () => {
      mkdirSpy.mockRejectedValue(new Error('Permission denied'));

      await expect(service.getLogFiles()).rejects.toThrow('Failed to create logs directory');
    });
  });

  describe('getLogFileContents', () => {
    it('should return log file contents', async () => {
      const mockContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      readFileSpy.mockResolvedValue(mockContent);

      const result = await service.getLogFileContents('app.log');

      expect(result).toMatchObject({
        filename: 'app.log',
        content: expect.any(String),
        totalLines: 5,
        displayedLines: 5,
      });
    });

    it('should limit to specified number of lines', async () => {
      const lines = Array.from({ length: 1000 }, (_, i) => `Line ${i + 1}`);
      const mockContent = lines.join('\n');
      readFileSpy.mockResolvedValue(mockContent);

      const result = await service.getLogFileContents('app.log', 100);

      expect(result.totalLines).toBe(1000);
      expect(result.displayedLines).toBe(100);
    });

    it('should return last N lines', async () => {
      const mockContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      readFileSpy.mockResolvedValue(mockContent);

      const result = await service.getLogFileContents('app.log', 3);

      expect(result.content).toContain('Line 3');
      expect(result.content).toContain('Line 5');
      expect(result.content).not.toContain('Line 1');
    });

    it('should throw NotFoundError for non-existent file', async () => {
      accessSpy.mockRejectedValue(new Error('File not found'));

      await expect(service.getLogFileContents('nonexistent.log')).rejects.toThrow(NotFoundError);
    });

    it('should reject path traversal attempts', async () => {
      await expect(service.getLogFileContents('../../../etc/passwd')).rejects.toThrow(BadRequestError);
    });

    it('should allow subfolder paths with forward slashes', async () => {
      const mockContent = 'Log content';
      readFileSpy.mockResolvedValue(mockContent);

      const result = await service.getLogFileContents('api/app.log');

      expect(result.filename).toBe('app.log');
    });

    it('should reject filenames with backslashes', async () => {
      await expect(service.getLogFileContents('logs\\app.log')).rejects.toThrow(BadRequestError);
    });

    it('should handle default line limit', async () => {
      const mockContent = 'Line 1\nLine 2\nLine 3';
      readFileSpy.mockResolvedValue(mockContent);

      const result = await service.getLogFileContents('app.log');

      expect(result.displayedLines).toBe(3);
    });
  });

  describe('getLogFilePath', () => {
    it('should return file path for valid log file', async () => {
      const result = await service.getLogFilePath('app.log');

      expect(result).toContain('app.log');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should throw NotFoundError for non-existent file', async () => {
      accessSpy.mockRejectedValue(new Error('File not found'));

      await expect(service.getLogFilePath('nonexistent.log')).rejects.toThrow(NotFoundError);
    });

    it('should reject path traversal attempts', async () => {
      await expect(service.getLogFilePath('../../../etc/passwd')).rejects.toThrow(BadRequestError);
    });

    it('should validate filename before checking existence', async () => {
      await expect(service.getLogFilePath('../../app.log')).rejects.toThrow(BadRequestError);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete logs older than specified days', async () => {
      // Use dates relative to today
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 20); // 20 days ago
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5); // 5 days ago

      readdirSpy.mockResolvedValue([createDirent('old.log'), createDirent('recent.log')]);
      statSpy
        .mockResolvedValueOnce({ size: 1024, mtime: oldDate })
        .mockResolvedValueOnce({ size: 2048, mtime: recentDate });

      const result = await service.cleanupOldLogs(10);

      expect(result.deletedCount).toBe(1);
      expect(result.deletedSize).toBe(1024);
      expect(unlinkSpy).toHaveBeenCalledTimes(1);
    });

    it('should return formatted deleted size', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400); // 400 days ago

      readdirSpy.mockResolvedValue([createDirent('old.log')]);
      statSpy.mockResolvedValue({ size: 1024 * 1024 * 5, mtime: oldDate });

      const result = await service.cleanupOldLogs(365);

      expect(result.deletedSizeFormatted).toContain('MB');
    });

    it('should not delete recent logs', async () => {
      const recentDate = new Date();

      readdirSpy.mockResolvedValue([createDirent('recent1.log'), createDirent('recent2.log')]);
      statSpy.mockResolvedValue({ size: 1024, mtime: recentDate });

      const result = await service.cleanupOldLogs(10);

      expect(result.deletedCount).toBe(0);
      expect(unlinkSpy).not.toHaveBeenCalled();
    });

    it('should only delete .log files', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400); // 400 days ago

      readdirSpy.mockResolvedValue([
        createDirent('old.log'),
        createDirent('old.txt'),
        createDirent('old.json')
      ]);
      statSpy.mockResolvedValue({ size: 1024, mtime: oldDate });

      const result = await service.cleanupOldLogs(365);

      expect(result.deletedCount).toBe(1);
      expect(unlinkSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid daysToKeep', async () => {
      await expect(service.cleanupOldLogs(0)).rejects.toThrow(BadRequestError);
    });

    it('should throw error for negative daysToKeep', async () => {
      await expect(service.cleanupOldLogs(-1)).rejects.toThrow(BadRequestError);
    });

    it('should handle no files to delete', async () => {
      readdirSpy.mockResolvedValue([]);

      const result = await service.cleanupOldLogs(30);

      expect(result.deletedCount).toBe(0);
      expect(result.deletedSize).toBe(0);
    });
  });

  describe('deleteLogFile', () => {
    it('should delete specified log file', async () => {
      await service.deleteLogFile('app.log');

      expect(unlinkSpy).toHaveBeenCalledWith(expect.stringContaining('app.log'));
    });

    it('should throw NotFoundError for non-existent file', async () => {
      accessSpy.mockRejectedValue(new Error('File not found'));

      await expect(service.deleteLogFile('nonexistent.log')).rejects.toThrow(NotFoundError);
    });

    it('should reject path traversal attempts', async () => {
      await expect(service.deleteLogFile('../../../etc/passwd')).rejects.toThrow(BadRequestError);
    });

    it('should validate filename before deletion', async () => {
      await expect(service.deleteLogFile('logs/../../app.log')).rejects.toThrow(BadRequestError);
    });
  });

  describe('formatFileSize (private)', () => {
    it('should format 0 bytes', async () => {
      readdirSpy.mockResolvedValue([createDirent('empty.log')]);
      statSpy.mockResolvedValue({ size: 0, mtime: new Date() });

      const result = await service.getLogFiles();

      expect(result.files[0].sizeFormatted).toBe('0 Bytes');
    });

    it('should format bytes', async () => {
      readdirSpy.mockResolvedValue([createDirent('small.log')]);
      statSpy.mockResolvedValue({ size: 512, mtime: new Date() });

      const result = await service.getLogFiles();

      expect(result.files[0].sizeFormatted).toContain('Bytes');
    });

    it('should format kilobytes', async () => {
      readdirSpy.mockResolvedValue([createDirent('medium.log')]);
      statSpy.mockResolvedValue({ size: 1024 * 50, mtime: new Date() });

      const result = await service.getLogFiles();

      expect(result.files[0].sizeFormatted).toContain('KB');
    });

    it('should format gigabytes', async () => {
      readdirSpy.mockResolvedValue([createDirent('huge.log')]);
      statSpy.mockResolvedValue({ size: 1024 * 1024 * 1024 * 2, mtime: new Date() });

      const result = await service.getLogFiles();

      expect(result.files[0].sizeFormatted).toContain('GB');
    });
  });
});
