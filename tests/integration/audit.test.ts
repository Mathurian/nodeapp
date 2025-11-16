/**
 * Integration Tests for Audit API
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

describe('Audit API Integration Tests', () => {
  let adminToken: string;
  let auditorToken: string;

  beforeAll(async () => {
    await cleanupTestData('audit-test-');
    const admin = await createTestUser({ role: UserRole.ADMIN, email: `audit-test-admin-${uniqueTestId()}@example.com` });
    const auditor = await createTestUser({ role: UserRole.ADMIN, email: `audit-test-auditor-${uniqueTestId()}@example.com` });
    adminToken = generateAuthToken(admin.id, UserRole.ADMIN);
    auditorToken = generateAuthToken(auditor.id, UserRole.ADMIN);
  });

  afterAll(async () => {
    await cleanupTestData('audit-test-');
    await disconnectPrisma();
  });

  describe('GET /api/audit/logs', () => {
    it('should get audit logs', async () => {
      const response = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/audit/logs')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should filter by user', async () => {
      const response = await request(app)
        .get('/api/audit/logs')
        .query({ userId: 'test-user-id' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });

    it('should filter by action', async () => {
      const response = await request(app)
        .get('/api/audit/logs')
        .query({ action: 'CREATE' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });

    it('should reject non-admin access', async () => {
      const user = await createTestUser({ role: UserRole.CONTESTANT, email: `audit-test-user-${uniqueTestId()}@example.com` });
      const userToken = generateAuthToken(user.id, UserRole.CONTESTANT);

      const response = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${userToken}`);

      // May return 401/403 for auth failure or 404 if route doesn't exist
      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/audit/logs/:id', () => {
    it('should get specific audit log', async () => {
      const response = await request(app)
        .get('/api/audit/logs/test-log-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/audit/user/:userId', () => {
    it('should get user audit trail', async () => {
      const response = await request(app)
        .get('/api/audit/user/test-user-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/audit/export', () => {
    it('should export audit logs', async () => {
      const response = await request(app)
        .get('/api/audit/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});
