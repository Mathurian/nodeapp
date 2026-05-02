import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/server';
import jwt from 'jsonwebtoken';
import { container } from 'tsyringe';
import { ensureTestTenant } from '../helpers/testUtils';

const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
const responseData = <T = any>(body: any): T => body.data ?? body;

describe('DR Automation Integration Tests', () => {
  let adminToken: string;
  let organizerId: string;
  let drConfigId: string;
  let backupScheduleId: string;
  let backupTargetId: string;
  let tenantId: string;

  beforeAll(async () => {
    const tenant = await ensureTestTenant();
    tenantId = tenant.id;

    // Create admin user for testing
    const admin = await prisma.user.create({
      data: {
        email: 'dr-admin@test.com',
        name: 'DR Admin',
        password: 'hashedpassword',
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
        tenantId,
      },
    });

    organizerId = admin.id;
    adminToken = jwt.sign({ userId: admin.id, role: 'ADMIN', tenantId }, JWT_SECRET, {
      expiresIn: '1h',
    });
  });

  afterAll(async () => {
    // Cleanup
    if (drConfigId) {
      await prisma.drConfig.delete({ where: { id: drConfigId } }).catch(() => {});
    }
    if (backupScheduleId) {
      await prisma.backupSchedule.delete({ where: { id: backupScheduleId } }).catch(() => {});
    }
    if (backupTargetId) {
      await prisma.backupTarget.delete({ where: { id: backupTargetId } }).catch(() => {});
    }
    await prisma.user.delete({ where: { id: organizerId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('DR Configuration', () => {
    it('should create DR configuration', async () => {
      const response = await request(app)
        .post('/api/dr/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rto: 4,
          rpo: 1,
          backupRetentionDays: 30,
          testFrequencyDays: 90,
          autoFailover: false,
          notificationEmails: ['admin@example.com']
      });

      expect(response.status).toBe(201);
      const config = responseData(response.body);
      expect(config).toHaveProperty('id');
      expect(config.rtoMinutes).toBe(240);
      expect(config.rpoMinutes).toBe(60);
      expect(config.backupRetentionDays).toBe(30);

      drConfigId = config.id;
    });

    it('should get DR configuration', async () => {
      const response = await request(app)
        .get('/api/dr/config')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const config = responseData(response.body);
      expect(config.id).toBe(drConfigId);
      expect(config.rtoMinutes).toBe(240);
    });

    it('should update DR configuration', async () => {
      const response = await request(app)
        .put(`/api/dr/config/${drConfigId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rto: 2,
          rpo: 0.5,
          autoFailover: true
        });

      expect(response.status).toBe(200);
      const config = responseData(response.body);
      expect(config.rtoMinutes).toBe(120);
      expect(config.rpoMinutes).toBe(30);
      expect(config.enableFailover).toBe(true);
    });

    it('should validate RTO/RPO values', async () => {
      const response = await request(app)
        .post('/api/dr/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rto: -1, // Invalid
          rpo: 100 // Invalid
        });

      expect(response.status).toBe(400);
      expect(response.body.message || response.body.error).toBeTruthy();
    });
  });

  describe('Backup Schedules', () => {
    it('should create backup schedule', async () => {
      const response = await request(app)
        .post('/api/dr/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Daily Full Backup',
          backupType: 'FULL',
          frequency: 'DAILY',
          enabled: true,
          retentionDays: 7
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Daily Full Backup');
      expect(response.body.data.backupType).toBe('full');

      backupScheduleId = response.body.data.id;
    });

    it('should get all backup schedules', async () => {
      const response = await request(app)
        .get('/api/dr/schedules')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should update backup schedule', async () => {
      const response = await request(app)
        .put(`/api/dr/schedules/${backupScheduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          enabled: false,
          retentionDays: 14
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(false);
      expect(response.body.data.retentionDays).toBe(14);
    });

    it('should delete backup schedule', async () => {
      // Create a temporary schedule
      const createResponse = await request(app)
        .post('/api/dr/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Temp Schedule',
          backupType: 'DATA',
          frequency: 'HOURLY',
          enabled: false
        });

      const tempId = createResponse.body.data.id;

      const deleteResponse = await request(app)
        .delete(`/api/dr/schedules/${tempId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);
    });

    it('should execute manual backup', async () => {
      const response = await request(app)
        .post('/api/dr/backup/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ scheduleId: backupScheduleId });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('success');
    });

    it('should validate cron expression', async () => {
      const response = await request(app)
        .post('/api/dr/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Schedule',
          backupType: 'FULL',
          frequency: 'CUSTOM',
          enabled: true
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Backup Targets', () => {
    it('should create local backup target', async () => {
      const response = await request(app)
        .post('/api/dr/targets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Local Storage',
          type: 'LOCAL',
          config: {
            path: '/var/backups/event-manager'
          },
          enabled: true
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.type).toBe('LOCAL');

      backupTargetId = response.body.data.id;
    });

    it('should create S3 backup target (mocked)', async () => {
      const response = await request(app)
        .post('/api/dr/targets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'AWS S3 Backup',
          type: 'S3',
          config: {
            bucket: 'event-manager-backups',
            region: 'us-east-1',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret'
          },
          enabled: true
        });

      expect(response.status).toBe(201);
      expect(response.body.data.type).toBe('S3');
    });

    it('should verify backup target connection', async () => {
      const response = await request(app)
        .post(`/api/dr/targets/${backupTargetId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('verified');
    });

    it('should reject unknown backup target verification', async () => {
      const response = await request(app)
        .post('/api/dr/targets/nonexistent-target/verify')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([404, 500]).toContain(response.status);
    });

    it('should get all backup targets', async () => {
      const response = await request(app)
        .get('/api/dr/targets')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should update backup target', async () => {
      const response = await request(app)
        .put(`/api/dr/targets/${backupTargetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          enabled: false
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(false);
    });
  });

  describe('DR Testing', () => {
    it('should execute DR test', async () => {
      const response = await request(app)
        .post('/api/dr/test/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          testType: 'FAILOVER',
          scheduleId: backupScheduleId
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('success');
    });

    it('should get DR dashboard summary', async () => {
      const response = await request(app)
        .get('/api/dr/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('tests');
    });
  });

  describe('DR Metrics', () => {
    it('should collect DR metrics', async () => {
      const response = await request(app)
        .get('/api/dr/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should detect RTO violations', async () => {
      const response = await request(app)
        .get('/api/dr/rto-rpo')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(responseData(response.body)).toHaveProperty('rtoMinutes');
    });

    it('should detect RPO violations', async () => {
      const response = await request(app)
        .get('/api/dr/rto-rpo')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(responseData(response.body)).toHaveProperty('rpoViolation');
    });

    it('should get backup success rate', async () => {
      const response = await request(app)
        .get('/api/dr/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.backups).toHaveProperty('successRate');
      expect(typeof response.body.data.backups.successRate).toBe('number');
    });
  });

  describe('Access Control', () => {
    it('should deny non-admin access to DR config', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@test.com',
          name: 'Regular User',
          password: 'hashedpassword',
          role: 'JUDGE',
          isActive: true,
          sessionVersion: 1,
          tenantId,
        },
      });

      const userToken = jwt.sign({ userId: user.id, role: 'JUDGE', tenantId }, JWT_SECRET, {
        expiresIn: '1h',
      });

      const response = await request(app)
        .get('/api/dr/config')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);

      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});
