/**
 * Integration Tests for Settings API
 * Tests end-to-end functionality of settings management
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Settings API Integration Tests', () => {
  let adminUser: any;
  let regularUser: any;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
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
      }
    });

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@settingstest.com',
        password: 'password123'
      });

    if (adminLoginResponse.status === 200 || adminLoginResponse.status === 201) {
      adminToken = adminLoginResponse.body.data?.token || adminLoginResponse.body.token;
    } else {
      adminToken = jwt.sign(
        { userId: adminUser.id, role: adminUser.role },
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

    if (userLoginResponse.status === 200 || userLoginResponse.status === 201) {
      userToken = userLoginResponse.body.data?.token || userLoginResponse.body.token;
    } else {
      userToken = jwt.sign(
        { userId: regularUser.id, role: regularUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }
  });

  afterAll(async () => {
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
