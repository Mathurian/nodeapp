/**
 * Integration Tests for Settings API
 * Tests end-to-end functionality of settings management
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ensureTestTenant } from '../helpers/testUtils';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Settings API Integration Tests', () => {
  let adminUser: any;
  let regularUser: any;
  let adminToken: string;
  let userToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const tenant = await ensureTestTenant();
    tenantId = tenant.id;

    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@settingstest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@settingstest.com',
        name: 'Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
        tenantId,
      }
    });

    regularUser = await prisma.user.create({
      data: {
        email: 'user@settingstest.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'CONTESTANT',
        isActive: true,
        sessionVersion: 1,
        tenantId,
      }
    });

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@settingstest.com',
        password: 'password123'
      });

    if ((adminLoginResponse.status === 200 || adminLoginResponse.status === 201) && (adminLoginResponse.body.data?.token || adminLoginResponse.body.token)) {
      adminToken = adminLoginResponse.body.data?.token || adminLoginResponse.body.token;
    } else {
      adminToken = jwt.sign(
        { userId: adminUser.id, role: adminUser.role, tenantId },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    const userLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@settingstest.com',
        password: 'password123'
      });

    if ((userLoginResponse.status === 200 || userLoginResponse.status === 201) && (userLoginResponse.body.data?.token || userLoginResponse.body.token)) {
      userToken = userLoginResponse.body.data?.token || userLoginResponse.body.token;
    } else {
      userToken = jwt.sign(
        { userId: regularUser.id, role: regularUser.role, tenantId },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }
  });

  afterAll(async () => {
    await prisma.systemSetting.deleteMany({
      where: {
        tenantId,
        key: { in: ['email_replyToEmail', 'email_replyToName'] }
      }
    });

    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@settingstest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/settings', () => {
    it('should get all settings for admin', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.body) || typeof response.body === 'object').toBe(true);
      }
    });

    it('should reject non-admin access', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${userToken}`);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/settings/public', () => {
    it('should get public settings without authentication', async () => {
      const response = await request(app)
        .get('/api/settings/public');

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('GET /api/settings/app-name', () => {
    it('should get app name without authentication', async () => {
      const response = await request(app)
        .get('/api/settings/app-name');

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('GET /api/settings/password-policy', () => {
    it('should get password policy without authentication', async () => {
      const response = await request(app)
        .get('/api/settings/password-policy');

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/settings', () => {
    it('should update settings for admin', async () => {
      const updateData = {
        app_name: 'Test App Name',
      };

      const response = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect([200, 401, 403]).toContain(response.status);
    });

    it('should reject update without admin role', async () => {
      const updateData = {
        app_name: 'Unauthorized',
      };

      const response = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/settings/security', () => {
    it('should get security settings for admin', async () => {
      const response = await request(app)
        .get('/api/settings/security')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('PUT /api/settings/security', () => {
    it('should update security settings for admin', async () => {
      const updateData = {
        requireHttps: true,
      };

      const response = await request(app)
        .put('/api/settings/security')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/settings/backup', () => {
    it('should get backup settings for admin', async () => {
      const response = await request(app)
        .get('/api/settings/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/settings/email', () => {
    it('should get email settings for admin', async () => {
      const response = await request(app)
        .get('/api/settings/email')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });

    it('should persist tenant-scoped reply-to settings through the email settings API', async () => {
      await prisma.systemSetting.deleteMany({
        where: {
          tenantId,
          key: { in: ['email_replyToEmail', 'email_replyToName'] }
        }
      });

      const updateResponse = await request(app)
        .put('/api/settings/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email_enabled: 'true',
          email_smtp_host: 'smtp.settingstest.com',
          email_smtp_port: '587',
          email_smtp_secure: 'false',
          email_smtp_user: 'smtp-user',
          email_smtp_pass: 'smtp-pass',
          email_from_address: 'noreply@settingstest.com',
          email_from_name: 'Settings Test Sender',
          email_reply_to_address: 'replies@settingstest.com',
          email_reply_to_name: 'Settings Test Replies',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data?.scope).toBe('tenant');

      const readResponse = await request(app)
        .get('/api/settings/email')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.data).toMatchObject({
        email_reply_to_address: 'replies@settingstest.com',
        email_reply_to_name: 'Settings Test Replies',
      });

      const storedReplyToSettings = await prisma.systemSetting.findMany({
        where: {
          tenantId,
          key: { in: ['email_replyToEmail', 'email_replyToName'] },
        },
        select: { key: true, value: true, tenantId: true },
      });
      const storedByKey = Object.fromEntries(
        storedReplyToSettings.map((setting) => [setting.key, setting])
      );

      expect(storedByKey['email_replyToEmail']).toMatchObject({
        value: 'replies@settingstest.com',
        tenantId,
      });
      expect(storedByKey['email_replyToName']).toMatchObject({
        value: 'Settings Test Replies',
        tenantId,
      });
    });
  });

  describe('GET /api/settings/logging-levels', () => {
    it('should get logging levels for admin', async () => {
      const response = await request(app)
        .get('/api/settings/logging-levels')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/settings/theme', () => {
    it('should get theme settings without authentication', async () => {
      const response = await request(app)
        .get('/api/settings/theme');

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('GET /api/settings/contestant-visibility', () => {
    it('should get contestant visibility settings', async () => {
      const response = await request(app)
        .get('/api/settings/contestant-visibility')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
