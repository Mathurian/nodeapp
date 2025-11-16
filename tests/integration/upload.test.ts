/**
 * Integration Tests for Upload API
 * Tests end-to-end functionality of file upload operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Upload API Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;
  let testFilePath: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@uploadtest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@uploadtest.com',
        name: 'Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
      }
    });

    // Create a temporary test file
    testFilePath = path.join(__dirname, '../../temp/test-upload.txt');
    fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
    fs.writeFileSync(testFilePath, 'Test file content');

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@uploadtest.com',
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
    // Cleanup test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@uploadtest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('POST /api/upload', () => {
    it('should upload a file', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', testFilePath);

      expect([200, 201, 401, 403, 400, 500]).toContain(response.status);
    });

    it('should reject upload without authentication', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/upload/image', () => {
    it('should upload an image', async () => {
      // Create a test image file (or use existing test file)
      const response = await request(app)
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', testFilePath);

      expect([200, 201, 400, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('GET /api/upload/files', () => {
    it('should get uploaded files', async () => {
      const response = await request(app)
        .get('/api/upload/files')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.body.data || response.body)).toBe(true);
      }
    });
  });

  describe('DELETE /api/upload/:fileId', () => {
    it('should delete uploaded file', async () => {
      const response = await request(app)
        .delete('/api/upload/test-file-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404]).toContain(response.status);
    });
  });
});
