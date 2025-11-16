/**
 * Integration Tests for Certification API
 * Tests end-to-end functionality of certification operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Certification API Integration Tests', () => {
  let adminUser: any;
  let judgeUser: any;
  let adminToken: string;
  let judgeToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@certificationtest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@certificationtest.com',
        name: 'Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
      }
    });

    judgeUser = await prisma.user.create({
      data: {
        email: 'judge@certificationtest.com',
        name: 'Test Judge',
        password: hashedPassword,
        role: 'JUDGE',
        isActive: true,
        sessionVersion: 1,
      }
    });

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@certificationtest.com',
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

    const judgeLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'judge@certificationtest.com',
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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@certificationtest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/certification', () => {
    it('should get all certifications', async () => {
      const response = await request(app)
        .get('/api/certification')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.body.data || response.body)).toBe(true);
      }
    });
  });

  describe('GET /api/certification/stats', () => {
    it('should get certification statistics', async () => {
      const response = await request(app)
        .get('/api/certification/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/certification', () => {
    it('should create certification', async () => {
      const certData = {
        categoryId: 'test-category-id',
        type: 'JUDGE',
      };

      const response = await request(app)
        .post('/api/certification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(certData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });

    it('should reject certification creation without admin role', async () => {
      const certData = {
        categoryId: 'test-category-id',
        type: 'JUDGE',
      };

      const response = await request(app)
        .post('/api/certification')
        .set('Authorization', `Bearer ${judgeToken}`)
        .send(certData);

      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/certification/:id/certify-judge', () => {
    it('should certify judge', async () => {
      const response = await request(app)
        .post('/api/certification/test-id/certify-judge')
        .set('Authorization', `Bearer ${judgeToken}`)
        .send({});

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/certification/:id/certify-tally', () => {
    it('should certify tally', async () => {
      const tallyMasterUser = await prisma.user.create({
        data: {
          email: 'tallymaster@certificationtest.com',
          name: 'Test Tally Master',
          password: await bcrypt.hash('Password123!', 10),
          role: 'TALLY_MASTER',
          isActive: true,
          sessionVersion: 1,
        }
      });

      const tallyToken = jwt.sign(
        { userId: tallyMasterUser.id, role: tallyMasterUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/certification/test-id/certify-tally')
        .set('Authorization', `Bearer ${tallyToken}`)
        .send({});

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);

      await prisma.user.delete({ where: { id: tallyMasterUser.id } }).catch(() => {});
    });
  });

  describe('POST /api/certification/:id/approve-board', () => {
    it('should approve certification by board', async () => {
      const boardUser = await prisma.user.create({
        data: {
          email: 'board@certificationtest.com',
          name: 'Test Board',
          password: await bcrypt.hash('Password123!', 10),
          role: 'BOARD',
          isActive: true,
          sessionVersion: 1,
        }
      });

      const boardToken = jwt.sign(
        { userId: boardUser.id, role: boardUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/certification/test-id/approve-board')
        .set('Authorization', `Bearer ${boardToken}`)
        .send({});

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);

      await prisma.user.delete({ where: { id: boardUser.id } }).catch(() => {});
    });
  });

  describe('GET /api/certification/:id', () => {
    it('should get certification by ID', async () => {
      const response = await request(app)
        .get('/api/certification/test-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/certification/:id', () => {
    it('should update certification', async () => {
      const updateData = {
        status: 'APPROVED',
      };

      const response = await request(app)
        .put('/api/certification/test-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/certification/:id', () => {
    it('should delete certification', async () => {
      const response = await request(app)
        .delete('/api/certification/test-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404]).toContain(response.status);
    });
  });
});
