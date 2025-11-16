/**
 * ScheduledBackupService Unit Tests
 * Comprehensive test coverage for automated backup scheduling and execution
 */

import 'reflect-metadata';
import { ScheduledBackupService } from '../../../src/services/scheduledBackupService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import cron from 'node-cron';
import fs from 'fs';
import { exec } from 'child_process';

// Mock dependencies
jest.mock('node-cron');
jest.mock('fs');
jest.mock('child_process');

describe('ScheduledBackupService', () => {
  let service: ScheduledBackupService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockCronJob: any;
  const originalEnv = process.env;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ScheduledBackupService(mockPrisma as any);
    jest.clearAllMocks();

    // Mock cron job
    mockCronJob = {
      stop: jest.fn(),
      start: jest.fn()
    };

    (cron.schedule as jest.Mock).mockReturnValue(mockCronJob);

    // Setup fs mocks (must be after clearAllMocks)
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation();
    (fs.statSync as jest.Mock).mockImplementation(() => ({
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false
    }));
    (fs.unlinkSync as jest.Mock).mockImplementation();

    // Setup environment
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgresql://user:password@localhost:5432/testdb'
    };
  });

  afterEach(() => {
    mockReset(mockPrisma);
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ScheduledBackupService);
    });

    it('should initialize with empty jobs map', () => {
      const schedules = service.getActiveSchedules();
      expect(schedules).toEqual([]);
    });
  });

  describe('start()', () => {
    it('should start the service', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      process.env.NODE_ENV = 'test'; // Prevent actual DB calls

      await service.start();

      expect(consoleLogSpy).toHaveBeenCalledWith('Starting scheduled backup service...');

      consoleLogSpy.mockRestore();
    });

    it('should not start if already running', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      process.env.NODE_ENV = 'test';

      await service.start();
      await service.start();

      expect(consoleLogSpy).toHaveBeenCalledWith('Scheduled backup service is already running');

      consoleLogSpy.mockRestore();
    });

    it('should load backup settings on start in non-test environment', async () => {
      process.env.NODE_ENV = 'production';
      mockPrisma.backupSetting.findMany.mockResolvedValue([]);

      await service.start();

      expect(mockPrisma.backupSetting.findMany).toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('should stop the service', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      process.env.NODE_ENV = 'test';

      await service.start();
      await service.stop();

      expect(consoleLogSpy).toHaveBeenCalledWith('Scheduled backup service stopped');

      consoleLogSpy.mockRestore();
    });

    it('should stop all cron jobs', async () => {
      process.env.NODE_ENV = 'production';
      mockPrisma.backupSetting.findMany.mockResolvedValue([
        {
          id: '1',
          backupType: 'FULL',
          frequency: 'DAILY',
          frequencyValue: 2,
          retentionDays: 7,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any
      ]);

      await service.start();
      await service.stop();

      expect(mockCronJob.stop).toHaveBeenCalled();
    });

    it('should not stop if not running', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.stop();

      expect(consoleLogSpy).toHaveBeenCalledWith('Scheduled backup service is not running');

      consoleLogSpy.mockRestore();
    });
  });

  describe('loadBackupSettings()', () => {
    it('should skip in test environment', async () => {
      process.env.NODE_ENV = 'test';

      await service.loadBackupSettings();

      expect(mockPrisma.backupSetting.findMany).not.toHaveBeenCalled();
    });

    it('should load and schedule enabled backups', async () => {
      process.env.NODE_ENV = 'production';
      mockPrisma.backupSetting.findMany.mockResolvedValue([
        {
          id: '1',
          backupType: 'FULL',
          frequency: 'DAILY',
          frequencyValue: 2,
          retentionDays: 7,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any,
        {
          id: '2',
          backupType: 'SCHEMA',
          frequency: 'WEEKLY',
          frequencyValue: 3,
          retentionDays: 30,
          enabled: false,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any
      ]);

      await service.loadBackupSettings();

      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully in production', async () => {
      process.env.NODE_ENV = 'production';
      mockPrisma.backupSetting.findMany.mockRejectedValue(new Error('Database error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.loadBackupSettings();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading backup settings:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('scheduleBackup()', () => {
    it('should create cron job for MINUTES frequency', async () => {
      const setting = {
        backupType: 'FULL',
        frequency: 'MINUTES',
        frequencyValue: 30,
        retentionDays: 7
      };

      await service.scheduleBackup(setting);

      expect(cron.schedule).toHaveBeenCalledWith('*/30 * * * *', expect.any(Function));
    });

    it('should create cron job for HOURS frequency', async () => {
      const setting = {
        backupType: 'FULL',
        frequency: 'HOURS',
        frequencyValue: 6,
        retentionDays: 7
      };

      await service.scheduleBackup(setting);

      expect(cron.schedule).toHaveBeenCalledWith('0 */6 * * *', expect.any(Function));
    });

    it('should create cron job for DAILY frequency', async () => {
      const setting = {
        backupType: 'FULL',
        frequency: 'DAILY',
        frequencyValue: 2,
        retentionDays: 7
      };

      await service.scheduleBackup(setting);

      expect(cron.schedule).toHaveBeenCalledWith('0 2 * * *', expect.any(Function));
    });

    it('should create cron job for WEEKLY frequency', async () => {
      const setting = {
        backupType: 'FULL',
        frequency: 'WEEKLY',
        frequencyValue: 3,
        retentionDays: 30
      };

      await service.scheduleBackup(setting);

      expect(cron.schedule).toHaveBeenCalledWith('0 3 * * 0', expect.any(Function));
    });

    it('should create cron job for MONTHLY frequency', async () => {
      const setting = {
        backupType: 'FULL',
        frequency: 'MONTHLY',
        frequencyValue: 1,
        retentionDays: 90
      };

      await service.scheduleBackup(setting);

      expect(cron.schedule).toHaveBeenCalledWith('0 1 1 * *', expect.any(Function));
    });

    it('should stop existing job before creating new one', async () => {
      const setting = {
        backupType: 'FULL',
        frequency: 'DAILY',
        frequencyValue: 2,
        retentionDays: 7
      };

      await service.scheduleBackup(setting);
      await service.scheduleBackup(setting);

      expect(mockCronJob.stop).toHaveBeenCalled();
    });

    it('should warn for unknown frequency', async () => {
      const setting = {
        backupType: 'FULL',
        frequency: 'UNKNOWN',
        frequencyValue: 1,
        retentionDays: 7
      };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.scheduleBackup(setting);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown backup frequency: UNKNOWN');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('runScheduledBackup()', () => {
    beforeEach(() => {
      mockPrisma.backupLog.create.mockResolvedValue({
        id: 'log-1',
        type: 'FULL',
        location: 'backups/test.sql',
        size: 0,
        status: 'running',
        startedAt: new Date(),
        completedAt: null,
        duration: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      mockPrisma.backupLog.update.mockResolvedValue({} as any);
      mockPrisma.backupLog.findMany.mockResolvedValue([]);
    });

    it('should create backup directory if not exists', async () => {
      const setting = { backupType: 'FULL', retentionDays: 7 };

      await service.runScheduledBackup(setting);

      expect(fs.existsSync).toHaveBeenCalledWith('backups');
      expect(fs.mkdirSync).toHaveBeenCalledWith('backups', { recursive: true });
    });

    it('should create backup log entry', async () => {
      const setting = { backupType: 'FULL', retentionDays: 7 };

      await service.runScheduledBackup(setting);

      expect(mockPrisma.backupLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'FULL',
          status: 'running'
        })
      });
    });

    it('should execute pg_dump for FULL backup', async () => {
      const setting = { backupType: 'FULL', retentionDays: 7 };
      const execMock = exec as unknown as jest.Mock;
      execMock.mockImplementation((cmd, callback) => callback(null, '', ''));

      await service.runScheduledBackup(setting);

      expect(exec).toHaveBeenCalled();
      const command = execMock.mock.calls[0][0];
      expect(command).toContain('pg_dump');
      expect(command).toContain('-d testdb');
    });

    it('should execute pg_dump with --schema-only for SCHEMA backup', async () => {
      const setting = { backupType: 'SCHEMA', retentionDays: 7 };
      const execMock = exec as unknown as jest.Mock;
      execMock.mockImplementation((cmd, callback) => callback(null, '', ''));

      await service.runScheduledBackup(setting);

      const command = execMock.mock.calls[0][0];
      expect(command).toContain('--schema-only');
    });

    it('should execute pg_dump with --data-only for DATA backup', async () => {
      const setting = { backupType: 'DATA', retentionDays: 7 };
      const execMock = exec as unknown as jest.Mock;
      execMock.mockImplementation((cmd, callback) => callback(null, '', ''));

      await service.runScheduledBackup(setting);

      const command = execMock.mock.calls[0][0];
      expect(command).toContain('--data-only');
    });

    it('should handle invalid backup type', async () => {
      const setting = { backupType: 'INVALID', retentionDays: 7 };

      await service.runScheduledBackup(setting);

      expect(mockPrisma.backupLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({
          status: 'failed',
          errorMessage: 'Invalid backup type'
        })
      });
    });

    it('should handle backup execution errors', async () => {
      const setting = { backupType: 'FULL', retentionDays: 7 };
      const execMock = exec as unknown as jest.Mock;
      const error = new Error('pg_dump failed');
      execMock.mockImplementation((cmd, callback) => callback(error, '', ''));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.runScheduledBackup(setting);

      // Wait for async exec callback
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('cleanupOldBackups()', () => {
    it('should delete old backups beyond retention period', async () => {
      const setting = { backupType: 'FULL', retentionDays: 7 };
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      mockPrisma.backupLog.findMany.mockResolvedValue([
        {
          id: 'old-1',
          location: 'backups/old-backup.sql',
          createdAt: oldDate,
          type: 'FULL',
          status: 'success'
        } as any
      ]);

      mockPrisma.backupLog.delete.mockResolvedValue({} as any);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await service.cleanupOldBackups(setting);

      expect(mockPrisma.backupLog.findMany).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledWith('backups/old-backup.sql');
      expect(mockPrisma.backupLog.delete).toHaveBeenCalledWith({ where: { id: 'old-1' } });
    });

    it('should handle missing physical files', async () => {
      const setting = { backupType: 'FULL', retentionDays: 7 };
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      mockPrisma.backupLog.findMany.mockResolvedValue([
        {
          id: 'old-1',
          location: 'backups/missing.sql',
          createdAt: oldDate,
          type: 'FULL',
          status: 'success'
        } as any
      ]);

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await service.cleanupOldBackups(setting);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(mockPrisma.backupLog.delete).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const setting = { backupType: 'FULL', retentionDays: 7 };
      mockPrisma.backupLog.findMany.mockRejectedValue(new Error('Database error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.cleanupOldBackups(setting);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateBackupSchedule()', () => {
    it('should update existing schedule', async () => {
      const setting = {
        backupType: 'FULL',
        frequency: 'DAILY',
        frequencyValue: 2,
        retentionDays: 7,
        enabled: true
      };

      await service.scheduleBackup(setting);
      await service.updateBackupSchedule(setting);

      expect(mockCronJob.stop).toHaveBeenCalled();
      expect(cron.schedule).toHaveBeenCalled();
    });

    it('should remove schedule when disabled', async () => {
      const setting = {
        backupType: 'FULL',
        frequency: 'DAILY',
        frequencyValue: 2,
        retentionDays: 7,
        enabled: false
      };

      await service.scheduleBackup({ ...setting, enabled: true });
      await service.updateBackupSchedule(setting);

      expect(mockCronJob.stop).toHaveBeenCalled();
    });
  });

  describe('reloadSettings()', () => {
    it('should stop all jobs and reload settings', async () => {
      process.env.NODE_ENV = 'test';
      await service.scheduleBackup({
        backupType: 'FULL',
        frequency: 'DAILY',
        frequencyValue: 2,
        retentionDays: 7
      });

      await service.reloadSettings();

      expect(mockCronJob.stop).toHaveBeenCalled();
    });
  });

  describe('runManualBackup()', () => {
    it('should execute manual backup successfully', async () => {
      mockPrisma.backupSetting.findUnique.mockResolvedValue({
        id: 'setting-1',
        backupType: 'FULL',
        frequency: 'DAILY',
        frequencyValue: 2,
        retentionDays: 7,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      mockPrisma.backupLog.create.mockResolvedValue({
        id: 'log-1',
        startedAt: new Date()
      } as any);

      const execMock = exec as unknown as jest.Mock;
      execMock.mockImplementation((cmd, callback) => callback(null, '', ''));

      const result = await service.runManualBackup('setting-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Manual backup completed');
    });

    it('should return error for non-existent setting', async () => {
      mockPrisma.backupSetting.findUnique.mockResolvedValue(null);

      const result = await service.runManualBackup('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Backup setting not found');
    });

    it('should handle manual backup errors', async () => {
      mockPrisma.backupSetting.findUnique.mockRejectedValue(new Error('Database error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.runManualBackup('setting-1');

      expect(result.success).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getActiveSchedules()', () => {
    it('should return empty array when no schedules', () => {
      const schedules = service.getActiveSchedules();

      expect(schedules).toEqual([]);
    });

    it('should return active schedules', async () => {
      await service.scheduleBackup({
        backupType: 'FULL',
        frequency: 'DAILY',
        frequencyValue: 2,
        retentionDays: 7
      });

      await service.scheduleBackup({
        backupType: 'SCHEMA',
        frequency: 'WEEKLY',
        frequencyValue: 3,
        retentionDays: 30
      });

      const schedules = service.getActiveSchedules();

      expect(schedules).toHaveLength(2);
      expect(schedules[0]).toEqual({
        backupType: 'FULL',
        frequency: 'DAILY',
        isActive: true
      });
      expect(schedules[1]).toEqual({
        backupType: 'SCHEMA',
        frequency: 'WEEKLY',
        isActive: true
      });
    });
  });
});
