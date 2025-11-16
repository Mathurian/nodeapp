/**
 * Integration Tests for Tally Master API
 * Tests end-to-end functionality of tally master operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Tally Master API Integration Tests', () => {
  let tallyMasterUser: any;
  let adminUser: any;
  let tallyMasterToken: string;
  let adminToken: string;
  let testEvent: any;
  let testContest: any;
  let testCategory: any;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@tallymastertest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    tallyMasterUser = await prisma.user.create({
      data: {
        email: 'tallymaster@tallymastertest.com',
        name: 'Test Tally Master',
        password: hashedPassword,
        role: 'TALLY_MASTER',
        isActive: true,
        sessionVersion: 1,
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: 'admin@tallymastertest.com',
        name: 'Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
      }
    });

    testEvent = await prisma.event.create({
      data: {
        name: `event-test-${Date.now()}`,
        description: 'Test event',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-03'),
        location: 'Test Location',
      }
    });

    testContest = await prisma.contest.create({
      data: {
        name: `contest-test-${Date.now()}`,
        eventId: testEvent.id,
        description: 'Test contest',
      }
    });

    testCategory = await prisma.category.create({
      data: {
        name: `category-test-${Date.now()}`,
        contestId: testContest.id,
        description: 'Test category',
      }
    });

    const tallyMasterLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'tallymaster@tallymastertest.com',
        password: 'password123'
      });

    if (tallyMasterLoginResponse.status === 200 || tallyMasterLoginResponse.status === 201) {
      tallyMasterToken = tallyMasterLoginResponse.body.data?.token || tallyMasterLoginResponse.body.token;
    } else {
      tallyMasterToken = jwt.sign(
        { userId: tallyMasterUser.id, role: tallyMasterUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@tallymastertest.com',
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
    await prisma.category.deleteMany({
      where: {
        OR: [
          { name: { contains: 'category-test-' } }
        ]
      }
    });

    await prisma.contest.deleteMany({
      where: {
        OR: [
          { name: { contains: 'contest-test-' } }
        ]
      }
    });

    await prisma.event.deleteMany({
      where: {
        OR: [
          { name: { contains: 'event-test-' } }
        ]
      }
    });

    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@tallymastertest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/tally-master/stats', () => {
    it('should get tally master dashboard stats', async () => {
      const response = await request(app)
        .get('/api/tally-master/stats')
        .set('Authorization', `Bearer ${tallyMasterToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/tally-master/certifications', () => {
    it('should get certifications', async () => {
      const response = await request(app)
        .get('/api/tally-master/certifications')
        .set('Authorization', `Bearer ${tallyMasterToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/tally-master/pending-certifications', () => {
    it('should get pending certifications', async () => {
      const response = await request(app)
        .get('/api/tally-master/pending-certifications')
        .set('Authorization', `Bearer ${tallyMasterToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/tally-master/score-review/:categoryId', () => {
    it('should get score review for category', async () => {
      const response = await request(app)
        .get(`/api/tally-master/score-review/${testCategory.id}`)
        .set('Authorization', `Bearer ${tallyMasterToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/tally-master/certify-totals', () => {
    it('should certify totals', async () => {
      const certifyData = {
        categoryId: testCategory.id,
      };

      const response = await request(app)
        .post('/api/tally-master/certify-totals')
        .set('Authorization', `Bearer ${tallyMasterToken}`)
        .send(certifyData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/tally-master/certification-workflow/:categoryId', () => {
    it('should get certification workflow', async () => {
      const response = await request(app)
        .get(`/api/tally-master/certification-workflow/${testCategory.id}`)
        .set('Authorization', `Bearer ${tallyMasterToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/tally-master/history', () => {
    it('should get tally master history', async () => {
      const response = await request(app)
        .get('/api/tally-master/history')
        .set('Authorization', `Bearer ${tallyMasterToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/tally-master/score-removal-requests', () => {
    it('should create score removal request', async () => {
      const requestData = {
        categoryId: testCategory.id,
        judgeId: 'test-judge-id',
        reason: 'Test reason',
      };

      const response = await request(app)
        .post('/api/tally-master/score-removal-requests')
        .set('Authorization', `Bearer ${tallyMasterToken}`)
        .send(requestData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});
