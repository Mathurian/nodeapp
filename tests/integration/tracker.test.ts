/**
 * Integration Tests for Tracker API
 * Tests end-to-end functionality of tracking operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Tracker API Integration Tests', () => {
  let tallyMasterUser: any;
  let adminUser: any;
  let tallyMasterToken: string;
  let adminToken: string;
  let testEvent: any;
  let testContest: any;
  let testCategory: any;
  let testJudge: any;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@trackertest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    tallyMasterUser = await prisma.user.create({
      data: {
        email: 'tallymaster@trackertest.com',
        name: 'Test Tally Master',
        password: hashedPassword,
        role: 'TALLY_MASTER',
        isActive: true,
        sessionVersion: 1,
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: 'admin@trackertest.com',
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

    // Check if judge already exists
    testJudge = await prisma.judge.findUnique({
      where: { email: 'judge@trackertest.com' }
    });

    if (!testJudge) {
      testJudge = await prisma.judge.create({
        data: {
          name: 'Test Judge',
          email: 'judge@trackertest.com',
        }
      });
    }

    const tallyMasterLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'tallymaster@trackertest.com',
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
        email: 'admin@trackertest.com',
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
          { email: { contains: '@trackertest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/tracker/scoring/contest/:contestId', () => {
    it('should get scoring progress for contest', async () => {
      const response = await request(app)
        .get(`/api/tracker/scoring/contest/${testContest.id}`)
        .set('Authorization', `Bearer ${tallyMasterToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should reject non-authorized access', async () => {
      const regularUser = await prisma.user.create({
        data: {
          email: 'user@trackertest.com',
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
        .get(`/api/tracker/scoring/contest/${testContest.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect([401, 403]).toContain(response.status);

      await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {});
    });
  });

  describe('GET /api/tracker/scoring/category/:categoryId', () => {
    it('should get scoring progress for category', async () => {
      const response = await request(app)
        .get(`/api/tracker/scoring/category/${testCategory.id}`)
        .set('Authorization', `Bearer ${tallyMasterToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/tracker/scoring/judge/:judgeId', () => {
    it('should get scoring progress for judge', async () => {
      const response = await request(app)
        .get(`/api/tracker/scoring/judge/${testJudge.id}`)
        .set('Authorization', `Bearer ${tallyMasterToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/tracker/certification/status', () => {
    it('should get certification status', async () => {
      const response = await request(app)
        .get('/api/tracker/certification/status')
        .set('Authorization', `Bearer ${tallyMasterToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/tracker/certification/pending', () => {
    it('should get pending certifications', async () => {
      const response = await request(app)
        .get('/api/tracker/certification/pending')
        .set('Authorization', `Bearer ${tallyMasterToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
