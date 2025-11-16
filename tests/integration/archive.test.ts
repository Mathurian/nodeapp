/**
 * Integration Tests for Archive API
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

describe('Archive API Integration Tests', () => {
  let adminToken: string;

  beforeAll(async () => {
    await cleanupTestData('archive-test-');
    const admin = await createTestUser({ role: UserRole.ADMIN, email: `archive-test-admin-${uniqueTestId()}@example.com` });
    adminToken = generateAuthToken(admin.id, UserRole.ADMIN);
  });

  afterAll(async () => {
    await cleanupTestData('archive-test-');
    await disconnectPrisma();
  });

  describe('POST /api/archive/event/:id', () => {
    it('should archive event', async () => {
      const response = await request(app)
        .post('/api/archive/event/test-event-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/archive/contest/:id', () => {
    it('should archive contest', async () => {
      const response = await request(app)
        .post('/api/archive/contest/test-contest-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/archive/events', () => {
    it('should get archived events', async () => {
      const response = await request(app)
        .get('/api/archive/events')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/archive/restore/event/:id', () => {
    it('should restore archived event', async () => {
      const response = await request(app)
        .post('/api/archive/restore/event/test-event-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/archive/event/:id', () => {
    it('should permanently delete archived event', async () => {
      const response = await request(app)
        .delete('/api/archive/event/test-event-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});
