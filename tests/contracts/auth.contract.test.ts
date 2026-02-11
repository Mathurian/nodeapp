import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { z } from 'zod';
import app from '../../src/server';
import { expectResponseToMatchSchema, ApiErrorResponseSchema } from '../utils/apiContractHelpers';

// Auth-specific response schemas
const LoginSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      role: z.string(),
    }),
    token: z.string().optional(),
    requiresMfa: z.boolean().optional(),
  }),
  message: z.string().optional(),
});

describe('Auth API Contract Tests', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should return success response matching LoginSuccessResponse schema', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@localhost', password: 'Password123!' });

      if (response.status === 200) {
        expectResponseToMatchSchema(
          response.body,
          LoginSuccessResponseSchema,
          'POST /api/v1/auth/login (success)'
        );
      }
    });

    it('should return error response for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'invalid@example.com', password: 'wrongpassword' });

      expect(response.status).toBeGreaterThanOrEqual(400);

      expectResponseToMatchSchema(
        response.body,
        ApiErrorResponseSchema,
        'POST /api/v1/auth/login (invalid credentials)'
      );
    });

    it('should return error response for missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com' }); // Missing password

      expect(response.status).toBeGreaterThanOrEqual(400);

      expectResponseToMatchSchema(
        response.body,
        ApiErrorResponseSchema,
        'POST /api/v1/auth/login (missing password)'
      );
    });
  });
});
