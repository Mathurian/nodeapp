import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { container } from 'tsyringe';
import app from '../../src/server';
import { expectResponseToMatchSchema, ApiErrorResponseSchema } from '../utils/apiContractHelpers';
import { UserListResponseSchema } from './schemas';
import {
  createTestUser,
  generateTestToken,
  cleanupAllTestData,
} from './testSetup';

const prisma = container.resolve<PrismaClient>('PrismaClient');

describe('Users API Contract Tests', () => {
  let adminToken: string;
  const tenantHeader = { 'X-Tenant-ID': 'default-tenant' };
  const TEST_PATTERN = 'users-contract-test';

  beforeAll(async () => {
    await cleanupAllTestData(prisma, TEST_PATTERN);

    const adminUser = await createTestUser(prisma, {
      email: `admin@${TEST_PATTERN}.com`,
      name: 'Users Contract Test Admin',
      role: 'ADMIN',
    });

    adminToken = generateTestToken(adminUser.id, 'ADMIN', adminUser.tenantId);
  });

  afterAll(async () => {
    await cleanupAllTestData(prisma, TEST_PATTERN);
  });

  describe('GET /api/v1/users', () => {
    it('should return response matching UserListResponse schema', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set(tenantHeader)
        .set('Cookie', `access_token=${adminToken}`);

      expect(response.status).toBe(200);

      expectResponseToMatchSchema(
        response.body,
        UserListResponseSchema,
        'GET /api/v1/users'
      );
    });

    it('should return error response matching ApiErrorResponse schema when unauthorized', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set(tenantHeader);

      expect(response.status).toBeGreaterThanOrEqual(400);

      expectResponseToMatchSchema(
        response.body,
        ApiErrorResponseSchema,
        'GET /api/v1/users (unauthorized)'
      );
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return 404 error matching ApiErrorResponse schema for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/users/non-existent-id-00000000')
        .set(tenantHeader)
        .set('Cookie', `access_token=${adminToken}`);

      expect(response.status).toBe(404);

      expectResponseToMatchSchema(
        response.body,
        ApiErrorResponseSchema,
        'GET /api/v1/users/:id (not found)'
      );
    });
  });
});
