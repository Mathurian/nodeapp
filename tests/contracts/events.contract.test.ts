import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { container } from 'tsyringe';
import app from '../../src/server';
import { expectResponseToMatchSchema, ApiErrorResponseSchema } from '../utils/apiContractHelpers';
import { EventListResponseSchema } from './schemas';
import {
  createTestUser,
  generateTestToken,
  cleanupAllTestData,
} from './testSetup';

const prisma = container.resolve<PrismaClient>('PrismaClient');

describe('Events API Contract Tests', () => {
  let adminToken: string;
  const tenantHeader = { 'X-Tenant-ID': 'default-tenant' };
  const TEST_PATTERN = 'events-contract-test';

  beforeAll(async () => {
    await cleanupAllTestData(prisma, TEST_PATTERN);

    const adminUser = await createTestUser(prisma, {
      email: `admin@${TEST_PATTERN}.com`,
      name: 'Events Contract Test Admin',
      role: 'ADMIN',
    });

    adminToken = generateTestToken(adminUser.id, 'ADMIN', adminUser.tenantId);
  });

  afterAll(async () => {
    await cleanupAllTestData(prisma, TEST_PATTERN);
  });

  describe('GET /api/v1/events', () => {
    it('should return response matching EventListResponse schema', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .set(tenantHeader)
        .set('Cookie', `access_token=${adminToken}`);

      expect(response.status).toBe(200);

      expectResponseToMatchSchema(
        response.body,
        EventListResponseSchema,
        'GET /api/v1/events'
      );
    });

    it('should return error response when unauthorized', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .set(tenantHeader);

      expect(response.status).toBeGreaterThanOrEqual(400);

      expectResponseToMatchSchema(
        response.body,
        ApiErrorResponseSchema,
        'GET /api/v1/events (unauthorized)'
      );
    });
  });

  describe('GET /api/v1/events/:id', () => {
    it('should return 404 error matching ApiErrorResponse schema for non-existent event', async () => {
      const response = await request(app)
        .get('/api/v1/events/non-existent-id-00000000')
        .set(tenantHeader)
        .set('Cookie', `access_token=${adminToken}`);

      expect(response.status).toBe(404);

      expectResponseToMatchSchema(
        response.body,
        ApiErrorResponseSchema,
        'GET /api/v1/events/:id (not found)'
      );
    });
  });
});
