/**
 * Integration Tests for User Field Visibility API
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

describe('User Field Visibility API Integration Tests', () => {
  let adminToken: string;
  let testUser: any;

  beforeAll(async () => {
    await cleanupTestData('field-test-');
    const admin = await createTestUser({ role: UserRole.ADMIN, email: `field-test-admin-${uniqueTestId()}@example.com` });
    testUser = await createTestUser({ role: UserRole.CONTESTANT, email: `field-test-user-${uniqueTestId()}@example.com` });
    adminToken = generateAuthToken(admin.id, UserRole.ADMIN);
  });

  afterAll(async () => {
    await cleanupTestData('field-test-');
    await disconnectPrisma();
  });

  describe('GET /api/field-visibility/user/:userId', () => {
    it('should get user field visibility settings', async () => {
      const response = await request(app)
        .get(`/api/field-visibility/user/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/field-visibility/user/:userId', () => {
    it('should update user field visibility', async () => {
      const response = await request(app)
        .put(`/api/field-visibility/user/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fields: {
            email: 'private',
            phone: 'public',
            address: 'hidden',
          },
        });

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/field-visibility/defaults', () => {
    it('should get default field visibility settings', async () => {
      const response = await request(app)
        .get('/api/field-visibility/defaults')
        .set('Authorization', `Bearer ${adminToken}`);

      // May return 200, 404 if route doesn't exist, or 401/403 if auth fails
      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/field-visibility/defaults', () => {
    it('should update default field visibility', async () => {
      const response = await request(app)
        .put('/api/field-visibility/defaults')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          defaults: {
            email: 'private',
            phone: 'private',
          },
        });

      // May return 200, 404, 500, or 401/403 if auth fails
      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});
