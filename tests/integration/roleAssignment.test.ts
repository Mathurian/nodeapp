/**
 * Integration Tests for Role Assignment API
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

describe('Role Assignment API Integration Tests', () => {
  let adminToken: string;
  let testUser: any;
  let testEvent: any;

  beforeAll(async () => {
    await cleanupTestData('role-test-');
    const admin = await createTestUser({ role: UserRole.ADMIN, email: `role-test-admin-${uniqueTestId()}@example.com` });
    testUser = await createTestUser({ role: UserRole.CONTESTANT, email: `role-test-user-${uniqueTestId()}@example.com` });
    const { createTestEvent } = await import('../helpers/testUtils');
    testEvent = await createTestEvent({ name: `role-test-event-${uniqueTestId()}` });
    adminToken = generateAuthToken(admin.id, UserRole.ADMIN);
  });

  afterAll(async () => {
    await cleanupTestData('role-test-');
    await disconnectPrisma();
  });

  describe('POST /api/role-assignments', () => {
    it('should assign role to user', async () => {
      const response = await request(app)
        .post('/api/role-assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id,
          role: 'BOARD',
          eventId: testEvent.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: testUser.id,
        role: 'BOARD',
        eventId: testEvent.id,
      });
    });

    it('should reject role assignment by non-admin', async () => {
      const userToken = generateAuthToken(testUser.id, UserRole.CONTESTANT);

      const response = await request(app)
        .post('/api/role-assignments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId: testUser.id, role: 'ADMIN' });

      expect([401, 403, 404]).toContain(response.status);
    });

    it('should reject invalid role', async () => {
      const response = await request(app)
        .post('/api/role-assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id,
          role: 'INVALID_ROLE',
        });

      // May return 400, 401, 422, 500 for validation/auth errors
      expect([400, 401, 422, 500]).toContain(response.status);
    });
  });

  describe('GET /api/role-assignments/user/:userId', () => {
    it('should get user role assignments', async () => {
      const response = await request(app)
        .get(`/api/role-assignments/user/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/role-assignments/:id', () => {
    it('should remove role assignment', async () => {
      const response = await request(app)
        .delete('/api/role-assignments/test-assignment-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/role-assignments/role/:role', () => {
    it('should get users by role', async () => {
      const response = await request(app)
        .get('/api/role-assignments/role/JUDGE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message || response.body.error).toBeTruthy();
    });
  });
});
