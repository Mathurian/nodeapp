/**
 * Tests for Judge Contestant Certification Service
 * Tests the fixes for judge certification status endpoint
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { container } from '../../src/config/container';
import { JudgeContestantCertificationService } from '../../src/services/JudgeContestantCertificationService';
import { PrismaClient } from '@prisma/client';

describe('JudgeContestantCertificationService', () => {
  let service: JudgeContestantCertificationService;
  let prisma: PrismaClient;
  let testCategoryId: string;
  let testJudgeId: string;
  let testContestantId: string;

  beforeAll(async () => {
    prisma = container.resolve<PrismaClient>('PrismaClient');
    service = container.resolve<JudgeContestantCertificationService>(JudgeContestantCertificationService);

    // Create test data
    const event = await prisma.event.create({
      data: {
        name: 'Test Event',
        startDate: new Date(),
        endDate: new Date()
      }
    });

    const contest = await prisma.contest.create({
      data: {
        eventId: event.id,
        name: 'Test Contest'
      }
    });

    const category = await prisma.category.create({
      data: {
        contestId: contest.id,
        name: 'Test Category'
      }
    });
    testCategoryId = category.id;

    const judge = await prisma.judge.create({
      data: {
        name: 'Test Judge',
        email: `judge-${Date.now()}@test.com`
      }
    });
    testJudgeId = judge.id;

    const contestant = await prisma.contestant.create({
      data: {
        name: 'Test Contestant',
        email: `contestant-${Date.now()}@test.com`
      }
    });
    testContestantId = contestant.id;
  });

  afterAll(async () => {
    // Clean up
    if (testCategoryId) {
      await prisma.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    if (testJudgeId) {
      await prisma.judge.delete({ where: { id: testJudgeId } }).catch(() => {});
    }
    if (testContestantId) {
      await prisma.contestant.delete({ where: { id: testContestantId } }).catch(() => {});
    }
  });

  describe('getCategoryCertificationStatus', () => {
    it('should return certification status structure', async () => {
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
      const status = await service.getCategoryCertificationStatus(testCategoryId);

      if (status.expectedCertifications > 0) {
        const expectedPercentage = Math.round(
          (status.completedCertifications / status.expectedCertifications) * 100
        );
        expect(status.completionPercentage).toBe(expectedPercentage);
      } else {
        expect(status.completionPercentage).toBe(0);
      }
    });

    it('should return arrays for grouped certifications', async () => {
      const status = await service.getCategoryCertificationStatus(testCategoryId);

      expect(Array.isArray(status.certificationsByJudge)).toBe(true);
      expect(Array.isArray(status.certificationsByContestant)).toBe(true);
      expect(Array.isArray(status.allCertifications)).toBe(true);
    });
  });
});

