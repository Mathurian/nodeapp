/**
 * COMPLETE WORKING EXAMPLE - Authentication Integration Tests
 *
 * This is a fully implemented example showing how integration tests should look.
 * Use this as a template for implementing other test files.
 *
 * Key patterns demonstrated:
 * - Database setup/teardown
 * - Real HTTP requests with supertest
 * - Authentication token handling
 * - Comprehensive test coverage (happy path + edge cases)
 * - Proper assertions
 * - Test data management
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../src/server';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

describe('Authentication Integration Tests - COMPLETE EXAMPLE', () => {
  let testUser: any;
  let testAdmin: any;

  // ============================================================================
  // SETUP & TEARDOWN
  // ============================================================================

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: { email: { contains: '@authtest.com' } }
    });

    // Create test users with hashed passwords
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    testUser = await prisma.user.create({
      data: {
        email: 'contestant@authtest.com',
        name: 'Test Contestant',
        password: hashedPassword,
        role: 'CONTESTANT',
        isActive: true
      }
    });

    testAdmin = await prisma.user.create({
      data: {
        email: 'admin@authtest.com',
        name: 'Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: '@authtest.com' } }
    });
    await prisma.$disconnect();
  });

  // ============================================================================
  // LOGIN TESTS
  // ============================================================================

  describe('POST /api/auth/login', () => {

    // --- HAPPY PATH ---

    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'contestant@authtest.com',
          password: 'TestPassword123!'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');

      // Verify user data
      expect(response.body.user).toMatchObject({
        id: testUser.id,
        email: 'contestant@authtest.com',
        name: 'Test Contestant',
        role: 'CONTESTANT'
      });

      // Verify password is NOT in response
      expect(response.body.user).not.toHaveProperty('password');

      // Verify token is valid JWT
      expect(response.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

      // Verify token can be decoded
      const decoded = jwt.verify(response.body.token, JWT_SECRET);
      expect(decoded).toHaveProperty('id', testUser.id);
      expect(decoded).toHaveProperty('role', 'CONTESTANT');
    });

    it('should login admin user with admin role', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@authtest.com',
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(response.body.user.role).toBe('ADMIN');
    });

    // --- ERROR CASES ---

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'contestant@authtest.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/invalid|incorrect|wrong/i);
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@authtest.com',
          password: 'TestPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    // --- VALIDATION TESTS ---

    it('should reject login with missing email', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ password: 'TestPassword123!' })
        .expect(400);
    });

    it('should reject login with missing password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'contestant@authtest.com' })
        .expect(400);
    });

    it('should reject login with invalid email format', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'TestPassword123!'
        })
        .expect(400);
    });

    it('should reject login with empty credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);
    });

    // --- EDGE CASES ---

    it('should reject login for inactive user', async () => {
      // Create inactive user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      const inactiveUser = await prisma.user.create({
        data: {
          email: 'inactive@authtest.com',
          name: 'Inactive User',
          password: hashedPassword,
          role: 'CONTESTANT',
          isActive: false
        }
      });

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@authtest.com',
          password: 'TestPassword123!'
        })
        .expect(403);

      // Cleanup
      await prisma.user.delete({ where: { id: inactiveUser.id } });
    });

    it('should handle case-insensitive email login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'CONTESTANT@AUTHTEST.COM', // Uppercase
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(response.body.user.email).toBe('contestant@authtest.com');
    });
  });

  // ============================================================================
  // GET PROFILE TESTS
  // ============================================================================

  describe('GET /api/auth/profile', () => {
    let authToken: string;

    beforeAll(async () => {
      // Get auth token for tests
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'contestant@authtest.com',
          password: 'TestPassword123!'
        });
      authToken = loginResponse.body.token;
    });

    // --- HAPPY PATH ---

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        id: testUser.id,
        email: 'contestant@authtest.com',
        name: 'Test Contestant',
        role: 'CONTESTANT'
      });
      expect(response.body.user).not.toHaveProperty('password');
    });

    // --- ERROR CASES ---

    it('should reject request without Authorization header', async () => {
      await request(app)
        .get('/api/auth/profile')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);
    });

    it('should reject request with expired token', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { id: testUser.id, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject request with malformed Authorization header', async () => {
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', authToken) // Missing 'Bearer '
        .expect(401);
    });

    it('should reject request with token for deleted user', async () => {
      // Create temporary user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      const tempUser = await prisma.user.create({
        data: {
          email: 'temp@authtest.com',
          name: 'Temp User',
          password: hashedPassword,
          role: 'CONTESTANT'
        }
      });

      // Get token
      const tempToken = jwt.sign(
        { id: tempUser.id, role: tempUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Delete user
      await prisma.user.delete({ where: { id: tempUser.id } });

      // Token should be rejected
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${tempToken}`)
        .expect(401);
    });
  });

  // ============================================================================
  // LOGOUT TESTS
  // ============================================================================

  describe('POST /api/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'contestant@authtest.com',
          password: 'TestPassword123!'
        });
      authToken = loginResponse.body.token;
    });

    it('should successfully logout with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should allow logout without token (stateless JWT)', async () => {
      // Since JWT is stateless, logout without token should still succeed
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should support GET method for logout', async () => {
      await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  // ============================================================================
  // PASSWORD RESET TESTS
  // ============================================================================

  describe('POST /api/auth/forgot-password', () => {

    it('should initiate password reset for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'contestant@authtest.com' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');

      // Verify reset token was created in database
      const user = await prisma.user.findUnique({
        where: { email: 'contestant@authtest.com' }
      });
      expect(user).toHaveProperty('resetToken');
      expect(user).toHaveProperty('resetTokenExpiry');
      expect(user!.resetTokenExpiry).toBeInstanceOf(Date);
      expect(user!.resetTokenExpiry!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should not reveal if email does not exist (security)', async () => {
      // Security: Don't tell attackers if email exists
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@authtest.com' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject invalid email format', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('should reject missing email', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Generate reset token
      resetToken = jwt.sign(
        { email: 'contestant@authtest.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Save reset token to database
      await prisma.user.update({
        where: { email: 'contestant@authtest.com' },
        data: {
          resetToken,
          resetTokenExpiry: new Date(Date.now() + 3600000) // 1 hour from now
        }
      });
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword456!';

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'contestant@authtest.com',
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');

      // Verify reset token was cleared
      const user = await prisma.user.findUnique({
        where: { email: 'contestant@authtest.com' }
      });
      expect(user!.resetToken).toBeNull();
      expect(user!.resetTokenExpiry).toBeNull();

      // Reset password back to original for other tests
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      await prisma.user.update({
        where: { id: testUser.id },
        data: { password: hashedPassword }
      });
    });

    it('should reject invalid reset token', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword456!'
        })
        .expect(400);
    });

    it('should reject expired reset token', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { email: 'contestant@authtest.com' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: expiredToken,
          password: 'NewPassword456!'
        })
        .expect(400);
    });

    it('should reject weak password', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: '123' // Too short
        })
        .expect(400);
    });
  });

  // ============================================================================
  // GET PERMISSIONS TESTS
  // ============================================================================

  describe('GET /api/auth/permissions', () => {
    it('should get permissions for admin user', async () => {
      // Login as admin
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@authtest.com',
          password: 'TestPassword123!'
        });

      const response = await request(app)
        .get('/api/auth/permissions')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('permissions');
      expect(Array.isArray(response.body.permissions)).toBe(true);
      expect(response.body.permissions.length).toBeGreaterThan(0);
    });

    it('should get limited permissions for contestant', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'contestant@authtest.com',
          password: 'TestPassword123!'
        });

      const response = await request(app)
        .get('/api/auth/permissions')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('permissions');
      expect(Array.isArray(response.body.permissions)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/auth/permissions')
        .expect(401);
    });
  });
});
