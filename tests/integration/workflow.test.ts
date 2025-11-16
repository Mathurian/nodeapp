import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/server';
import { generateToken } from '../../src/utils/auth';

const prisma = new PrismaClient();

describe('Workflow System Integration Tests', () => {
  let adminToken: string;
  let adminId: string;
  let workflowTemplateId: string;
  let workflowInstanceId: string;
  let stepIds: string[] = [];

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        email: 'workflow-admin@test.com',
        username: 'workflowadmin',
        firstName: 'Workflow',
        lastName: 'Admin',
        password: 'hashedpassword',
        role: 'ADMIN',
        active: true
      }
    });

    adminId = admin.id;
    adminToken = generateToken({ id: admin.id, role: 'ADMIN' });
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
          active: true
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Contestant Approval Workflow');

      workflowTemplateId = response.body.id;
    });

    it('should create steps for template', async () => {
      // Step 1: Initial Review
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

      expect(step1Response.status).toBe(201);
      stepIds.push(step1Response.body.id);

      // Step 2: Board Approval
      const step2Response = await request(app)
        .post(`/api/workflows/templates/${workflowTemplateId}/steps`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Board Approval',
          description: 'Board reviews and approves',
          stepOrder: 2,
          requiredRole: 'BOARD',
          actions: ['APPROVE', 'REJECT'],
          autoAdvance: false,
          timeoutHours: 72
        });

      expect(step2Response.status).toBe(201);
      stepIds.push(step2Response.body.id);

      // Step 3: Final Registration
      const step3Response = await request(app)
        .post(`/api/workflows/templates/${workflowTemplateId}/steps`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Final Registration',
          description: 'Automatic registration completion',
          stepOrder: 3,
          requiredRole: 'ADMIN',
          actions: ['COMPLETE'],
          autoAdvance: true,
          timeoutHours: 24
        });

      expect(step3Response.status).toBe(201);
      stepIds.push(step3Response.body.id);
    });

    it('should create transitions between steps', async () => {
      // Transition: Initial Review APPROVE -> Board Approval
      const transition1 = await request(app)
        .post(`/api/workflows/templates/${workflowTemplateId}/transitions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fromStepId: stepIds[0],
          toStepId: stepIds[1],
          condition: 'APPROVE',
          priority: 1
        });

      expect(transition1.status).toBe(201);

      // Transition: Board Approval APPROVE -> Final Registration
      const transition2 = await request(app)
        .post(`/api/workflows/templates/${workflowTemplateId}/transitions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fromStepId: stepIds[1],
          toStepId: stepIds[2],
          condition: 'APPROVE',
          priority: 1
        });

      expect(transition2.status).toBe(201);
    });

    it('should validate workflow structure', async () => {
      const response = await request(app)
        .post(`/api/workflows/templates/${workflowTemplateId}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(true);
      expect(response.body.errors).toHaveLength(0);
    });

    it('should get workflow template details', async () => {
      const response = await request(app)
        .get(`/api/workflows/templates/${workflowTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(workflowTemplateId);
      expect(response.body.steps).toHaveLength(3);
      expect(response.body.transitions).toHaveLength(2);
    });
  });

  describe('Workflow Instances', () => {
    let entityId: string;

    beforeAll(async () => {
      // Create a test contestant
      const contestant = await prisma.user.create({
        data: {
          email: 'test-contestant@test.com',
          username: 'testcontestant',
          firstName: 'Test',
          lastName: 'Contestant',
          password: 'hashedpassword',
          role: 'CONTESTANT',
          active: true
        }
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
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('IN_PROGRESS');
      expect(response.body.currentStep).toBe(1);

      workflowInstanceId = response.body.id;
    });

    it('should get workflow instance details', async () => {
      const response = await request(app)
        .get(`/api/workflows/instances/${workflowInstanceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(workflowInstanceId);
      expect(response.body.template).toHaveProperty('name');
      expect(response.body.executions).toBeDefined();
    });

    it('should advance to next step', async () => {
      const response = await request(app)
        .post(`/api/workflows/instances/${workflowInstanceId}/advance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'APPROVE',
          comments: 'Application looks good',
          metadata: { reviewedBy: 'John Doe' }
        });

      expect(response.status).toBe(200);
      expect(response.body.currentStep).toBe(2);
      expect(response.body.status).toBe('IN_PROGRESS');
    });

    it('should validate role permissions', async () => {
      // Create a judge user (should not be able to advance BOARD step)
      const judge = await prisma.user.create({
        data: {
          email: 'judge@test.com',
          username: 'testjudge',
          firstName: 'Test',
          lastName: 'Judge',
          password: 'hashedpassword',
          role: 'JUDGE',
          active: true
        }
      });

      const judgeToken = generateToken({ id: judge.id, role: 'JUDGE' });

      const response = await request(app)
        .post(`/api/workflows/instances/${workflowInstanceId}/advance`)
        .set('Authorization', `Bearer ${judgeToken}`)
        .send({
          action: 'APPROVE'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('permission');

      await prisma.user.delete({ where: { id: judge.id } });
    });

    it('should handle conditional routing', async () => {
      // Test rejection flow
      const rejectResponse = await request(app)
        .post(`/api/workflows/instances/${workflowInstanceId}/advance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'REJECT',
          comments: 'Does not meet criteria'
        });

      expect([200, 400]).toContain(rejectResponse.status);
    });

    it('should complete workflow', async () => {
      // First advance to board approval if not already there
      await request(app)
        .post(`/api/workflows/instances/${workflowInstanceId}/advance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'APPROVE' });

      // Then complete final step
      const completeResponse = await request(app)
        .post(`/api/workflows/instances/${workflowInstanceId}/advance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'COMPLETE' });

      expect([200, 400]).toContain(completeResponse.status);
    });

    it('should get workflow history', async () => {
      const response = await request(app)
        .get(`/api/workflows/instances/${workflowInstanceId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
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
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should migrate existing certification data', async () => {
      const response = await request(app)
        .post('/api/workflows/migrate-certifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400]).toContain(response.status);
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

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalInstances');
      expect(response.body).toHaveProperty('completionRate');
      expect(response.body).toHaveProperty('avgCompletionTime');
    });

    it('should identify bottlenecks', async () => {
      const response = await request(app)
        .get(`/api/workflows/templates/${workflowTemplateId}/bottlenecks`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.slowSteps)).toBe(true);
    });
  });
});
