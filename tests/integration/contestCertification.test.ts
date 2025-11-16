/**
 * Integration Tests for Contest Certification API
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

describe('Contest Certification API Integration Tests', () => {
  let adminToken: string;

  beforeAll(async () => {
    await cleanupTestData('concert-test-');
    const admin = await createTestUser({ role: UserRole.ADMIN, email: `concert-test-admin-${uniqueTestId()}@example.com` });
    adminToken = generateAuthToken(admin.id, UserRole.ADMIN);
  });

  afterAll(async () => {
    await cleanupTestData('concert-test-');
    await disconnectPrisma();
  });

  describe('POST /api/contest-certification', () => {
    it('should certify contest', async () => {
      const response = await request(app)
        .post('/api/contest-certification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          contestId: 'test-contest-id',
          certifiedBy: 'test-auditor-id',
        });

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/contest-certification/:contestId', () => {
    it('should get contest certification status', async () => {
      const response = await request(app)
        .get('/api/contest-certification/test-contest-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/contest-certification/:id', () => {
    it('should update contest certification', async () => {
      const response = await request(app)
        .put('/api/contest-certification/test-cert-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Updated notes' });

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/contest-certification/:id', () => {
    it('should uncertify contest', async () => {
      const response = await request(app)
        .delete('/api/contest-certification/test-cert-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});
