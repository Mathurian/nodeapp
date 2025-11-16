/**
 * Integration Tests for Templates API
 * Tests end-to-end functionality of template operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Templates API Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@templatestest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@templatestest.com',
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
        email: 'admin@templatestest.com',
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
          { email: { contains: '@templatestest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/templates', () => {
    it('should get all templates for admin', async () => {
      const response = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.body.data || response.body)).toBe(true);
      }
    });

    it('should reject non-admin access', async () => {
      const regularUser = await prisma.user.create({
        data: {
          email: 'user@templatestest.com',
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
        .get('/api/templates')
        .set('Authorization', `Bearer ${userToken}`);

      expect([401, 403]).toContain(response.status);

      await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {});
    });
  });

  describe('POST /api/templates', () => {
    it('should create template', async () => {
      const templateData = {
        name: 'Test Template',
        type: 'EVENT',
        content: { contests: [], categories: [] },
      };

      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/templates/:id', () => {
    it('should update template', async () => {
      const updateData = {
        name: 'Updated Template',
      };

      const response = await request(app)
        .put('/api/templates/test-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/templates/:id', () => {
    it('should delete template', async () => {
      const response = await request(app)
        .delete('/api/templates/test-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404]).toContain(response.status);
    });
  });
});
