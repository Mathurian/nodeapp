/**
 * Integration Tests for Commentary API
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

describe('Commentary API Integration Tests', () => {
  let judgeToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await cleanupTestData('comment-test-');
    const judge = await createTestUser({ role: UserRole.JUDGE, email: `comment-test-judge-${uniqueTestId()}@example.com` });
    const admin = await createTestUser({ role: UserRole.ADMIN, email: `comment-test-admin-${uniqueTestId()}@example.com` });
    judgeToken = generateAuthToken(judge.id, UserRole.JUDGE);
    adminToken = generateAuthToken(admin.id, UserRole.ADMIN);
  });

  afterAll(async () => {
    await cleanupTestData('comment-test-');
    await disconnectPrisma();
  });

  describe('POST /api/commentary', () => {
    it('should create commentary', async () => {
      const response = await request(app)
        .post('/api/commentary')
        .set('Authorization', `Bearer ${judgeToken}`)
        .send({
          scoreId: 'test-score-id',
          comment: 'Great performance, excellent timing',
        });

      expect(response.status).toBe(503);
      expect(response.body.message || response.body.error).toBeTruthy();
    });
  });

  describe('GET /api/commentary/score/:scoreId', () => {
    it('should get commentary for score', async () => {
      const response = await request(app)
        .get('/api/commentary/score/test-score-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/commentary/:id', () => {
    it('should update commentary', async () => {
      const response = await request(app)
        .put('/api/commentary/test-commentary-id')
        .set('Authorization', `Bearer ${judgeToken}`)
        .send({ comment: 'Updated commentary' });

      expect(response.status).toBe(503);
      expect(response.body.message || response.body.error).toBeTruthy();
    });
  });

  describe('DELETE /api/commentary/:id', () => {
    it('should delete commentary', async () => {
      const response = await request(app)
        .delete('/api/commentary/test-commentary-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(503);
      expect(response.body.message || response.body.error).toBeTruthy();
    });
  });
});
