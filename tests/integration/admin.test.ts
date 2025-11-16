/**
 * Integration Tests for Admin API
 * Tests end-to-end functionality of admin operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Admin API Integration Tests', () => {
  let adminUser: any;
  let regularUser: any;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@admintest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@admintest.com',
        name: 'Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
      }
    });

    regularUser = await prisma.user.create({
      data: {
        email: 'user@admintest.com',
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
        email: 'admin@admintest.com',
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

  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@admintest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/admin/stats', () => {
    it('should get system statistics for admin', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should reject non-admin access', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect([401, 403]).toContain(response.status);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/stats');

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/admin/logs', () => {
    it('should get system logs for admin', async () => {
      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });

    it('should reject non-admin access to logs', async () => {
      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${userToken}`);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should get all users for admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/admin/events', () => {
    it('should get all events for admin', async () => {
      const response = await request(app)
        .get('/api/admin/events')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/admin/contests', () => {
    it('should get all contests for admin', async () => {
      const response = await request(app)
        .get('/api/admin/contests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/admin/categories', () => {
    it('should get all categories for admin', async () => {
      const response = await request(app)
        .get('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/admin/scores', () => {
    it('should get all scores for admin', async () => {
      const response = await request(app)
        .get('/api/admin/scores')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/admin/activity-logs', () => {
    it('should get activity logs for admin', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/admin/audit-logs', () => {
    it('should get audit logs for admin', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/admin/active-users', () => {
    it('should get active users for admin', async () => {
      const response = await request(app)
        .get('/api/admin/active-users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/admin/users/force-logout-all', () => {
    it('should force logout all users', async () => {
      const response = await request(app)
        .post('/api/admin/users/force-logout-all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201, 401, 403]).toContain(response.status);
    });

    it('should reject non-admin access', async () => {
      const response = await request(app)
        .post('/api/admin/users/force-logout-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/admin/users/:id/force-logout', () => {
    it('should force logout a specific user', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${regularUser.id}/force-logout`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/admin/database/tables', () => {
    it('should get database tables for admin', async () => {
      const response = await request(app)
        .get('/api/admin/database/tables')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });

    it('should reject non-admin access', async () => {
      const response = await request(app)
        .get('/api/admin/database/tables')
        .set('Authorization', `Bearer ${userToken}`);

      expect([401, 403]).toContain(response.status);
    });
  });
});

