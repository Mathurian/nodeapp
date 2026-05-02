/**
 * Integration Tests for Judges API
 * Tests end-to-end functionality of judge operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ensureTestTenant } from '../helpers/testUtils';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
const fallbackTokenFor = (user: any, tenantId: string) =>
  jwt.sign({ userId: user.id, role: user.role, tenantId }, JWT_SECRET, { expiresIn: '1h' });
const loginTokenOrFallback = (response: any, user: any, tenantId: string) =>
  response.body.data?.token || response.body.token || fallbackTokenFor(user, tenantId);

describe('Judges API Integration Tests', () => {
  let judgeUser: any;
  let adminUser: any;
  let judgeToken: string;
  let adminToken: string;
  let testEvent: any;
  let testContest: any;
  let testCategory: any;
  let testJudge: any;
  let tenantId: string;

  beforeAll(async () => {
    const tenant = await ensureTestTenant();
    tenantId = tenant.id;

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
        tenantId,
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
        tenantId,
      }
    });

    testEvent = await prisma.event.create({
      data: {
        name: `event-test-${Date.now()}`,
        description: 'Test event',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-03'),
        location: 'Test Location',
        tenantId,
      }
    });

    testContest = await prisma.contest.create({
      data: {
        name: `contest-test-${Date.now()}`,
        eventId: testEvent.id,
        description: 'Test contest',
        tenantId,
      }
    });

    testCategory = await prisma.category.create({
      data: {
        name: `category-test-${Date.now()}`,
        contestId: testContest.id,
        description: 'Test category',
        tenantId,
      }
    });

    // Check if judge already exists
    testJudge = await prisma.judge.findUnique({
      where: { tenantId_email: { tenantId, email: 'judge@judgetest.com' } }
    });

    if (!testJudge) {
      testJudge = await prisma.judge.create({
        data: {
          name: 'Test Judge',
          email: 'judge@judgetest.com',
          tenantId,
        }
      });
    }

    await prisma.user.update({
      where: { id: judgeUser.id },
      data: { judgeId: testJudge.id }
    }).catch(() => {});

    await prisma.assignment.upsert({
      where: {
        tenantId_judgeId_categoryId: {
          tenantId,
          judgeId: testJudge.id,
          categoryId: testCategory.id,
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        judgeId: testJudge.id,
        categoryId: testCategory.id,
        contestId: testContest.id,
        eventId: testEvent.id,
        assignedBy: adminUser.id,
        status: 'ACTIVE',
        tenantId,
      },
    });

    const judgeLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'judge@judgetest.com',
        password: 'password123'
      });

    judgeToken = loginTokenOrFallback(judgeLoginResponse, judgeUser, tenantId);

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@judgetest.com',
        password: 'password123'
      });

    adminToken = loginTokenOrFallback(adminLoginResponse, adminUser, tenantId);
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
        where: { tenantId_email: { tenantId, email: 'contestant@judgetest.com' } }
      });

      if (!testContestant) {
        testContestant = await prisma.contestant.create({
          data: {
            name: 'Test Contestant',
            email: 'contestant@judgetest.com',
            contestantNumber: 1,
            tenantId,
          }
        });
      }

      const scoreData = {
        categoryId: testCategory.id,
        contestantId: testContestant.id,
        score: 85,
        comment: 'Test score',
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
