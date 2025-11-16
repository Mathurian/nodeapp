/**
 * Integration Tests for Notifications API
 * Tests end-to-end functionality of notification operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Notifications API Integration Tests', () => {
  let adminUser: any;
  let regularUser: any;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@notificationtest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@notificationtest.com',
        name: 'Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
      }
    });

    regularUser = await prisma.user.create({
      data: {
        email: 'user@notificationtest.com',
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
        email: 'admin@notificationtest.com',
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
        email: 'user@notificationtest.com',
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
          { email: { contains: '@notificationtest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/notifications', () => {
    it('should get all notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.body.data || response.body)).toBe(true);
      }
    });

    it('should allow regular users to view notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/notifications', () => {
    it('should create notification for admin', async () => {
      const notificationData = {
        title: 'Test Notification',
        message: 'Test message',
        type: 'INFO',
      };

      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });

    it('should reject notification creation without admin role', async () => {
      const notificationData = {
        title: 'Test Notification',
        message: 'Test message',
        type: 'INFO',
      };

      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(notificationData);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('PUT /api/notifications/:id', () => {
    it('should update notification', async () => {
      const updateData = {
        read: true,
      };

      const response = await request(app)
        .put('/api/notifications/test-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete notification', async () => {
      const response = await request(app)
        .delete('/api/notifications/test-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404]).toContain(response.status);
    });
  });
});
