/**
 * ExportService Unit Tests
 * Comprehensive test coverage for export functionality
 */

import 'reflect-metadata';
import { ExportService } from '../../../src/services/ExportService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError } from '../../../src/services/BaseService';
import { promises as fs } from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ExportService', () => {
  let service: ExportService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ExportService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ExportService);
    });
  });

  describe('exportEventToExcel', () => {
    const mockEvent = {
      id: 'event-1',
      name: 'Annual Competition',
      date: new Date('2025-06-15'),
      location: 'Convention Center',
      contests: [
        {
          id: 'contest-1',
          name: 'Junior Division',
          categories: [
            { id: 'cat-1', name: 'Dance', ageGroup: 'JUNIOR' },
            { id: 'cat-2', name: 'Vocal', ageGroup: 'JUNIOR' },
          ],
        },
      ],
    };

    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should export event to Excel successfully', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);

      const result = await service.exportEventToExcel('event-1');

      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        include: {
          contests: {
            include: {
              categories: true,
            },
          },
        },
      });
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(result).toContain('event_event-1_');
      expect(result).toContain('.xlsx');
    });

    it('should export event with details when includeDetails is true', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);

      const result = await service.exportEventToExcel('event-1', true);

      expect(result).toContain('detailed');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should export event without details when includeDetails is false', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);

      const result = await service.exportEventToExcel('event-1', false);

      expect(result).toContain('summary');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should throw NotFoundError when event does not exist', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(service.exportEventToExcel('nonexistent'))
        .rejects.toThrow(NotFoundError);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should create export directory if it does not exist', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);

      await service.exportEventToExcel('event-1');

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('exports'),
        { recursive: true }
      );
    });

    it('should handle export directory creation errors gracefully', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      // Should not throw - error is logged but continues
      const result = await service.exportEventToExcel('event-1');
      expect(result).toBeDefined();
    });

    it('should generate unique filenames for concurrent exports', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);

      const result1 = await service.exportEventToExcel('event-1');
      const result2 = await service.exportEventToExcel('event-1');

      expect(result1).not.toBe(result2);
    });

    it('should include event data in export', async () => {
      const eventWithMultipleContests = {
        ...mockEvent,
        contests: [
          mockEvent.contests[0],
          {
            id: 'contest-2',
            name: 'Senior Division',
            categories: [
              { id: 'cat-3', name: 'Dance', ageGroup: 'SENIOR' },
            ],
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithMultipleContests as any);

      const result = await service.exportEventToExcel('event-1', true);

      expect(mockPrisma.event.findUnique).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('exportContestResultsToCSV', () => {
    const mockContest = {
      id: 'contest-1',
      name: 'Junior Division',
      eventId: 'event-1',
      categories: [
        { id: 'cat-1', name: 'Dance', ageGroup: 'JUNIOR' },
        { id: 'cat-2', name: 'Vocal', ageGroup: 'JUNIOR' },
      ],
    };

    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should export contest results to CSV successfully', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

      const result = await service.exportContestResultsToCSV('contest-1');

      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockPrisma.contest.findUnique).toHaveBeenCalledWith({
        where: { id: 'contest-1' },
        include: {
          categories: true,
        },
      });
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(result).toContain('contest_contest-1_');
      expect(result).toContain('.csv');
    });

    it('should throw NotFoundError when contest does not exist', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(null);

      await expect(service.exportContestResultsToCSV('nonexistent'))
        .rejects.toThrow(NotFoundError);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should create export directory for CSV exports', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

      await service.exportContestResultsToCSV('contest-1');

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('exports'),
        { recursive: true }
      );
    });

    it('should generate unique CSV filenames', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

      const result1 = await service.exportContestResultsToCSV('contest-1');
      const result2 = await service.exportContestResultsToCSV('contest-1');

      expect(result1).not.toBe(result2);
    });

    it('should handle contest with no categories', async () => {
      const contestWithNoCategories = {
        ...mockContest,
        categories: [],
      };

      mockPrisma.contest.findUnique.mockResolvedValue(contestWithNoCategories as any);

      const result = await service.exportContestResultsToCSV('contest-1');

      expect(result).toBeDefined();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle contest with many categories', async () => {
      const contestWithManyCategories = {
        ...mockContest,
        categories: Array.from({ length: 50 }, (_, i) => ({
          id: `cat-${i}`,
          name: `Category ${i}`,
          ageGroup: 'JUNIOR',
        })),
      };

      mockPrisma.contest.findUnique.mockResolvedValue(contestWithManyCategories as any);

      const result = await service.exportContestResultsToCSV('contest-1');

      expect(result).toBeDefined();
    });
  });

  describe('exportJudgePerformanceToXML', () => {
    const mockJudge = {
      id: 'judge-1',
      userId: 'user-1',
      name: 'John Smith',
      email: 'judge@example.com',
      certificationLevel: 'SENIOR',
    };

    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should export judge performance to XML successfully', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue(mockJudge as any);

      const result = await service.exportJudgePerformanceToXML('judge-1');

      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockPrisma.judge.findUnique).toHaveBeenCalledWith({
        where: { id: 'judge-1' },
      });
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(result).toContain('judge_judge-1_');
      expect(result).toContain('.xml');
    });

    it('should throw NotFoundError when judge does not exist', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue(null);

      await expect(service.exportJudgePerformanceToXML('nonexistent'))
        .rejects.toThrow(NotFoundError);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should create export directory for XML exports', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue(mockJudge as any);

      await service.exportJudgePerformanceToXML('judge-1');

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('exports'),
        { recursive: true }
      );
    });

    it('should generate unique XML filenames', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue(mockJudge as any);

      const result1 = await service.exportJudgePerformanceToXML('judge-1');
      const result2 = await service.exportJudgePerformanceToXML('judge-1');

      expect(result1).not.toBe(result2);
    });

    it('should write XML format to file', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue(mockJudge as any);

      await service.exportJudgePerformanceToXML('judge-1');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('XML export placeholder')
      );
    });
  });

  describe('exportSystemAnalyticsToPDF', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should export system analytics to PDF successfully', async () => {
      const result = await service.exportSystemAnalyticsToPDF();

      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(result).toContain('analytics_');
      expect(result).toContain('.pdf');
    });

    it('should export analytics for all time when no dates provided', async () => {
      const result = await service.exportSystemAnalyticsToPDF();

      expect(result).toContain('all_time');
    });

    it('should export analytics for specific date range', async () => {
      const result = await service.exportSystemAnalyticsToPDF('2025-01-01', '2025-12-31');

      expect(result).toContain('2025-01-01_to_2025-12-31');
    });

    it('should handle only startDate provided', async () => {
      const result = await service.exportSystemAnalyticsToPDF('2025-01-01');

      expect(result).toBeDefined();
    });

    it('should handle only endDate provided', async () => {
      const result = await service.exportSystemAnalyticsToPDF(undefined, '2025-12-31');

      expect(result).toBeDefined();
    });

    it('should create export directory for PDF exports', async () => {
      await service.exportSystemAnalyticsToPDF();

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('exports'),
        { recursive: true }
      );
    });

    it('should generate unique PDF filenames', async () => {
      const result1 = await service.exportSystemAnalyticsToPDF();
      const result2 = await service.exportSystemAnalyticsToPDF();

      expect(result1).not.toBe(result2);
    });

    it('should generate unique filenames for same date range', async () => {
      const result1 = await service.exportSystemAnalyticsToPDF('2025-01-01', '2025-12-31');
      const result2 = await service.exportSystemAnalyticsToPDF('2025-01-01', '2025-12-31');

      expect(result1).not.toBe(result2);
    });
  });

  describe('getExportHistory', () => {
    const mockExports = [
      {
        id: 'export-1',
        type: 'EXCEL_EXPORT',
        generatedBy: 'user-1',
        createdAt: new Date('2025-11-13'),
      },
      {
        id: 'export-2',
        type: 'CSV_EXPORT',
        generatedBy: 'user-1',
        createdAt: new Date('2025-11-12'),
      },
      {
        id: 'export-3',
        type: 'PDF_EXPORT',
        generatedBy: 'user-1',
        createdAt: new Date('2025-11-11'),
      },
    ];

    it('should retrieve export history successfully', async () => {
      (mockPrisma as any).report = {
        findMany: jest.fn().mockResolvedValue(mockExports),
      };

      const result = await service.getExportHistory('user-1');

      expect(result.exports).toHaveLength(3);
      expect(result.message).toBe('Export history retrieved successfully');
    });

    it('should query with correct parameters', async () => {
      const findMany = jest.fn().mockResolvedValue(mockExports);
      (mockPrisma as any).report = { findMany };

      await service.getExportHistory('user-1', 25);

      expect(findMany).toHaveBeenCalledWith({
        where: {
          generatedBy: 'user-1',
          type: {
            in: ['EXCEL_EXPORT', 'CSV_EXPORT', 'XML_EXPORT', 'PDF_EXPORT'],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      });
    });

    it('should use default limit of 50 when not provided', async () => {
      const findMany = jest.fn().mockResolvedValue(mockExports);
      (mockPrisma as any).report = { findMany };

      await service.getExportHistory('user-1');

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
    });

    it('should handle custom limit', async () => {
      const findMany = jest.fn().mockResolvedValue(mockExports);
      (mockPrisma as any).report = { findMany };

      await service.getExportHistory('user-1', 100);

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it('should return empty array when no exports found', async () => {
      (mockPrisma as any).report = {
        findMany: jest.fn().mockResolvedValue([]),
      };

      const result = await service.getExportHistory('user-1');

      expect(result.exports).toHaveLength(0);
      expect(result.message).toBe('Export history retrieved successfully');
    });

    it('should handle when report model does not exist', async () => {
      (mockPrisma as any).report = undefined;

      const result = await service.getExportHistory('user-1');

      expect(result.exports).toHaveLength(0);
    });

    it('should order exports by createdAt descending', async () => {
      const findMany = jest.fn().mockResolvedValue(mockExports);
      (mockPrisma as any).report = { findMany };

      await service.getExportHistory('user-1');

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should filter by export types only', async () => {
      const findMany = jest.fn().mockResolvedValue(mockExports);
      (mockPrisma as any).report = { findMany };

      await service.getExportHistory('user-1');

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: {
              in: ['EXCEL_EXPORT', 'CSV_EXPORT', 'XML_EXPORT', 'PDF_EXPORT'],
            },
          }),
        })
      );
    });

    it('should filter by user ID', async () => {
      const findMany = jest.fn().mockResolvedValue(mockExports);
      (mockPrisma as any).report = { findMany };

      await service.getExportHistory('specific-user-123');

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            generatedBy: 'specific-user-123',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle file write errors for Excel export', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        contests: [],
      };

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(service.exportEventToExcel('event-1'))
        .rejects.toThrow('Disk full');
    });

    it('should handle file write errors for CSV export', async () => {
      const mockContest = {
        id: 'contest-1',
        name: 'Test Contest',
        categories: [],
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      await expect(service.exportContestResultsToCSV('contest-1'))
        .rejects.toThrow('Permission denied');
    });

    it('should handle database errors for event export', async () => {
      mockPrisma.event.findUnique.mockRejectedValue(new Error('Database connection lost'));

      await expect(service.exportEventToExcel('event-1'))
        .rejects.toThrow('Database connection lost');
    });

    it('should handle database errors for contest export', async () => {
      mockPrisma.contest.findUnique.mockRejectedValue(new Error('Query timeout'));

      await expect(service.exportContestResultsToCSV('contest-1'))
        .rejects.toThrow('Query timeout');
    });

    it('should handle database errors for judge export', async () => {
      mockPrisma.judge.findUnique.mockRejectedValue(new Error('Connection refused'));

      await expect(service.exportJudgePerformanceToXML('judge-1'))
        .rejects.toThrow('Connection refused');
    });
  });
});
