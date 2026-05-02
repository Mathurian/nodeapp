/**
 * TallyMasterService Tests
 *
 * Comprehensive test suite for tally master functionality including score review,
 * bias checking, certification workflow, and score tabulation.
 *
 * Test Coverage:
 * - Dashboard statistics
 * - Certification queue management
 * - Score review and tabulation
 * - Bias checking and detection
 * - Certification workflow
 * - Contest-level score reviews
 * - Score removal requests
 * - Pagination and filtering
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mockDeep, DeepMockProxy, mockReset } from 'jest-mock-extended';
import { PrismaClient, UserRole } from '@prisma/client';
import { NotFoundError } from '../../../src/services/BaseService';

jest.mock('../../../src/utils/certificationPipeline', () => ({
  applyCertificationStage: jest.fn(),
  refreshRoleStages: jest.fn(),
  upsertCategoryRoleCertification: jest.fn(),
}));

const {
  applyCertificationStage,
  refreshRoleStages,
  upsertCategoryRoleCertification,
} = require('../../../src/utils/certificationPipeline');
const { TallyMasterService } = require('../../../src/services/TallyMasterService');

describe('TallyMasterService', () => {
  let service: any;
  let prismaMock: DeepMockProxy<PrismaClient>;
  const tenantId = 'tenant-test';
  const mockedApplyCertificationStage = jest.mocked(applyCertificationStage);
  const mockedRefreshRoleStages = jest.mocked(refreshRoleStages);
  const mockedUpsertCategoryRoleCertification = jest.mocked(upsertCategoryRoleCertification);

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    service = new TallyMasterService(prismaMock as any);
    mockedApplyCertificationStage.mockReset();
    mockedRefreshRoleStages.mockReset();
    mockedUpsertCategoryRoleCertification.mockReset();
    mockedRefreshRoleStages.mockResolvedValue({
      id: 'certification-1',
      categoryId: 'cat1',
      contestId: 'c1',
      eventId: 'e1',
      tenantId,
      userId: null,
      status: 'IN_PROGRESS',
      currentStep: 2,
      totalSteps: 4,
      judgeCertified: true,
      tallyCertified: false,
      auditorCertified: false,
      boardApproved: false,
      certifiedAt: null,
      certifiedBy: null,
      rejectionReason: null,
      comments: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    mockedUpsertCategoryRoleCertification.mockResolvedValue({ id: 'tally-cert-1' } as any);
    mockedApplyCertificationStage.mockResolvedValue({} as any);
    prismaMock.certification.upsert.mockResolvedValue({
      id: 'certification-1',
      categoryId: 'cat1',
      contestId: 'c1',
      eventId: 'e1',
      tenantId,
      userId: null,
      status: 'IN_PROGRESS',
      currentStep: 2,
      totalSteps: 4,
      judgeCertified: true,
      tallyCertified: false,
      auditorCertified: false,
      boardApproved: false,
      certifiedAt: null,
      certifiedBy: null,
      rejectionReason: null,
      comments: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    ((prismaMock.certification.update as unknown as jest.Mock).mockImplementation)(({ data }: any) =>
      Promise.resolve({
        id: 'certification-1',
        categoryId: 'cat1',
        contestId: 'c1',
        eventId: 'e1',
        tenantId,
        userId: null,
        status: 'IN_PROGRESS',
        currentStep: 2,
        totalSteps: 4,
        judgeCertified: true,
        tallyCertified: false,
        auditorCertified: false,
        boardApproved: false,
        certifiedAt: null,
        certifiedBy: null,
        rejectionReason: null,
        comments: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      } as any)
    );
    prismaMock.category.findFirst.mockResolvedValue({
      id: 'cat1',
      tenantId,
      contestId: 'c1',
      contest: { eventId: 'e1' },
    } as any);
    prismaMock.categoryJudge.findMany.mockResolvedValue([{ judgeId: 'judge-1' }] as any);
    (prismaMock.assignment.groupBy as unknown as jest.Mock).mockResolvedValue([] as any);
    prismaMock.judgeCertification.findMany.mockResolvedValue([{ judgeId: 'judge-1' }] as any);
    prismaMock.systemSetting.findFirst.mockResolvedValue(null);
    prismaMock.event.findFirst.mockResolvedValue({} as any);
    prismaMock.tallyMasterAssignment.findMany.mockResolvedValue([] as any);
    prismaMock.auditorAssignment.findMany.mockResolvedValue([] as any);
    prismaMock.categoryCertification.findFirst.mockResolvedValue(null);
    prismaMock.categoryCertification.findMany.mockResolvedValue([] as any);
    prismaMock.categoryCertification.create.mockResolvedValue({ id: 'tally-cert-1' } as any);
    prismaMock.user.findMany.mockResolvedValue([] as any);
  });

  afterEach(() => {
    mockReset(prismaMock);
  });

  describe('getStats', () => {
    it('should return tally master dashboard statistics', async () => {
      prismaMock.category.count.mockResolvedValueOnce(50);
      prismaMock.certification.count
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(35);

      const result = await service.getStats(tenantId);

      expect(result).toEqual({
        totalCategories: 50,
        pendingTotals: 15,
        pendingCertifications: 15,
        certifiedTotals: 35,
      });
      expect(prismaMock.category.count).toHaveBeenCalledWith({
        where: { tenantId, deletedAt: null },
      });
      expect(prismaMock.certification.count).toHaveBeenCalledTimes(2);
    });

    it('should handle zero counts', async () => {
      prismaMock.category.count.mockResolvedValue(0);
      prismaMock.certification.count.mockResolvedValue(0);

      const result = await service.getStats(tenantId);

      expect(result).toEqual({
        totalCategories: 0,
        pendingTotals: 0,
        pendingCertifications: 0,
        certifiedTotals: 0,
      });
    });
  });

  describe('getCertifications', () => {
    it('should retrieve certified categories with pagination', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          totalsCertified: true,
          contest: { id: 'c1', event: { id: 'e1' } },
          scores: [],
        },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);
      prismaMock.category.count.mockResolvedValue(1);

      const result = await service.getCertifications(1, 20);

      expect(result.categories).toEqual(mockCategories);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { totalsCertified: true },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should handle pagination correctly', async () => {
      prismaMock.category.findMany.mockResolvedValue([]);
      prismaMock.category.count.mockResolvedValue(45);

      const result = await service.getCertifications(3, 20);

      expect(result.pagination).toEqual({
        page: 3,
        limit: 20,
        total: 45,
        pages: 3,
      });
      expect(prismaMock.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        })
      );
    });

    it('should return empty array when no certified categories', async () => {
      prismaMock.category.findMany.mockResolvedValue([]);
      prismaMock.category.count.mockResolvedValue(0);

      const result = await service.getCertifications();

      expect(result.categories).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getCertificationQueue', () => {
    it('should return categories ready for tally master review', async () => {
      const mockCertifications = [
        {
          id: 'cert1',
          categoryId: 'cat1',
          status: 'IN_PROGRESS',
          currentStep: 2,
          updatedAt: new Date('2026-02-25T12:00:00Z'),
        },
      ];
      const mockCategories = [
        {
          id: 'cat1',
          name: 'Solo',
          contestId: 'c1',
          updatedAt: new Date('2026-02-25T12:00:00Z'),
          contest: { id: 'c1', name: 'Contest', event: { id: 'e1', name: 'Event' } },
        },
      ];

      prismaMock.certification.findMany.mockResolvedValue(mockCertifications as any);
      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.getCertificationQueue(1, 20);

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].id).toBe('cat1');
      expect(result.pagination.total).toBe(1);
    });

    it('should exclude categories without judge certifications', async () => {
      prismaMock.certification.findMany.mockResolvedValue([]);

      const result = await service.getCertificationQueue();

      expect(result.categories).toHaveLength(0);
    });

    it('should exclude categories with tally certifications', async () => {
      prismaMock.certification.findMany.mockResolvedValue([]);

      const result = await service.getCertificationQueue();

      expect(result.categories).toHaveLength(0);
    });

    it('should exclude categories without scores', async () => {
      prismaMock.certification.findMany.mockResolvedValue([]);

      const result = await service.getCertificationQueue();

      expect(result.categories).toHaveLength(0);
    });

    it('should exclude categories with uncertified scores', async () => {
      prismaMock.certification.findMany.mockResolvedValue([]);

      const result = await service.getCertificationQueue();

      expect(result.categories).toHaveLength(0);
    });
  });

  describe('getPendingCertifications', () => {
    it('should return pending certifications with status', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          totalsCertified: false,
          tallyMasterCertified: false,
          auditorCertified: false,
          boardApproved: false,
          contest: { id: 'c1', event: { id: 'e1' } },
          scores: [{ id: 's1', isCertified: true }],
          categoryCertifications: [],
        },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);
      // Service uses findMany with batch query for optimization
      prismaMock.judgeCertification.findMany.mockResolvedValue([{ id: 'jc1', categoryId: 'cat1' }] as any);

      const result = await service.getPendingCertifications(1, 20);

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].certificationStatus).toBeDefined();
      expect(result.categories[0].certificationStatus.statusLabel).toBe('Ready for Tally Master');
    });

    it('should calculate correct certification status for tally certified', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          totalsCertified: true,
          tallyMasterCertified: false,
          auditorCertified: false,
          boardApproved: false,
          scores: [{ id: 's1', isCertified: true }],
          categoryCertifications: [],
        },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);
      // Service uses findMany with batch query for optimization
      prismaMock.judgeCertification.findMany.mockResolvedValue([{ id: 'jc1', categoryId: 'cat1' }] as any);

      const result = await service.getPendingCertifications();

      expect(result.categories[0].certificationStatus.currentStep).toBe(3);
      expect(result.categories[0].certificationStatus.statusLabel).toBe('Ready for Tally Master Review');
    });

    it('should handle pagination', async () => {
      prismaMock.category.findMany.mockResolvedValue([]);
      prismaMock.judgeCertification.findMany.mockResolvedValue([]);

      const result = await service.getPendingCertifications(2, 10);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
    });
  });

  describe('certifyTotals', () => {
    it('should certify category totals', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Solo Performance',
        tenantId,
        contestId: 'c1',
        contest: { id: 'c1', eventId: 'e1', event: { id: 'e1' } },
      };

      const mockUpdated = {
        id: 'cat1',
        totalsCertified: true,
        contest: { id: 'c1', event: { id: 'e1' } },
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);
      prismaMock.category.update.mockResolvedValue(mockUpdated as any);

      const result = await service.certifyTotals('cat1', 'u1', 'TALLY_MASTER' as UserRole);

      expect(result.totalsCertified).toBe(true);
      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: 'cat1' },
        data: { totalsCertified: true },
        include: {
          contest: {
            include: {
              event: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundError when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(
        service.certifyTotals('nonexistent', 'u1', 'TALLY_MASTER' as UserRole)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when categoryId is missing', async () => {
      await expect(
        service.certifyTotals('', 'u1', 'TALLY_MASTER' as UserRole)
      ).rejects.toThrow();
    });
  });

  describe('getScoreReview', () => {
    it('should retrieve and group scores by contestant', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Solo Performance',
        scoreCap: 100,
        contest: {
          id: 'c1',
          name: 'Talent Show',
          event: { id: 'e1', name: 'Spring Event' },
        },
        scores: [
          {
            id: 's1',
            score: 85,
            contestantId: 'cont1',
            contestant: { id: 'cont1', name: 'Alice' },
            judge: { id: 'j1', name: 'Judge One' },
            criterion: { id: 'cr1', name: 'Technique' },
          },
          {
            id: 's2',
            score: 90,
            contestantId: 'cont1',
            contestant: { id: 'cont1', name: 'Alice' },
            judge: { id: 'j2', name: 'Judge Two' },
            criterion: { id: 'cr1', name: 'Technique' },
          },
        ],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getScoreReview('cat1');

      expect(result.category.id).toBe('cat1');
      expect(result.contestants).toHaveLength(1);
      expect(result.contestants[0].contestant.name).toBe('Alice');
      expect(result.contestants[0].totalScore).toBe(175);
      expect(result.contestants[0].averageScore).toBe(87.5);
      expect(result.totalScores).toBe(2);
    });

    it('should sort contestants by average score descending', async () => {
      const mockCategory = {
        id: 'cat1',
        scores: [
          {
            score: 70,
            contestantId: 'cont1',
            contestant: { id: 'cont1', name: 'Alice' },
          },
          {
            score: 90,
            contestantId: 'cont2',
            contestant: { id: 'cont2', name: 'Bob' },
          },
        ],
        contest: { id: 'c1', event: { id: 'e1' } },
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getScoreReview('cat1');

      expect(result.contestants[0].contestant.name).toBe('Bob');
      expect(result.contestants[1].contestant.name).toBe('Alice');
    });

    it('should throw NotFoundError when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.getScoreReview('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should handle empty scores', async () => {
      const mockCategory = {
        id: 'cat1',
        scores: [],
        contest: { id: 'c1', event: { id: 'e1' } },
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getScoreReview('cat1');

      expect(result.contestants).toEqual([]);
      expect(result.totalScores).toBe(0);
    });
  });

  describe('getBiasCheckingTools', () => {
    it('should analyze judge scoring patterns for bias', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Solo',
        maxScore: 100,
        scores: [
          { id: 's1', score: 80, judgeId: 'j1', judge: { id: 'j1', name: 'Judge One' } },
          { id: 's2', score: 85, judgeId: 'j1', judge: { id: 'j1', name: 'Judge One' } },
          { id: 's3', score: 50, judgeId: 'j2', judge: { id: 'j2', name: 'Judge Two' } },
          { id: 's4', score: 55, judgeId: 'j2', judge: { id: 'j2', name: 'Judge Two' } },
        ],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getBiasCheckingTools('cat1');

      expect(result.overallAverage).toBe(67.5);
      expect(result.biasAnalysis).toHaveLength(2);
      expect(result.biasAnalysis[0].judge.name).toBe('Judge One');
      expect(result.biasAnalysis[0].averageScore).toBeCloseTo(82.5, 2);
      expect(result.biasAnalysis[1].averageScore).toBeCloseTo(52.5, 2);
    });

    it('should identify potential bias based on deviation', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Solo',
        description: 'Test category',
        scores: [
          { id: 's1', score: 50, judgeId: 'j1', judge: { id: 'j1', name: 'Judge One', email: 'j1@test.com' } },
          { id: 's2', score: 90, judgeId: 'j2', judge: { id: 'j2', name: 'Judge Two', email: 'j2@test.com' } },
        ],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getBiasCheckingTools('cat1');

      const biasedJudges = result.biasAnalysis.filter((j: any) => j.potentialBias);
      expect(biasedJudges.length).toBeGreaterThan(0);
      expect(result.recommendations.some((r: string) => r.includes('potential bias'))).toBe(true);
    });

    it('should throw NotFoundError when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.getBiasCheckingTools('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should handle empty scores gracefully', async () => {
      const mockCategory = {
        id: 'cat1',
        scores: [],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getBiasCheckingTools('cat1');

      expect(result.overallAverage).toBe(0);
      expect(result.biasAnalysis).toEqual([]);
      expect(result.recommendations).toEqual([]);
    });

    it('should sort bias analysis by deviation percentage descending', async () => {
      const mockCategory = {
        id: 'cat1',
        scores: [
          { score: 60, judgeId: 'j1', judge: { id: 'j1', name: 'Judge One' } },
          { score: 90, judgeId: 'j2', judge: { id: 'j2', name: 'Judge Two' } },
          { score: 70, judgeId: 'j3', judge: { id: 'j3', name: 'Judge Three' } },
        ],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getBiasCheckingTools('cat1');

      expect(result.biasAnalysis[0].deviationPercentage).toBeGreaterThanOrEqual(
        result.biasAnalysis[1].deviationPercentage
      );
    });
  });

  describe('getTallyMasterHistory', () => {
    it('should retrieve tally master certification history', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          totalsCertified: true,
          contest: { id: 'c1', event: { id: 'e1' } },
        },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);
      prismaMock.category.count.mockResolvedValue(1);

      const result = await service.getTallyMasterHistory(1, 10);

      expect(result.categories).toEqual(mockCategories);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
      });
      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { totalsCertified: true },
        include: expect.any(Object),
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should handle empty history', async () => {
      prismaMock.category.findMany.mockResolvedValue([]);
      prismaMock.category.count.mockResolvedValue(0);

      const result = await service.getTallyMasterHistory();

      expect(result.categories).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getContestScoreReview', () => {
    it('should provide comprehensive contest-level score review', async () => {
      const mockContest = {
        id: 'c1',
        name: 'Talent Show',
        event: { id: 'e1', name: 'Spring Event' },
        categories: [
          {
            id: 'cat1',
            name: 'Solo',
            scores: [
              {
                id: 's1',
                score: 85,
                judgeId: 'j1',
                judge: { id: 'j1', name: 'Judge One' },
                contestantId: 'cont1',
                contestant: { id: 'cont1', name: 'Alice' },
              },
            ],
          },
        ],
      };

      prismaMock.contest.findUnique.mockResolvedValue(mockContest as any);

      const result = await service.getContestScoreReview('c1');

      expect(result.contest.id).toBe('c1');
      expect(result.summary.totalCategories).toBe(1);
      expect(result.summary.uniqueJudges).toBe(1);
      expect(result.summary.uniqueContestants).toBe(1);
      expect(result.judgeBreakdown).toHaveLength(1);
      expect(result.contestantBreakdown).toHaveLength(1);
    });

    it('should throw NotFoundError when contest does not exist', async () => {
      prismaMock.contest.findUnique.mockResolvedValue(null);

      await expect(service.getContestScoreReview('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should aggregate scores across multiple categories', async () => {
      const mockContest = {
        id: 'c1',
        event: { id: 'e1' },
        categories: [
          {
            id: 'cat1',
            scores: [
              {
                score: 80,
                judgeId: 'j1',
                judge: { id: 'j1' },
                contestantId: 'cont1',
                contestant: { id: 'cont1' },
              },
            ],
          },
          {
            id: 'cat2',
            scores: [
              {
                score: 90,
                judgeId: 'j1',
                judge: { id: 'j1' },
                contestantId: 'cont1',
                contestant: { id: 'cont1' },
              },
            ],
          },
        ],
      };

      prismaMock.contest.findUnique.mockResolvedValue(mockContest as any);

      const result = await service.getContestScoreReview('c1');

      expect(result.summary.totalScores).toBe(2);
      const judgeBreakdown = result.judgeBreakdown[0];
      expect(judgeBreakdown.categories).toHaveLength(2);
    });

    it('should calculate total scores per judge', async () => {
      const mockContest = {
        id: 'c1',
        event: { id: 'e1' },
        categories: [
          {
            id: 'cat1',
            scores: [
              {
                score: 85,
                judgeId: 'j1',
                judge: { id: 'j1', name: 'Judge One' },
                contestantId: 'cont1',
                contestant: { id: 'cont1' },
              },
              {
                score: 90,
                judgeId: 'j1',
                judge: { id: 'j1', name: 'Judge One' },
                contestantId: 'cont2',
                contestant: { id: 'cont2' },
              },
            ],
          },
        ],
      };

      prismaMock.contest.findUnique.mockResolvedValue(mockContest as any);

      const result = await service.getContestScoreReview('c1');

      const judgeBreakdown = result.judgeBreakdown[0];
      expect(judgeBreakdown.totalScore).toBe(175);
    });
  });

  describe('getCategoryJudges', () => {
    it('should return unique judges for a category', async () => {
      const mockCategory = {
        id: 'cat1',
        scores: [
          { judge: { id: 'j1', name: 'Judge One', email: 'j1@test.com' } },
          { judge: { id: 'j1', name: 'Judge One', email: 'j1@test.com' } },
          { judge: { id: 'j2', name: 'Judge Two', email: 'j2@test.com' } },
        ],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getCategoryJudges('cat1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('j1');
      expect(result[1].id).toBe('j2');
    });

    it('should throw NotFoundError when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.getCategoryJudges('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should return empty array when no scores exist', async () => {
      const mockCategory = { id: 'cat1', scores: [] };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getCategoryJudges('cat1');

      expect(result).toEqual([]);
    });
  });

  describe('getContestCertifications', () => {
    it('should calculate certification progress for contest', async () => {
      const mockContest = {
        id: 'c1',
        name: 'Talent Show',
        event: { id: 'e1', name: 'Spring Event' },
        categories: [
          {
            id: 'cat1',
            name: 'Solo',
            criteria: [{ id: 'cr1' }, { id: 'cr2' }],
            scores: [{ id: 's1' }, { id: 's2' }],
            categoryJudges: [{ judge: { id: 'j1' } }],
            categoryContestants: [{ contestant: { id: 'cont1' } }],
          },
        ],
      };

      prismaMock.contest.findUnique.mockResolvedValue(mockContest as any);
      prismaMock.judgeContestantCertification.findMany.mockResolvedValue([{ id: 'cert1' }] as any);

      const result = await service.getContestCertifications('c1');

      expect(result.contestId).toBe('c1');
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].categoryId).toBe('cat1');
      expect(result.categories[0].expectedScores).toBe(2);
    });

    it('should throw NotFoundError when contest does not exist', async () => {
      prismaMock.contest.findUnique.mockResolvedValue(null);

      await expect(service.getContestCertifications('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should calculate average completion percentages', async () => {
      const mockContest = {
        id: 'c1',
        event: { id: 'e1' },
        categories: [
          {
            id: 'cat1',
            criteria: [{ id: 'cr1' }],
            scores: [{ id: 's1' }, { id: 's2' }],
            categoryJudges: [{ judge: { id: 'j1' } }, { judge: { id: 'j2' } }],
            categoryContestants: [{ contestant: { id: 'cont1' } }],
          },
        ],
      };

      prismaMock.contest.findUnique.mockResolvedValue(mockContest as any);
      prismaMock.judgeContestantCertification.findMany.mockResolvedValue([]);

      const result = await service.getContestCertifications('c1');

      expect(result.averageScoringCompletion).toBeDefined();
      expect(result.averageCertificationCompletion).toBeDefined();
    });
  });

  describe('getScoreRemovalRequests', () => {
    it('should retrieve score removal requests with filters', async () => {
      const mockRequests = [
        {
          id: 'req1',
          categoryId: 'cat1',
          contestantId: 'cont1',
          judgeId: 'j1',
          status: 'PENDING',
        },
      ];

      const mockCategory = {
        id: 'cat1',
        name: 'Solo',
        contest: { id: 'c1', name: 'Contest', event: { id: 'e1', name: 'Event' } },
      };

      prismaMock.judgeScoreRemovalRequest.findMany.mockResolvedValue(mockRequests as any);
      prismaMock.judgeScoreRemovalRequest.count.mockResolvedValue(1);
      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);
      prismaMock.contestant.findUnique.mockResolvedValue({
        id: 'cont1',
        users: [{ id: 'u1', name: 'Alice' }],
      } as any);
      prismaMock.judge.findUnique.mockResolvedValue({
        id: 'j1',
        name: 'Judge One',
        users: [{ id: 'u2', name: 'Judge' }],
      } as any);

      const result = await service.getScoreRemovalRequests(1, 20, 'PENDING');

      expect(result.requests).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by categoryId', async () => {
      prismaMock.judgeScoreRemovalRequest.findMany.mockResolvedValue([]);
      prismaMock.judgeScoreRemovalRequest.count.mockResolvedValue(0);

      await service.getScoreRemovalRequests(1, 20, undefined, 'cat1');

      expect(prismaMock.judgeScoreRemovalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { categoryId: 'cat1' },
        })
      );
    });

    it('should filter by contestId', async () => {
      const mockCategories = [{ id: 'cat1' }, { id: 'cat2' }];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);
      prismaMock.judgeScoreRemovalRequest.findMany.mockResolvedValue([]);
      prismaMock.judgeScoreRemovalRequest.count.mockResolvedValue(0);

      await service.getScoreRemovalRequests(1, 20, undefined, undefined, 'c1');

      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { contestId: 'c1' },
        select: { id: true },
      });
      expect(prismaMock.judgeScoreRemovalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { categoryId: { in: ['cat1', 'cat2'] } },
        })
      );
    });

    it('should handle pagination', async () => {
      prismaMock.judgeScoreRemovalRequest.findMany.mockResolvedValue([]);
      prismaMock.judgeScoreRemovalRequest.count.mockResolvedValue(45);

      const result = await service.getScoreRemovalRequests(3, 20);

      expect(result.pagination).toEqual({
        page: 3,
        limit: 20,
        total: 45,
        pages: 3,
      });
      expect(prismaMock.judgeScoreRemovalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        })
      );
    });

    it('should enrich requests with related data', async () => {
      const mockRequests = [{ id: 'req1', categoryId: 'cat1', contestantId: 'cont1', judgeId: 'j1' }];

      prismaMock.judgeScoreRemovalRequest.findMany.mockResolvedValue(mockRequests as any);
      prismaMock.judgeScoreRemovalRequest.count.mockResolvedValue(1);
      prismaMock.category.findUnique.mockResolvedValue({
        id: 'cat1',
        name: 'Solo',
        contest: { id: 'c1', event: { id: 'e1' } },
      } as any);
      prismaMock.contestant.findUnique.mockResolvedValue({
        id: 'cont1',
        users: [{ id: 'u1', name: 'Alice' }],
      } as any);
      prismaMock.judge.findUnique.mockResolvedValue({
        id: 'j1',
        users: [{ id: 'u2', name: 'Judge' }],
      } as any);

      const result = await service.getScoreRemovalRequests();

      expect(result.requests[0].category).toBeDefined();
      expect(result.requests[0].contestant).toBeDefined();
      expect(result.requests[0].judge).toBeDefined();
    });
  });
});
