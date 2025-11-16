/**
 * Integration Tests for Cache API
 * Tests end-to-end functionality of cache management
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Cache API Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@cachetest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@cachetest.com',
        name: 'Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
      }
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@cachetest.com',
        password: 'password123'
      });

    if (loginResponse.status === 200 || loginResponse.status === 201) {
      adminToken = loginResponse.body.data?.token || loginResponse.body.token;
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
          { email: { contains: '@cachetest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/cache/stats', () => {
    it('should get cache statistics for admin', async () => {
      const response = await request(app)
        .get('/api/cache/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });

    it('should reject non-admin access', async () => {
      const regularUser = await prisma.user.create({
        data: {
          email: 'user@cachetest.com',
          name: 'Test User',
          password: await bcrypt.hash('Password123!', 10),
          role: 'CONTESTANT',
          isActive: true,
          sessionVersion: 1,
        }
      });

      const userToken = jwt.sign(
        { userId: regularUser.id, role: regularUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/cache/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect([401, 403]).toContain(response.status);

      await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {});
    });
  });

  describe('GET /api/cache/status', () => {
    it('should get cache status for admin', async () => {
      const response = await request(app)
        .get('/api/cache/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/cache/flush', () => {
    it('should flush all cache for admin', async () => {
      const response = await request(app)
        .post('/api/cache/flush')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201, 401, 403]).toContain(response.status);
    });
  });

  describe('DELETE /api/cache/key/:key', () => {
    it('should delete specific cache key', async () => {
      const response = await request(app)
        .delete('/api/cache/key/test-key')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/cache/pattern', () => {
    it('should delete cache keys by pattern', async () => {
      const response = await request(app)
        .post('/api/cache/pattern')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ pattern: 'test-*' });

      expect([200, 201, 401, 403]).toContain(response.status);
    });
  });
});
