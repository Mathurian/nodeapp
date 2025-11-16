/**
 * ContestService Unit Tests
 * Tests all public methods with mocked dependencies
 */

import { ContestService } from '../../../src/services/ContestService';
import { ContestRepository } from '../../../src/repositories/ContestRepository';
import { CacheService } from '../../../src/services/CacheService';
import { NotFoundError, ValidationError } from '../../../src/services/BaseService';

describe('ContestService', () => {
  let contestService: ContestService;
  let mockContestRepo: jest.Mocked<ContestRepository>;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    mockContestRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByEventId: jest.fn(),
      findActiveByEventId: jest.fn(),
      findContestWithDetails: jest.fn(),
      getContestStats: jest.fn(),
      searchContests: jest.fn(),
      getNextContestantNumber: jest.fn(),
      incrementContestantNumber: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      archiveContest: jest.fn(),
      unarchiveContest: jest.fn(),
    } as any;

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      invalidatePattern: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      flushAll: jest.fn(),
      getStats: jest.fn(),
      disconnect: jest.fn(),
      enabled: true,
    } as any;

    contestService = new ContestService(mockContestRepo, mockCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createContest', () => {
    it('should create contest with valid data', async () => {
      const contestData = {
        name: 'Talent Contest',
        eventId: 'event-1',
        description: 'Test Contest',
      };
      const createdContest = { id: '1', ...contestData };
      mockContestRepo.create.mockResolvedValue(createdContest as any);

      const result = await contestService.createContest(contestData);

      expect(result).toEqual(createdContest);
      expect(mockContestRepo.create).toHaveBeenCalledWith(contestData);
      expect(mockCacheService.del).toHaveBeenCalledWith('contests:event:event-1');
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('contests:*');
    });

    it('should throw error if eventId is missing', async () => {
      const invalidData = { name: 'Contest' } as any;

      await expect(contestService.createContest(invalidData)).rejects.toThrow();
    });

    it('should throw error if name is missing', async () => {
      const invalidData = { eventId: 'event-1' } as any;

      await expect(contestService.createContest(invalidData)).rejects.toThrow();
    });
  });

  describe('getContestById', () => {
    it('should return cached contest if available', async () => {
      const cachedContest = {
        id: '1',
        name: 'Cached Contest',
        eventId: 'event-1',
      };
      mockCacheService.get.mockResolvedValue(cachedContest);

      const result = await contestService.getContestById('1');

      expect(result).toEqual(cachedContest);
      expect(mockCacheService.get).toHaveBeenCalledWith('contest:1');
      expect(mockContestRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not cached', async () => {
      const dbContest = {
        id: '1',
        name: 'DB Contest',
        eventId: 'event-1',
      };
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findById.mockResolvedValue(dbContest as any);

      const result = await contestService.getContestById('1');

      expect(result).toEqual(dbContest);
      expect(mockContestRepo.findById).toHaveBeenCalledWith('1');
      expect(mockCacheService.set).toHaveBeenCalledWith('contest:1', dbContest, 1800);
    });

    it('should throw NotFoundError if contest not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findById.mockResolvedValue(null);

      await expect(contestService.getContestById('invalid')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getContestWithDetails', () => {
    it('should return cached detailed contest if available', async () => {
      const cachedContest = {
        id: '1',
        name: 'Contest',
        categories: [],
        contestants: [],
      };
      mockCacheService.get.mockResolvedValue(cachedContest);

      const result = await contestService.getContestWithDetails('1');

      expect(result).toEqual(cachedContest);
      expect(mockCacheService.get).toHaveBeenCalledWith('contest:details:1');
    });

    it('should fetch from database and cache if not cached', async () => {
      const dbContest = {
        id: '1',
        name: 'Contest',
        categories: [],
        contestants: [],
      };
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findContestWithDetails.mockResolvedValue(dbContest as any);

      const result = await contestService.getContestWithDetails('1');

      expect(result).toEqual(dbContest);
      expect(mockCacheService.set).toHaveBeenCalledWith('contest:details:1', dbContest, 900);
    });

    it('should throw NotFoundError if not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findContestWithDetails.mockResolvedValue(null);

      await expect(contestService.getContestWithDetails('invalid')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getContestsByEventId', () => {
    it('should return contests for event (excluding archived)', async () => {
      const contests = [
        { id: '1', name: 'Contest 1', eventId: 'event-1' },
        { id: '2', name: 'Contest 2', eventId: 'event-1' },
      ];
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findActiveByEventId.mockResolvedValue(contests as any);

      const result = await contestService.getContestsByEventId('event-1', false);

      expect(result).toEqual(contests);
      expect(mockContestRepo.findActiveByEventId).toHaveBeenCalledWith('event-1');
      expect(mockCacheService.set).toHaveBeenCalledWith('contests:event:event-1:false', contests, 600);
    });

    it('should return all contests for event (including archived)', async () => {
      const contests = [
        { id: '1', name: 'Contest 1', eventId: 'event-1' },
        { id: '2', name: 'Contest 2', eventId: 'event-1', archived: true },
      ];
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findByEventId.mockResolvedValue(contests as any);

      const result = await contestService.getContestsByEventId('event-1', true);

      expect(result).toEqual(contests);
      expect(mockContestRepo.findByEventId).toHaveBeenCalledWith('event-1');
    });

    it('should return cached contests if available', async () => {
      const contests = [{ id: '1', name: 'Cached Contest' }];
      mockCacheService.get.mockResolvedValue(contests);

      const result = await contestService.getContestsByEventId('event-1');

      expect(result).toEqual(contests);
      expect(mockContestRepo.findByEventId).not.toHaveBeenCalled();
      expect(mockContestRepo.findActiveByEventId).not.toHaveBeenCalled();
    });
  });

  describe('updateContest', () => {
    it('should update contest and invalidate cache', async () => {
      const existingContest = {
        id: '1',
        name: 'Old Name',
        eventId: 'event-1',
      };
      const updateData = { name: 'New Name' };
      const updatedContest = { ...existingContest, ...updateData };

      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findById.mockResolvedValue(existingContest as any);
      mockContestRepo.update.mockResolvedValue(updatedContest as any);

      const result = await contestService.updateContest('1', updateData);

      expect(result).toEqual(updatedContest);
      expect(mockCacheService.del).toHaveBeenCalledWith('contest:1');
      expect(mockCacheService.del).toHaveBeenCalledWith('contest:details:1');
      expect(mockCacheService.del).toHaveBeenCalledWith('contests:event:event-1');
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('contests:*');
    });

    it('should throw error if contest not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findById.mockResolvedValue(null);

      await expect(contestService.updateContest('invalid', { name: 'New Name' })).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('archiveContest', () => {
    it('should archive contest and invalidate cache', async () => {
      const existingContest = { id: '1', name: 'Contest', eventId: 'event-1' };
      const archivedContest = { ...existingContest, archived: true };

      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findById.mockResolvedValue(existingContest as any);
      mockContestRepo.archiveContest.mockResolvedValue(archivedContest as any);

      const result = await contestService.archiveContest('1');

      expect(result).toEqual(archivedContest);
      expect(mockContestRepo.archiveContest).toHaveBeenCalledWith('1');
      expect(mockCacheService.del).toHaveBeenCalledWith('contest:1');
    });
  });

  describe('unarchiveContest', () => {
    it('should unarchive contest and invalidate cache', async () => {
      const existingContest = { id: '1', name: 'Contest', eventId: 'event-1', archived: true };
      const unarchivedContest = { ...existingContest, archived: false };

      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findById.mockResolvedValue(existingContest as any);
      mockContestRepo.unarchiveContest.mockResolvedValue(unarchivedContest as any);

      const result = await contestService.unarchiveContest('1');

      expect(result).toEqual(unarchivedContest);
      expect(mockContestRepo.unarchiveContest).toHaveBeenCalledWith('1');
    });
  });

  describe('deleteContest', () => {
    it('should delete contest and invalidate cache', async () => {
      const existingContest = { id: '1', name: 'Contest', eventId: 'event-1' };
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findById.mockResolvedValue(existingContest as any);
      mockContestRepo.delete.mockResolvedValue(undefined);

      await contestService.deleteContest('1');

      expect(mockContestRepo.delete).toHaveBeenCalledWith('1');
      expect(mockCacheService.del).toHaveBeenCalledWith('contest:1');
      expect(mockCacheService.del).toHaveBeenCalledWith('contests:event:event-1');
    });

    it('should throw error if contest not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findById.mockResolvedValue(null);

      await expect(contestService.deleteContest('invalid')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getContestStats', () => {
    it('should return contest statistics', async () => {
      const stats = {
        totalCategories: 5,
        totalContestants: 50,
        totalJudges: 10,
        totalScores: 200,
      };
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.getContestStats.mockResolvedValue(stats);

      const result = await contestService.getContestStats('1');

      expect(result).toEqual(stats);
      expect(mockCacheService.set).toHaveBeenCalledWith('contest:stats:1', stats, 300);
    });

    it('should return cached stats', async () => {
      const stats = { totalCategories: 5 };
      mockCacheService.get.mockResolvedValue(stats);

      const result = await contestService.getContestStats('1');

      expect(result).toEqual(stats);
      expect(mockContestRepo.getContestStats).not.toHaveBeenCalled();
    });
  });

  describe('searchContests', () => {
    it('should search contests by query', async () => {
      const contests = [{ id: '1', name: 'Found Contest' }];
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.searchContests.mockResolvedValue(contests as any);

      const result = await contestService.searchContests('test query');

      expect(result).toEqual(contests);
      expect(mockContestRepo.searchContests).toHaveBeenCalledWith('test query');
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return cached search results', async () => {
      const contests = [{ id: '1', name: 'Cached Result' }];
      mockCacheService.get.mockResolvedValue(contests);

      const result = await contestService.searchContests('test query');

      expect(result).toEqual(contests);
      expect(mockContestRepo.searchContests).not.toHaveBeenCalled();
    });
  });

  describe('getNextContestantNumber', () => {
    it('should return next contestant number', async () => {
      mockContestRepo.getNextContestantNumber.mockResolvedValue(42);

      const result = await contestService.getNextContestantNumber('contest-1');

      expect(result).toBe(42);
      expect(mockContestRepo.getNextContestantNumber).toHaveBeenCalledWith('contest-1');
    });
  });

  describe('assignContestantNumber', () => {
    it('should assign contestant number in AUTO_INDEXED mode', async () => {
      const contest = {
        id: 'contest-1',
        name: 'Contest',
        eventId: 'event-1',
        contestantNumberingMode: 'AUTO_INDEXED',
      };
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findById.mockResolvedValue(contest as any);
      mockContestRepo.getNextContestantNumber.mockResolvedValue(5);
      mockContestRepo.incrementContestantNumber.mockResolvedValue(undefined as any);

      const result = await contestService.assignContestantNumber('contest-1');

      expect(result).toBe(5);
      expect(mockContestRepo.incrementContestantNumber).toHaveBeenCalledWith('contest-1');
      expect(mockCacheService.del).toHaveBeenCalledWith('contest:contest-1');
    });

    it('should throw error if contest is not in AUTO_INDEXED mode', async () => {
      const contest = {
        id: 'contest-1',
        name: 'Contest',
        eventId: 'event-1',
        contestantNumberingMode: 'MANUAL',
      };
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findById.mockResolvedValue(contest as any);

      await expect(contestService.assignContestantNumber('contest-1')).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw error if contest not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockContestRepo.findById.mockResolvedValue(null);

      await expect(contestService.assignContestantNumber('invalid')).rejects.toThrow(NotFoundError);
    });
  });
});
