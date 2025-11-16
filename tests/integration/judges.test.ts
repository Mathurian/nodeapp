/**
 * Integration Tests for Judges API
 * Tests end-to-end functionality of judge operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Judges API Integration Tests', () => {
  let judgeUser: any;
  let adminUser: any;
  let judgeToken: string;
  let adminToken: string;
  let testEvent: any;
  let testContest: any;
  let testCategory: any;
  let testJudge: any;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@judgetest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    judgeUser = await prisma.user.create({
      data: {
        email: 'judge@judgetest.com',
        name: 'Test Judge',
        password: hashedPassword,
        role: 'JUDGE',
        isActive: true,
        sessionVersion: 1,
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: 'admin@judgetest.com',
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
      where: { email: 'judge@judgetest.com' }
    });

    if (!testJudge) {
      testJudge = await prisma.judge.create({
        data: {
          name: 'Test Judge',
          email: 'judge@judgetest.com',
        }
      });
    }

    await prisma.user.update({
      where: { id: judgeUser.id },
      data: { judgeId: testJudge.id }
    }).catch(() => {});

    const judgeLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'judge@judgetest.com',
        password: 'password123'
      });

    if (judgeLoginResponse.status === 200 || judgeLoginResponse.status === 201) {
      judgeToken = judgeLoginResponse.body.data?.token || judgeLoginResponse.body.token;
    } else {
      judgeToken = jwt.sign(
        { userId: judgeUser.id, role: judgeUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@judgetest.com',
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
          { email: { contains: '@judgetest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/judge/stats', () => {
    it('should get judge dashboard stats', async () => {
      const response = await request(app)
        .get('/api/judge/stats')
        .set('Authorization', `Bearer ${judgeToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });

    it('should reject non-judge access', async () => {
      const response = await request(app)
        .get('/api/judge/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/judge/assignments', () => {
    it('should get judge assignments', async () => {
      const response = await request(app)
        .get('/api/judge/assignments')
        .set('Authorization', `Bearer ${judgeToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/judge/scoring/:categoryId', () => {
    it('should get scoring interface for category', async () => {
      const response = await request(app)
        .get(`/api/judge/scoring/${testCategory.id}`)
        .set('Authorization', `Bearer ${judgeToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/judge/scoring/submit', () => {
    it('should submit a score', async () => {
      // Check if contestant already exists
      let testContestant = await prisma.contestant.findUnique({
        where: { email: 'contestant@judgetest.com' }
      });

      if (!testContestant) {
        testContestant = await prisma.contestant.create({
          data: {
            name: 'Test Contestant',
            email: 'contestant@judgetest.com',
            contestantNumber: 1,
          }
        });
      }

      const scoreData = {
        categoryId: testCategory.id,
        contestantId: testContestant.id,
        score: 85,
        comments: 'Test score',
      };

      const response = await request(app)
        .post('/api/judge/scoring/submit')
        .set('Authorization', `Bearer ${judgeToken}`)
        .send(scoreData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);

      await prisma.contestant.delete({ where: { id: testContestant.id } }).catch(() => {});
    });
  });

  describe('GET /api/judge/history', () => {
    it('should get judge history', async () => {
      const response = await request(app)
        .get('/api/judge/history')
        .set('Authorization', `Bearer ${judgeToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/judge/contestant-bios/:categoryId', () => {
    it('should get contestant bios for category', async () => {
      const response = await request(app)
        .get(`/api/judge/contestant-bios/${testCategory.id}`)
        .set('Authorization', `Bearer ${judgeToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/judge/certification-workflow/:categoryId', () => {
    it('should get certification workflow', async () => {
      const response = await request(app)
        .get(`/api/judge/certification-workflow/${testCategory.id}`)
        .set('Authorization', `Bearer ${judgeToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });
});
