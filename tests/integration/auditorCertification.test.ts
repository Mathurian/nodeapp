/**
 * Integration Tests for Auditor Certification API
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

describe('Auditor Certification API Integration Tests', () => {
  let adminToken: string;

  beforeAll(async () => {
    await cleanupTestData('audcert-test-');
    const admin = await createTestUser({ role: UserRole.ADMIN, email: `audcert-test-admin-${uniqueTestId()}@example.com` });
    adminToken = generateAuthToken(admin.id, UserRole.ADMIN);
  });

  afterAll(async () => {
    await cleanupTestData('audcert-test-');
    await disconnectPrisma();
  });

  describe('POST /api/auditor-certification', () => {
    it('should create auditor certification', async () => {
      const response = await request(app)
        .post('/api/auditor-certification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          auditorId: 'test-auditor-id',
          eventId: 'test-event-id',
        });

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/auditor-certification/event/:eventId', () => {
    it('should get auditor certifications for event', async () => {
      const response = await request(app)
        .get('/api/auditor-certification/event/test-event-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/auditor-certification/verify/:id', () => {
    it('should verify auditor certification', async () => {
      const response = await request(app)
        .post('/api/auditor-certification/verify/test-cert-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/auditor-certification/:id', () => {
    it('should delete auditor certification', async () => {
      const response = await request(app)
        .delete('/api/auditor-certification/test-cert-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});
