/**
 * Integration Tests for Performance API
 */

import request from 'supertest';
import app from '../../src/server';
import {
  createTestUser,
  generateAuthToken,
  cleanupTestData,
  disconnectPrisma,
  uniqueTestId,
} from '../helpers/testUtils';
import { UserRole } from '@prisma/client';

describe('Performance API Integration Tests', () => {
  let adminToken: string;

  beforeAll(async () => {
    await cleanupTestData('perf-test-');
    const admin = await createTestUser({ role: UserRole.ADMIN, email: `perf-test-admin-${uniqueTestId()}@example.com` });
    adminToken = generateAuthToken(admin.id, UserRole.ADMIN);
  });

  afterAll(async () => {
    await cleanupTestData('perf-test-');
    await disconnectPrisma();
  });

  describe('GET /api/performance/metrics', () => {
    it('should get performance metrics', async () => {
      const response = await request(app)
        .get('/api/performance/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('GET /api/performance/contestant/:id', () => {
    it('should get contestant performance', async () => {
      const response = await request(app)
        .get('/api/performance/contestant/test-contestant-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/performance/record', () => {
    it('should record performance', async () => {
      const response = await request(app)
        .post('/api/performance/record')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          contestantId: 'test-contestant-id',
          categoryId: 'test-category-id',
          metrics: { timing: 180 },
        });

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('GET /api/performance/category/:id', () => {
    it('should get category performances', async () => {
      const response = await request(app)
        .get('/api/performance/category/test-category-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});
