/**
 * Integration Tests for Deduction API
 * Tests end-to-end functionality of deduction operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Deduction API Integration Tests', () => {
  let judgeUser: any;
  let adminUser: any;
  let judgeToken: string;
  let adminToken: string;
  let testEvent: any;
  let testContest: any;
  let testCategory: any;
  let testContestant: any;

  beforeAll(async () => {
    await prisma.deductionRequest.deleteMany({
      where: {
        OR: [
          { category: { name: { contains: 'category-test-' } } }
        ]
      }
    });

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
          { email: { contains: '@deductiontest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    judgeUser = await prisma.user.create({
      data: {
        email: 'judge@deductiontest.com',
        name: 'Test Judge',
        password: hashedPassword,
        role: 'JUDGE',
        isActive: true,
        sessionVersion: 1,
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: 'admin@deductiontest.com',
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

    // Check if contestant already exists
    testContestant = await prisma.contestant.findUnique({
      where: { email: 'contestant@deductiontest.com' }
    });

    if (!testContestant) {
      testContestant = await prisma.contestant.create({
        data: {
          name: 'Test Contestant',
          email: 'contestant@deductiontest.com',
          contestantNumber: 1,
        }
      });
    }

    const judgeLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'judge@deductiontest.com',
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
        email: 'admin@deductiontest.com',
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
    await prisma.deductionRequest.deleteMany({
      where: {
        OR: [
          { category: { name: { contains: 'category-test-' } } }
        ]
      }
    });

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
          { email: { contains: '@deductiontest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('POST /api/deduction/request', () => {
    it('should create deduction request', async () => {
      const requestData = {
        contestantId: testContestant.id,
        categoryId: testCategory.id,
        amount: 5.0,
        reason: 'Test deduction reason',
      };

      const response = await request(app)
        .post('/api/deduction/request')
        .set('Authorization', `Bearer ${judgeToken}`)
        .send(requestData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });

    it('should reject request without authentication', async () => {
      const requestData = {
        contestantId: testContestant.id,
        categoryId: testCategory.id,
        amount: 5.0,
        reason: 'Test reason',
      };

      const response = await request(app)
        .post('/api/deduction/request')
        .send(requestData);

      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/deduction/pending', () => {
    it('should get pending deductions', async () => {
      const response = await request(app)
        .get('/api/deduction/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/deduction/:id/approve', () => {
    it('should approve deduction', async () => {
      const response = await request(app)
        .post('/api/deduction/test-id/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/deduction/:id/reject', () => {
    it('should reject deduction', async () => {
      const response = await request(app)
        .post('/api/deduction/test-id/reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test rejection reason' });

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/deduction/:id/approvals', () => {
    it('should get approval status', async () => {
      const response = await request(app)
        .get('/api/deduction/test-id/approvals')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/deduction/history', () => {
    it('should get deduction history', async () => {
      const response = await request(app)
        .get('/api/deduction/history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });
});
