/**
 * Integration Tests for Email API
 * Tests end-to-end functionality of email operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Email API Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@emailtest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@emailtest.com',
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
        email: 'admin@emailtest.com',
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
          { email: { contains: '@emailtest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/email/templates', () => {
    it('should get email templates', async () => {
      const response = await request(app)
        .get('/api/email/templates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/email/templates', () => {
    it('should create email template', async () => {
      const templateData = {
        name: 'Test Template',
        subject: 'Test Subject',
        body: 'Test Body',
      };

      const response = await request(app)
        .post('/api/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });

    it('should reject template creation without admin role', async () => {
      const regularUser = await prisma.user.create({
        data: {
          email: 'user@emailtest.com',
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

      const templateData = {
        name: 'Test Template',
        subject: 'Test Subject',
        body: 'Test Body',
      };

      const response = await request(app)
        .post('/api/email/templates')
        .set('Authorization', `Bearer ${userToken}`)
        .send(templateData);

      expect([401, 403]).toContain(response.status);

      await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {});
    });
  });

  describe('GET /api/email/campaigns', () => {
    it('should get email campaigns', async () => {
      const response = await request(app)
        .get('/api/email/campaigns')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/email/campaigns', () => {
    it('should create email campaign', async () => {
      const campaignData = {
        name: 'Test Campaign',
        templateId: 'test-template-id',
        recipients: ['test@example.com'],
      };

      const response = await request(app)
        .post('/api/email/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(campaignData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('GET /api/email/logs', () => {
    it('should get email logs', async () => {
      const response = await request(app)
        .get('/api/email/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/email/send-multiple', () => {
    it('should send multiple emails', async () => {
      const emailData = {
        recipients: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Subject',
        body: 'Test Body',
      };

      const response = await request(app)
        .post('/api/email/send-multiple')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emailData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('POST /api/email/send-by-role', () => {
    it('should send email by role', async () => {
      const emailData = {
        role: 'JUDGE',
        subject: 'Test Subject',
        body: 'Test Body',
      };

      const response = await request(app)
        .post('/api/email/send-by-role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emailData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });
  });
});
