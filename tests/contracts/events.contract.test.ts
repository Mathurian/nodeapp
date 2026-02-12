import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server';
import { expectResponseToMatchSchema, ApiErrorResponseSchema } from '../utils/apiContractHelpers';
import { EventListResponseSchema } from './schemas';

describe('Events API Contract Tests', () => {
  let authToken: string;
  const tenantHeader = { 'X-Tenant-ID': 'default-tenant' };

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .set(tenantHeader)
      .send({ email: 'admin@localhost', password: 'Password123!' });

    if (loginResponse.body.data?.token) {
      authToken = loginResponse.body.data.token;
    }
  });

  describe('GET /api/v1/events', () => {
    it('should return response matching EventListResponse schema', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .set(tenantHeader)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(200);

      expectResponseToMatchSchema(
        response.body,
        EventListResponseSchema,
        'GET /api/v1/events'
      );
    });

    it('should return error response when unauthorized', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .set(tenantHeader);

      expect(response.status).toBeGreaterThanOrEqual(400);

      expectResponseToMatchSchema(
        response.body,
        ApiErrorResponseSchema,
        'GET /api/v1/events (unauthorized)'
      );
    });
  });

  describe('GET /api/v1/events/:id', () => {
    it('should return 404 error matching ApiErrorResponse schema for non-existent event', async () => {
      const response = await request(app)
        .get('/api/v1/events/non-existent-id')
        .set(tenantHeader)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(404);

      expectResponseToMatchSchema(
        response.body,
        ApiErrorResponseSchema,
        'GET /api/v1/events/:id (not found)'
      );
    });
  });
});
