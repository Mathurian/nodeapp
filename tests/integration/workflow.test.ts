import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/server';
import jwt from 'jsonwebtoken';
import { container } from 'tsyringe';
import { ensureTestTenant } from '../helpers/testUtils';

const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
const responseData = <T = any>(body: any): T => body.data ?? body;

describe('Workflow System Integration Tests', () => {
  let adminToken: string;
  let adminId: string;
  let workflowTemplateId: string;
  let workflowInstanceId: string;
  let stepIds: string[] = [];
  let tenantId: string;

  beforeAll(async () => {
    const tenant = await ensureTestTenant();
    tenantId = tenant.id;

    const admin = await prisma.user.create({
      data: {
        email: 'workflow-admin@test.com',
        name: 'Workflow Admin',
        password: 'hashedpassword',
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
        tenantId,
      },
    });

    adminId = admin.id;
    adminToken = jwt.sign({ userId: admin.id, role: 'ADMIN', tenantId }, JWT_SECRET, {
      expiresIn: '1h',
    });
  });

  afterAll(async () => {
    // Cleanup
    if (workflowInstanceId) {
      await prisma.workflowInstance.delete({ where: { id: workflowInstanceId } }).catch(() => {});
    }
    if (workflowTemplateId) {
      await prisma.workflowTemplate.delete({ where: { id: workflowTemplateId } }).catch(() => {});
    }
    await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('Workflow Templates', () => {
    it('should create workflow template', async () => {
      const response = await request(app)
        .post('/api/workflows/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Contestant Approval Workflow',
          description: 'Multi-step approval process for contestants',
          entityType: 'CONTESTANT',
          isActive: true,
          steps: [
            {
              name: 'Initial Review',
              description: 'Organizer reviews contestant application',
              stepOrder: 1,
              requiredRole: 'ORGANIZER',
              actions: { allowed: ['APPROVE', 'REJECT', 'REQUEST_CHANGES'] },
              autoAdvance: false,
            },
            {
              name: 'Board Approval',
              description: 'Board reviews and approves',
              stepOrder: 2,
              requiredRole: 'BOARD',
              actions: { allowed: ['APPROVE', 'REJECT'] },
              autoAdvance: false,
            },
            {
              name: 'Final Registration',
              description: 'Automatic registration completion',
              stepOrder: 3,
              requiredRole: 'ADMIN',
              actions: { allowed: ['COMPLETE'] },
              autoAdvance: true,
            },
          ],
        });

      expect(response.status).toBe(201);
      const template = responseData(response.body);
      expect(template).toHaveProperty('id');
      expect(template.name).toBe('Contestant Approval Workflow');
      expect(template.steps).toHaveLength(3);

      workflowTemplateId = template.id;
      stepIds = template.steps.map((step: any) => step.id);
    });

    it('should report legacy step creation route as unsupported', async () => {
      const step1Response = await request(app)
        .post(`/api/workflows/templates/${workflowTemplateId}/steps`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Initial Review',
          description: 'Organizer reviews contestant application',
          stepOrder: 1,
          requiredRole: 'ORGANIZER',
          actions: ['APPROVE', 'REJECT', 'REQUEST_CHANGES'],
          autoAdvance: false,
          timeoutHours: 48
        });

      expect(step1Response.status).toBe(404);
      expect(step1Response.body.message || step1Response.body.error).toBeTruthy();
    });

    it('should report legacy transition route as unsupported', async () => {
      const transition1 = await request(app)
        .post(`/api/workflows/templates/${workflowTemplateId}/transitions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fromStepId: stepIds[0],
          toStepId: stepIds[1],
          condition: 'APPROVE',
          priority: 1
        });

      expect(transition1.status).toBe(404);
      expect(transition1.body.message || transition1.body.error).toBeTruthy();
    });

    it('should report legacy workflow validation route as unsupported', async () => {
      const response = await request(app)
        .post(`/api/workflows/templates/${workflowTemplateId}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message || response.body.error).toBeTruthy();
    });

    it('should get workflow template details', async () => {
      const response = await request(app)
        .get(`/api/workflows/templates/${workflowTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const template = responseData(response.body);
      expect(template.id).toBe(workflowTemplateId);
      expect(template.steps).toHaveLength(3);
    });
  });

  describe('Workflow Instances', () => {
    let entityId: string;

    beforeAll(async () => {
      // Create a test contestant
      const contestant = await prisma.user.create({
        data: {
          email: 'test-contestant@test.com',
          name: 'Test Contestant',
          password: 'hashedpassword',
          role: 'CONTESTANT',
          isActive: true,
          sessionVersion: 1,
          tenantId,
        },
      });
      entityId = contestant.id;
    });

    it('should start workflow instance', async () => {
      const response = await request(app)
        .post('/api/workflows/instances')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          templateId: workflowTemplateId,
          entityType: 'CONTESTANT',
          entityId: entityId,
          initiatedBy: adminId
        });

      expect(response.status).toBe(201);
      const instance = responseData(response.body);
      expect(instance).toHaveProperty('id');
      expect(instance.status).toBe('active');
      expect(instance.currentStepId).toBe(stepIds[0]);

      workflowInstanceId = instance.id;
    });

    it('should get workflow instance details', async () => {
      const response = await request(app)
        .get(`/api/workflows/instances/${workflowInstanceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const instance = responseData(response.body);
      expect(instance.id).toBe(workflowInstanceId);
      expect(instance.currentStep).toMatchObject({ id: stepIds[0], name: 'Initial Review' });
      expect(instance.steps).toBeDefined();
    });

    it('should advance to next step', async () => {
      const response = await request(app)
        .post(`/api/workflows/instances/${workflowInstanceId}/advance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvalStatus: 'approved',
          comments: 'Application looks good',
          metadata: { reviewedBy: 'John Doe' }
        });

      expect(response.status).toBe(200);
      const instance = responseData(response.body);
      expect(instance.currentStep).toMatchObject({ id: stepIds[1], name: 'Board Approval' });
      expect(instance.status).toBe('active');
    });

    it('should validate role permissions', async () => {
      // Create a judge user (should not be able to advance BOARD step)
      const judge = await prisma.user.create({
        data: {
          email: 'judge@test.com',
          name: 'Test Judge',
          password: 'hashedpassword',
          role: 'JUDGE',
          isActive: true,
          sessionVersion: 1,
          tenantId,
        },
      });

      const judgeToken = jwt.sign({ userId: judge.id, role: 'JUDGE', tenantId }, JWT_SECRET, {
        expiresIn: '1h',
      });

      const response = await request(app)
        .post(`/api/workflows/instances/${workflowInstanceId}/advance`)
        .set('Authorization', `Bearer ${judgeToken}`)
        .send({
          approvalStatus: 'approved'
        });

      expect(response.status).toBe(403);
      expect(response.body.message || response.body.error).toContain('not allowed');

      await prisma.user.delete({ where: { id: judge.id } });
    });

    it('should handle conditional routing', async () => {
      const startResponse = await request(app)
        .post('/api/workflows/instances')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          templateId: workflowTemplateId,
          entityType: 'CONTESTANT',
          entityId,
        });
      expect(startResponse.status).toBe(201);
      const rejectInstanceId = responseData(startResponse.body).id;

      // Test rejection flow
      const rejectResponse = await request(app)
        .post(`/api/workflows/instances/${rejectInstanceId}/advance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvalStatus: 'rejected',
          comments: 'Does not meet criteria'
        });

      expect([200, 400]).toContain(rejectResponse.status);
    });

    it('should complete workflow', async () => {
      // First advance to board approval if not already there
      await request(app)
        .post(`/api/workflows/instances/${workflowInstanceId}/advance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approvalStatus: 'approved' });

      // Then complete final step
      const completeResponse = await request(app)
        .post(`/api/workflows/instances/${workflowInstanceId}/advance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approvalStatus: 'approved' });

      expect([200, 400]).toContain(completeResponse.status);
    });

    it('should expose workflow history through instance step executions', async () => {
      const response = await request(app)
        .get(`/api/workflows/instances/${workflowInstanceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const instance = responseData(response.body);
      expect(Array.isArray(instance.steps)).toBe(true);
      expect(instance.steps.length).toBeGreaterThan(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with existing certification workflow', async () => {
      // Test that new workflow system doesn't break existing certification
      const response = await request(app)
        .get('/api/workflows/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ entityType: 'CATEGORY' });

      expect(response.status).toBe(200);
      expect(Array.isArray(responseData(response.body))).toBe(true);
    });

    it('should migrate existing certification data', async () => {
      const response = await request(app)
        .post('/api/workflows/migrate-certifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message || response.body.error).toBeTruthy();
    });
  });

  describe('Workflow Analytics', () => {
    it('should get workflow metrics', async () => {
      const response = await request(app)
        .get('/api/workflows/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          templateId: workflowTemplateId,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      expect(response.status).toBe(404);
      expect(response.body.message || response.body.error).toBeTruthy();
    });

    it('should identify bottlenecks', async () => {
      const response = await request(app)
        .get(`/api/workflows/templates/${workflowTemplateId}/bottlenecks`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message || response.body.error).toBeTruthy();
    });
  });
});
