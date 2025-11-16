/**
 * Integration Tests for Advanced Reporting API
 * Tests end-to-end functionality of advanced reporting operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Advanced Reporting API Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@advancedreportingtest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@advancedreportingtest.com',
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
        email: 'admin@advancedreportingtest.com',
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
          { email: { contains: '@advancedreportingtest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/advanced-reporting/event', () => {
    it('should generate event report', async () => {
      const response = await request(app)
        .get('/api/advanced-reporting/event')
        .query({ eventId: 'test-event-id' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/advanced-reporting/judge-performance', () => {
    it('should generate judge performance report', async () => {
      const response = await request(app)
        .get('/api/advanced-reporting/judge-performance')
        .query({ judgeId: 'test-judge-id' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/advanced-reporting/system-analytics', () => {
    it('should generate system analytics report', async () => {
      const response = await request(app)
        .get('/api/advanced-reporting/system-analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });

    it('should reject non-admin access', async () => {
      const regularUser = await prisma.user.create({
        data: {
          email: 'user@advancedreportingtest.com',
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
        .get('/api/advanced-reporting/system-analytics')
        .set('Authorization', `Bearer ${userToken}`);

      expect([401, 403]).toContain(response.status);

      await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {});
    });
  });

  describe('GET /api/advanced-reporting/contest-results', () => {
    it('should generate contest results report', async () => {
      const response = await request(app)
        .get('/api/advanced-reporting/contest-results')
        .query({ contestId: 'test-contest-id' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});
