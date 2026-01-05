/**
 * ContestantScoreFilterService Unit Tests
 * Tests for Phase 2.1 - Complete Contestant Score Visibility Enforcement
 *
 * Verifies that:
 * - Contestants cannot view others' scores
 * - Event-level restrictions are enforced
 * - Contest-level restrictions are enforced
 * - Release dates work correctly
 * - Admin+ can bypass restrictions
 * - Ownership validation works
 */

import 'reflect-metadata';
import { ContestantScoreFilterService } from '../../../src/services/ContestantScoreFilterService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('ContestantScoreFilterService - Contestant Visibility Tests', () => {
  let service: ContestantScoreFilterService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockContestId = 'contest-123';
  const mockCategoryId = 'category-123';
  const mockContestantId = 'contestant-123';
  const mockOtherContestantId = 'contestant-456';

  const createMockContest = (overrides: any = {}) => ({
    id: mockContestId,
    tenantId: mockTenantId,
    contestantViewRestricted: false,
    contestantViewReleaseDate: null,
    event: {
      id: 'event-123',
      contestantViewRestricted: false,
      contestantViewReleaseDate: null,
    },
    ...overrides
  });

  const createMockUser = (contestantId: string | null = mockContestantId) => ({
    id: mockUserId,
    tenantId: mockTenantId,
    contestantId,
  });

  const createMockScores = () => [
    {
      id: 'score-1',
      contestantId: mockContestantId,
      judgeId: 'judge-1',
      categoryId: mockCategoryId,
      score: 85,
    },
    {
      id: 'score-2',
      contestantId: mockOtherContestantId,
      judgeId: 'judge-1',
      categoryId: mockCategoryId,
      score: 90,
    },
    {
      id: 'score-3',
      contestantId: mockContestantId,
      judgeId: 'judge-2',
      categoryId: mockCategoryId,
      score: 88,
    }
  ];

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ContestantScoreFilterService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('canContestantViewScores - Permission Checks', () => {
    it('should allow ADMIN to view all scores', async () => {
      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'ADMIN',
        mockTenantId
      );

      expect(result.canView).toBe(true);
      expect(mockPrisma.contest.findUnique).not.toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN to view all scores', async () => {
      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'SUPER_ADMIN',
        mockTenantId
      );

      expect(result.canView).toBe(true);
      expect(mockPrisma.contest.findUnique).not.toHaveBeenCalled();
    });

    it('should allow ORGANIZER to view all scores', async () => {
      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'ORGANIZER',
        mockTenantId
      );

      expect(result.canView).toBe(true);
      expect(mockPrisma.contest.findUnique).not.toHaveBeenCalled();
    });

    it('should allow BOARD to view all scores', async () => {
      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'BOARD',
        mockTenantId
      );

      expect(result.canView).toBe(true);
      expect(mockPrisma.contest.findUnique).not.toHaveBeenCalled();
    });

    it('should deny if contest not found', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(null);

      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result.canView).toBe(false);
      expect(result.reason).toBe('Contest not found');
    });
  });

  describe('canContestantViewScores - Event-Level Restrictions', () => {
    it('should DENY when event is restricted with no release date', async () => {
      const contest = createMockContest({
        event: {
          id: 'event-123',
          contestantViewRestricted: true,
          contestantViewReleaseDate: null,
        }
      });

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser() as any);

      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result.canView).toBe(false);
      expect(result.reason).toContain('Event scores are restricted');
    });

    it('should DENY when event release date is in the future', async () => {
      const futureDate = new Date('2030-12-31T23:59:59Z');
      const contest = createMockContest({
        event: {
          id: 'event-123',
          contestantViewRestricted: true,
          contestantViewReleaseDate: futureDate,
        }
      });

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser() as any);

      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result.canView).toBe(false);
      expect(result.reason).toContain('Event scores will be released on');
    });

    it('should ALLOW when event release date has passed', async () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const contest = createMockContest({
        event: {
          id: 'event-123',
          contestantViewRestricted: true,
          contestantViewReleaseDate: pastDate,
        }
      });

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser() as any);

      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result.canView).toBe(true);
    });

    it('should ALLOW when event is not restricted', async () => {
      const contest = createMockContest({
        event: {
          id: 'event-123',
          contestantViewRestricted: false,
          contestantViewReleaseDate: null,
        }
      });

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser() as any);

      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result.canView).toBe(true);
    });
  });

  describe('canContestantViewScores - Contest-Level Restrictions', () => {
    it('should DENY when contest is restricted with no release date', async () => {
      const contest = createMockContest({
        contestantViewRestricted: true,
        contestantViewReleaseDate: null,
      });

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser() as any);

      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result.canView).toBe(false);
      expect(result.reason).toContain('Contest scores are restricted');
    });

    it('should DENY when contest release date is in the future', async () => {
      const futureDate = new Date('2030-12-31T23:59:59Z');
      const contest = createMockContest({
        contestantViewRestricted: true,
        contestantViewReleaseDate: futureDate,
      });

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser() as any);

      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result.canView).toBe(false);
      expect(result.reason).toContain('Contest scores will be released on');
    });

    it('should ALLOW when contest release date has passed', async () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const contest = createMockContest({
        contestantViewRestricted: true,
        contestantViewReleaseDate: pastDate,
      });

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser() as any);

      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result.canView).toBe(true);
    });
  });

  describe('canContestantViewScores - Ownership Validation', () => {
    it('should DENY when contestant tries to view another contestant\'s scores', async () => {
      const contest = createMockContest();

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      // User owns different contestant
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser('different-contestant-id') as any);

      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId, // Requesting different contestant's scores
        mockUserId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result.canView).toBe(false);
      expect(result.reason).toBe('You can only view your own scores');
    });

    it('should ALLOW when contestant views their own scores', async () => {
      const contest = createMockContest();

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser(mockContestantId) as any);

      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId, // Same as user's contestantId
        mockUserId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result.canView).toBe(true);
    });

    it('should DENY when user has no associated contestant', async () => {
      const contest = createMockContest();

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser(null) as any);

      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result.canView).toBe(false);
      expect(result.reason).toBe('You can only view your own scores');
    });
  });

  describe('filterScoresForContestant - Role-Based Filtering', () => {
    const mockScores = createMockScores();

    it('should return ALL scores for ADMIN', async () => {
      const filtered = await service.filterScoresForContestant(
        mockScores as any,
        mockContestantId,
        'ADMIN'
      );

      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual(mockScores);
    });

    it('should return ALL scores for SUPER_ADMIN', async () => {
      const filtered = await service.filterScoresForContestant(
        mockScores as any,
        mockContestantId,
        'SUPER_ADMIN'
      );

      expect(filtered).toHaveLength(3);
    });

    it('should return ALL scores for ORGANIZER', async () => {
      const filtered = await service.filterScoresForContestant(
        mockScores as any,
        mockContestantId,
        'ORGANIZER'
      );

      expect(filtered).toHaveLength(3);
    });

    it('should return ALL scores for BOARD', async () => {
      const filtered = await service.filterScoresForContestant(
        mockScores as any,
        mockContestantId,
        'BOARD'
      );

      expect(filtered).toHaveLength(3);
    });

    it('should return ALL scores for JUDGE', async () => {
      const filtered = await service.filterScoresForContestant(
        mockScores as any,
        mockContestantId,
        'JUDGE'
      );

      expect(filtered).toHaveLength(3);
    });

    it('should return ALL scores for TALLY_MASTER', async () => {
      const filtered = await service.filterScoresForContestant(
        mockScores as any,
        mockContestantId,
        'TALLY_MASTER'
      );

      expect(filtered).toHaveLength(3);
    });

    it('should return ALL scores for AUDITOR', async () => {
      const filtered = await service.filterScoresForContestant(
        mockScores as any,
        mockContestantId,
        'AUDITOR'
      );

      expect(filtered).toHaveLength(3);
    });

    it('should return ALL scores for EMCEE', async () => {
      const filtered = await service.filterScoresForContestant(
        mockScores as any,
        mockContestantId,
        'EMCEE'
      );

      expect(filtered).toHaveLength(3);
    });

    it('should return ONLY own scores for CONTESTANT', async () => {
      const filtered = await service.filterScoresForContestant(
        mockScores as any,
        mockContestantId,
        'CONTESTANT'
      );

      expect(filtered).toHaveLength(2); // Only scores for mockContestantId
      expect(filtered.every(s => s.contestantId === mockContestantId)).toBe(true);
      expect(filtered.map(s => s.id)).toEqual(['score-1', 'score-3']);
    });

    it('should return EMPTY array for CONTESTANT with no matching scores', async () => {
      const filtered = await service.filterScoresForContestant(
        mockScores as any,
        'non-existent-contestant',
        'CONTESTANT'
      );

      expect(filtered).toHaveLength(0);
    });

    it('should return EMPTY array for CONTESTANT with null contestantId', async () => {
      const filtered = await service.filterScoresForContestant(
        mockScores as any,
        null,
        'CONTESTANT'
      );

      expect(filtered).toHaveLength(0);
    });
  });

  describe('areScoresVisible - Visibility Checks', () => {
    it('should return TRUE for ADMIN regardless of restrictions', async () => {
      const result = await service.areScoresVisible(
        mockContestId,
        'ADMIN',
        mockTenantId
      );

      expect(result).toBe(true);
      expect(mockPrisma.contest.findUnique).not.toHaveBeenCalled();
    });

    it('should return TRUE for staff roles (JUDGE, TALLY_MASTER, AUDITOR)', async () => {
      expect(await service.areScoresVisible(mockContestId, 'JUDGE', mockTenantId)).toBe(true);
      expect(await service.areScoresVisible(mockContestId, 'TALLY_MASTER', mockTenantId)).toBe(true);
      expect(await service.areScoresVisible(mockContestId, 'AUDITOR', mockTenantId)).toBe(true);
    });

    it('should return FALSE when contest not found', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(null);

      const result = await service.areScoresVisible(
        mockContestId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result).toBe(false);
    });

    it('should return FALSE when event is restricted', async () => {
      const contest = createMockContest({
        event: {
          id: 'event-123',
          contestantViewRestricted: true,
          contestantViewReleaseDate: null,
        }
      });

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);

      const result = await service.areScoresVisible(
        mockContestId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result).toBe(false);
    });

    it('should return TRUE when event release date has passed', async () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const contest = createMockContest({
        event: {
          id: 'event-123',
          contestantViewRestricted: true,
          contestantViewReleaseDate: pastDate,
        }
      });

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);

      const result = await service.areScoresVisible(
        mockContestId,
        'CONTESTANT',
        mockTenantId
      );

      expect(result).toBe(true);
    });
  });

  describe('getScoreReleaseStatus - Status Information', () => {
    it('should return event restriction status', async () => {
      const futureDate = new Date('2030-12-31T23:59:59Z');
      const contest = createMockContest({
        event: {
          id: 'event-123',
          name: 'Test Event',
          contestantViewRestricted: true,
          contestantViewReleaseDate: futureDate,
        }
      });

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);

      const status = await service.getScoreReleaseStatus(
        mockContestId,
        mockTenantId
      );

      expect(status.isRestricted).toBe(true);
      expect(status.releaseDate).toEqual(futureDate);
      expect(status.restrictedBy).toBe('event');
      expect(status.reason).toContain('Scores will be released on');
    });

    it('should return contest restriction status when event not restricted', async () => {
      const futureDate = new Date('2030-12-31T23:59:59Z');
      const contest = createMockContest({
        contestantViewRestricted: true,
        contestantViewReleaseDate: futureDate,
        event: {
          id: 'event-123',
          name: 'Test Event',
          contestantViewRestricted: false,
          contestantViewReleaseDate: null,
        }
      });

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);

      const status = await service.getScoreReleaseStatus(
        mockContestId,
        mockTenantId
      );

      expect(status.isRestricted).toBe(true);
      expect(status.releaseDate).toEqual(futureDate);
      expect(status.restrictedBy).toBe('contest');
    });

    it('should return not restricted when no restrictions', async () => {
      const contest = createMockContest();

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);

      const status = await service.getScoreReleaseStatus(
        mockContestId,
        mockTenantId
      );

      expect(status.isRestricted).toBe(false);
      expect(status.releaseDate).toBeNull();
      expect(status.restrictedBy).toBeNull();
      expect(status.reason).toBe('Scores are publicly visible');
    });

    it('should handle contest not found', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(null);

      const status = await service.getScoreReleaseStatus(
        mockContestId,
        mockTenantId
      );

      expect(status.isRestricted).toBe(false);
      expect(status.reason).toBe('Contest not found');
    });
  });

  describe('filterScoresByCategory - Integration', () => {
    it('should throw error when category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.filterScoresByCategory(
          mockCategoryId,
          mockUserId,
          'CONTESTANT',
          mockContestantId,
          mockTenantId
        )
      ).rejects.toThrow('Category not found');
    });

    it('should throw error when contestant cannot view scores', async () => {
      const category = {
        id: mockCategoryId,
        contestId: mockContestId,
        tenantId: mockTenantId
      };

      const contest = createMockContest({
        event: {
          id: 'event-123',
          contestantViewRestricted: true,
          contestantViewReleaseDate: null,
        }
      });

      mockPrisma.category.findUnique.mockResolvedValue(category as any);
      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser() as any);

      await expect(
        service.filterScoresByCategory(
          mockCategoryId,
          mockUserId,
          'CONTESTANT',
          mockContestantId,
          mockTenantId
        )
      ).rejects.toThrow('Event scores are restricted');
    });

    it('should return filtered scores when contestant can view', async () => {
      const category = {
        id: mockCategoryId,
        contestId: mockContestId,
        tenantId: mockTenantId
      };

      const contest = createMockContest();
      const mockScores = createMockScores();

      mockPrisma.category.findUnique.mockResolvedValue(category as any);
      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser() as any);
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      const result = await service.filterScoresByCategory(
        mockCategoryId,
        mockUserId,
        'CONTESTANT',
        mockContestantId,
        mockTenantId
      );

      expect(result).toHaveLength(2); // Only own scores
      expect(result.every(s => s.contestantId === mockContestantId)).toBe(true);
    });

    it('should return all scores for admin role', async () => {
      const category = {
        id: mockCategoryId,
        contestId: mockContestId,
        tenantId: mockTenantId
      };

      const mockScores = createMockScores();

      mockPrisma.category.findUnique.mockResolvedValue(category as any);
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      const result = await service.filterScoresByCategory(
        mockCategoryId,
        mockUserId,
        'ADMIN',
        null,
        mockTenantId
      );

      expect(result).toHaveLength(3); // All scores
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly at release date boundary', async () => {
      const now = new Date();
      const contest = createMockContest({
        event: {
          id: 'event-123',
          contestantViewRestricted: true,
          contestantViewReleaseDate: now,
        }
      });

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser() as any);

      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'CONTESTANT',
        mockTenantId
      );

      // Should allow at exact release date
      expect(result.canView).toBe(true);
    });

    it('should prioritize event restriction over contest restriction', async () => {
      const futureDate = new Date('2030-12-31T23:59:59Z');
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const contest = createMockContest({
        contestantViewRestricted: true,
        contestantViewReleaseDate: pastDate, // Contest allows viewing
        event: {
          id: 'event-123',
          contestantViewRestricted: true,
          contestantViewReleaseDate: futureDate, // Event blocks viewing
        }
      });

      mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser() as any);

      const result = await service.canContestantViewScores(
        mockContestId,
        mockContestantId,
        mockUserId,
        'CONTESTANT',
        mockTenantId
      );

      // Event restriction should take precedence
      expect(result.canView).toBe(false);
      expect(result.reason).toContain('Event');
    });

    it('should handle empty scores array', async () => {
      const filtered = await service.filterScoresForContestant(
        [],
        mockContestantId,
        'CONTESTANT'
      );

      expect(filtered).toHaveLength(0);
    });
  });
});
