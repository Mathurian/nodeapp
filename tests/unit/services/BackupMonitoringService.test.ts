/**
 * BackupMonitoringService Unit Tests
 * Comprehensive tests for backup monitoring operations
 */

import 'reflect-metadata';
import BackupMonitoringService, { BackupLogData, BackupStats, BackupHealthCheck } from '../../../src/services/BackupMonitoringService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('BackupMonitoringService', () => {
  let service: BackupMonitoringService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockBackupLog = {
    id: 'backup-1',
    type: 'full' as const,
    status: 'success' as const,
    startedAt: new Date('2025-06-01T00:00:00Z'),
    completedAt: new Date('2025-06-01T01:00:00Z'),
    duration: 3600,
    size: BigInt(1024 * 1024 * 1024), // 1GB
    location: '/backups/full-2025-06-01.sql',
    errorMessage: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = BackupMonitoringService.getInstance();

    // Replace prisma instance in singleton
    (service as any).prisma = mockPrisma;

    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
    service.removeAllListeners();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = BackupMonitoringService.getInstance();
      const instance2 = BackupMonitoringService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(BackupMonitoringService);
    });
  });

  describe('logBackup', () => {
    const backupData: BackupLogData = {
      type: 'full',
      status: 'success',
      startedAt: new Date('2025-06-01T00:00:00Z'),
      completedAt: new Date('2025-06-01T01:00:00Z'),
      duration: 3600,
      size: 1024 * 1024 * 1024,
      location: '/backups/full-2025-06-01.sql',
      metadata: { version: '1.0' },
    };

    it('should log successful backup and emit success event', async () => {
      mockPrisma.backupLog.create.mockResolvedValue(mockBackupLog as any);

      const successSpy = jest.fn();
      service.on('backup:success', successSpy);

      const result = await service.logBackup(backupData);

      expect(result).toEqual(mockBackupLog);
      expect(mockPrisma.backupLog.create).toHaveBeenCalledWith({
        data: {
          type: backupData.type,
          status: backupData.status,
          startedAt: backupData.startedAt,
          completedAt: backupData.completedAt,
          duration: backupData.duration,
          size: BigInt(backupData.size!),
          location: backupData.location,
          errorMessage: backupData.errorMessage,
          metadata: backupData.metadata,
        },
      });
      expect(successSpy).toHaveBeenCalledWith(mockBackupLog);
    });

    it('should log failed backup and emit failure event', async () => {
      const failedData: BackupLogData = {
        ...backupData,
        status: 'failed',
        errorMessage: 'Connection timeout',
      };

      const failedLog = {
        ...mockBackupLog,
        status: 'failed',
        errorMessage: 'Connection timeout',
      };

      mockPrisma.backupLog.create.mockResolvedValue(failedLog as any);
      mockPrisma.backupLog.count.mockResolvedValue(1);

      const failedSpy = jest.fn();
      service.on('backup:failed', failedSpy);

      const result = await service.logBackup(failedData);

      expect(result).toEqual(failedLog);
      expect(failedSpy).toHaveBeenCalledWith(failedLog);
    });

    it('should emit backup:logged event for any backup', async () => {
      mockPrisma.backupLog.create.mockResolvedValue(mockBackupLog as any);

      const loggedSpy = jest.fn();
      service.on('backup:logged', loggedSpy);

      await service.logBackup(backupData);

      expect(loggedSpy).toHaveBeenCalledWith(mockBackupLog);
    });

    it('should emit critical event on repeated failures', async () => {
      const failedData: BackupLogData = {
        ...backupData,
        status: 'failed',
        errorMessage: 'Disk full',
      };

      const failedLog = { ...mockBackupLog, status: 'failed', errorMessage: 'Disk full' };
      mockPrisma.backupLog.create.mockResolvedValue(failedLog as any);
      mockPrisma.backupLog.count.mockResolvedValue(3);

      const criticalSpy = jest.fn();
      service.on('backup:critical', criticalSpy);

      await service.logBackup(failedData);

      expect(criticalSpy).toHaveBeenCalledWith({ failures: 3 });
    });

    it('should handle backup without size', async () => {
      const dataWithoutSize: BackupLogData = {
        ...backupData,
        size: undefined,
      };

      mockPrisma.backupLog.create.mockResolvedValue({ ...mockBackupLog, size: null } as any);

      await service.logBackup(dataWithoutSize);

      expect(mockPrisma.backupLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          size: null,
        }),
      });
    });

    it('should handle backup without metadata', async () => {
      const dataWithoutMetadata: BackupLogData = {
        ...backupData,
        metadata: undefined,
      };

      mockPrisma.backupLog.create.mockResolvedValue(mockBackupLog as any);

      await service.logBackup(dataWithoutMetadata);

      expect(mockPrisma.backupLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {},
        }),
      });
    });

    it('should throw error on database failure', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.backupLog.create.mockRejectedValue(error);

      await expect(service.logBackup(backupData)).rejects.toThrow('Database connection failed');
    });

    it('should log incremental backup', async () => {
      const incrementalData: BackupLogData = {
        ...backupData,
        type: 'incremental',
      };

      mockPrisma.backupLog.create.mockResolvedValue({ ...mockBackupLog, type: 'incremental' } as any);

      const result = await service.logBackup(incrementalData);

      expect(result.type).toBe('incremental');
    });

    it('should log PITR base backup', async () => {
      const pitrData: BackupLogData = {
        ...backupData,
        type: 'pitr_base',
      };

      mockPrisma.backupLog.create.mockResolvedValue({ ...mockBackupLog, type: 'pitr_base' } as any);

      const result = await service.logBackup(pitrData);

      expect(result.type).toBe('pitr_base');
    });
  });

  describe('updateBackupLog', () => {
    it('should update backup log with status', async () => {
      const updateData = { status: 'success' as const };
      mockPrisma.backupLog.update.mockResolvedValue({ ...mockBackupLog, ...updateData } as any);

      const updatedSpy = jest.fn();
      service.on('backup:updated', updatedSpy);

      const result = await service.updateBackupLog('backup-1', updateData);

      expect(result.status).toBe('success');
      expect(mockPrisma.backupLog.update).toHaveBeenCalledWith({
        where: { id: 'backup-1' },
        data: { status: 'success' },
      });
      expect(updatedSpy).toHaveBeenCalledWith(result);
    });

    it('should update backup log with completion data', async () => {
      const completedAt = new Date('2025-06-01T01:00:00Z');
      const updateData = {
        status: 'success' as const,
        completedAt,
        duration: 3600,
        size: 1024 * 1024 * 1024,
      };

      mockPrisma.backupLog.update.mockResolvedValue({ ...mockBackupLog, ...updateData } as any);

      await service.updateBackupLog('backup-1', updateData);

      expect(mockPrisma.backupLog.update).toHaveBeenCalledWith({
        where: { id: 'backup-1' },
        data: {
          status: 'success',
          completedAt,
          duration: 3600,
          size: BigInt(1024 * 1024 * 1024),
        },
      });
    });

    it('should update backup log with error message', async () => {
      const updateData = {
        status: 'failed' as const,
        errorMessage: 'Backup failed due to network error',
      };

      mockPrisma.backupLog.update.mockResolvedValue({ ...mockBackupLog, ...updateData } as any);

      await service.updateBackupLog('backup-1', updateData);

      expect(mockPrisma.backupLog.update).toHaveBeenCalledWith({
        where: { id: 'backup-1' },
        data: {
          status: 'failed',
          errorMessage: 'Backup failed due to network error',
        },
      });
    });

    it('should update backup log with metadata', async () => {
      const updateData = {
        metadata: { retries: 3, lastError: 'timeout' },
      };

      mockPrisma.backupLog.update.mockResolvedValue({ ...mockBackupLog, ...updateData } as any);

      await service.updateBackupLog('backup-1', updateData);

      expect(mockPrisma.backupLog.update).toHaveBeenCalledWith({
        where: { id: 'backup-1' },
        data: { metadata: updateData.metadata },
      });
    });

    it('should throw error on update failure', async () => {
      const error = new Error('Update failed');
      mockPrisma.backupLog.update.mockRejectedValue(error);

      await expect(service.updateBackupLog('backup-1', { status: 'success' })).rejects.toThrow('Update failed');
    });
  });

  describe('getBackupHistory', () => {
    const mockBackups = [
      mockBackupLog,
      { ...mockBackupLog, id: 'backup-2', type: 'incremental' },
    ];

    it('should return backup history with default options', async () => {
      mockPrisma.backupLog.findMany.mockResolvedValue(mockBackups as any);
      mockPrisma.backupLog.count.mockResolvedValue(2);

      const result = await service.getBackupHistory();

      expect(result).toEqual({
        backups: mockBackups,
        total: 2,
      });
      expect(mockPrisma.backupLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { startedAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter by type', async () => {
      mockPrisma.backupLog.findMany.mockResolvedValue([mockBackups[0]] as any);
      mockPrisma.backupLog.count.mockResolvedValue(1);

      const result = await service.getBackupHistory({ type: 'full' });

      expect(result.backups).toHaveLength(1);
      expect(mockPrisma.backupLog.findMany).toHaveBeenCalledWith({
        where: { type: 'full' },
        orderBy: { startedAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter by status', async () => {
      mockPrisma.backupLog.findMany.mockResolvedValue(mockBackups as any);
      mockPrisma.backupLog.count.mockResolvedValue(2);

      await service.getBackupHistory({ status: 'success' });

      expect(mockPrisma.backupLog.findMany).toHaveBeenCalledWith({
        where: { status: 'success' },
        orderBy: { startedAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-30');

      mockPrisma.backupLog.findMany.mockResolvedValue(mockBackups as any);
      mockPrisma.backupLog.count.mockResolvedValue(2);

      await service.getBackupHistory({ startDate, endDate });

      expect(mockPrisma.backupLog.findMany).toHaveBeenCalledWith({
        where: {
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should support pagination', async () => {
      mockPrisma.backupLog.findMany.mockResolvedValue([mockBackups[1]] as any);
      mockPrisma.backupLog.count.mockResolvedValue(2);

      const result = await service.getBackupHistory({ limit: 10, offset: 10 });

      expect(mockPrisma.backupLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { startedAt: 'desc' },
        take: 10,
        skip: 10,
      });
    });

    it('should combine multiple filters', async () => {
      const options = {
        type: 'full',
        status: 'success',
        startDate: new Date('2025-06-01'),
        limit: 20,
      };

      mockPrisma.backupLog.findMany.mockResolvedValue([mockBackupLog] as any);
      mockPrisma.backupLog.count.mockResolvedValue(1);

      await service.getBackupHistory(options);

      expect(mockPrisma.backupLog.findMany).toHaveBeenCalledWith({
        where: {
          type: 'full',
          status: 'success',
          startedAt: { gte: options.startDate },
        },
        orderBy: { startedAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });
  });

  describe('getLatestBackup', () => {
    it('should return latest backup', async () => {
      mockPrisma.backupLog.findFirst.mockResolvedValue(mockBackupLog as any);

      const result = await service.getLatestBackup();

      expect(result).toEqual(mockBackupLog);
      expect(mockPrisma.backupLog.findFirst).toHaveBeenCalledWith({
        where: {},
        orderBy: { startedAt: 'desc' },
      });
    });

    it('should return latest backup of specific type', async () => {
      mockPrisma.backupLog.findFirst.mockResolvedValue(mockBackupLog as any);

      const result = await service.getLatestBackup('full');

      expect(result).toEqual(mockBackupLog);
      expect(mockPrisma.backupLog.findFirst).toHaveBeenCalledWith({
        where: { type: 'full' },
        orderBy: { startedAt: 'desc' },
      });
    });

    it('should return null when no backups exist', async () => {
      mockPrisma.backupLog.findFirst.mockResolvedValue(null);

      const result = await service.getLatestBackup();

      expect(result).toBeNull();
    });
  });

  describe('getBackupStats', () => {
    const mockBackupsForStats = [
      { ...mockBackupLog, status: 'success', size: BigInt(1024 * 1024 * 1024), duration: 3600 },
      { ...mockBackupLog, id: 'backup-2', status: 'success', size: BigInt(2 * 1024 * 1024 * 1024), duration: 3800 },
      { ...mockBackupLog, id: 'backup-3', status: 'failed', size: null, duration: null },
    ];

    it('should calculate backup statistics', async () => {
      mockPrisma.backupLog.findMany.mockResolvedValue(mockBackupsForStats as any);
      mockPrisma.backupLog.findFirst.mockResolvedValue(mockBackupLog as any);

      const result = await service.getBackupStats(30);

      expect(result).toMatchObject({
        totalBackups: 3,
        successfulBackups: 2,
        failedBackups: 1,
        successRate: (2 / 3) * 100,
        lastBackupTime: mockBackupLog.startedAt,
        lastBackupStatus: mockBackupLog.status,
        averageDuration: (3600 + 3800) / 2,
      });
      expect(typeof result.totalSize).toBe('bigint');
    });

    it('should detect healthy backup status', async () => {
      const recentBackup = {
        ...mockBackupLog,
        startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        status: 'success',
      };

      mockPrisma.backupLog.findMany.mockResolvedValue([recentBackup] as any);
      mockPrisma.backupLog.findFirst.mockResolvedValue(recentBackup as any);

      const result = await service.getBackupStats();

      expect(result.backupHealth).toBe('healthy');
      expect(result.issues).toHaveLength(0);
    });

    it('should detect critical status when last backup is old', async () => {
      const oldBackup = {
        ...mockBackupLog,
        startedAt: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 hours ago
      };

      mockPrisma.backupLog.findMany.mockResolvedValue([oldBackup] as any);
      mockPrisma.backupLog.findFirst.mockResolvedValue(oldBackup as any);

      const result = await service.getBackupStats();

      expect(result.backupHealth).toBe('critical');
      expect(result.issues).toContain(expect.stringContaining('Last backup is 26'));
    });

    it('should detect warning status for low success rate', async () => {
      const mixedBackups = [
        { ...mockBackupLog, id: '1', status: 'success' },
        { ...mockBackupLog, id: '2', status: 'failed' },
        { ...mockBackupLog, id: '3', status: 'failed' },
        { ...mockBackupLog, id: '4', status: 'failed' },
      ];

      const recentBackup = {
        ...mockBackupLog,
        startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      };

      mockPrisma.backupLog.findMany.mockResolvedValue(mixedBackups as any);
      mockPrisma.backupLog.findFirst.mockResolvedValue(recentBackup as any);

      const result = await service.getBackupStats();

      expect(result.successRate).toBe(25);
      expect(result.backupHealth).toBe('warning');
      expect(result.issues).toContain(expect.stringContaining('Low success rate'));
    });

    it('should detect critical status when no backups exist', async () => {
      mockPrisma.backupLog.findMany.mockResolvedValue([]);
      mockPrisma.backupLog.findFirst.mockResolvedValue(null);

      const result = await service.getBackupStats();

      expect(result.backupHealth).toBe('critical');
      expect(result.issues).toContain('No backups found');
    });

    it('should handle custom retention period', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      mockPrisma.backupLog.findMany.mockResolvedValue([mockBackupLog] as any);
      mockPrisma.backupLog.findFirst.mockResolvedValue(mockBackupLog as any);

      await service.getBackupStats(7);

      expect(mockPrisma.backupLog.findMany).toHaveBeenCalledWith({
        where: {
          startedAt: {
            gte: expect.any(Date),
          },
        },
      });
    });
  });

  describe('checkBackupHealth', () => {
    it('should return healthy status for recent successful backup', async () => {
      const recentBackup = {
        ...mockBackupLog,
        startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        status: 'success',
      };

      mockPrisma.backupLog.findFirst.mockResolvedValue(recentBackup as any);
      mockPrisma.backupLog.findMany.mockResolvedValue([recentBackup] as any);

      const result = await service.checkBackupHealth();

      expect(result.isHealthy).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.lastBackup).toEqual({
        type: recentBackup.type,
        status: recentBackup.status,
        timestamp: recentBackup.startedAt,
        ageHours: expect.any(Number),
      });
    });

    it('should detect unhealthy status for old backup', async () => {
      const oldBackup = {
        ...mockBackupLog,
        startedAt: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 hours ago
        status: 'success',
      };

      mockPrisma.backupLog.findFirst.mockResolvedValue(oldBackup as any);
      mockPrisma.backupLog.findMany.mockResolvedValue([oldBackup] as any);

      const result = await service.checkBackupHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.issues).toContain(expect.stringContaining('Last backup is'));
    });

    it('should detect unhealthy status for failed last backup', async () => {
      const failedBackup = {
        ...mockBackupLog,
        status: 'failed',
        errorMessage: 'Connection timeout',
      };

      mockPrisma.backupLog.findFirst.mockResolvedValue(failedBackup as any);
      mockPrisma.backupLog.findMany.mockResolvedValue([failedBackup] as any);

      const result = await service.checkBackupHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.issues).toContain('Last backup failed');
    });

    it('should detect unhealthy status when no backups exist', async () => {
      mockPrisma.backupLog.findFirst.mockResolvedValue(null);
      mockPrisma.backupLog.findMany.mockResolvedValue([]);

      const result = await service.checkBackupHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.issues).toContain('No backups found');
      expect(result.lastBackup).toBeUndefined();
    });

    it('should detect multiple recent failures', async () => {
      const recentBackup = {
        ...mockBackupLog,
        startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: 'success',
      };

      const recentFailures = [
        { ...mockBackupLog, id: '1', status: 'failed' },
        { ...mockBackupLog, id: '2', status: 'failed' },
        { ...mockBackupLog, id: '3', status: 'failed' },
      ];

      mockPrisma.backupLog.findFirst.mockResolvedValue(recentBackup as any);
      mockPrisma.backupLog.findMany.mockResolvedValue(recentFailures as any);

      const result = await service.checkBackupHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.recentFailures).toBe(3);
      expect(result.issues).toContain('3 failures in last 10 backups');
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete logs older than retention period', async () => {
      mockPrisma.backupLog.deleteMany.mockResolvedValue({ count: 15 });

      const result = await service.cleanupOldLogs(90);

      expect(result).toBe(15);
      expect(mockPrisma.backupLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should use default retention period', async () => {
      mockPrisma.backupLog.deleteMany.mockResolvedValue({ count: 20 });

      const result = await service.cleanupOldLogs();

      expect(result).toBe(20);
    });

    it('should return 0 when no old logs exist', async () => {
      mockPrisma.backupLog.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.cleanupOldLogs(90);

      expect(result).toBe(0);
    });
  });

  describe('getBackupSizeTrend', () => {
    it('should return backup size trend data', async () => {
      const backups = [
        {
          startedAt: new Date('2025-06-01'),
          size: BigInt(1024 * 1024 * 1024), // 1GB
        },
        {
          startedAt: new Date('2025-06-02'),
          size: BigInt(2 * 1024 * 1024 * 1024), // 2GB
        },
      ];

      mockPrisma.backupLog.findMany.mockResolvedValue(backups as any);

      const result = await service.getBackupSizeTrend(30);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2025-06-01',
        size: 1, // 1GB
      });
      expect(result[1]).toEqual({
        date: '2025-06-02',
        size: 2, // 2GB
      });
    });

    it('should filter by success status and non-null size', async () => {
      mockPrisma.backupLog.findMany.mockResolvedValue([]);

      await service.getBackupSizeTrend(30);

      expect(mockPrisma.backupLog.findMany).toHaveBeenCalledWith({
        where: {
          startedAt: { gte: expect.any(Date) },
          status: 'success',
          size: { not: null },
        },
        orderBy: { startedAt: 'asc' },
        select: {
          startedAt: true,
          size: true,
        },
      });
    });

    it('should return empty array when no backups exist', async () => {
      mockPrisma.backupLog.findMany.mockResolvedValue([]);

      const result = await service.getBackupSizeTrend(30);

      expect(result).toEqual([]);
    });
  });

  describe('detectSizeAnomalies', () => {
    it('should detect no anomaly for consistent sizes', async () => {
      const backups = Array.from({ length: 10 }, (_, i) => ({
        ...mockBackupLog,
        id: `backup-${i}`,
        size: BigInt(1024 * 1024 * 1024), // 1GB consistently
      }));

      mockPrisma.backupLog.findMany.mockResolvedValue(backups as any);

      const result = await service.detectSizeAnomalies();

      expect(result.hasAnomaly).toBe(false);
      expect(result.details).toBeDefined();
    });

    it('should detect anomaly when size doubles', async () => {
      const backups = [
        { ...mockBackupLog, id: '1', size: BigInt(2 * 1024 * 1024 * 1024) }, // 2GB - latest
        { ...mockBackupLog, id: '2', size: BigInt(1 * 1024 * 1024 * 1024) }, // 1GB
        { ...mockBackupLog, id: '3', size: BigInt(1 * 1024 * 1024 * 1024) },
        { ...mockBackupLog, id: '4', size: BigInt(1 * 1024 * 1024 * 1024) },
        { ...mockBackupLog, id: '5', size: BigInt(1 * 1024 * 1024 * 1024) },
      ];

      mockPrisma.backupLog.findMany.mockResolvedValue(backups as any);

      const result = await service.detectSizeAnomalies();

      expect(result.hasAnomaly).toBe(true);
      expect(result.details).toBeDefined();
      expect(result.details!.deviation).toBeGreaterThan(100);
    });

    it('should detect anomaly when size halves', async () => {
      const backups = [
        { ...mockBackupLog, id: '1', size: BigInt(500 * 1024 * 1024) }, // 500MB - latest
        { ...mockBackupLog, id: '2', size: BigInt(1 * 1024 * 1024 * 1024) }, // 1GB
        { ...mockBackupLog, id: '3', size: BigInt(1 * 1024 * 1024 * 1024) },
        { ...mockBackupLog, id: '4', size: BigInt(1 * 1024 * 1024 * 1024) },
        { ...mockBackupLog, id: '5', size: BigInt(1 * 1024 * 1024 * 1024) },
      ];

      mockPrisma.backupLog.findMany.mockResolvedValue(backups as any);

      const result = await service.detectSizeAnomalies();

      expect(result.hasAnomaly).toBe(true);
      expect(result.details!.deviation).toBeLessThan(-50);
    });

    it('should return no anomaly when insufficient data', async () => {
      const backups = [
        { ...mockBackupLog, id: '1', size: BigInt(1024 * 1024 * 1024) },
        { ...mockBackupLog, id: '2', size: BigInt(1024 * 1024 * 1024) },
      ];

      mockPrisma.backupLog.findMany.mockResolvedValue(backups as any);

      const result = await service.detectSizeAnomalies();

      expect(result.hasAnomaly).toBe(false);
      expect(result.details).toBeUndefined();
    });
  });

  describe('Event Emission', () => {
    it('should be an EventEmitter', () => {
      expect(service.on).toBeDefined();
      expect(service.emit).toBeDefined();
      expect(service.removeAllListeners).toBeDefined();
    });

    it('should support multiple event listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      service.on('backup:success', listener1);
      service.on('backup:success', listener2);

      mockPrisma.backupLog.create.mockResolvedValue(mockBackupLog as any);

      await service.logBackup({
        type: 'full',
        status: 'success',
        startedAt: new Date(),
        location: '/backup',
      });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should remove event listeners', async () => {
      const listener = jest.fn();

      service.on('backup:success', listener);
      service.removeAllListeners('backup:success');

      mockPrisma.backupLog.create.mockResolvedValue(mockBackupLog as any);

      await service.logBackup({
        type: 'full',
        status: 'success',
        startedAt: new Date(),
        location: '/backup',
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
