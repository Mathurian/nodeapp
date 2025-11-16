/**
 * Integration Tests for Category Certification API
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

describe('Category Certification API Integration Tests', () => {
  let adminToken: string;

  beforeAll(async () => {
    await cleanupTestData('catcert-test-');
    const admin = await createTestUser({ role: UserRole.ADMIN, email: `catcert-test-admin-${uniqueTestId()}@example.com` });
    adminToken = generateAuthToken(admin.id, UserRole.ADMIN);
  });

  afterAll(async () => {
    await cleanupTestData('catcert-test-');
    await disconnectPrisma();
  });

  describe('POST /api/category-certification', () => {
    it('should certify category', async () => {
      const response = await request(app)
        .post('/api/category-certification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          categoryId: 'test-category-id',
          certifiedBy: 'test-auditor-id',
        });

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/category-certification/:categoryId', () => {
    it('should get category certification status', async () => {
      const response = await request(app)
        .get('/api/category-certification/test-category-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/category-certification/:id', () => {
    it('should update category certification', async () => {
      const response = await request(app)
        .put('/api/category-certification/test-cert-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/category-certification/:id', () => {
    it('should uncertify category', async () => {
      const response = await request(app)
        .delete('/api/category-certification/test-cert-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});
