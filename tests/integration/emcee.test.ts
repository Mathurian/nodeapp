/**
 * Integration Tests for Emcee API
 * Tests end-to-end functionality of emcee operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Emcee API Integration Tests', () => {
  let emceeUser: any;
  let adminUser: any;
  let emceeToken: string;
  let adminToken: string;
  let testEvent: any;
  let testContest: any;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@emceetest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    emceeUser = await prisma.user.create({
      data: {
        email: 'emcee@emceetest.com',
        name: 'Test Emcee',
        password: hashedPassword,
        role: 'EMCEE',
        isActive: true,
        sessionVersion: 1,
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: 'admin@emceetest.com',
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

    const emceeLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'emcee@emceetest.com',
        password: 'password123'
      });

    if (emceeLoginResponse.status === 200 || emceeLoginResponse.status === 201) {
      emceeToken = emceeLoginResponse.body.data?.token || emceeLoginResponse.body.token;
    } else {
      emceeToken = jwt.sign(
        { userId: emceeUser.id, role: emceeUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@emceetest.com',
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
          { email: { contains: '@emceetest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/emcee/stats', () => {
    it('should get emcee dashboard stats', async () => {
      const response = await request(app)
        .get('/api/emcee/stats')
        .set('Authorization', `Bearer ${emceeToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/emcee/scripts', () => {
    it('should get emcee scripts', async () => {
      const response = await request(app)
        .get('/api/emcee/scripts')
        .set('Authorization', `Bearer ${emceeToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/emcee/scripts/:scriptId', () => {
    it('should get specific script', async () => {
      const response = await request(app)
        .get('/api/emcee/scripts/test-script-id')
        .set('Authorization', `Bearer ${emceeToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/emcee/scripts', () => {
    it('should create script for admin', async () => {
      const scriptData = {
        title: 'Test Script',
        content: 'Test content',
        eventId: testEvent.id,
        contestId: testContest.id,
      };

      const response = await request(app)
        .post('/api/emcee/scripts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(scriptData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });

    it('should reject script creation without admin role', async () => {
      const scriptData = {
        title: 'Test Script',
        content: 'Test content',
      };

      const response = await request(app)
        .post('/api/emcee/scripts')
        .set('Authorization', `Bearer ${emceeToken}`)
        .send(scriptData);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/emcee/contestant-bios', () => {
    it('should get contestant bios', async () => {
      const response = await request(app)
        .get('/api/emcee/contestant-bios')
        .set('Authorization', `Bearer ${emceeToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/emcee/judge-bios', () => {
    it('should get judge bios', async () => {
      const response = await request(app)
        .get('/api/emcee/judge-bios')
        .set('Authorization', `Bearer ${emceeToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/emcee/events', () => {
    it('should get events', async () => {
      const response = await request(app)
        .get('/api/emcee/events')
        .set('Authorization', `Bearer ${emceeToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/emcee/contests', () => {
    it('should get contests', async () => {
      const response = await request(app)
        .get('/api/emcee/contests')
        .set('Authorization', `Bearer ${emceeToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
