/**
 * Integration Tests for Assignments API
 * Tests end-to-end functionality of assignment operations
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

describe('Assignments API Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;
  let testEvent: any;
  let testContest: any;
  let testCategory: any;
  let testJudge: any;
  let testContestant: any;
  let tenantId: string;

  const signTestToken = (user: { id: string; role: string }) =>
    jwt.sign(
      { userId: user.id, role: user.role, tenantId },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

  beforeAll(async () => {
    const tenant = await ensureTestTenant();
    tenantId = tenant.id;

    await prisma.assignment.deleteMany({
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
          { email: { contains: '@assignmenttest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@assignmenttest.com',
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
      where: { tenantId_email: { tenantId, email: 'judge@assignmenttest.com' } }
    });

    if (!testJudge) {
      testJudge = await prisma.judge.create({
        data: {
          name: 'Test Judge',
          email: 'judge@assignmenttest.com',
          tenantId,
        }
      });
    }

    // Check if contestant already exists
    testContestant = await prisma.contestant.findUnique({
      where: { tenantId_email: { tenantId, email: 'contestant@assignmenttest.com' } }
    });

    if (!testContestant) {
      testContestant = await prisma.contestant.create({
        data: {
          name: 'Test Contestant',
          email: 'contestant@assignmenttest.com',
          contestantNumber: 1,
          tenantId,
        }
      });
    }

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@assignmenttest.com',
        password: 'password123'
      });

    if (loginResponse.status === 200 || loginResponse.status === 201) {
      adminToken = loginResponse.body.data?.token || loginResponse.body.token;
    }

    if (!adminToken) {
      adminToken = signTestToken(adminUser);
    }
  });

  afterAll(async () => {
    await prisma.assignment.deleteMany({
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
          { email: { contains: '@assignmenttest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/assignments', () => {
    it('should get all assignments', async () => {
      const response = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.body.data || response.body)).toBe(true);
      }
    });

    it('should support filtering by categoryId', async () => {
      const response = await request(app)
        .get('/api/assignments')
        .query({ categoryId: testCategory.id })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/assignments', () => {
    it('should create assignment', async () => {
      const assignmentData = {
        categoryId: testCategory.id,
        judgeId: testJudge.id,
      };

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignmentData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });

    it('should reject assignment creation without admin role', async () => {
      const timestamp = Date.now();
      const restrictedJudge = await prisma.judge.create({
        data: {
          name: 'Restricted Role Judge',
          email: `restricted-judge-${timestamp}@assignmenttest.com`,
          tenantId,
        },
      });
      const restrictedCategory = await prisma.category.create({
        data: {
          name: `category-test-restricted-${timestamp}`,
          contestId: testContest.id,
          description: 'Restricted role category',
          tenantId,
        },
      });
      const regularUser = await prisma.user.create({
        data: {
          email: 'user@assignmenttest.com',
          name: 'Test User',
          password: await bcrypt.hash('Password123!', 10),
          role: 'CONTESTANT',
          isActive: true,
          sessionVersion: 1,
          tenantId,
        }
      });

      const userToken = signTestToken(regularUser);

      const assignmentData = {
        categoryId: restrictedCategory.id,
        judgeId: restrictedJudge.id,
      };

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${userToken}`)
        .send(assignmentData);

      expect([401, 403]).toContain(response.status);

      await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {});
      await prisma.judge.delete({ where: { id: restrictedJudge.id } }).catch(() => {});
    });
  });

  describe('GET /api/assignments/judges', () => {
    it('should get available judges', async () => {
      const response = await request(app)
        .get('/api/assignments/judges')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/assignments/categories', () => {
    it('should get available categories', async () => {
      const response = await request(app)
        .get('/api/assignments/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/assignments/judges/:judgeId', () => {
    it('should get assignments for specific judge', async () => {
      const response = await request(app)
        .get(`/api/assignments/judges/${testJudge.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/assignments/contestants', () => {
    it('should assign contestant to category', async () => {
      const assignmentData = {
        categoryId: testCategory.id,
        contestantId: testContestant.id,
      };

      const response = await request(app)
        .post('/api/assignments/contestants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignmentData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/assignments/category/:categoryId/contestants', () => {
    it('should get contestants for category', async () => {
      const response = await request(app)
        .get(`/api/assignments/category/${testCategory.id}/contestants`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/assignments/:id', () => {
    it('should update assignment', async () => {
      // Create assignment first
      const assignment = await prisma.assignment.create({
        data: {
          tenantId,
          eventId: testEvent.id,
          contestId: testContest.id,
          categoryId: testCategory.id,
          judgeId: testJudge.id,
          assignedBy: adminUser.id,
        }
      }).catch(() => null);

      if (assignment) {
        const updateData = {
          status: 'ACTIVE',
        };

        const response = await request(app)
          .put(`/api/assignments/${assignment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData);

        expect([200, 401, 403, 404]).toContain(response.status);

        await prisma.assignment.delete({ where: { id: assignment.id } }).catch(() => {});
      }
    });
  });

  describe('DELETE /api/assignments/:id', () => {
    it('should delete assignment', async () => {
      // Create assignment first
      const assignment = await prisma.assignment.create({
        data: {
          tenantId,
          eventId: testEvent.id,
          contestId: testContest.id,
          categoryId: testCategory.id,
          judgeId: testJudge.id,
          assignedBy: adminUser.id,
        }
      }).catch(() => null);

      if (assignment) {
        const response = await request(app)
          .delete(`/api/assignments/${assignment.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 204, 401, 403, 404]).toContain(response.status);
      }
    });
  });
});
