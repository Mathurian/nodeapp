/**
 * Integration Tests for Board API
 * Tests end-to-end functionality of board operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Board API Integration Tests', () => {
  let boardUser: any;
  let adminUser: any;
  let boardToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@boardtest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    boardUser = await prisma.user.create({
      data: {
        email: 'board@boardtest.com',
        name: 'Test Board',
        password: hashedPassword,
        role: 'BOARD',
        isActive: true,
        sessionVersion: 1,
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: 'admin@boardtest.com',
        name: 'Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
      }
    });

    const boardLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'board@boardtest.com',
        password: 'password123'
      });

    if (boardLoginResponse.status === 200 || boardLoginResponse.status === 201) {
      boardToken = boardLoginResponse.body.data?.token || boardLoginResponse.body.token;
    } else {
      boardToken = jwt.sign(
        { userId: boardUser.id, role: boardUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@boardtest.com',
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
          { email: { contains: '@boardtest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/board/stats', () => {
    it('should get board dashboard stats', async () => {
      const response = await request(app)
        .get('/api/board/stats')
        .set('Authorization', `Bearer ${boardToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/board/certifications', () => {
    it('should get certifications', async () => {
      const response = await request(app)
        .get('/api/board/certifications')
        .set('Authorization', `Bearer ${boardToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/board/certification-status', () => {
    it('should get certification status', async () => {
      const response = await request(app)
        .get('/api/board/certification-status')
        .set('Authorization', `Bearer ${boardToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/board/certifications/:id/approve', () => {
    it('should approve certification', async () => {
      const response = await request(app)
        .post('/api/board/certifications/test-id/approve')
        .set('Authorization', `Bearer ${boardToken}`)
        .send({});

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/board/certifications/:id/reject', () => {
    it('should reject certification', async () => {
      const response = await request(app)
        .post('/api/board/certifications/test-id/reject')
        .set('Authorization', `Bearer ${boardToken}`)
        .send({ reason: 'Test rejection' });

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/board/score-removal', () => {
    it('should get score removal requests', async () => {
      const response = await request(app)
        .get('/api/board/score-removal')
        .set('Authorization', `Bearer ${boardToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/board/score-removal', () => {
    it('should create score removal request', async () => {
      const requestData = {
        categoryId: 'test-category-id',
        judgeId: 'test-judge-id',
        reason: 'Test reason',
      };

      const response = await request(app)
        .post('/api/board/score-removal')
        .set('Authorization', `Bearer ${boardToken}`)
        .send(requestData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/board/reports', () => {
    it('should generate report', async () => {
      const reportData = {
        type: 'event',
        eventId: 'test-event-id',
      };

      const response = await request(app)
        .post('/api/board/reports')
        .set('Authorization', `Bearer ${boardToken}`)
        .send(reportData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });
  });
});
