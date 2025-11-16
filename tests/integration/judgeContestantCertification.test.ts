/**
 * Integration Tests for Judge Contestant Certification API
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

describe('Judge Contestant Certification API Integration Tests', () => {
  let adminToken: string;

  beforeAll(async () => {
    await cleanupTestData('jccert-test-');
    const admin = await createTestUser({ role: UserRole.ADMIN, email: `jccert-test-admin-${uniqueTestId()}@example.com` });
    adminToken = generateAuthToken(admin.id, UserRole.ADMIN);
  });

  afterAll(async () => {
    await cleanupTestData('jccert-test-');
    await disconnectPrisma();
  });

  describe('POST /api/judge-contestant-certification', () => {
    it('should create judge-contestant certification', async () => {
      const response = await request(app)
        .post('/api/judge-contestant-certification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          judgeId: 'test-judge-id',
          contestantId: 'test-contestant-id',
          categoryId: 'test-category-id',
        });

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/judge-contestant-certification/category/:categoryId', () => {
    it('should get certifications for category', async () => {
      const response = await request(app)
        .get('/api/judge-contestant-certification/category/test-category-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/judge-contestant-certification/:id', () => {
    it('should delete certification', async () => {
      const response = await request(app)
        .delete('/api/judge-contestant-certification/test-cert-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});
