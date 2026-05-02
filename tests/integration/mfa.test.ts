/**
 * MFA Integration Tests
 * End-to-end tests for Multi-Factor Authentication
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/server';
import * as speakeasy from 'speakeasy';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { container } from 'tsyringe';
import { ensureTestTenant } from '../helpers/testUtils';

const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('MFA Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let mfaSecret: string;
  let tenantId: string;

  const mfaData = (body: any) => body.data || body;

  const setupMfa = async () => {
    const setupResponse = await request(app)
      .post('/api/mfa/setup')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    return mfaData(setupResponse.body);
  };

  const enableMfa = async () => {
    const setup = await setupMfa();
    mfaSecret = setup.secret;

    const token = speakeasy.totp({
      secret: mfaSecret,
      encoding: 'base32'
    });

    const enableResponse = await request(app)
      .post('/api/mfa/enable')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        secret: mfaSecret,
        token,
        backupCodes: setup.backupCodes
      })
      .expect(200);

    expect(enableResponse.body).toHaveProperty('success', true);

    return setup;
  };

  beforeAll(async () => {
    const tenant = await ensureTestTenant();
    tenantId = tenant.id;

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'mfa-test@example.com',
        password: hashedPassword,
        name: 'MFA Test User',
        role: 'CONTESTANT',
        isActive: true,
        sessionVersion: 1,
        tenantId,
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

    authToken =
      loginResponse.body?.data?.token ||
      loginResponse.body?.token ||
      jwt.sign({ userId, role: 'CONTESTANT', tenantId }, JWT_SECRET, { expiresIn: '1h' });
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

      const body = mfaData(response.body);
      expect(body).toHaveProperty('secret');
      expect(body).toHaveProperty('qrCode');
      expect(body).toHaveProperty('backupCodes');
      expect(body).toHaveProperty('manualEntryKey');
      expect(body.backupCodes).toHaveLength(10);

      mfaSecret = body.secret;
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/mfa/setup')
        .expect(401);
    });
  });

  describe('POST /api/mfa/enable', () => {
    beforeEach(async () => {
      const setup = await setupMfa();
      mfaSecret = setup.secret;
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
        .expect(200);

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
      await enableMfa();
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
        .expect(200);

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
      await enableMfa();
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

      const body = mfaData(response.body);
      expect(body).toHaveProperty('enabled');
      expect(typeof body.enabled).toBe('boolean');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/mfa/status')
        .expect(401);
    });
  });

  describe('POST /api/mfa/backup-codes/regenerate', () => {
    beforeEach(async () => {
      await enableMfa();
    });

    it('should regenerate backup codes', async () => {
      const response = await request(app)
        .post('/api/mfa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = mfaData(response.body);
      expect(body).toHaveProperty('backupCodes');
      expect(body.backupCodes).toHaveLength(10);
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
      await enableMfa();

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

      const loginBody = mfaData(loginResponse.body);
      expect(loginBody).toHaveProperty('requiresMFA', true);
      expect(loginBody).toHaveProperty('tempToken');

      // Verify MFA
      const verifyToken = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const verifyResponse = await request(app)
        .post('/api/auth/mfa/complete')
        .send({
          tempToken: loginBody.tempToken,
          code: verifyToken
        })
        .expect(200);

      const verifyBody = mfaData(verifyResponse.body);
      expect(verifyBody).toHaveProperty('user');
      const setCookieHeader = verifyResponse.headers['set-cookie'];
      const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : String(setCookieHeader || '');
      expect(setCookie).toContain('access_token=');
    });
  });

  describe('Backup Code Usage', () => {
    it('should accept backup code for login and remove it', async () => {
      const setup = await enableMfa();
      const backupCodes = setup.backupCodes;

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
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveProperty('success', false);
        });
    });
  });
});
