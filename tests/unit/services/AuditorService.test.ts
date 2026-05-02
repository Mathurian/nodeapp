/**
 * AuditorService Tests
 *
 * Comprehensive test suite for auditor functionality including score verification,
 * final certification, audit workflows, and audit trail management.
 *
 * Test Coverage:
 * - Dashboard statistics
 * - Pending and completed audits
 * - Final certification workflow
 * - Audit rejection with reasons
 * - Score verification
 * - Tally master status tracking
 * - Certification workflow visualization
 * - Summary report generation
 * - Audit history
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
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
const { AuditorService } = require('../../../src/services/AuditorService');

describe('AuditorService', () => {
  let service: any;
  let prismaMock: DeepMockProxy<PrismaClient>;
  const mockedApplyCertificationStage = jest.mocked(applyCertificationStage);
  const mockedRefreshRoleStages = jest.mocked(refreshRoleStages);
  const mockedUpsertCategoryRoleCertification = jest.mocked(upsertCategoryRoleCertification);

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    service = new AuditorService(prismaMock as any);
    mockedApplyCertificationStage.mockReset();
    mockedRefreshRoleStages.mockReset();
    mockedUpsertCategoryRoleCertification.mockReset();
    mockedRefreshRoleStages.mockResolvedValue({
      tallyCertified: true,
      auditorCertified: false,
    } as any);
    mockedApplyCertificationStage.mockResolvedValue({} as any);
    prismaMock.certification.upsert.mockResolvedValue({
      id: 'certification-1',
      categoryId: 'cat1',
      contestId: 'c1',
      eventId: 'e1',
      tenantId: 'tenant1',
      userId: null,
      status: 'IN_PROGRESS',
      currentStep: 3,
      totalSteps: 4,
      judgeCertified: true,
      tallyCertified: true,
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
        tenantId: 'tenant1',
        userId: null,
        status: 'IN_PROGRESS',
        currentStep: 3,
        totalSteps: 4,
        judgeCertified: true,
        tallyCertified: true,
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
      tenantId: 'tenant1',
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
    ((prismaMock.categoryCertification.findMany as unknown as jest.Mock).mockImplementation)(({ where }: any) => {
      if (where?.role === 'TALLY_MASTER') {
        return Promise.resolve([{ userId: 'tally-1' }] as any);
      }
      return Promise.resolve([] as any);
    });
    ((prismaMock.categoryCertification.create as unknown as jest.Mock).mockImplementation)(({ data }: any) =>
      Promise.resolve({ id: 'cert1', ...data } as any)
    );
    prismaMock.user.findMany.mockResolvedValue([] as any);
    prismaMock.score.updateMany.mockResolvedValue({ count: 0 } as any);
  });

  afterEach(() => {
    mockReset(prismaMock);
  });

  describe('getStats', () => {
    it('should return auditor dashboard statistics', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          categoryCertifications: [
            { role: 'TALLY_MASTER' },
            { role: 'AUDITOR' },
          ],
        },
        {
          id: 'cat2',
          categoryCertifications: [{ role: 'TALLY_MASTER' }],
        },
        {
          id: 'cat3',
          categoryCertifications: [],
        },
      ];

      prismaMock.category.count.mockResolvedValue(3);
      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.getStats();

      expect(result.totalCategories).toBe(3);
      expect(result.pendingAudits).toBe(1);
      expect(result.completedAudits).toBe(1);
    });

    it('should handle zero counts', async () => {
      prismaMock.category.count.mockResolvedValue(0);
      prismaMock.category.findMany.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result).toEqual({
        totalCategories: 0,
        pendingAudits: 0,
        completedAudits: 0,
      });
    });

    it('should correctly identify pending audits', async () => {
      const mockCategories = [
        {
          categoryCertifications: [
            { role: 'TALLY_MASTER' },
            { role: 'AUDITOR' },
          ],
        },
        {
          categoryCertifications: [{ role: 'TALLY_MASTER' }],
        },
      ];

      prismaMock.category.count.mockResolvedValue(2);
      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.getStats();

      expect(result.pendingAudits).toBe(1);
    });
  });

  describe('getPendingAudits', () => {
    it('should return categories pending auditor review', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          name: 'Solo Performance',
          contest: { id: 'c1', event: { id: 'e1' } },
          categoryCertifications: [{ role: 'TALLY_MASTER' }],
        },
        {
          id: 'cat2',
          name: 'Group',
          contest: { id: 'c1', event: { id: 'e1' } },
          categoryCertifications: [],
        },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.getPendingAudits(1, 20);

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].id).toBe('cat1');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
    });

    it('should exclude categories already audited', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          categoryCertifications: [
            { role: 'TALLY_MASTER' },
            { role: 'AUDITOR' },
          ],
        },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.getPendingAudits();

      expect(result.categories).toHaveLength(0);
    });

    it('should exclude categories without tally master certification', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          categoryCertifications: [],
        },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.getPendingAudits();

      expect(result.categories).toHaveLength(0);
    });

    it('should handle pagination', async () => {
      const mockCategories = Array.from({ length: 5 }, (_, i) => ({
        id: `cat${i}`,
        categoryCertifications: [{ role: 'TALLY_MASTER' }],
      }));

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.getPendingAudits(2, 2);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(2);
    });
  });

  describe('getCompletedAudits', () => {
    it('should return audited categories', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          name: 'Solo',
          contest: { id: 'c1', event: { id: 'e1' } },
          categoryCertifications: [{ role: 'AUDITOR' }],
        },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.getCompletedAudits(1, 20);

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].id).toBe('cat1');
    });

    it('should exclude categories without auditor certification', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          categoryCertifications: [{ role: 'TALLY_MASTER' }],
        },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.getCompletedAudits();

      expect(result.categories).toHaveLength(0);
    });
  });

  describe('finalCertification', () => {
    it('should create auditor certification for a category', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Solo',
        tenantId: 'tenant1',
        contestId: 'c1',
        contest: { id: 'c1', eventId: 'e1', event: { id: 'e1' } },
      };

      const mockCertification = {
        id: 'cert1',
        categoryId: 'cat1',
        userId: 'u1',
        role: 'AUDITOR',
        tenantId: 'tenant1',
        signatureName: null,
        comments: 'Auditor category certification (final for audit)',
        boardRoleSnapshot: null,
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);
      mockedUpsertCategoryRoleCertification.mockResolvedValue(mockCertification as any);

      const result = await service.finalCertification('cat1', 'u1');

      expect(result.message).toBe('Final certification completed');
      expect(result.certification).toEqual(mockCertification);
      expect(prismaMock.categoryCertification.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant1',
          categoryId: 'cat1',
          userId: 'u1',
          role: 'AUDITOR',
          signatureName: null,
          comments: 'Auditor category certification (final for audit)',
          boardRoleSnapshot: null,
        },
      });
    });

    it('should throw NotFoundError when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.finalCertification('nonexistent', 'u1')).rejects.toThrow(NotFoundError);
    });

    it('should include event information in response', async () => {
      const mockCategory = {
        id: 'cat1',
        tenantId: 'tenant1',
        contestId: 'c1',
        contest: {
          id: 'c1',
          eventId: 'e1',
          event: { id: 'e1', name: 'Spring Event' },
        },
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.finalCertification('cat1', 'u1');

      expect(result).toBeDefined();
    });
  });

  describe('rejectAudit', () => {
    it('should record audit rejection in activity log', async () => {
      const mockActivityLog = {
        id: 'log1',
        userId: 'u1',
        action: 'AUDIT_REJECTED',
        resourceType: 'CATEGORY',
        resourceId: 'cat1',
        details: { reason: 'Scores do not match' },
      };

      prismaMock.activityLog.create.mockResolvedValue(mockActivityLog as any);

      const result = await service.rejectAudit('cat1', 'u1', 'Scores do not match');

      expect(result.message).toBe('Audit rejected');
      expect(result.activityLog).toEqual(mockActivityLog);
      expect(prismaMock.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          tenantId: null,
          action: 'AUDIT_REJECTED',
          resourceType: 'CATEGORY',
          resourceId: 'cat1',
          details: { reason: 'Scores do not match' },
        },
      });
    });

    it('should handle rejection without reason', async () => {
      prismaMock.activityLog.create.mockResolvedValue({} as any);

      await service.rejectAudit('cat1', 'u1', '');

      expect(prismaMock.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: { reason: 'No reason provided' },
        }),
      });
    });
  });

  describe('getScoreVerification', () => {
    it('should retrieve and group scores for verification', async () => {
      const mockScores = [
        {
          id: 's1',
          score: 85,
          contestantId: 'cont1',
          contestant: { id: 'cont1', name: 'Alice' },
          judge: { id: 'j1', name: 'Judge One' },
          criterion: { id: 'cr1', name: 'Technique' },
          category: { id: 'cat1', name: 'Solo' },
        },
        {
          id: 's2',
          score: 90,
          contestantId: 'cont1',
          contestant: { id: 'cont1', name: 'Alice' },
          judge: { id: 'j2', name: 'Judge Two' },
          criterion: { id: 'cr1', name: 'Technique' },
          category: { id: 'cat1', name: 'Solo' },
        },
      ];

      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat1' } as any);
      prismaMock.score.findMany.mockResolvedValue(mockScores as any);

      const result = await service.getScoreVerification('cat1');

      expect(result.categoryId).toBe('cat1');
      expect(result.scores).toHaveLength(1);
      expect(result.scores[0].contestant.name).toBe('Alice');
      expect(result.scores[0].totalScore).toBe(175);
      expect(result.scores[0].averageScore).toBe(87.5);
    });

    it('should filter by contestantId when provided', async () => {
      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat1' } as any);
      prismaMock.score.findMany.mockResolvedValue([]);

      await service.getScoreVerification('cat1', 'cont1');

      expect(prismaMock.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            categoryId: 'cat1',
            contestantId: 'cont1',
          },
        })
      );
    });

    it('should throw NotFoundError when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.getScoreVerification('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should calculate averages correctly', async () => {
      const mockScores = [
        {
          score: 80,
          contestantId: 'cont1',
          contestant: { id: 'cont1' },
        },
        {
          score: 90,
          contestantId: 'cont1',
          contestant: { id: 'cont1' },
        },
        {
          score: 70,
          contestantId: 'cont1',
          contestant: { id: 'cont1' },
        },
      ];

      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat1' } as any);
      prismaMock.score.findMany.mockResolvedValue(mockScores as any);

      const result = await service.getScoreVerification('cat1');

      expect(result.scores[0].averageScore).toBe(80);
    });
  });

  describe('verifyScore', () => {
    it('should verify a score with comments', async () => {
      const mockScore = {
        id: 's1',
        score: 85,
        judge: { id: 'j1' },
        contestant: { id: 'cont1' },
        criterion: { id: 'cr1' },
        category: { id: 'cat1' },
      };

      const mockUpdated = {
        ...mockScore,
        isCertified: true,
        certifiedBy: 'u1',
        certifiedAt: expect.any(Date),
      };

      prismaMock.score.findUnique.mockResolvedValue(mockScore as any);
      prismaMock.score.update.mockResolvedValue(mockUpdated as any);

      const result = await service.verifyScore('s1', 'u1', {
        verified: true,
        comments: 'Score verified',
      });

      expect(result.isCertified).toBe(true);
      expect(prismaMock.score.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: expect.objectContaining({
          isCertified: true,
          certifiedBy: 'u1',
          certifiedAt: expect.any(Date),
        }),
      });
    });

    it('should mark score as unverified with issues', async () => {
      prismaMock.score.findUnique.mockResolvedValue({ id: 's1' } as any);
      prismaMock.score.update.mockResolvedValue({} as any);

      await service.verifyScore('s1', 'u1', {
        verified: false,
        issues: 'Score calculation error',
      });

      expect(prismaMock.score.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: expect.objectContaining({
          isCertified: false,
          certifiedBy: 'u1',
          certifiedAt: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundError when score does not exist', async () => {
      prismaMock.score.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyScore('nonexistent', 'u1', { verified: true })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getTallyMasterStatus', () => {
    it('should return tally master verification status', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Solo',
        contest: { id: 'c1', event: { id: 'e1' } },
        scores: [
          { id: 's1', verified: true },
          { id: 's2', verified: true },
          { id: 's3', verified: false },
        ],
        categoryCertifications: [{ role: 'TALLY_MASTER' }],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getTallyMasterStatus('cat1');

      expect(result.categoryId).toBe('cat1');
      expect(result.totalScores).toBe(3);
      expect(result.verifiedScores).toBe(2);
      expect(result.pendingVerification).toBe(1);
      expect(result.verificationProgress).toBe('66.67');
      expect(result.tallyMasterCertified).toBe(true);
    });

    it('should throw NotFoundError when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.getTallyMasterStatus('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should handle zero scores', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Solo',
        scores: [],
        categoryCertifications: [],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getTallyMasterStatus('cat1');

      expect(result.totalScores).toBe(0);
      expect(result.verificationProgress).toBe(0);
    });
  });

  describe('getCertificationWorkflow', () => {
    it('should return certification workflow status', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Solo',
        contest: {
          id: 'c1',
          name: 'Talent Show',
          event: { id: 'e1', name: 'Spring Event' },
        },
        scores: [{ id: 's1', createdAt: new Date() }],
        categoryCertifications: [
          { role: 'TALLY_MASTER', certifiedAt: new Date() },
          { role: 'AUDITOR', certifiedAt: new Date() },
        ],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getCertificationWorkflow('cat1');

      expect(result.categoryId).toBe('cat1');
      expect(result.steps).toHaveLength(4);
      expect(result.currentStep).toBe(3);
      expect(result.overallStatus).toBe('AUDITOR_CERTIFIED');
    });

    it('should show pending status for new category', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Solo',
        contest: { id: 'c1', name: 'Contest', event: { id: 'e1', name: 'Event' } },
        scores: [],
        categoryCertifications: [],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getCertificationWorkflow('cat1');

      expect(result.currentStep).toBe(1);
      expect(result.overallStatus).toBe('PENDING');
    });

    it('should throw NotFoundError when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.getCertificationWorkflow('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('generateSummaryReport', () => {
    it('should generate comprehensive summary report', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Solo',
        description: 'Solo performance',
        scoreCap: 100,
        contest: {
          id: 'c1',
          name: 'Talent Show',
          event: { id: 'e1', name: 'Spring Event' },
        },
        scores: [
          {
            score: 85,
            contestantId: 'cont1',
            judgeId: 'j1',
            contestant: { id: 'cont1', name: 'Alice' },
          },
          {
            score: 90,
            contestantId: 'cont2',
            judgeId: 'j1',
            contestant: { id: 'cont2', name: 'Bob' },
          },
        ],
        categoryCertifications: [{ role: 'TALLY_MASTER' }],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.generateSummaryReport('cat1', 'u1', true);

      expect(result.category.id).toBe('cat1');
      expect(result.statistics.totalScores).toBe(2);
      expect(result.statistics.averageScore).toBe(87.5);
      expect(result.rankings).toHaveLength(2);
      expect(result.rankings[0].rank).toBe(1);
      expect(result.generatedBy).toBe('u1');
    });

    it('should include detailed scores when requested', async () => {
      const mockCategory = {
        id: 'cat1',
        scores: [
          {
            score: 85,
            contestantId: 'cont1',
            judgeId: 'j1',
            contestant: { id: 'cont1' },
          },
        ],
        contest: { id: 'c1', event: { id: 'e1' } },
        categoryCertifications: [],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.generateSummaryReport('cat1', 'u1', true);

      expect(result.rankings[0].scores).toBeDefined();
    });

    it('should exclude detailed scores when not requested', async () => {
      const mockCategory = {
        id: 'cat1',
        scores: [
          {
            score: 85,
            contestantId: 'cont1',
            judgeId: 'j1',
            contestant: { id: 'cont1' },
          },
        ],
        contest: { id: 'c1', event: { id: 'e1' } },
        categoryCertifications: [],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.generateSummaryReport('cat1', 'u1', false);

      expect(result.rankings[0].scores).toBeUndefined();
    });

    it('should throw NotFoundError when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(
        service.generateSummaryReport('nonexistent', 'u1')
      ).rejects.toThrow(NotFoundError);
    });

    it('should calculate score statistics correctly', async () => {
      const mockCategory = {
        id: 'cat1',
        scores: [
          { score: 70, contestantId: 'cont1', judgeId: 'j1', contestant: { id: 'cont1' } },
          { score: 85, contestantId: 'cont2', judgeId: 'j1', contestant: { id: 'cont2' } },
          { score: 95, contestantId: 'cont3', judgeId: 'j1', contestant: { id: 'cont3' } },
        ],
        contest: { id: 'c1', event: { id: 'e1' } },
        categoryCertifications: [],
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.generateSummaryReport('cat1', 'u1');

      expect(result.statistics.maxScore).toBe(95);
      expect(result.statistics.minScore).toBe(70);
      expect(result.statistics.scoreRange).toBe(25);
    });
  });

  describe('getAuditHistory', () => {
    it('should retrieve audit history logs', async () => {
      const mockLogs = [
        {
          id: 'log1',
          action: 'AUDIT_REJECTED',
          resourceType: 'CATEGORY',
          resourceId: 'cat1',
          user: { id: 'u1', name: 'Auditor' },
        },
      ];

      prismaMock.activityLog.findMany.mockResolvedValue(mockLogs as any);
      prismaMock.activityLog.count.mockResolvedValue(1);

      const result = await service.getAuditHistory(undefined, 1, 20);

      expect(result.auditLogs).toEqual(mockLogs);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
    });

    it('should filter by categoryId', async () => {
      prismaMock.activityLog.findMany.mockResolvedValue([]);
      prismaMock.activityLog.count.mockResolvedValue(0);

      await service.getAuditHistory('cat1');

      expect(prismaMock.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            categoryId: 'cat1',
            resourceType: 'CATEGORY',
          },
        })
      );
    });

    it('should handle pagination', async () => {
      prismaMock.activityLog.findMany.mockResolvedValue([]);
      prismaMock.activityLog.count.mockResolvedValue(50);

      const result = await service.getAuditHistory(undefined, 2, 20);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        pages: 3,
      });
    });

    it('should order by createdAt descending', async () => {
      prismaMock.activityLog.findMany.mockResolvedValue([]);
      prismaMock.activityLog.count.mockResolvedValue(0);

      await service.getAuditHistory();

      expect(prismaMock.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });
});
