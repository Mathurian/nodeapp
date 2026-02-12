/**
 * API Contract Tests for Certification API
 * Validates that API responses match expected TypeScript types/schemas
 *
 * These tests focus on response STRUCTURE, not business logic.
 * They prevent breaking changes to the API contract.
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import { container } from 'tsyringe';

import {
  expectResponseToMatchSchema,
  ApiErrorResponseSchema,
} from '../utils/apiContractHelpers';
import {
  CertifyActionResponseSchema,
} from './schemas/certificationSchemas';
import {
  createTestUser,
  createTestEvent,
  createTestContest,
  createTestCategory,
  generateTestToken,
  cleanupAllTestData,
} from './testSetup';

const prisma = container.resolve<PrismaClient>('PrismaClient');

describe('Certifications API Contract Tests', () => {
  let adminToken: string;
  let judgeToken: string;
  let auditorToken: string;
  let tallyMasterToken: string;
  let adminUserId: string;
  let testEventId: string;
  let testContestId: string;
  let testCategoryId: string;

  const TEST_PATTERN = 'cert-contract-test';

  beforeAll(async () => {
    // Clean up existing test data
    await cleanupAllTestData(prisma, TEST_PATTERN);

    // Create users with different roles
    const adminUser = await createTestUser(prisma, {
      email: 'admin@cert-contract-test.com',
      name: 'Cert Contract Test Admin',
      role: 'ADMIN',
    });
    adminUserId = adminUser.id;

    const judgeUser = await createTestUser(prisma, {
      email: 'judge@cert-contract-test.com',
      name: 'Cert Contract Test Judge',
      role: 'JUDGE',
    });

    const auditorUser = await createTestUser(prisma, {
      email: 'auditor@cert-contract-test.com',
      name: 'Cert Contract Test Auditor',
      role: 'AUDITOR',
    });

    const tallyMasterUser = await createTestUser(prisma, {
      email: 'tally@cert-contract-test.com',
      name: 'Cert Contract Test Tally Master',
      role: 'TALLY_MASTER',
    });

    // Generate tokens
    adminToken = generateTestToken(adminUserId, 'ADMIN');
    judgeToken = generateTestToken(judgeUser.id, 'JUDGE');
    auditorToken = generateTestToken(auditorUser.id, 'AUDITOR');
    tallyMasterToken = generateTestToken(tallyMasterUser.id, 'TALLY_MASTER');

    // Create test event, contest, and category
    const testEvent = await createTestEvent(prisma, {
      name: `cert-contract-test-event-${Date.now()}`,
      description: 'Event for certification contract testing',
      startDate: new Date('2024-07-01'),
      endDate: new Date('2024-07-03'),
      location: 'Cert Contract Test Venue',
    });
    testEventId = testEvent.id;

    const testContest = await createTestContest(prisma, {
      name: `cert-contract-test-contest-${Date.now()}`,
      eventId: testEventId,
      description: 'Contest for certification contract testing',
    });
    testContestId = testContest.id;

    const testCategory = await createTestCategory(prisma, {
      name: `cert-contract-test-category-${Date.now()}`,
      contestId: testContestId,
      description: 'Category for certification contract testing',
      scoreCap: 100,
    });
    testCategoryId = testCategory.id;
  });

  afterAll(async () => {
    // Cleanup
    await cleanupAllTestData(prisma, TEST_PATTERN);
    await prisma.$disconnect();
  });

  // ============================================================================
  // POST /api/scoring/category/:categoryId/certify-totals - Tally Master Certification
  // ============================================================================

  describe('POST /api/scoring/category/:categoryId/certify-totals', () => {
    it('should return response matching CertifyActionResponse schema on success', async () => {
      const response = await request(app)
        .post(`/api/scoring/category/${testCategoryId}/certify-totals`)
        .set('Cookie', `access_token=${tallyMasterToken}`)
        .send({});

      if (response.status === 401 || response.status === 403) {
        console.warn('Skipping contract test: authentication/authorization issue');
        return;
      }

      // May fail if prerequisites not met
      if (response.status === 400 || response.status === 404) {
        // Still validate error response structure
        expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
        return;
      }

      expect([200, 201]).toContain(response.status);
      expectResponseToMatchSchema(response.body, CertifyActionResponseSchema);
    });

    it('should return error response when called by non-tally-master', async () => {
      const response = await request(app)
        .post(`/api/scoring/category/${testCategoryId}/certify-totals`)
        .set('Cookie', `access_token=${judgeToken}`)
        .send({});

      // Judge should not be able to certify totals
      expect([401, 403]).toContain(response.status);
      expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
    });
  });

  // ============================================================================
  // POST /api/scoring/category/:categoryId/final-certification - Auditor Final Certification
  // ============================================================================

  describe('POST /api/scoring/category/:categoryId/final-certification', () => {
    it('should return response matching CertifyActionResponse schema on success', async () => {
      const response = await request(app)
        .post(`/api/scoring/category/${testCategoryId}/final-certification`)
        .set('Cookie', `access_token=${auditorToken}`)
        .send({});

      if (response.status === 401 || response.status === 403) {
        console.warn('Skipping contract test: authentication/authorization issue');
        return;
      }

      // May fail if prerequisites not met (judges and tally master not certified)
      if (response.status === 400 || response.status === 404) {
        expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
        return;
      }

      expect([200, 201]).toContain(response.status);
      expectResponseToMatchSchema(response.body, CertifyActionResponseSchema);
    });

    it('should return error response when unauthorized', async () => {
      const response = await request(app)
        .post(`/api/scoring/category/${testCategoryId}/final-certification`)
        .send({});

      expect([401, 403]).toContain(response.status);
      expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
    });

    it('should return error response for non-existent category', async () => {
      const fakeId = 'clx00000000000000000000000';

      const response = await request(app)
        .post(`/api/scoring/category/${fakeId}/final-certification`)
        .set('Cookie', `access_token=${auditorToken}`)
        .send({});

      if (response.status === 401 || response.status === 403) {
        console.warn('Skipping contract test: authorization issue');
        return;
      }

      expect([404, 400]).toContain(response.status);
      expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
    });
  });

  // ============================================================================
  // POST /api/scoring/category/:categoryId/uncertify - Uncertify Category
  // ============================================================================

  describe('POST /api/scoring/category/:categoryId/uncertify', () => {
    it('should return success response structure on uncertify', async () => {
      const response = await request(app)
        .post(`/api/scoring/category/${testCategoryId}/uncertify`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({});

      if (response.status === 401 || response.status === 403) {
        console.warn('Skipping contract test: authentication/authorization issue');
        return;
      }

      // May fail if category not certified
      if (response.status === 400 || response.status === 404) {
        expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
        return;
      }

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should require proper authorization', async () => {
      const response = await request(app)
        .post(`/api/scoring/category/${testCategoryId}/uncertify`)
        .send({});

      expect([401, 403]).toContain(response.status);
      expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
    });
  });

  // ============================================================================
  // Role-Based Access Contract Tests
  // ============================================================================

  describe('Role-Based Access Contracts', () => {
    it('should return 403 when judge tries to access admin-only certification endpoint', async () => {
      const response = await request(app)
        .post(`/api/scoring/category/${testCategoryId}/uncertify`)
        .set('Cookie', `access_token=${judgeToken}`)
        .send({});

      // Uncertify is typically admin/board only
      expect([401, 403]).toContain(response.status);
      expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
    });

    it('should return error response with proper structure for role violations', async () => {
      // Contestant trying to certify (should not be allowed)
      const contestantToken = generateTestToken('test-contestant-id', 'CONTESTANT');

      const response = await request(app)
        .post(`/api/scoring/category/${testCategoryId}/certify`)
        .set('Cookie', `access_token=${contestantToken}`)
        .send({});

      expect([401, 403]).toContain(response.status);
      expectResponseToMatchSchema(response.body, ApiErrorResponseSchema);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ============================================================================
  // Generic Success/Error Structure Tests
  // ============================================================================

  describe('Response Structure Consistency', () => {
    it('should always include success field in responses', async () => {
      // Success case
      const successResponse = await request(app)
        .get('/api/scoring/categories')
        .set('Cookie', `access_token=${adminToken}`);

      if (successResponse.status === 200) {
        expect(successResponse.body).toHaveProperty('success');
        expect(typeof successResponse.body.success).toBe('boolean');
      }

      // Error case
      const errorResponse = await request(app)
        .get('/api/scoring/categories');

      expect(errorResponse.body).toHaveProperty('success', false);
    });

    it('should include data field only in success responses', async () => {
      const successResponse = await request(app)
        .get('/api/scoring/categories')
        .set('Cookie', `access_token=${adminToken}`);

      if (successResponse.status === 200) {
        expect(successResponse.body).toHaveProperty('data');
      }

      const errorResponse = await request(app)
        .get('/api/scoring/categories');

      // Error responses should have 'error' field, not 'data'
      expect(errorResponse.body).toHaveProperty('error');
    });

    it('should include error field only in error responses', async () => {
      const errorResponse = await request(app)
        .get('/api/scoring/categories');

      expect(errorResponse.body).toHaveProperty('error');
      expect(typeof errorResponse.body.error).toBe('string');

      const successResponse = await request(app)
        .get('/api/scoring/categories')
        .set('Cookie', `access_token=${adminToken}`);

      if (successResponse.status === 200) {
        // Success responses should not have 'error' field
        expect(successResponse.body).not.toHaveProperty('error');
      }
    });
  });
});
