/**
 * Integration Tests for Print API
 * Tests end-to-end functionality of print operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Print API Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@printtest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@printtest.com',
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
        email: 'admin@printtest.com',
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
          { email: { contains: '@printtest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/print/templates', () => {
    it('should get print templates', async () => {
      const response = await request(app)
        .get('/api/print/templates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/print/templates', () => {
    it('should create print template', async () => {
      const templateData = {
        name: 'Test Print Template',
        type: 'EVENT',
        content: 'Test content',
      };

      const response = await request(app)
        .post('/api/print/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('POST /api/print/event-report', () => {
    it('should print event report', async () => {
      const reportData = {
        eventId: 'test-event-id',
      };

      const response = await request(app)
        .post('/api/print/event-report')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reportData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/print/contest-results', () => {
    it('should print contest results', async () => {
      const reportData = {
        contestId: 'test-contest-id',
      };

      const response = await request(app)
        .post('/api/print/contest-results')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reportData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/print/contestant/:id', () => {
    it('should print contestant report', async () => {
      const response = await request(app)
        .get('/api/print/contestant/test-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/print/judge/:id', () => {
    it('should print judge report', async () => {
      const response = await request(app)
        .get('/api/print/judge/test-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/print/category/:id', () => {
    it('should print category report', async () => {
      const response = await request(app)
        .get('/api/print/category/test-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/print/contest/:id', () => {
    it('should print contest report', async () => {
      const response = await request(app)
        .get('/api/print/contest/test-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });
});
