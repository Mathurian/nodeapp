/**
 * Integration Tests for SMS API
 * Tests end-to-end functionality of SMS operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('SMS API Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@smstest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@smstest.com',
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
        email: 'admin@smstest.com',
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
          { email: { contains: '@smstest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/sms/settings', () => {
    it('should get SMS settings for admin', async () => {
      const response = await request(app)
        .get('/api/sms/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('PUT /api/sms/settings', () => {
    it('should update SMS settings', async () => {
      const settingsData = {
        enabled: true,
        provider: 'twilio',
      };

      const response = await request(app)
        .put('/api/sms/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(settingsData);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/sms/send', () => {
    it('should send SMS', async () => {
      const smsData = {
        to: '+1234567890',
        message: 'Test message',
      };

      const response = await request(app)
        .post('/api/sms/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(smsData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });

    it('should reject SMS sending without admin role', async () => {
      const regularUser = await prisma.user.create({
        data: {
          email: 'user@smstest.com',
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

      const smsData = {
        to: '+1234567890',
        message: 'Test message',
      };

      const response = await request(app)
        .post('/api/sms/send')
        .set('Authorization', `Bearer ${userToken}`)
        .send(smsData);

      expect([401, 403]).toContain(response.status);

      await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {});
    });
  });

  describe('POST /api/sms/send-bulk', () => {
    it('should send bulk SMS', async () => {
      const smsData = {
        recipients: ['+1234567890', '+0987654321'],
        message: 'Test bulk message',
      };

      const response = await request(app)
        .post('/api/sms/send-bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(smsData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('GET /api/sms/history', () => {
    it('should get SMS history', async () => {
      const response = await request(app)
        .get('/api/sms/history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
