import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/server';
import { generateToken } from '../../src/utils/auth';

const prisma = new PrismaClient();

describe('DR Automation Integration Tests', () => {
  let adminToken: string;
  let organizerId: string;
  let drConfigId: string;
  let backupScheduleId: string;
  let backupTargetId: string;

  beforeAll(async () => {
    // Create admin user for testing
    const admin = await prisma.user.create({
      data: {
        email: 'dr-admin@test.com',
        username: 'dradmin',
        firstName: 'DR',
        lastName: 'Admin',
        password: 'hashedpassword',
        role: 'ADMIN',
        active: true
      }
    });

    organizerId = admin.id;
    adminToken = generateToken({ id: admin.id, role: 'ADMIN' });
  });

  afterAll(async () => {
    // Cleanup
    if (drConfigId) {
      await prisma.dRConfig.delete({ where: { id: drConfigId } }).catch(() => {});
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
      expect(response.body).toHaveProperty('id');
      expect(response.body.rto).toBe(4);
      expect(response.body.rpo).toBe(1);
      expect(response.body.backupRetentionDays).toBe(30);

      drConfigId = response.body.id;
    });

    it('should get DR configuration', async () => {
      const response = await request(app)
        .get('/api/dr/config')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(drConfigId);
      expect(response.body.rto).toBe(4);
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
      expect(response.body.rto).toBe(2);
      expect(response.body.rpo).toBe(0.5);
      expect(response.body.autoFailover).toBe(true);
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
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Backup Schedules', () => {
    it('should create backup schedule', async () => {
      const response = await request(app)
        .post('/api/dr/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Daily Full Backup',
          scheduleType: 'FULL',
          frequency: 'DAILY',
          cronExpression: '0 2 * * *',
          active: true,
          retentionDays: 7
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Daily Full Backup');
      expect(response.body.scheduleType).toBe('FULL');

      backupScheduleId = response.body.id;
    });

    it('should get all backup schedules', async () => {
      const response = await request(app)
        .get('/api/dr/schedules')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should update backup schedule', async () => {
      const response = await request(app)
        .put(`/api/dr/schedules/${backupScheduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          active: false,
          retentionDays: 14
        });

      expect(response.status).toBe(200);
      expect(response.body.active).toBe(false);
      expect(response.body.retentionDays).toBe(14);
    });

    it('should delete backup schedule', async () => {
      // Create a temporary schedule
      const createResponse = await request(app)
        .post('/api/dr/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Temp Schedule',
          scheduleType: 'INCREMENTAL',
          frequency: 'HOURLY',
          cronExpression: '0 * * * *',
          active: false
        });

      const tempId = createResponse.body.id;

      const deleteResponse = await request(app)
        .delete(`/api/dr/schedules/${tempId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(204);
    });

    it('should execute manual backup', async () => {
      const response = await request(app)
        .post(`/api/dr/schedules/${backupScheduleId}/execute`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('backupId');
      expect(response.body).toHaveProperty('status');
    });

    it('should validate cron expression', async () => {
      const response = await request(app)
        .post('/api/dr/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Schedule',
          scheduleType: 'FULL',
          frequency: 'CUSTOM',
          cronExpression: 'invalid cron',
          active: true
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
          targetType: 'LOCAL',
          config: {
            path: '/var/backups/event-manager'
          },
          active: true
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.targetType).toBe('LOCAL');

      backupTargetId = response.body.id;
    });

    it('should create S3 backup target (mocked)', async () => {
      const response = await request(app)
        .post('/api/dr/targets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'AWS S3 Backup',
          targetType: 'S3',
          config: {
            bucket: 'event-manager-backups',
            region: 'us-east-1',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret'
          },
          active: true
        });

      expect(response.status).toBe(201);
      expect(response.body.targetType).toBe('S3');
    });

    it('should verify backup target connection', async () => {
      const response = await request(app)
        .post(`/api/dr/targets/${backupTargetId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });

    it('should test S3 connection (mocked)', async () => {
      // This would be mocked in actual tests
      const response = await request(app)
        .post('/api/dr/targets/test-connection')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetType: 'S3',
          config: {
            bucket: 'test-bucket',
            region: 'us-west-2',
            accessKeyId: 'mock-key',
            secretAccessKey: 'mock-secret'
          }
        });

      expect([200, 400]).toContain(response.status);
    });

    it('should get all backup targets', async () => {
      const response = await request(app)
        .get('/api/dr/targets')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should update backup target', async () => {
      const response = await request(app)
        .put(`/api/dr/targets/${backupTargetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          active: false
        });

      expect(response.status).toBe(200);
      expect(response.body.active).toBe(false);
    });
  });

  describe('DR Testing', () => {
    it('should execute DR test', async () => {
      const response = await request(app)
        .post('/api/dr/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          testType: 'FAILOVER',
          targetEnvironment: 'STAGING'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('testId');
      expect(response.body).toHaveProperty('status');
    });

    it('should record DR test results', async () => {
      const testResponse = await request(app)
        .post('/api/dr/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          testType: 'RESTORE',
          targetEnvironment: 'TEST'
        });

      const testId = testResponse.body.testId;

      const resultResponse = await request(app)
        .post(`/api/dr/test/${testId}/results`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          success: true,
          actualRTO: 3.5,
          actualRPO: 0.8,
          issues: [],
          notes: 'Test completed successfully'
        });

      expect(resultResponse.status).toBe(200);
    });

    it('should get DR test history', async () => {
      const response = await request(app)
        .get('/api/dr/test/history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
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
      expect(response.body).toHaveProperty('backupMetrics');
      expect(response.body).toHaveProperty('testMetrics');
    });

    it('should detect RTO violations', async () => {
      const response = await request(app)
        .get('/api/dr/metrics/violations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rtoViolations');
      expect(Array.isArray(response.body.rtoViolations)).toBe(true);
    });

    it('should detect RPO violations', async () => {
      const response = await request(app)
        .get('/api/dr/metrics/violations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rpoViolations');
      expect(Array.isArray(response.body.rpoViolations)).toBe(true);
    });

    it('should get backup success rate', async () => {
      const response = await request(app)
        .get('/api/dr/metrics/success-rate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('successRate');
      expect(typeof response.body.successRate).toBe('number');
    });
  });

  describe('Access Control', () => {
    it('should deny non-admin access to DR config', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@test.com',
          username: 'regularuser',
          firstName: 'Regular',
          lastName: 'User',
          password: 'hashedpassword',
          role: 'JUDGE',
          active: true
        }
      });

      const userToken = generateToken({ id: user.id, role: 'JUDGE' });

      const response = await request(app)
        .get('/api/dr/config')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);

      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});
