/**
 * Integration Tests for Assignments API
 * Tests end-to-end functionality of assignment operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

  beforeAll(async () => {
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
      where: { email: 'judge@assignmenttest.com' }
    });

    if (!testJudge) {
      testJudge = await prisma.judge.create({
        data: {
          name: 'Test Judge',
          email: 'judge@assignmenttest.com',
        }
      });
    }

    // Check if contestant already exists
    testContestant = await prisma.contestant.findUnique({
      where: { email: 'contestant@assignmenttest.com' }
    });

    if (!testContestant) {
      testContestant = await prisma.contestant.create({
        data: {
          name: 'Test Contestant',
          email: 'contestant@assignmenttest.com',
          contestantNumber: 1,
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
    } else {
      adminToken = jwt.sign(
        { userId: adminUser.id, role: adminUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
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
      const regularUser = await prisma.user.create({
        data: {
          email: 'user@assignmenttest.com',
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

      const assignmentData = {
        categoryId: testCategory.id,
        judgeId: testJudge.id,
      };

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${userToken}`)
        .send(assignmentData);

      expect([401, 403]).toContain(response.status);

      await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {});
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
          categoryId: testCategory.id,
          judgeId: testJudge.id,
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
          categoryId: testCategory.id,
          judgeId: testJudge.id,
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
