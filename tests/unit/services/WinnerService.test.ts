/**
 * WinnerService Unit Tests
 */

import 'reflect-metadata';
import { WinnerService } from '../../../src/services/WinnerService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('WinnerService', () => {
  let service: WinnerService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockCategory = {
    id: 'category-1',
    name: 'Talent',
    contestId: 'contest-1',
    contest: {
      id: 'contest-1',
      name: 'Contest 1',
      event: { id: 'event-1', name: 'Event 1' }
    },
    criteria: [
      { id: 'criterion-1', maxScore: 50 },
      { id: 'criterion-2', maxScore: 50 }
    ]
  };

  const mockScores = [
    {
      id: 'score-1',
      score: 45,
      categoryId: 'category-1',
      contestantId: 'contestant-1',
      judgeId: 'judge-1',
      contestant: {
        id: 'contestant-1',
        name: 'Contestant 1',
        contestantNumber: '001'
      },
      judge: {
        id: 'judge-1',
        name: 'Judge 1'
      },
      criterion: {
        id: 'criterion-1',
        maxScore: 50
      }
    },
    {
      id: 'score-2',
      score: 48,
      categoryId: 'category-1',
      contestantId: 'contestant-1',
      judgeId: 'judge-1',
      contestant: {
        id: 'contestant-1',
        name: 'Contestant 1',
        contestantNumber: '001'
      },
      judge: {
        id: 'judge-1',
        name: 'Judge 1'
      },
      criterion: {
        id: 'criterion-2',
        maxScore: 50
      }
    }
  ];

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new WinnerService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('generateSignature', () => {
    it('should generate a signature hash', () => {
      const signature = service.generateSignature(
        'user-1',
        'category-1',
        'BOARD',
        '127.0.0.1',
        'Mozilla/5.0'
      );

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64); // SHA256 produces 64 hex characters
    });

    it('should generate different signatures for different inputs', () => {
      const sig1 = service.generateSignature('user-1', 'category-1', 'BOARD');
      const sig2 = service.generateSignature('user-2', 'category-1', 'BOARD');

      expect(sig1).not.toEqual(sig2);
    });

    it('should handle optional parameters', () => {
      const signature = service.generateSignature('user-1', 'category-1', 'BOARD');

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });
  });

  describe('getWinnersByCategory', () => {
    beforeEach(() => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue(mockScores);
      (mockPrisma.overallDeduction.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.categoryCertification.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.judgeCertification.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should calculate winners for a category', async () => {
      const result = await service.getWinnersByCategory('category-1', 'ADMIN');

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'category-1' },
        include: {
          contest: {
            include: {
              event: true
            }
          },
          criteria: {
            select: {
              id: true,
              maxScore: true
            }
          }
        }
      });
      expect(result.category).toEqual(mockCategory);
      expect(result.contestants).toBeDefined();
      expect(result.totalPossibleScore).toBe(100); // 50 + 50
    });

    it('should throw error when category not found', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getWinnersByCategory('nonexistent', 'ADMIN')
      ).rejects.toThrow();
    });

    it('should apply overall deductions to contestants', async () => {
      const deductions = [
        { contestantId: 'contestant-1', deduction: 5, categoryId: 'category-1' }
      ];
      (mockPrisma.overallDeduction.findMany as jest.Mock).mockResolvedValue(deductions);

      const result = await service.getWinnersByCategory('category-1', 'ADMIN');

      expect(result.contestants[0].totalScore).toBe(88); // 93 - 5
    });

    it('should ensure non-negative scores after deductions', async () => {
      const deductions = [
        { contestantId: 'contestant-1', deduction: 200, categoryId: 'category-1' }
      ];
      (mockPrisma.overallDeduction.findMany as jest.Mock).mockResolvedValue(deductions);

      const result = await service.getWinnersByCategory('category-1', 'ADMIN');

      expect(result.contestants[0].totalScore).toBeGreaterThanOrEqual(0);
    });

    it('should sort contestants by total score descending', async () => {
      const multipleScores = [
        ...mockScores,
        {
          id: 'score-3',
          score: 50,
          categoryId: 'category-1',
          contestantId: 'contestant-2',
          judgeId: 'judge-1',
          contestant: {
            id: 'contestant-2',
            name: 'Contestant 2',
            contestantNumber: '002'
          },
          judge: {
            id: 'judge-1',
            name: 'Judge 1'
          },
          criterion: {
            id: 'criterion-1',
            maxScore: 50
          }
        }
      ];
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue(multipleScores);

      const result = await service.getWinnersByCategory('category-1', 'ADMIN');

      expect(result.contestants.length).toBeGreaterThan(1);
      expect(result.contestants[0].totalScore).toBeGreaterThanOrEqual(
        result.contestants[1].totalScore
      );
    });

    it('should include certification status', async () => {
      const categoryCertifications = [
        {
          id: 'cert-1',
          categoryId: 'category-1',
          role: 'BOARD',
          user: { id: 'user-1', role: 'BOARD', name: 'Board Member' }
        }
      ];
      (mockPrisma.categoryCertification.findMany as jest.Mock).mockResolvedValue(
        categoryCertifications
      );
      (mockPrisma.judgeCertification.findMany as jest.Mock).mockResolvedValue([
        { id: 'judge-cert-1', categoryId: 'category-1' }
      ]);

      const result = await service.getWinnersByCategory('category-1', 'ADMIN');

      expect(result.allSigned).toBe(true);
      expect(result.boardSigned).toBe(true);
      expect(result.canShowWinners).toBe(true);
      expect(result.signatures).toHaveLength(1);
    });

    it('should handle categories with no scores', async () => {
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getWinnersByCategory('category-1', 'ADMIN');

      expect(result.contestants).toEqual([]);
    });
  });

  describe('getWinnersByContest', () => {
    const mockContest = {
      id: 'contest-1',
      name: 'Contest 1',
      event: { id: 'event-1', name: 'Event 1' },
      categories: [mockCategory]
    };

    beforeEach(() => {
      (mockPrisma.contest.findUnique as jest.Mock).mockResolvedValue(mockContest);
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue(mockScores);
      (mockPrisma.overallDeduction.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.categoryCertification.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.judgeCertification.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should calculate winners for all categories in contest', async () => {
      const result = await service.getWinnersByContest('contest-1', 'ADMIN', true);

      expect(mockPrisma.contest.findUnique).toHaveBeenCalledWith({
        where: { id: 'contest-1' },
        include: {
          event: true,
          categories: {
            include: {
              criteria: {
                select: {
                  id: true,
                  maxScore: true
                }
              }
            }
          }
        }
      });
      expect(result.contest).toEqual(mockContest);
      expect(result.contestants).toBeDefined();
    });

    it('should throw error when contest not found', async () => {
      (mockPrisma.contest.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getWinnersByContest('nonexistent', 'ADMIN')
      ).rejects.toThrow();
    });

    it('should calculate overall contest winners across categories', async () => {
      const result = await service.getWinnersByContest('contest-1', 'ADMIN', true);

      expect(result.contestants).toBeDefined();
      expect(Array.isArray(result.contestants)).toBe(true);
    });

    it('should exclude category breakdown when requested', async () => {
      const result = await service.getWinnersByContest('contest-1', 'ADMIN', false);

      expect(result.categories).toBeUndefined();
    });

    it('should handle contest with no categories', async () => {
      (mockPrisma.contest.findUnique as jest.Mock).mockResolvedValue({
        ...mockContest,
        categories: []
      });

      const result = await service.getWinnersByContest('contest-1', 'ADMIN');

      expect(result.contestants).toEqual([]);
    });
  });

  describe('signWinners', () => {
    beforeEach(() => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
    });

    it('should sign winners and generate signature', async () => {
      const result = await service.signWinners(
        'category-1',
        'user-1',
        'BOARD',
        '127.0.0.1',
        'Mozilla/5.0'
      );

      expect(result.message).toContain('signed successfully');
      expect(result.signature).toBeDefined();
      expect(result.categoryId).toBe('category-1');
    });

    it('should throw error when category not found', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.signWinners('nonexistent', 'user-1', 'BOARD')
      ).rejects.toThrow();
    });
  });

  describe('getSignatureStatus', () => {
    beforeEach(() => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
    });

    it('should return signature status for category', async () => {
      const result = await service.getSignatureStatus('category-1', 'user-1');

      expect(result.categoryId).toBe('category-1');
      expect(result.userId).toBe('user-1');
      expect(result.signed).toBeDefined();
    });

    it('should throw error when category not found', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getSignatureStatus('nonexistent', 'user-1')
      ).rejects.toThrow();
    });
  });

  describe('getCertificationProgress', () => {
    beforeEach(() => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
    });

    it('should return certification progress for category', async () => {
      const result = await service.getCertificationProgress('category-1');

      expect(result.categoryId).toBe('category-1');
      expect(result.totalsCertified).toBeDefined();
      expect(result.certificationProgress).toBeDefined();
      expect(Array.isArray(result.rolesCertified)).toBe(true);
      expect(Array.isArray(result.rolesRemaining)).toBe(true);
    });

    it('should throw error when category not found', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getCertificationProgress('nonexistent')
      ).rejects.toThrow();
    });
  });

  describe('getRoleCertificationStatus', () => {
    beforeEach(() => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
    });

    it('should return role-specific certification status', async () => {
      const result = await service.getRoleCertificationStatus('category-1', 'BOARD');

      expect(result.categoryId).toBe('category-1');
      expect(result.role).toBe('BOARD');
      expect(result.certified).toBeDefined();
    });

    it('should throw error when category not found', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getRoleCertificationStatus('nonexistent', 'BOARD')
      ).rejects.toThrow();
    });
  });

  describe('certifyScores', () => {
    beforeEach(() => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
    });

    it('should certify scores for category', async () => {
      const result = await service.certifyScores('category-1', 'user-1', 'BOARD');

      expect(result.message).toContain('certified successfully');
      expect(result.categoryId).toBe('category-1');
      expect(result.certifiedBy).toBe('user-1');
      expect(result.role).toBe('BOARD');
    });

    it('should throw error when category not found', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.certifyScores('nonexistent', 'user-1', 'BOARD')
      ).rejects.toThrow();
    });
  });

  describe('getWinners', () => {
    beforeEach(() => {
      (mockPrisma.contest.findUnique as jest.Mock).mockResolvedValue({
        id: 'contest-1',
        name: 'Contest 1',
        event: { id: 'event-1', name: 'Event 1' },
        categories: [mockCategory]
      });
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event-1',
        name: 'Event 1',
        contests: [{
          id: 'contest-1',
          name: 'Contest 1',
          categories: [mockCategory]
        }]
      });
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue(mockScores);
      (mockPrisma.overallDeduction.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.categoryCertification.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.judgeCertification.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should get winners by contest when contestId provided', async () => {
      const result = await service.getWinners(undefined, 'contest-1');

      expect(result.contest).toBeDefined();
      expect(result.contestants).toBeDefined();
    });

    it('should get winners by event when eventId provided', async () => {
      const result = await service.getWinners('event-1');

      expect(result.event).toBeDefined();
      expect(result.contests).toBeDefined();
    });

    it('should return empty result when no filters provided', async () => {
      const result = await service.getWinners();

      expect(result.winners).toEqual([]);
      expect(result.message).toContain('No filters provided');
    });

    it('should handle event with no contests', async () => {
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event-1',
        name: 'Event 1',
        contests: []
      });

      const result = await service.getWinners('event-1');

      expect(result.contests).toEqual([]);
    });
  });
});
