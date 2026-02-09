/**
 * Tests for Judge Contestant Certification Service
 * Unit tests with mocked dependencies
 */

import 'reflect-metadata';
import { JudgeContestantCertificationService } from '../../../src/services/JudgeContestantCertificationService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('JudgeContestantCertificationService', () => {
  let service: JudgeContestantCertificationService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const testCategoryId = 'cat-123';
  const testJudgeId = 'judge-123';
  const testContestantId = 'contestant-123';
  const tenantId = 'tenant-1';

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new JudgeContestantCertificationService(mockPrisma as any);
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getCategoryCertificationStatus', () => {
    it('should return certification status structure', async () => {
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([]);
      mockPrisma.category.findUnique.mockResolvedValue({
        id: testCategoryId,
        name: 'Test Category',
        contestId: 'contest-1',
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
        tenantId
      } as any);
      mockPrisma.categoryJudge.count.mockResolvedValue(0);
      mockPrisma.categoryContestant.count.mockResolvedValue(0);

      const status = await service.getCategoryCertificationStatus(testCategoryId);

      expect(status).toHaveProperty('categoryId');
      expect(status).toHaveProperty('categoryName');
      expect(status).toHaveProperty('totalJudges');
      expect(status).toHaveProperty('totalContestants');
      expect(status).toHaveProperty('expectedCertifications');
      expect(status).toHaveProperty('completedCertifications');
      expect(status).toHaveProperty('completionPercentage');
      expect(status).toHaveProperty('certificationsByJudge');
      expect(status).toHaveProperty('certificationsByContestant');
      expect(status).toHaveProperty('allCertifications');
    });

    it('should calculate completion percentage correctly', async () => {
      const mockCertifications = [
        { id: 'cert-1', judgeId: testJudgeId, categoryId: testCategoryId, contestantId: testContestantId, tenantId, createdAt: new Date() }
      ];

      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue(mockCertifications as any);
      mockPrisma.category.findUnique.mockResolvedValue({
        id: testCategoryId,
        name: 'Test Category',
        contestId: 'contest-1',
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
        tenantId
      } as any);
      mockPrisma.categoryJudge.count.mockResolvedValue(1);
      mockPrisma.categoryContestant.count.mockResolvedValue(2);

      const status = await service.getCategoryCertificationStatus(testCategoryId);

      // 1 completed out of 2 expected (1 judge * 2 contestants)
      expect(status.expectedCertifications).toBe(2);
      expect(status.completedCertifications).toBe(1);
      expect(status.completionPercentage).toBe(50);
    });

    it('should return arrays for grouped certifications', async () => {
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([]);
      mockPrisma.category.findUnique.mockResolvedValue({
        id: testCategoryId,
        name: 'Test Category',
        contestId: 'contest-1',
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
        tenantId
      } as any);
      mockPrisma.categoryJudge.count.mockResolvedValue(0);
      mockPrisma.categoryContestant.count.mockResolvedValue(0);

      const status = await service.getCategoryCertificationStatus(testCategoryId);

      expect(Array.isArray(status.certificationsByJudge)).toBe(true);
      expect(Array.isArray(status.certificationsByContestant)).toBe(true);
      expect(Array.isArray(status.allCertifications)).toBe(true);
    });

    it('should throw error if category not found', async () => {
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([]);
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.getCategoryCertificationStatus('nonexistent'))
        .rejects.toThrow();
    });
  });

  describe('getCertifications', () => {
    it('should return certifications filtered by judgeId', async () => {
      const mockCerts = [
        { id: 'cert-1', judgeId: testJudgeId, categoryId: testCategoryId, contestantId: testContestantId, tenantId }
      ];
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue(mockCerts as any);

      const result = await service.getCertifications(testJudgeId);

      expect(mockPrisma.judgeContestantCertification.findMany).toHaveBeenCalledWith({
        where: { judgeId: testJudgeId }
      });
      expect(result).toEqual(mockCerts);
    });

    it('should return certifications filtered by categoryId', async () => {
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([]);

      await service.getCertifications(undefined, testCategoryId);

      expect(mockPrisma.judgeContestantCertification.findMany).toHaveBeenCalledWith({
        where: { categoryId: testCategoryId }
      });
    });
  });

  describe('certify', () => {
    it('should create certification successfully', async () => {
      mockPrisma.judgeContestantCertification.findFirst.mockResolvedValue(null);
      const mockCreated = {
        id: 'new-cert',
        judgeId: testJudgeId,
        categoryId: testCategoryId,
        contestantId: testContestantId,
        tenantId
      };
      mockPrisma.judgeContestantCertification.create.mockResolvedValue(mockCreated as any);

      const result = await service.certify({
        judgeId: testJudgeId,
        categoryId: testCategoryId,
        contestantId: testContestantId,
        tenantId
      });

      expect(result).toEqual(mockCreated);
    });

    it('should throw error if certification already exists', async () => {
      mockPrisma.judgeContestantCertification.findFirst.mockResolvedValue({ id: 'existing' } as any);

      await expect(service.certify({
        judgeId: testJudgeId,
        categoryId: testCategoryId,
        contestantId: testContestantId,
        tenantId
      })).rejects.toThrow('Certification already exists');
    });

    it('should throw error if required fields are missing', async () => {
      await expect(service.certify({
        judgeId: '',
        categoryId: testCategoryId,
        contestantId: testContestantId,
        tenantId
      })).rejects.toThrow();
    });
  });

  describe('uncertify', () => {
    it('should delete certification successfully', async () => {
      mockPrisma.judgeContestantCertification.findUnique.mockResolvedValue({
        id: 'cert-1',
        judgeId: testJudgeId
      } as any);
      mockPrisma.judgeContestantCertification.delete.mockResolvedValue({ id: 'cert-1' } as any);

      await service.uncertify('cert-1');

      expect(mockPrisma.judgeContestantCertification.delete).toHaveBeenCalledWith({
        where: { id: 'cert-1' }
      });
    });

    it('should throw error if certification not found', async () => {
      mockPrisma.judgeContestantCertification.findUnique.mockResolvedValue(null);

      await expect(service.uncertify('nonexistent')).rejects.toThrow();
    });
  });
});
