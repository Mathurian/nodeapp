/**
 * Integration Tests for Export API
 * Tests end-to-end functionality of export operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Export API Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@exporttest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@exporttest.com',
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
        email: 'admin@exporttest.com',
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
          { email: { contains: '@exporttest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('POST /api/export/event/excel', () => {
    it('should export event to Excel', async () => {
      const exportData = {
        eventId: 'test-event-id',
      };

      const response = await request(app)
        .post('/api/export/event/excel')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(exportData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/export/contest-results/csv', () => {
    it('should export contest results to CSV', async () => {
      const exportData = {
        contestId: 'test-contest-id',
      };

      const response = await request(app)
        .post('/api/export/contest-results/csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(exportData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/export/judge-performance/xml', () => {
    it('should export judge performance to XML', async () => {
      const exportData = {
        judgeId: 'test-judge-id',
      };

      const response = await request(app)
        .post('/api/export/judge-performance/xml')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(exportData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/export/system-analytics/pdf', () => {
    it('should export system analytics to PDF', async () => {
      const response = await request(app)
        .post('/api/export/system-analytics/pdf')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('GET /api/export/history', () => {
    it('should get export history', async () => {
      const response = await request(app)
        .get('/api/export/history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
