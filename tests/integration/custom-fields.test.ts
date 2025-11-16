import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/server';
import { generateToken } from '../../src/utils/auth';

const prisma = new PrismaClient();

describe('Custom Fields Integration Tests', () => {
  let adminToken: string;
  let adminId: string;
  let textFieldId: string;
  let selectFieldId: string;
  let entityId: string;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        email: 'cf-admin@test.com',
        username: 'cfadmin',
        firstName: 'CF',
        lastName: 'Admin',
        password: 'hashedpassword',
        role: 'ADMIN',
        active: true
      }
    });

    adminId = admin.id;
    adminToken = generateToken({ id: admin.id, role: 'ADMIN' });

    // Create a test user entity
    const testUser = await prisma.user.create({
      data: {
        email: 'test-entity@test.com',
        username: 'testentity',
        firstName: 'Test',
        lastName: 'Entity',
        password: 'hashedpassword',
        role: 'CONTESTANT',
        active: true
      }
    });
    entityId = testUser.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
    await prisma.user.delete({ where: { id: entityId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('Field Definitions', () => {
    it('should create TEXT custom field for USER entity', async () => {
      const response = await request(app)
        .post('/api/custom-fields/USER')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldName: 'phoneNumber',
          fieldLabel: 'Phone Number',
          fieldType: 'PHONE',
          required: true,
          helpText: 'Enter your contact number',
          displayOrder: 0
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.fieldName).toBe('phoneNumber');
      expect(response.body.fieldType).toBe('PHONE');
      expect(response.body.required).toBe(true);

      textFieldId = response.body.id;
    });

    it('should create SELECT custom field', async () => {
      const response = await request(app)
        .post('/api/custom-fields/USER')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldName: 'tshirtSize',
          fieldLabel: 'T-Shirt Size',
          fieldType: 'SELECT',
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
          required: false,
          displayOrder: 1
        });

      expect(response.status).toBe(201);
      expect(response.body.fieldType).toBe('SELECT');
      expect(response.body.options).toHaveLength(6);

      selectFieldId = response.body.id;
    });

    it('should create MULTI_SELECT custom field', async () => {
      const response = await request(app)
        .post('/api/custom-fields/USER')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldName: 'interests',
          fieldLabel: 'Interests',
          fieldType: 'MULTI_SELECT',
          options: ['Music', 'Dance', 'Acting', 'Singing'],
          required: false,
          displayOrder: 2
        });

      expect(response.status).toBe(201);
      expect(response.body.fieldType).toBe('MULTI_SELECT');
    });

    it('should create NUMBER custom field with validation', async () => {
      const response = await request(app)
        .post('/api/custom-fields/CONTESTANT')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldName: 'age',
          fieldLabel: 'Age',
          fieldType: 'NUMBER',
          required: true,
          validation: {
            min: 5,
            max: 25
          },
          displayOrder: 0
        });

      expect(response.status).toBe(201);
      expect(response.body.validation.min).toBe(5);
      expect(response.body.validation.max).toBe(25);
    });

    it('should create DATE custom field', async () => {
      const response = await request(app)
        .post('/api/custom-fields/EVENT')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldName: 'registrationDeadline',
          fieldLabel: 'Registration Deadline',
          fieldType: 'DATE',
          required: true,
          displayOrder: 0
        });

      expect(response.status).toBe(201);
      expect(response.body.fieldType).toBe('DATE');
    });

    it('should create BOOLEAN custom field', async () => {
      const response = await request(app)
        .post('/api/custom-fields/CONTESTANT')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldName: 'needsAccommodation',
          fieldLabel: 'Needs Special Accommodation',
          fieldType: 'BOOLEAN',
          required: false,
          displayOrder: 1
        });

      expect(response.status).toBe(201);
      expect(response.body.fieldType).toBe('BOOLEAN');
    });

    it('should create EMAIL custom field', async () => {
      const response = await request(app)
        .post('/api/custom-fields/JUDGE')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldName: 'alternateEmail',
          fieldLabel: 'Alternate Email',
          fieldType: 'EMAIL',
          required: false,
          displayOrder: 0
        });

      expect(response.status).toBe(201);
      expect(response.body.fieldType).toBe('EMAIL');
    });

    it('should create URL custom field', async () => {
      const response = await request(app)
        .post('/api/custom-fields/CONTESTANT')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldName: 'portfolioUrl',
          fieldLabel: 'Portfolio Website',
          fieldType: 'URL',
          required: false,
          helpText: 'Link to your online portfolio',
          displayOrder: 2
        });

      expect(response.status).toBe(201);
      expect(response.body.fieldType).toBe('URL');
    });

    it('should validate field types', async () => {
      const response = await request(app)
        .post('/api/custom-fields/USER')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldName: 'invalidField',
          fieldLabel: 'Invalid',
          fieldType: 'INVALID_TYPE',
          displayOrder: 99
        });

      expect(response.status).toBe(400);
    });

    it('should enforce required field options for SELECT', async () => {
      const response = await request(app)
        .post('/api/custom-fields/USER')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldName: 'selectWithoutOptions',
          fieldLabel: 'Select Without Options',
          fieldType: 'SELECT',
          displayOrder: 99
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('options');
    });

    it('should get all fields for entity type', async () => {
      const response = await request(app)
        .get('/api/custom-fields/USER')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should reorder fields', async () => {
      const response = await request(app)
        .put(`/api/custom-fields/USER/${textFieldId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayOrder: 5
        });

      expect(response.status).toBe(200);
      expect(response.body.displayOrder).toBe(5);
    });

    it('should update field', async () => {
      const response = await request(app)
        .put(`/api/custom-fields/USER/${selectFieldId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          required: true,
          helpText: 'Required for merchandise'
        });

      expect(response.status).toBe(200);
      expect(response.body.required).toBe(true);
      expect(response.body.helpText).toBe('Required for merchandise');
    });

    it('should delete field', async () => {
      // Create a temp field
      const createResponse = await request(app)
        .post('/api/custom-fields/USER')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldName: 'tempField',
          fieldLabel: 'Temp Field',
          fieldType: 'TEXT',
          displayOrder: 99
        });

      const tempId = createResponse.body.id;

      const deleteResponse = await request(app)
        .delete(`/api/custom-fields/USER/${tempId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(204);
    });
  });

  describe('Field Values', () => {
    it('should save TEXT field value', async () => {
      const response = await request(app)
        .post(`/api/custom-fields/USER/${entityId}/values`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldId: textFieldId,
          value: '(555) 123-4567'
        });

      expect(response.status).toBe(201);
      expect(response.body.value).toBe('(555) 123-4567');
    });

    it('should save SELECT field value', async () => {
      const response = await request(app)
        .post(`/api/custom-fields/USER/${entityId}/values`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldId: selectFieldId,
          value: 'L'
        });

      expect(response.status).toBe(201);
      expect(response.body.value).toBe('L');
    });

    it('should validate required fields', async () => {
      // Try to submit without required field
      const response = await request(app)
        .post(`/api/custom-fields/USER/${entityId}/values/validate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          values: {
            tshirtSize: 'M'
            // Missing required phoneNumber
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('phoneNumber');
    });

    it('should validate EMAIL format', async () => {
      // Create email field
      const emailField = await request(app)
        .post('/api/custom-fields/USER')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldName: 'contactEmail',
          fieldLabel: 'Contact Email',
          fieldType: 'EMAIL',
          required: false,
          displayOrder: 10
        });

      const response = await request(app)
        .post(`/api/custom-fields/USER/${entityId}/values`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldId: emailField.body.id,
          value: 'invalid-email'
        });

      expect(response.status).toBe(400);
    });

    it('should validate URL format', async () => {
      // Create URL field
      const urlField = await request(app)
        .post('/api/custom-fields/USER')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldName: 'website',
          fieldLabel: 'Website',
          fieldType: 'URL',
          required: false,
          displayOrder: 11
        });

      const invalidResponse = await request(app)
        .post(`/api/custom-fields/USER/${entityId}/values`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldId: urlField.body.id,
          value: 'not-a-url'
        });

      expect(invalidResponse.status).toBe(400);

      const validResponse = await request(app)
        .post(`/api/custom-fields/USER/${entityId}/values`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldId: urlField.body.id,
          value: 'https://example.com'
        });

      expect(validResponse.status).toBe(201);
    });

    it('should get all field values for entity', async () => {
      const response = await request(app)
        .get(`/api/custom-fields/USER/${entityId}/values`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should bulk save field values', async () => {
      const response = await request(app)
        .post(`/api/custom-fields/USER/${entityId}/values/bulk`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fieldValues: [
            { fieldId: textFieldId, value: '(555) 987-6543' },
            { fieldId: selectFieldId, value: 'XL' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.saved).toBe(2);
    });
  });
});
