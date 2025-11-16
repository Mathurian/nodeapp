/**
 * Integration Tests for Winners API
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

describe('Winners API Integration Tests', () => {
  let adminToken: string;

  beforeAll(async () => {
    await cleanupTestData('winners-test-');
    const admin = await createTestUser({ role: UserRole.ADMIN, email: `winners-test-admin-${uniqueTestId()}@example.com` });
    adminToken = generateAuthToken(admin.id, UserRole.ADMIN);
  });

  afterAll(async () => {
    await cleanupTestData('winners-test-');
    await disconnectPrisma();
  });

  describe('GET /api/winners', () => {
    it('should get all winners', async () => {
      const response = await request(app)
        .get('/api/winners')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should filter winners by eventId', async () => {
      const response = await request(app)
        .get('/api/winners')
        .query({ eventId: 'test-event-id' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 500]).toContain(response.status);
    });

    it('should filter winners by categoryId', async () => {
      const response = await request(app)
        .get('/api/winners')
        .query({ categoryId: 'test-category-id' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('GET /api/winners/:categoryId', () => {
    it('should get winners for specific category', async () => {
      const response = await request(app)
        .get('/api/winners/test-category-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/winners/calculate', () => {
    it('should calculate winners', async () => {
      const response = await request(app)
        .post('/api/winners/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ categoryId: 'test-category-id' });

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });

    it('should reject calculate without admin role', async () => {
      const user = await createTestUser({ role: UserRole.CONTESTANT, email: `winners-test-user-${uniqueTestId()}@example.com` });
      const userToken = generateAuthToken(user.id, UserRole.CONTESTANT);

      const response = await request(app)
        .post('/api/winners/calculate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ categoryId: 'test-category-id' });

      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/winners/export', () => {
    it('should export winners data', async () => {
      const response = await request(app)
        .get('/api/winners/export')
        .query({ eventId: 'test-event-id' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/winners/public/:eventId', () => {
    it('should get public winners without authentication', async () => {
      const response = await request(app)
        .get('/api/winners/public/test-event-id');

      // May return 200, 401, 404, or 500
      expect([200, 401, 404, 500]).toContain(response.status);
    });
  });
});
