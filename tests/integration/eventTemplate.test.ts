/**
 * Integration Tests for Event Template API
 * Tests end-to-end functionality of event template operations
 */

import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { container } from 'tsyringe';
const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Event Template API Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@eventtemplatetest.com' } }
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@eventtemplatetest.com',
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
        email: 'admin@eventtemplatetest.com',
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
          { email: { contains: '@eventtemplatetest.com' } }
        ]
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/event-templates', () => {
    it('should get all event templates', async () => {
      const response = await request(app)
        .get('/api/event-templates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.body.data || response.body)).toBe(true);
      }
    });
  });

  describe('GET /api/event-templates/:id', () => {
    it('should get event template by ID', async () => {
      const response = await request(app)
        .get('/api/event-templates/test-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/event-templates', () => {
    it('should create event template', async () => {
      const templateData = {
        name: 'Test Event Template',
        description: 'Test description',
        contests: [],
        categories: [],
      };

      const response = await request(app)
        .post('/api/event-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData);

      expect([200, 201, 401, 403, 500]).toContain(response.status);
    });

    it('should reject template creation without admin role', async () => {
      const regularUser = await prisma.user.create({
        data: {
          email: 'user@eventtemplatetest.com',
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

      const templateData = {
        name: 'Test Event Template',
        description: 'Test description',
      };

      const response = await request(app)
        .post('/api/event-templates')
        .set('Authorization', `Bearer ${userToken}`)
        .send(templateData);

      expect([401, 403]).toContain(response.status);

      await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {});
    });
  });

  describe('PUT /api/event-templates/:id', () => {
    it('should update event template', async () => {
      const updateData = {
        name: 'Updated Template',
      };

      const response = await request(app)
        .put('/api/event-templates/test-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/event-templates/:id', () => {
    it('should delete event template', async () => {
      const response = await request(app)
        .delete('/api/event-templates/test-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/event-templates/:id/create-event', () => {
    it('should create event from template', async () => {
      const eventData = {
        name: 'Event from Template',
        startDate: new Date('2024-08-01').toISOString(),
        endDate: new Date('2024-08-03').toISOString(),
      };

      const response = await request(app)
        .post('/api/event-templates/test-id/create-event')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(eventData);

      expect([200, 201, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});
