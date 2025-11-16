import { LogFilesService } from '../../../src/services/LogFilesService';
import { BadRequestError, NotFoundError } from '../../../src/services/BaseService';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');

describe('LogFilesService', () => {
  let service: LogFilesService;

  beforeEach(() => {
    service = new LogFilesService();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(LogFilesService);
    });
  });

  describe('getLogFiles', () => {
    it('should return list of log files', async () => {
      const mockStats = {
        size: 1024,
        mtime: new Date('2024-01-15T10:00:00Z'),
      };

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['app.log', 'error.log', 'access.log']);
      (fs.stat as jest.Mock).mockResolvedValue(mockStats);

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
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['app.log', 'config.json', 'error.log', 'data.txt']);
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        mtime: new Date('2024-01-15T10:00:00Z'),
      });

      const result = await service.getLogFiles();

      expect(result.files).toHaveLength(2);
      expect(result.files.every((f) => f.name.endsWith('.log'))).toBe(true);
    });

    it('should sort files by modified date descending', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['old.log', 'recent.log', 'newest.log']);
      (fs.stat as jest.Mock)
        .mockResolvedValueOnce({
          size: 1024,
          mtime: new Date('2024-01-10T10:00:00Z'),
        })
        .mockResolvedValueOnce({
          size: 2048,
          mtime: new Date('2024-01-15T10:00:00Z'),
        })
        .mockResolvedValueOnce({
          size: 512,
          mtime: new Date('2024-01-20T10:00:00Z'),
        });

      const result = await service.getLogFiles();

      expect(result.files[0].name).toBe('newest.log');
      expect(result.files[2].name).toBe('old.log');
    });

    it('should format file sizes correctly', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['small.log', 'medium.log', 'large.log']);
      (fs.stat as jest.Mock)
        .mockResolvedValueOnce({
          size: 512,
          mtime: new Date(),
        })
        .mockResolvedValueOnce({
          size: 1024 * 500,
          mtime: new Date(),
        })
        .mockResolvedValueOnce({
          size: 1024 * 1024 * 10,
          mtime: new Date(),
        });

      const result = await service.getLogFiles();

      expect(result.files.find((f) => f.name === 'small.log')?.sizeFormatted).toContain('Bytes');
      expect(result.files.find((f) => f.name === 'medium.log')?.sizeFormatted).toContain('KB');
      expect(result.files.find((f) => f.name === 'large.log')?.sizeFormatted).toContain('MB');
    });

    it('should create log directory if it does not exist', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      await service.getLogFiles();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ recursive: true })
      );
    });

    it('should throw error if directory creation fails', async () => {
      (fs.mkdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(service.getLogFiles()).rejects.toThrow('Failed to create logs directory');
    });
  });

  describe('getLogFileContents', () => {
    it('should return log file contents', async () => {
      const mockContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const result = await service.getLogFileContents('app.log');

      expect(result).toMatchObject({
        filename: 'app.log',
        contents: expect.any(String),
        totalLines: 5,
        displayedLines: 5,
      });
    });

    it('should limit to specified number of lines', async () => {
      const lines = Array.from({ length: 1000 }, (_, i) => `Line ${i + 1}`);
      const mockContent = lines.join('\n');
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const result = await service.getLogFileContents('app.log', 100);

      expect(result.totalLines).toBe(1000);
      expect(result.displayedLines).toBe(100);
    });

    it('should return last N lines', async () => {
      const mockContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const result = await service.getLogFileContents('app.log', 3);

      expect(result.contents).toContain('Line 3');
      expect(result.contents).toContain('Line 5');
      expect(result.contents).not.toContain('Line 1');
    });

    it('should throw NotFoundError for non-existent file', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(service.getLogFileContents('nonexistent.log')).rejects.toThrow(NotFoundError);
    });

    it('should reject path traversal attempts', async () => {
      await expect(service.getLogFileContents('../../../etc/passwd')).rejects.toThrow(
        BadRequestError
      );
    });

    it('should reject filenames with slashes', async () => {
      await expect(service.getLogFileContents('logs/app.log')).rejects.toThrow(BadRequestError);
    });

    it('should reject filenames with backslashes', async () => {
      await expect(service.getLogFileContents('logs\\app.log')).rejects.toThrow(BadRequestError);
    });

    it('should handle default line limit', async () => {
      const mockContent = 'Line 1\nLine 2\nLine 3';
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const result = await service.getLogFileContents('app.log');

      expect(result.displayedLines).toBe(3);
    });
  });

  describe('getLogFilePath', () => {
    it('should return file path for valid log file', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getLogFilePath('app.log');

      expect(result).toContain('app.log');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should throw NotFoundError for non-existent file', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

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
      const oldDate = new Date('2024-01-01T10:00:00Z');
      const recentDate = new Date('2024-01-20T10:00:00Z');

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['old.log', 'recent.log']);
      (fs.stat as jest.Mock)
        .mockResolvedValueOnce({
          size: 1024,
          mtime: oldDate,
        })
        .mockResolvedValueOnce({
          size: 2048,
          mtime: recentDate,
        });
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await service.cleanupOldLogs(10);

      expect(result.deletedCount).toBe(1);
      expect(result.deletedSize).toBe(1024);
      expect(fs.unlink).toHaveBeenCalledTimes(1);
    });

    it('should return formatted deleted size', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['old.log']);
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024 * 1024 * 5,
        mtime: new Date('2020-01-01T10:00:00Z'),
      });
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await service.cleanupOldLogs(365);

      expect(result.deletedSizeFormatted).toContain('MB');
    });

    it('should not delete recent logs', async () => {
      const recentDate = new Date();

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['recent1.log', 'recent2.log']);
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        mtime: recentDate,
      });

      const result = await service.cleanupOldLogs(10);

      expect(result.deletedCount).toBe(0);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should only delete .log files', async () => {
      const oldDate = new Date('2020-01-01T10:00:00Z');

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['old.log', 'old.txt', 'old.json']);
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        mtime: oldDate,
      });
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await service.cleanupOldLogs(365);

      expect(result.deletedCount).toBe(1);
      expect(fs.unlink).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid daysToKeep', async () => {
      await expect(service.cleanupOldLogs(0)).rejects.toThrow(BadRequestError);
    });

    it('should throw error for negative daysToKeep', async () => {
      await expect(service.cleanupOldLogs(-1)).rejects.toThrow(BadRequestError);
    });

    it('should handle no files to delete', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const result = await service.cleanupOldLogs(30);

      expect(result.deletedCount).toBe(0);
      expect(result.deletedSize).toBe(0);
    });
  });

  describe('deleteLogFile', () => {
    it('should delete specified log file', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.deleteLogFile('app.log');

      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('app.log'));
    });

    it('should throw NotFoundError for non-existent file', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

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
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['empty.log']);
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 0,
        mtime: new Date(),
      });

      const result = await service.getLogFiles();

      expect(result.files[0].sizeFormatted).toBe('0 Bytes');
    });

    it('should format bytes', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['small.log']);
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 512,
        mtime: new Date(),
      });

      const result = await service.getLogFiles();

      expect(result.files[0].sizeFormatted).toContain('Bytes');
    });

    it('should format kilobytes', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['medium.log']);
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024 * 50,
        mtime: new Date(),
      });

      const result = await service.getLogFiles();

      expect(result.files[0].sizeFormatted).toContain('KB');
    });

    it('should format megabytes', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['large.log']);
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024 * 1024 * 10,
        mtime: new Date(),
      });

      const result = await service.getLogFiles();

      expect(result.files[0].sizeFormatted).toContain('MB');
    });

    it('should format gigabytes', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['huge.log']);
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024 * 1024 * 1024 * 2,
        mtime: new Date(),
      });

      const result = await service.getLogFiles();

      expect(result.files[0].sizeFormatted).toContain('GB');
    });
  });
});
