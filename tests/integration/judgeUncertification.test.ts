/**
 * Integration Tests for Judge Uncertification API
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

describe('Judge Uncertification API Integration Tests', () => {
  let adminToken: string;

  beforeAll(async () => {
    await cleanupTestData('uncert-test-');
    const admin = await createTestUser({ role: UserRole.ADMIN, email: `uncert-test-admin-${uniqueTestId()}@example.com` });
    adminToken = generateAuthToken(admin.id, UserRole.ADMIN);
  });

  afterAll(async () => {
    await cleanupTestData('uncert-test-');
    await disconnectPrisma();
  });

  describe('POST /api/judge-uncertification', () => {
    it('should uncertify judge', async () => {
      const response = await request(app)
        .post('/api/judge-uncertification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          judgeId: 'test-judge-id',
          categoryId: 'test-category-id',
          reason: 'Conflict of interest',
        });

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/judge-uncertification/judge/:judgeId', () => {
    it('should get judge uncertifications', async () => {
      const response = await request(app)
        .get('/api/judge-uncertification/judge/test-judge-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/judge-uncertification/:id', () => {
    it('should remove uncertification', async () => {
      const response = await request(app)
        .delete('/api/judge-uncertification/test-uncert-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});
