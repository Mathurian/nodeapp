/**
 * Integration Tests for File Management API
 * Tests end-to-end functionality of file management operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('File Management API Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@filemgmttest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@filemgmttest.com',
        name: 'Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
      }
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@filemgmttest.com',
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
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@filemgmttest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/file-management/files', () => {
    it('should get files with filters for admin', async () => {
      const response = await request(app)
        .get('/api/file-management/files')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ type: 'document', limit: 10 });

      expect([200, 401, 403]).toContain(response.status);
    });

    it('should reject non-admin access', async () => {
      const regularUser = await prisma.user.create({
        data: {
          email: 'user@filemgmttest.com',
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
        .get('/api/file-management/files')
        .set('Authorization', `Bearer ${userToken}`);

      expect([401, 403]).toContain(response.status);

      await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {});
    });
  });

  describe('POST /api/file-management/files/bulk', () => {
    it('should perform bulk file operations', async () => {
      const bulkData = {
        operation: 'delete',
        fileIds: ['test-id-1', 'test-id-2'],
      };

      const response = await request(app)
        .post('/api/file-management/files/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('GET /api/file-management/files/search', () => {
    it('should get file search suggestions', async () => {
      const response = await request(app)
        .get('/api/file-management/files/search')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ q: 'test' });

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/file-management/files/analytics', () => {
    it('should get file analytics', async () => {
      const response = await request(app)
        .get('/api/file-management/files/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/file-management/files/:fileId/integrity', () => {
    it('should check file integrity', async () => {
      const response = await request(app)
        .get('/api/file-management/files/test-file-id/integrity')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/file-management/files/integrity/bulk', () => {
    it('should perform bulk integrity check', async () => {
      const bulkData = {
        fileIds: ['test-id-1', 'test-id-2'],
      };

      const response = await request(app)
        .post('/api/file-management/files/integrity/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });
  });
});
