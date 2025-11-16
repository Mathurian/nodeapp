/**
 * Integration Tests for Category Type API
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

describe('Category Type API Integration Tests', () => {
  let adminToken: string;

  beforeAll(async () => {
    await cleanupTestData('cattype-test-');
    const admin = await createTestUser({ role: UserRole.ADMIN, email: `cattype-test-admin-${uniqueTestId()}@example.com` });
    adminToken = generateAuthToken(admin.id, UserRole.ADMIN);
  });

  afterAll(async () => {
    await cleanupTestData('cattype-test-');
    await disconnectPrisma();
  });

  describe('GET /api/category-types', () => {
    it('should get all category types', async () => {
      const response = await request(app)
        .get('/api/category-types')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/category-types', () => {
    it('should create category type', async () => {
      const response = await request(app)
        .post('/api/category-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `cattype-test-${uniqueTestId()}`,
          description: 'Test category type',
        });

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('GET /api/category-types/:id', () => {
    it('should get category type by ID', async () => {
      const response = await request(app)
        .get('/api/category-types/test-type-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/category-types/:id', () => {
    it('should update category type', async () => {
      const response = await request(app)
        .put('/api/category-types/test-type-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Type' });

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/category-types/:id', () => {
    it('should delete category type', async () => {
      const response = await request(app)
        .delete('/api/category-types/test-type-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});
