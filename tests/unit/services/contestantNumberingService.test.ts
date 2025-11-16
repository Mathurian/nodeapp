/**
 * ContestantNumberingService Unit Tests
 * Comprehensive test coverage for contestant numbering functionality
 */

import 'reflect-metadata';
import ContestantNumberingService from '../../../src/services/contestantNumberingService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('ContestantNumberingService', () => {
  let service: typeof ContestantNumberingService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    // Mock the prisma instance
    (ContestantNumberingService as any).prisma = mockPrisma;
    service = ContestantNumberingService;
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getNextContestantNumber', () => {
    it('should return next contestant number in AUTO_INDEXED mode', async () => {
      const mockContest = {
        id: 'contest-1',
        nextContestantNumber: 5,
        contestantNumberingMode: 'AUTO_INDEXED',
        event: {
          contestantNumberingMode: 'MANUAL',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
      mockPrisma.contest.update.mockResolvedValue({ ...mockContest, nextContestantNumber: 6 } as any);

      const result = await service.getNextContestantNumber('contest-1');

      expect(result).toBe(5);
      expect(mockPrisma.contest.update).toHaveBeenCalledWith({
        where: { id: 'contest-1' },
        data: { nextContestantNumber: 6 },
      });
    });

    it('should use event-level numbering mode if contest mode not set', async () => {
      const mockContest = {
        id: 'contest-1',
        nextContestantNumber: 10,
        contestantNumberingMode: null,
        event: {
          contestantNumberingMode: 'AUTO_INDEXED',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
      mockPrisma.contest.update.mockResolvedValue({ ...mockContest, nextContestantNumber: 11 } as any);

      const result = await service.getNextContestantNumber('contest-1');

      expect(result).toBe(10);
      expect(mockPrisma.contest.update).toHaveBeenCalledWith({
        where: { id: 'contest-1' },
        data: { nextContestantNumber: 11 },
      });
    });

    it('should return null for MANUAL numbering mode', async () => {
      const mockContest = {
        id: 'contest-1',
        nextContestantNumber: 5,
        contestantNumberingMode: 'MANUAL',
        event: {
          contestantNumberingMode: 'AUTO_INDEXED',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

      const result = await service.getNextContestantNumber('contest-1');

      expect(result).toBeNull();
      expect(mockPrisma.contest.update).not.toHaveBeenCalled();
    });

    it('should return null for OPTIONAL numbering mode', async () => {
      const mockContest = {
        id: 'contest-1',
        nextContestantNumber: 5,
        contestantNumberingMode: 'OPTIONAL',
        event: {
          contestantNumberingMode: 'AUTO_INDEXED',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

      const result = await service.getNextContestantNumber('contest-1');

      expect(result).toBeNull();
      expect(mockPrisma.contest.update).not.toHaveBeenCalled();
    });

    it('should start from 1 if nextContestantNumber is null', async () => {
      const mockContest = {
        id: 'contest-1',
        nextContestantNumber: null,
        contestantNumberingMode: 'AUTO_INDEXED',
        event: {
          contestantNumberingMode: 'MANUAL',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
      mockPrisma.contest.update.mockResolvedValue({ ...mockContest, nextContestantNumber: 2 } as any);

      const result = await service.getNextContestantNumber('contest-1');

      expect(result).toBe(1);
      expect(mockPrisma.contest.update).toHaveBeenCalledWith({
        where: { id: 'contest-1' },
        data: { nextContestantNumber: 2 },
      });
    });

    it('should throw error if contest not found', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(null);

      await expect(service.getNextContestantNumber('nonexistent')).rejects.toThrow('Contest not found');
    });

    it('should handle database errors', async () => {
      mockPrisma.contest.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getNextContestantNumber('contest-1')).rejects.toThrow('Database connection failed');
    });

    it('should increment number correctly for multiple calls', async () => {
      const mockContest = {
        id: 'contest-1',
        nextContestantNumber: 100,
        contestantNumberingMode: 'AUTO_INDEXED',
        event: {
          contestantNumberingMode: 'MANUAL',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
      mockPrisma.contest.update.mockResolvedValue({ ...mockContest, nextContestantNumber: 101 } as any);

      const result = await service.getNextContestantNumber('contest-1');

      expect(result).toBe(100);
      expect(mockPrisma.contest.update).toHaveBeenCalledWith({
        where: { id: 'contest-1' },
        data: { nextContestantNumber: 101 },
      });
    });
  });

  describe('getNumberingMode', () => {
    it('should return contest-level numbering mode', async () => {
      const mockContest = {
        id: 'contest-1',
        contestantNumberingMode: 'AUTO_INDEXED',
        event: {
          contestantNumberingMode: 'MANUAL',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

      const result = await service.getNumberingMode('contest-1');

      expect(result).toBe('AUTO_INDEXED');
    });

    it('should return event-level mode if contest mode is null', async () => {
      const mockContest = {
        id: 'contest-1',
        contestantNumberingMode: null,
        event: {
          contestantNumberingMode: 'OPTIONAL',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

      const result = await service.getNumberingMode('contest-1');

      expect(result).toBe('OPTIONAL');
    });

    it('should prioritize contest mode over event mode', async () => {
      const mockContest = {
        id: 'contest-1',
        contestantNumberingMode: 'MANUAL',
        event: {
          contestantNumberingMode: 'AUTO_INDEXED',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

      const result = await service.getNumberingMode('contest-1');

      expect(result).toBe('MANUAL');
    });

    it('should throw error if contest not found', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(null);

      await expect(service.getNumberingMode('nonexistent')).rejects.toThrow('Contest not found');
    });

    it('should handle database errors', async () => {
      mockPrisma.contest.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getNumberingMode('contest-1')).rejects.toThrow('Database error');
    });
  });

  describe('validateContestantNumber', () => {
    it('should reject number in AUTO_INDEXED mode', async () => {
      const mockContest = {
        id: 'contest-1',
        contestantNumberingMode: 'AUTO_INDEXED',
        event: {
          contestantNumberingMode: 'MANUAL',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

      const result = await service.validateContestantNumber('contest-1', 123);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('auto-assigned');
    });

    it('should require number in MANUAL mode', async () => {
      const mockContest = {
        id: 'contest-1',
        contestantNumberingMode: 'MANUAL',
        event: {
          contestantNumberingMode: 'AUTO_INDEXED',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

      const result = await service.validateContestantNumber('contest-1', null);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should accept both number and null in OPTIONAL mode', async () => {
      const mockContest = {
        id: 'contest-1',
        contestantNumberingMode: 'OPTIONAL',
        event: {
          contestantNumberingMode: 'MANUAL',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

      const resultWithNumber = await service.validateContestantNumber('contest-1', 123);
      expect(resultWithNumber.valid).toBe(true);

      const resultWithNull = await service.validateContestantNumber('contest-1', null);
      expect(resultWithNull.valid).toBe(true);
    });

    it('should detect duplicate contestant numbers', async () => {
      const mockContest = {
        id: 'contest-1',
        contestantNumberingMode: 'MANUAL',
        event: {
          contestantNumberingMode: 'MANUAL',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
      mockPrisma.contestant.findFirst.mockResolvedValue({ id: 'existing-contestant', contestantNumber: 123 } as any);

      const result = await service.validateContestantNumber('contest-1', 123);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('already assigned');
    });

    it('should allow number if not duplicate in MANUAL mode', async () => {
      const mockContest = {
        id: 'contest-1',
        contestantNumberingMode: 'MANUAL',
        event: {
          contestantNumberingMode: 'MANUAL',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
      mockPrisma.contestant.findFirst.mockResolvedValue(null);

      const result = await service.validateContestantNumber('contest-1', 456);

      expect(result.valid).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      mockPrisma.contest.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await service.validateContestantNumber('contest-1', 123);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate unique numbers across same contest only', async () => {
      const mockContest = {
        id: 'contest-1',
        contestantNumberingMode: 'MANUAL',
        event: {
          contestantNumberingMode: 'MANUAL',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
      mockPrisma.contestant.findFirst.mockResolvedValue(null);

      const result = await service.validateContestantNumber('contest-1', 999);

      expect(result.valid).toBe(true);
      expect(mockPrisma.contestant.findFirst).toHaveBeenCalledWith({
        where: {
          contestantNumber: 999,
          contestContestants: {
            some: {
              contest: {
                id: 'contest-1',
              },
            },
          },
        },
      });
    });
  });

  describe('resetContestantNumbering', () => {
    it('should reset to default start number (1)', async () => {
      mockPrisma.contest.update.mockResolvedValue({ id: 'contest-1', nextContestantNumber: 1 } as any);

      const result = await service.resetContestantNumbering('contest-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.contest.update).toHaveBeenCalledWith({
        where: { id: 'contest-1' },
        data: { nextContestantNumber: 1 },
      });
    });

    it('should reset to custom start number', async () => {
      mockPrisma.contest.update.mockResolvedValue({ id: 'contest-1', nextContestantNumber: 100 } as any);

      const result = await service.resetContestantNumbering('contest-1', 100);

      expect(result.success).toBe(true);
      expect(mockPrisma.contest.update).toHaveBeenCalledWith({
        where: { id: 'contest-1' },
        data: { nextContestantNumber: 100 },
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.contest.update.mockRejectedValue(new Error('Database error'));

      await expect(service.resetContestantNumbering('contest-1')).rejects.toThrow('Database error');
    });

    it('should accept zero as start number', async () => {
      mockPrisma.contest.update.mockResolvedValue({ id: 'contest-1', nextContestantNumber: 0 } as any);

      const result = await service.resetContestantNumbering('contest-1', 0);

      expect(result.success).toBe(true);
      expect(mockPrisma.contest.update).toHaveBeenCalledWith({
        where: { id: 'contest-1' },
        data: { nextContestantNumber: 0 },
      });
    });

    it('should accept large start numbers', async () => {
      mockPrisma.contest.update.mockResolvedValue({ id: 'contest-1', nextContestantNumber: 9999 } as any);

      const result = await service.resetContestantNumbering('contest-1', 9999);

      expect(result.success).toBe(true);
      expect(mockPrisma.contest.update).toHaveBeenCalledWith({
        where: { id: 'contest-1' },
        data: { nextContestantNumber: 9999 },
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty contest ID', async () => {
      await expect(service.getNextContestantNumber('')).rejects.toThrow();
    });

    it('should handle null contest ID', async () => {
      await expect(service.getNextContestantNumber(null as any)).rejects.toThrow();
    });

    it('should handle undefined contest ID', async () => {
      await expect(service.getNextContestantNumber(undefined as any)).rejects.toThrow();
    });

    it('should handle very large contestant numbers', async () => {
      const mockContest = {
        id: 'contest-1',
        nextContestantNumber: 999999,
        contestantNumberingMode: 'AUTO_INDEXED',
        event: {
          contestantNumberingMode: 'MANUAL',
        },
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
      mockPrisma.contest.update.mockResolvedValue({ ...mockContest, nextContestantNumber: 1000000 } as any);

      const result = await service.getNextContestantNumber('contest-1');

      expect(result).toBe(999999);
    });

    it('should handle negative start numbers in reset', async () => {
      mockPrisma.contest.update.mockResolvedValue({ id: 'contest-1', nextContestantNumber: -10 } as any);

      const result = await service.resetContestantNumbering('contest-1', -10);

      expect(result.success).toBe(true);
    });
  });
});
