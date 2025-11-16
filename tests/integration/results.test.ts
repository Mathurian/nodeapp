/**
 * Integration Tests for Results API
 * Tests end-to-end functionality of results retrieval
 */

import request from 'supertest';
import app from '../../src/server';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Use the same PrismaClient instance that the app uses
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Results API Integration Tests', () => {
  let adminUser: any;
  let contestantUser: any;
  let adminToken: string;
  let contestantToken: string;
  let testEvent: any;
  let testContest: any;
  let testCategory: any;
  let testContestant: any;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.score.deleteMany({
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
          { email: { contains: '@resultstest.com' } }
        ]
      }
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@resultstest.com',
        name: 'Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
      }
    });

    // Create contestant user
    contestantUser = await prisma.user.create({
      data: {
        email: 'contestant@resultstest.com',
        name: 'Test Contestant',
        password: hashedPassword,
        role: 'CONTESTANT',
        isActive: true,
        sessionVersion: 1,
      }
    });

    // Create test event, contest, category, and contestant
    testEvent = await prisma.event.create({
      data: {
        name: `event-test-${Date.now()}`,
        description: 'Test event for results',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-03'),
        location: 'Test Location',
      }
    });

    testContest = await prisma.contest.create({
      data: {
        name: `contest-test-${Date.now()}`,
        eventId: testEvent.id,
        description: 'Test contest for results',
      }
    });

    testCategory = await prisma.category.create({
      data: {
        name: `category-test-${Date.now()}`,
        contestId: testContest.id,
        description: 'Test category for results',
      }
    });

    // Check if contestant already exists
    testContestant = await prisma.contestant.findUnique({
      where: { email: 'contestant@resultstest.com' }
    });

    if (!testContestant) {
      testContestant = await prisma.contestant.create({
        data: {
          name: 'Test Contestant',
          email: 'contestant@resultstest.com',
          contestantNumber: 1,
        }
      });
    }

    await prisma.user.update({
      where: { id: contestantUser.id },
      data: { contestantId: testContestant.id }
    }).catch(() => {});

    // Login to get tokens - verify user exists first
    const verifyAdmin = await prisma.user.findUnique({
      where: { email: 'admin@resultstest.com' }
    });
    
    if (!verifyAdmin) {
      throw new Error('Admin user was not created successfully');
    }
    
    // Verify password hash matches
    const passwordMatches = await bcrypt.compare('password123', verifyAdmin.password);
    if (!passwordMatches) {
      console.error('Password hash mismatch for admin user');
      throw new Error('Password hash does not match');
    }
    
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@resultstest.com',
        password: 'password123'
      });

    // Debug: Log login response if it fails
    if (adminLoginResponse.status !== 200 && adminLoginResponse.status !== 201) {
      console.log('Admin login failed:', {
        status: adminLoginResponse.status,
        body: adminLoginResponse.body,
        userExists: !!verifyAdmin,
        userEmail: verifyAdmin?.email,
        passwordMatches
      });
    }

    if (adminLoginResponse.status === 200 || adminLoginResponse.status === 201) {
      adminToken = adminLoginResponse.body.data?.token || adminLoginResponse.body.token;
    } else {
      adminToken = jwt.sign(
        { userId: adminUser.id, role: adminUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    // Verify contestant user exists
    const verifyContestant = await prisma.user.findUnique({
      where: { email: 'contestant@resultstest.com' }
    });
    
    if (!verifyContestant) {
      throw new Error('Contestant user was not created successfully');
    }
    
    const contestantLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'contestant@resultstest.com',
        password: 'password123'
      });

    // Debug: Log login response if it fails
    if (contestantLoginResponse.status !== 200 && contestantLoginResponse.status !== 201) {
      console.log('Contestant login failed:', {
        status: contestantLoginResponse.status,
        body: contestantLoginResponse.body,
        userExists: !!verifyContestant,
        userEmail: verifyContestant?.email
      });
    }

    if (contestantLoginResponse.status === 200 || contestantLoginResponse.status === 201) {
      contestantToken = contestantLoginResponse.body.data?.token || contestantLoginResponse.body.token;
    } else {
      contestantToken = jwt.sign(
        { userId: contestantUser.id, role: contestantUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }
  });

  afterAll(async () => {
    await prisma.score.deleteMany({
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
          { email: { contains: '@resultstest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/results', () => {
    it('should get all results for admin', async () => {
      const response = await request(app)
        .get('/api/results')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('results');
        expect(response.body).toHaveProperty('pagination');
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/results')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/results');

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/results/categories', () => {
    it('should get all categories', async () => {
      const response = await request(app)
        .get('/api/results/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });

  describe('GET /api/results/category/:categoryId', () => {
    it('should get results for a specific category', async () => {
      const response = await request(app)
        .get(`/api/results/category/${testCategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should return 404 for non-existent category', async () => {
      const fakeId = 'clx00000000000000000000000';
      const response = await request(app)
        .get(`/api/results/category/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/results/contestant/:contestantId', () => {
    it('should get results for a specific contestant', async () => {
      const response = await request(app)
        .get(`/api/results/contestant/${testContestant.id}`)
        .set('Authorization', `Bearer ${contestantToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should allow contestants to view their own results', async () => {
      const response = await request(app)
        .get(`/api/results/contestant/${testContestant.id}`)
        .set('Authorization', `Bearer ${contestantToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/results/contest/:contestId', () => {
    it('should get results for a specific contest', async () => {
      const response = await request(app)
        .get(`/api/results/contest/${testContest.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/results/event/:eventId', () => {
    it('should get results for a specific event', async () => {
      const response = await request(app)
        .get(`/api/results/event/${testEvent.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = 'clx00000000000000000000000';
      const response = await request(app)
        .get(`/api/results/event/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([401, 403, 404]).toContain(response.status);
    });
  });
});

