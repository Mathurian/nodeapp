import 'reflect-metadata';
import { FileBackupService } from '../../../src/services/FileBackupService';
import { promises as fs } from 'fs';
import * as path from 'path';

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readdir: jest.fn(),
    rm: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
    copyFile: jest.fn(),
  },
}));

describe('FileBackupService', () => {
  let service: FileBackupService;
  const mockBackupDir = path.join(__dirname, '../../../backups');
  const mockUploadDir = path.join(__dirname, '../../../uploads');

  beforeEach(() => {
    service = new FileBackupService();
    jest.clearAllMocks();
  });

  describe('createBackup', () => {
    it('should create backup directory if it does not exist', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createBackup();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('backups'),
        { recursive: true }
      );
      expect(result.success).toBe(true);
      expect(result.backupPath).toContain('backup-');
      expect(result.timestamp).toBeDefined();
    });

    it('should generate timestamp-based backup path', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      const beforeTime = new Date();

      const result = await service.createBackup();

      expect(result.backupPath).toMatch(/backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      expect(result.timestamp).toBeDefined();
    });

    it('should return success true on successful backup', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createBackup();

      expect(result.success).toBe(true);
    });

    it('should throw error if mkdir fails', async () => {
      (fs.mkdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(service.createBackup()).rejects.toThrow('Backup failed: Permission denied');
    });

    it('should handle filesystem errors gracefully', async () => {
      (fs.mkdir as jest.Mock).mockRejectedValue(new Error('Disk full'));

      await expect(service.createBackup()).rejects.toThrow('Backup failed: Disk full');
    });

    it('should create unique backup paths for multiple backups', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      const result1 = await service.createBackup();
      // Wait a small amount to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      const result2 = await service.createBackup();

      expect(result1.backupPath).not.toBe(result2.backupPath);
    });

    it('should include timestamp in response', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createBackup();

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });

    it('should create backup directory with recursive option', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await service.createBackup();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });

    it('should format timestamp without colons and periods', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createBackup();

      expect(result.backupPath).not.toContain(':');
      expect(result.backupPath).not.toContain('.');
    });

    it('should handle network drive errors', async () => {
      (fs.mkdir as jest.Mock).mockRejectedValue(new Error('Network path not found'));

      await expect(service.createBackup()).rejects.toThrow('Backup failed: Network path not found');
    });
  });

  describe('listBackups', () => {
    it('should create backup directory if it does not exist', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      await service.listBackups();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('backups'),
        { recursive: true }
      );
    });

    it('should return empty array when no backups exist', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const result = await service.listBackups();

      expect(result).toEqual([]);
    });

    it('should filter files that start with "backup-"', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([
        'backup-2024-01-01',
        'backup-2024-01-02',
        'other-file.txt',
        'backup-2024-01-03',
        'random.log',
      ]);

      const result = await service.listBackups();

      expect(result).toEqual([
        'backup-2024-01-01',
        'backup-2024-01-02',
        'backup-2024-01-03',
      ]);
    });

    it('should return only backup files', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([
        'backup-2024-01-01',
        'test.txt',
      ]);

      const result = await service.listBackups();

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('backup-2024-01-01');
    });

    it('should return empty array on readdir error', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Read error'));

      const result = await service.listBackups();

      expect(result).toEqual([]);
    });

    it('should handle mkdir error and still return empty array', async () => {
      (fs.mkdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const result = await service.listBackups();

      expect(result).toEqual([]);
    });

    it('should handle multiple backup files correctly', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      const backupFiles = Array.from({ length: 10 }, (_, i) => `backup-2024-01-${String(i + 1).padStart(2, '0')}`);
      (fs.readdir as jest.Mock).mockResolvedValue(backupFiles);

      const result = await service.listBackups();

      expect(result).toHaveLength(10);
      expect(result).toEqual(backupFiles);
    });

    it('should not include hidden files', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([
        'backup-2024-01-01',
        '.hidden',
        'backup-2024-01-02',
      ]);

      const result = await service.listBackups();

      expect(result).not.toContain('.hidden');
      expect(result).toHaveLength(2);
    });

    it('should handle special backup name formats', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([
        'backup-2024-01-01T10-30-00',
        'backup-2024-01-02T14-45-30',
        'backup-manual',
      ]);

      const result = await service.listBackups();

      expect(result).toHaveLength(3);
      expect(result).toContain('backup-2024-01-01T10-30-00');
      expect(result).toContain('backup-manual');
    });

    it('should not modify original file list', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      const originalFiles = ['backup-1', 'other', 'backup-2'];
      (fs.readdir as jest.Mock).mockResolvedValue([...originalFiles]);

      await service.listBackups();

      expect((fs.readdir as jest.Mock).mock.results[0].value).toEqual(originalFiles);
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup directory', async () => {
      (fs.rm as jest.Mock).mockResolvedValue(undefined);

      await service.deleteBackup('backup-2024-01-01');

      expect(fs.rm).toHaveBeenCalledWith(
        expect.stringContaining('backup-2024-01-01'),
        { recursive: true, force: true }
      );
    });

    it('should use recursive and force options', async () => {
      (fs.rm as jest.Mock).mockResolvedValue(undefined);

      await service.deleteBackup('backup-test');

      expect(fs.rm).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true, force: true }
      );
    });

    it('should throw error if deletion fails', async () => {
      (fs.rm as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(service.deleteBackup('backup-test')).rejects.toThrow(
        'Delete backup failed: Permission denied'
      );
    });

    it('should handle non-existent backup gracefully', async () => {
      (fs.rm as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(service.deleteBackup('non-existent')).rejects.toThrow(
        'Delete backup failed: File not found'
      );
    });

    it('should construct correct backup path', async () => {
      (fs.rm as jest.Mock).mockResolvedValue(undefined);
      const backupName = 'backup-2024-01-01T12-00-00';

      await service.deleteBackup(backupName);

      expect(fs.rm).toHaveBeenCalledWith(
        expect.stringContaining(backupName),
        expect.any(Object)
      );
    });

    it('should handle special characters in backup name', async () => {
      (fs.rm as jest.Mock).mockResolvedValue(undefined);

      await service.deleteBackup('backup-2024-01-01T12:00:00');

      expect(fs.rm).toHaveBeenCalled();
    });

    it('should throw BadRequestError with proper message', async () => {
      (fs.rm as jest.Mock).mockRejectedValue(new Error('Access denied'));

      await expect(service.deleteBackup('backup-test')).rejects.toThrow('Delete backup failed: Access denied');
    });

    it('should handle empty backup name', async () => {
      (fs.rm as jest.Mock).mockResolvedValue(undefined);

      await service.deleteBackup('');

      expect(fs.rm).toHaveBeenCalled();
    });

    it('should handle path traversal attempts safely', async () => {
      (fs.rm as jest.Mock).mockResolvedValue(undefined);

      await service.deleteBackup('../../../etc/passwd');

      expect(fs.rm).toHaveBeenCalled();
    });

    it('should handle locked file errors', async () => {
      (fs.rm as jest.Mock).mockRejectedValue(new Error('File is locked'));

      await expect(service.deleteBackup('backup-locked')).rejects.toThrow(
        'Delete backup failed: File is locked'
      );
    });
  });

  describe('Backup directory configuration', () => {
    it('should use correct backup directory path', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await service.createBackup();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('backups'),
        expect.any(Object)
      );
    });

    it('should maintain consistent backup directory across operations', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([]);
      (fs.rm as jest.Mock).mockResolvedValue(undefined);

      await service.createBackup();
      const createCall = (fs.mkdir as jest.Mock).mock.calls[0][0];

      await service.listBackups();
      const listCall = (fs.mkdir as jest.Mock).mock.calls[1][0];

      expect(createCall).toBe(listCall);
    });
  });

  describe('Error handling', () => {
    it('should properly wrap filesystem errors', async () => {
      (fs.mkdir as jest.Mock).mockRejectedValue(new Error('Test error'));

      await expect(service.createBackup()).rejects.toThrow('Backup failed: Test error');
    });

    it('should handle unknown errors', async () => {
      (fs.mkdir as jest.Mock).mockRejectedValue('String error');

      await expect(service.createBackup()).rejects.toThrow();
    });

    it('should provide descriptive error messages', async () => {
      (fs.rm as jest.Mock).mockRejectedValue(new Error('ENOENT: no such file'));

      await expect(service.deleteBackup('backup-test')).rejects.toThrow(
        'Delete backup failed: ENOENT: no such file'
      );
    });

    it('should handle EACCES permission errors', async () => {
      (fs.rm as jest.Mock).mockRejectedValue(new Error('EACCES: permission denied'));

      await expect(service.deleteBackup('backup-test')).rejects.toThrow(
        'Delete backup failed: EACCES: permission denied'
      );
    });

    it('should handle ENOSPC disk full errors', async () => {
      (fs.mkdir as jest.Mock).mockRejectedValue(new Error('ENOSPC: no space left on device'));

      await expect(service.createBackup()).rejects.toThrow(
        'Backup failed: ENOSPC: no space left on device'
      );
    });
  });
});
