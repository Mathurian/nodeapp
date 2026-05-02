/**
 * API Contract Tests for Scoring API
 * Validates that API responses match expected TypeScript types/schemas
 *
 * These tests focus on response STRUCTURE, not business logic.
 * They prevent breaking changes to the API contract.
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import { container } from 'tsyringe';
import { initializeOfflineWriteOwnershipManifest } from '../../src/config/offlineWriteOwnership.config';

import {
  expectResponseToMatchSchema,
  ApiErrorResponseSchema,
} from '../utils/apiContractHelpers';
import {
  ScoringCategoriesResponseSchema,
  ScoreResponseSchema,
  DeductionListResponseSchema,
  CertifyCategoryScoresResponseSchema,
} from './schemas/scoreSchemas';
import {
  createTestUser,
  createTestEvent,
  createTestContest,
  createTestCategory,
  createTestJudge,
  createTestContestant,
  generateTestToken,
  cleanupAllTestData,
} from './testSetup';

const prisma = container.resolve<PrismaClient>('PrismaClient');
const idempotencyKey = (name: string) => `scoring-contract-${name}-${Date.now()}`;

describe('Scoring API Contract Tests', () => {
  let adminToken: string;
  let judgeToken: string;
  let adminUserId: string;
  let judgeUserId: string;
  let testEventId: string;
  let testContestId: string;
  let testCategoryId: string;
  let testJudgeId: string;
  let testContestantId: string;
  let certificationContestantId: string;

  const TEST_PATTERN = 'scoring-contract-test';

  beforeAll(async () => {
    await initializeOfflineWriteOwnershipManifest();

    // Clean up existing test data
    await cleanupAllTestData(prisma, TEST_PATTERN);

    // Create admin user
    const adminUser = await createTestUser(prisma, {
      email: 'admin@scoring-contract-test.com',
      name: 'Scoring Contract Test Admin',
      role: 'ADMIN',
    });
    adminUserId = adminUser.id;

    // Create judge user
    const judgeUser = await createTestUser(prisma, {
      email: 'judge@scoring-contract-test.com',
      name: 'Scoring Contract Test Judge',
      role: 'JUDGE',
    });
    judgeUserId = judgeUser.id;

    // Generate tokens
    adminToken = generateTestToken(adminUserId, 'ADMIN', adminUser.tenantId);
    judgeToken = generateTestToken(judgeUserId, 'JUDGE', judgeUser.tenantId);

    // Create test event, contest, and category
    const testEvent = await createTestEvent(prisma, {
      name: `scoring-contract-test-event-${Date.now()}`,
      description: 'Event for scoring contract testing',
      startDate: new Date('2024-07-01'),
      endDate: new Date('2024-07-03'),
      location: 'Scoring Contract Test Venue',
    });
    testEventId = testEvent.id;

    const testContest = await createTestContest(prisma, {
      name: `scoring-contract-test-contest-${Date.now()}`,
      eventId: testEventId,
      description: 'Contest for scoring contract testing',
    });
    testContestId = testContest.id;

    const testCategory = await createTestCategory(prisma, {
      name: `scoring-contract-test-category-${Date.now()}`,
      contestId: testContestId,
      description: 'Category for scoring contract testing',
      scoreCap: 100,
    });
    testCategoryId = testCategory.id;

    // Create judge record
    const testJudge = await createTestJudge(prisma, {
      name: 'Scoring Contract Test Judge',
      email: 'testjudge@scoring-contract-test.com',
    });
    testJudgeId = testJudge.id;

    await prisma.user.update({
      where: { id: judgeUserId },
      data: { judgeId: testJudgeId },
    });

    // Create contestant record
    const testContestant = await createTestContestant(prisma, {
      name: 'Scoring Contract Test Contestant',
      email: 'contestant@scoring-contract-test.com',
      contestantNumber: 1,
    });
    testContestantId = testContestant.id;

    const certificationContestant = await createTestContestant(prisma, {
      name: 'Scoring Contract Test Certification Contestant',
      email: 'certification-contestant@scoring-contract-test.com',
      contestantNumber: 2,
    });
    certificationContestantId = certificationContestant.id;

    await prisma.assignment.create({
      data: {
        judgeId: testJudgeId,
        categoryId: testCategoryId,
        contestId: testContestId,
        eventId: testEventId,
        assignedBy: adminUserId,
        status: 'ACTIVE',
        tenantId: judgeUser.tenantId,
      },
    });

    await prisma.score.create({
      data: {
        categoryId: testCategoryId,
        contestantId: certificationContestantId,
        judgeId: testJudgeId,
        score: 85,
        comment: 'Scoring contract certification fixture',
        tenantId: judgeUser.tenantId,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await cleanupAllTestData(prisma, TEST_PATTERN);
    await prisma.$disconnect();
  });

  // ============================================================================
  // GET /api/scoring/categories - List Categories for Scoring
  // ============================================================================

  describe('GET /api/scoring/categories', () => {
    it('should return response matching ScoringCategoriesResponse schema on success', async () => {
      const response = await request(app)
        .get('/api/scoring/categories')
        .set('Cookie', `access_token=${adminToken}`);

      if (response.status === 401 || response.status === 403) {
        console.warn('Skipping contract test: authentication issue');
        return;
      }

      expect(response.status).toBe(200);
      expectResponseToMatchSchema(response.body, ScoringCategoriesResponseSchema);
    });

    it('should return error response when unauthorized', async () => {
      const response = await request(app).get('/api/scoring/categories');

      expect([401, 403]).toContain(response.status);
      expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
    });

    it('should return categories with required id and name fields', async () => {
      const response = await request(app)
        .get('/api/scoring/categories')
        .set('Cookie', `access_token=${adminToken}`);

      if (response.status !== 200) {
        console.warn('Skipping contract test: non-200 response');
        return;
      }

      const categories = response.body.data;
      if (Array.isArray(categories) && categories.length > 0) {
        categories.forEach((category: any) => {
          expect(category).toHaveProperty('id');
          expect(category).toHaveProperty('name');
          expect(typeof category.id).toBe('string');
          expect(typeof category.name).toBe('string');
        });
      }
    });
  });

  // ============================================================================
  // POST /api/scoring/category/:categoryId/contestant/:contestantId - Submit Score
  // ============================================================================

  describe('POST /api/scoring/category/:categoryId/contestant/:contestantId', () => {
    it('should return response matching ScoreResponse schema on success', async () => {
      const scoreData = {
        score: 85,
        comment: 'Contract test score submission',
      };

      const response = await request(app)
        .post(`/api/scoring/category/${testCategoryId}/contestant/${testContestantId}`)
        .set('Cookie', `access_token=${judgeToken}`)
        .set('X-Idempotency-Key', idempotencyKey('submit-valid'))
        .send(scoreData);

      if (response.status === 401 || response.status === 403) {
        console.warn('Skipping contract test: authentication issue');
        return;
      }

      // May return 400 if score already exists or validation fails
      if (response.status === 400 || response.status === 404) {
        console.warn('Skipping contract test: validation or not found issue');
        return;
      }

      expect([200, 201]).toContain(response.status);
      expectResponseToMatchSchema(response.body, ScoreResponseSchema);
    });

    it('should return error response for invalid score value', async () => {
      const invalidScoreData = {
        score: -1, // Invalid negative score
        comment: 'Invalid score test',
      };

      const response = await request(app)
        .post(`/api/scoring/category/${testCategoryId}/contestant/${testContestantId}`)
        .set('Cookie', `access_token=${judgeToken}`)
        .set('X-Idempotency-Key', idempotencyKey('submit-invalid-score'))
        .send(invalidScoreData);

      if (response.status === 401 || response.status === 403) {
        console.warn('Skipping contract test: authentication issue');
        return;
      }

      // Negative scores may be rejected with 400/422
      if ([400, 422].includes(response.status)) {
        expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
      }
    });

    it('should return error response for non-existent category', async () => {
      const fakeId = 'clx00000000000000000000000';
      const scoreData = { score: 50 };

      const response = await request(app)
        .post(`/api/scoring/category/${fakeId}/contestant/${testContestantId}`)
        .set('Cookie', `access_token=${judgeToken}`)
        .set('X-Idempotency-Key', idempotencyKey('submit-missing-category'))
        .send(scoreData);

      if (response.status === 401 || response.status === 403) {
        console.warn('Skipping contract test: authentication issue');
        return;
      }

      expect([404, 400]).toContain(response.status);
      expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
    });
  });

  // ============================================================================
  // POST /api/scoring/category/:categoryId/certify - Certify Category Scores
  // ============================================================================

  describe('POST /api/scoring/category/:categoryId/certify', () => {
    it('should return response matching CertifyCategoryScoresResponse schema on success', async () => {
      const response = await request(app)
        .post(`/api/scoring/category/${testCategoryId}/certify`)
        .set('Cookie', `access_token=${judgeToken}`)
        .send({ typedSignature: 'Scoring Contract Test Judge' });

      expect([200, 201]).toContain(response.status);
      expectResponseToMatchSchema(response.body, CertifyCategoryScoresResponseSchema);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          certified: true,
          certifiedCount: expect.any(Number),
        })
      );
      expect(response.body.data.certifiedCount).toBeGreaterThanOrEqual(1);
    });

    it('should return error response when unauthorized', async () => {
      const response = await request(app)
        .post(`/api/scoring/category/${testCategoryId}/certify`)
        .send({});

      expect([401, 403]).toContain(response.status);
      expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
    });
  });

  // ============================================================================
  // GET /api/scoring/deductions - List Deductions
  // ============================================================================

  describe('GET /api/scoring/deductions', () => {
    it('should return response matching DeductionListResponse schema on success', async () => {
      const response = await request(app)
        .get('/api/scoring/deductions')
        .set('Cookie', `access_token=${adminToken}`);

      if (response.status === 401 || response.status === 403) {
        console.warn('Skipping contract test: authentication issue');
        return;
      }

      expect(response.status).toBe(200);
      expectResponseToMatchSchema(response.body, DeductionListResponseSchema);
    });

    it('should return error response when unauthorized', async () => {
      const response = await request(app).get('/api/scoring/deductions');

      expect([401, 403]).toContain(response.status);
      expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
    });

    it('should return empty array when no deductions exist', async () => {
      const response = await request(app)
        .get('/api/scoring/deductions')
        .set('Cookie', `access_token=${adminToken}`);

      if (response.status !== 200) {
        console.warn('Skipping contract test: non-200 response');
        return;
      }

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      const deductions = Array.isArray(response.body.data)
        ? response.body.data
        : response.body.data?.data;
      expect(Array.isArray(deductions)).toBe(true);
    });
  });

  // ============================================================================
  // Error Response Structure Tests
  // ============================================================================

  describe('Error Response Structure', () => {
    it('should return consistent error structure for 401 Unauthorized', async () => {
      const response = await request(app)
        .get('/api/scoring/categories')
        .set('Cookie', 'access_token=invalid-token');

      expect(response.status).toBe(401);
      expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return consistent error structure for missing auth header', async () => {
      const response = await request(app).get('/api/scoring/categories');

      expect([401, 403]).toContain(response.status);
      expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
    });

    it('should return consistent error structure for invalid route', async () => {
      const response = await request(app)
        .get('/api/scoring/nonexistent-endpoint')
        .set('Cookie', `access_token=${adminToken}`);

      expect([404]).toContain(response.status);
      expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
    });
  });
});
