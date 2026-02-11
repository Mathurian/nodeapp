import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server';
import { expectResponseToMatchSchema, ApiErrorResponseSchema } from '../utils/apiContractHelpers';
import { UserListResponseSchema, UserResponseSchema } from './schemas';

describe('Users API Contract Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get auth token for testing
    // This assumes there's a test user or you need to create one
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@localhost', password: 'Password123!' });

    if (loginResponse.body.data?.token) {
      authToken = loginResponse.body.data.token;
    }
  });

  describe('GET /api/v1/users', () => {
    it('should return response matching UserListResponse schema', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(200);

      // Validate response structure
      expectResponseToMatchSchema(
        response.body,
        UserListResponseSchema,
        'GET /api/v1/users'
      );
    });

    it('should return error response matching ApiErrorResponse schema when unauthorized', async () => {
      const response = await request(app)
        .get('/api/v1/users');

      expect(response.status).toBeGreaterThanOrEqual(400);

      expectResponseToMatchSchema(
        response.body,
        ApiErrorResponseSchema,
        'GET /api/v1/users (unauthorized)'
      );
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return 404 error matching ApiErrorResponse schema for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(404);

      expectResponseToMatchSchema(
        response.body,
        ApiErrorResponseSchema,
        'GET /api/v1/users/:id (not found)'
      );
    });
  });
});
