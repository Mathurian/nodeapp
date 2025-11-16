/**
 * MFA Integration Tests
 * End-to-end tests for Multi-Factor Authentication
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/server';
import * as speakeasy from 'speakeasy';

const prisma = new PrismaClient();

describe('MFA Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let mfaSecret: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'mfa-test@example.com',
        password: '$2a$10$hashedpassword',
        name: 'MFA Test User',
        role: 'USER',
        isActive: true
      }
    });
    userId = user.id;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'mfa-test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.delete({
      where: { id: userId }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/mfa/setup', () => {
    it('should generate MFA setup with QR code and backup codes', async () => {
      const response = await request(app)
        .post('/api/mfa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('backupCodes');
      expect(response.body).toHaveProperty('manualEntryKey');
      expect(response.body.backupCodes).toHaveLength(10);

      mfaSecret = response.body.secret;
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/mfa/setup')
        .expect(401);
    });
  });

  describe('POST /api/mfa/enable', () => {
    beforeEach(async () => {
      // Generate fresh secret
      const setupResponse = await request(app)
        .post('/api/mfa/setup')
        .set('Authorization', `Bearer ${authToken}`);

      mfaSecret = setupResponse.body.secret;
    });

    it('should enable MFA with valid TOTP token', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const backupCodes = ['1234-5678', 'ABCD-EFGH'];

      const response = await request(app)
        .post('/api/mfa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          secret: mfaSecret,
          token,
          backupCodes
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should fail with invalid TOTP token', async () => {
      const response = await request(app)
        .post('/api/mfa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          secret: mfaSecret,
          token: '000000',
          backupCodes: []
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/mfa/enable')
        .send({
          secret: mfaSecret,
          token: '123456',
          backupCodes: []
        })
        .expect(401);
    });
  });

  describe('POST /api/mfa/verify', () => {
    beforeEach(async () => {
      // Enable MFA first
      const setupResponse = await request(app)
        .post('/api/mfa/setup')
        .set('Authorization', `Bearer ${authToken}`);

      mfaSecret = setupResponse.body.secret;

      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      await request(app)
        .post('/api/mfa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          secret: mfaSecret,
          token,
          backupCodes: setupResponse.body.backupCodes
        });
    });

    it('should verify valid TOTP token', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/api/mfa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/mfa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: '000000' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/mfa/verify')
        .send({ token: '123456' })
        .expect(401);
    });
  });

  describe('POST /api/mfa/disable', () => {
    beforeEach(async () => {
      // Enable MFA first
      const setupResponse = await request(app)
        .post('/api/mfa/setup')
        .set('Authorization', `Bearer ${authToken}`);

      mfaSecret = setupResponse.body.secret;

      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      await request(app)
        .post('/api/mfa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          secret: mfaSecret,
          token,
          backupCodes: setupResponse.body.backupCodes
        });
    });

    it('should disable MFA with valid password', async () => {
      const response = await request(app)
        .post('/api/mfa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 'password123' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/mfa/disable')
        .send({ password: 'password123' })
        .expect(401);
    });
  });

  describe('GET /api/mfa/status', () => {
    it('should return MFA status for user', async () => {
      const response = await request(app)
        .get('/api/mfa/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('enabled');
      expect(typeof response.body.enabled).toBe('boolean');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/mfa/status')
        .expect(401);
    });
  });

  describe('POST /api/mfa/backup-codes/regenerate', () => {
    beforeEach(async () => {
      // Enable MFA first
      const setupResponse = await request(app)
        .post('/api/mfa/setup')
        .set('Authorization', `Bearer ${authToken}`);

      mfaSecret = setupResponse.body.secret;

      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      await request(app)
        .post('/api/mfa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          secret: mfaSecret,
          token,
          backupCodes: setupResponse.body.backupCodes
        });
    });

    it('should regenerate backup codes', async () => {
      const response = await request(app)
        .post('/api/mfa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('backupCodes');
      expect(response.body.backupCodes).toHaveLength(10);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/mfa/backup-codes/regenerate')
        .expect(401);
    });

    it('should fail if MFA not enabled', async () => {
      // Disable MFA
      await request(app)
        .post('/api/mfa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 'password123' });

      const response = await request(app)
        .post('/api/mfa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('MFA Login Flow', () => {
    it('should require MFA verification after successful login', async () => {
      // Enable MFA
      const setupResponse = await request(app)
        .post('/api/mfa/setup')
        .set('Authorization', `Bearer ${authToken}`);

      mfaSecret = setupResponse.body.secret;

      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      await request(app)
        .post('/api/mfa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          secret: mfaSecret,
          token,
          backupCodes: setupResponse.body.backupCodes
        });

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      // Login - should return mfaRequired
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa-test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('mfaRequired', true);
      expect(loginResponse.body).toHaveProperty('tempToken');

      // Verify MFA
      const verifyToken = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const verifyResponse = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          tempToken: loginResponse.body.tempToken,
          code: verifyToken
        })
        .expect(200);

      expect(verifyResponse.body).toHaveProperty('token');
      expect(verifyResponse.body).toHaveProperty('user');
    });
  });

  describe('Backup Code Usage', () => {
    it('should accept backup code for login and remove it', async () => {
      // Enable MFA and get backup codes
      const setupResponse = await request(app)
        .post('/api/mfa/setup')
        .set('Authorization', `Bearer ${authToken}`);

      mfaSecret = setupResponse.body.secret;
      const backupCodes = setupResponse.body.backupCodes;

      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      await request(app)
        .post('/api/mfa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          secret: mfaSecret,
          token,
          backupCodes
        });

      // Try to verify with backup code
      const verifyResponse = await request(app)
        .post('/api/mfa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: backupCodes[0] })
        .expect(200);

      expect(verifyResponse.body).toHaveProperty('success', true);
      expect(verifyResponse.body).toHaveProperty('remainingBackupCodes');
      expect(verifyResponse.body.remainingBackupCodes).toBeLessThan(10);

      // Try to use same backup code again - should fail
      await request(app)
        .post('/api/mfa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: backupCodes[0] })
        .expect(400);
    });
  });
});
