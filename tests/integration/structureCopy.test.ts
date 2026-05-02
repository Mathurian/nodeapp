import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ensureTestTenant } from '../helpers/testUtils';
import { container } from 'tsyringe';

const prisma = container.resolve<PrismaClient>('PrismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

describe('Structure Copy API Integration Tests', () => {
  let tenantId: string;
  let adminUser: any;
  let adminToken: string;
  let sourceEvent: any;
  let targetEvent: any;
  let sourceContest: any;
  let targetContest: any;
  let sourceCategory: any;
  let targetCategory: any;
  let directCategoryTemplate: any;
  let directEventTemplate: any;
  const directTemplateContestId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  beforeAll(async () => {
    const tenant = await ensureTestTenant();
    tenantId = tenant.id;

    await prisma.templateCriterion.deleteMany({
      where: { tenantId, template: { name: { contains: 'copy-test-' } } },
    });
    await prisma.categoryTemplate.deleteMany({
      where: { tenantId, name: { contains: 'copy-test-' } },
    });
    await prisma.eventTemplate.deleteMany({
      where: { tenantId, name: { contains: 'copy-test-' } },
    });
    await prisma.criterion.deleteMany({
      where: {
        tenantId,
        category: { name: { contains: 'copy-test-' } },
      },
    });
    await prisma.category.deleteMany({
      where: {
        tenantId,
        name: { contains: 'copy-test-' },
      },
    });
    await prisma.contest.deleteMany({
      where: {
        tenantId,
        name: { contains: 'copy-test-' },
      },
    });
    await prisma.event.deleteMany({
      where: {
        tenantId,
        name: { contains: 'copy-test-' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { contains: '@copytest.com' },
      },
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@copytest.com',
        name: 'Copy Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
        tenantId,
      },
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@copytest.com',
        password: 'password123',
      });

    if ((loginResponse.status === 200 || loginResponse.status === 201) && (loginResponse.body.data?.token || loginResponse.body.token)) {
      adminToken = loginResponse.body.data?.token || loginResponse.body.token;
    } else {
      adminToken = jwt.sign(
        { userId: adminUser.id, role: adminUser.role, tenantId },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    sourceEvent = await prisma.event.create({
      data: {
        name: `copy-test-source-event-${Date.now()}`,
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-02T00:00:00Z'),
        tenantId,
      },
    });

    targetEvent = await prisma.event.create({
      data: {
        name: `copy-test-target-event-${Date.now()}`,
        startDate: new Date('2025-02-01T00:00:00Z'),
        endDate: new Date('2025-02-02T00:00:00Z'),
        tenantId,
      },
    });

    sourceContest = await prisma.contest.create({
      data: {
        eventId: sourceEvent.id,
        name: `copy-test-source-contest-${Date.now()}`,
        description: 'Source contest',
        tenantId,
        contestantNumberingMode: 'AUTO_INDEXED',
        nextContestantNumber: 14,
        scoringType: 'OLYMPIC',
        contestantViewRestricted: true,
      },
    });

    targetContest = await prisma.contest.create({
      data: {
        eventId: targetEvent.id,
        name: `copy-test-target-contest-${Date.now()}`,
        description: 'Target contest',
        tenantId,
      },
    });

    sourceCategory = await prisma.category.create({
      data: {
        contestId: sourceContest.id,
        name: `copy-test-source-category-${Date.now()}`,
        description: 'Source category',
        scoreCap: 50,
        timeLimit: 10,
        contestantMin: 2,
        contestantMax: 8,
        tenantId,
        totalsCertified: true,
        boardApproved: true,
        approvedAt: new Date('2025-01-01T10:00:00Z'),
        approvedBy: adminUser.id,
      },
    });

    await prisma.criterion.createMany({
      data: [
        {
          categoryId: sourceCategory.id,
          name: 'Presence',
          maxScore: 20,
          tenantId,
        },
        {
          categoryId: sourceCategory.id,
          name: 'Execution',
          maxScore: 30,
          tenantId,
        },
      ],
    });

    targetCategory = await prisma.category.create({
      data: {
        contestId: targetContest.id,
        name: `copy-test-target-category-${Date.now()}`,
        description: 'Target category',
        tenantId,
      },
    });

    directCategoryTemplate = await prisma.categoryTemplate.create({
      data: {
        name: `copy-test-direct-template-${Date.now()}`,
        description: 'Direct template deployment',
        tenantId,
      },
    });

    await prisma.templateCriterion.createMany({
      data: [
        {
          templateId: directCategoryTemplate.id,
          name: 'Presentation',
          maxScore: 25,
          tenantId,
        },
        {
          templateId: directCategoryTemplate.id,
          name: 'Technique',
          maxScore: 25,
          tenantId,
        },
      ],
    });

    directEventTemplate = await prisma.eventTemplate.create({
      data: {
        name: `copy-test-event-template-${Date.now()}`,
        description: 'Deployable event template',
        contests: JSON.stringify([
          {
            id: directTemplateContestId,
            name: 'copy-test-template-contest',
            description: 'Contest from event template',
          },
        ]),
        categories: JSON.stringify([
          {
            contestId: directTemplateContestId,
            name: 'copy-test-template-category',
            description: 'Category from event template',
            scoreCap: 50,
            timeLimit: 5,
            contestantMin: 1,
            contestantMax: 5,
            criteria: [
              { name: 'Presence', maxScore: 20 },
              { name: 'Execution', maxScore: 30 },
            ],
          },
        ]),
        createdBy: adminUser.id,
        tenantId,
      },
    });
  });

  afterAll(async () => {
    await prisma.templateCriterion.deleteMany({
      where: { tenantId, template: { name: { contains: 'copy-test-' } } },
    });
    await prisma.categoryTemplate.deleteMany({
      where: { tenantId, name: { contains: 'copy-test-' } },
    });
    await prisma.eventTemplate.deleteMany({
      where: { tenantId, name: { contains: 'copy-test-' } },
    });
    await prisma.criterion.deleteMany({
      where: {
        tenantId,
        category: { name: { contains: 'copy-test-' } },
      },
    });
    await prisma.category.deleteMany({
      where: {
        tenantId,
        name: { contains: 'copy-test-' },
      },
    });
    await prisma.contest.deleteMany({
      where: {
        tenantId,
        name: { contains: 'copy-test-' },
      },
    });
    await prisma.event.deleteMany({
      where: {
        tenantId,
        name: { contains: 'copy-test-' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { contains: '@copytest.com' },
      },
    });

    await prisma.$disconnect();
  });

  it('clones a category with copied criteria and reset operational state', async () => {
    const response = await request(app)
      .post(`/api/categories/${sourceCategory.id}/clone`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        targetContestId: targetContest.id,
        name: 'copy-test-cloned-category',
        includeCriteria: true,
      });

    expect(response.status).toBe(201);
    const clonedCategoryId = response.body.data?.id || response.body.id;
    expect(clonedCategoryId).toBeTruthy();
    expect(response.body.data?.copiedCriteriaCount).toBe(2);

    const clonedCategory = await prisma.category.findUnique({
      where: { id: clonedCategoryId },
      include: { criteria: true },
    });

    expect(clonedCategory).toBeTruthy();
    expect(clonedCategory?.contestId).toBe(targetContest.id);
    expect(clonedCategory?.totalsCertified).toBe(false);
    expect(clonedCategory?.boardApproved).toBe(false);
    expect(clonedCategory?.criteria).toHaveLength(2);
  });

  it('clones a contest with categories, criteria, and reset numbering state', async () => {
    const response = await request(app)
      .post(`/api/contests/${sourceContest.id}/clone`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        targetEventId: targetEvent.id,
        name: 'copy-test-cloned-contest',
        includeCategories: true,
        includeCriteria: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.data?.copiedCategoriesCount).toBe(1);
    expect(response.body.data?.copiedCriteriaCount).toBe(2);

    const clonedContestId = response.body.data?.id || response.body.id;
    const clonedContest = await prisma.contest.findUnique({
      where: { id: clonedContestId },
      include: {
        categories: {
          include: { criteria: true },
        },
      },
    });

    expect(clonedContest).toBeTruthy();
    expect(clonedContest?.eventId).toBe(targetEvent.id);
    expect(clonedContest?.contestantNumberingMode).toBe(sourceContest.contestantNumberingMode);
    expect(clonedContest?.nextContestantNumber).toBe(1);
    expect(clonedContest?.winnersPublished).toBe(false);
    expect(clonedContest?.categories).toHaveLength(1);
    expect(clonedContest?.categories[0]?.criteria).toHaveLength(2);
  });

  it('creates a category template from a category and imports template criteria into another category', async () => {
    const templateResponse = await request(app)
      .post(`/api/templates/categories/from-category/${sourceCategory.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'copy-test-category-template',
        description: 'Saved from source category',
      });

    expect(templateResponse.status).toBe(201);
    const templateId = templateResponse.body.data?.id || templateResponse.body.id;
    expect(templateId).toBeTruthy();
    expect(templateResponse.body.data?.templateCriteria?.length).toBe(2);

    const importResponse = await request(app)
      .post(`/api/categories/${targetCategory.id}/criteria/import`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        templateId,
      });

    expect(importResponse.status).toBe(201);
    expect(importResponse.body.data?.importedCount).toBe(2);

    const importedCriteria = await prisma.criterion.findMany({
      where: { categoryId: targetCategory.id, tenantId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(importedCriteria).toHaveLength(2);

    const sourceCriteria = await prisma.criterion.findMany({
      where: { categoryId: sourceCategory.id, tenantId },
    });
    expect(sourceCriteria).toHaveLength(2);
  });

  it('creates a category directly from a saved category template', async () => {
    const response = await request(app)
      .post(`/api/templates/${directCategoryTemplate.id}/create-category`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        contestId: targetContest.id,
        name: 'copy-test-category-from-template',
        description: 'Created directly from template',
        scoreCap: 75,
      });

    expect(response.status).toBe(201);
    expect(response.body.data?.copiedCriteriaCount).toBe(2);

    const createdCategoryId = response.body.data?.id || response.body.id;
    const createdCategory = await prisma.category.findUnique({
      where: { id: createdCategoryId },
      include: { criteria: true },
    });

    expect(createdCategory?.contestId).toBe(targetContest.id);
    expect(createdCategory?.scoreCap).toBe(75);
    expect(createdCategory?.criteria).toHaveLength(2);
  });

  it('creates a contest directly from an event template contest', async () => {
    const response = await request(app)
      .post(`/api/event-templates/${directEventTemplate.id}/create-contest`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        templateContestId: directTemplateContestId,
        targetEventId: targetEvent.id,
        contestName: 'copy-test-contest-from-template',
        contestDescription: 'Created directly from event template',
      });

    expect(response.status).toBe(201);
    expect(response.body.data?.copiedCategoriesCount).toBe(1);
    expect(response.body.data?.copiedCriteriaCount).toBe(2);

    const createdContestId = response.body.data?.id || response.body.id;
    const createdContest = await prisma.contest.findUnique({
      where: { id: createdContestId },
      include: {
        categories: {
          include: { criteria: true },
        },
      },
    });

    expect(createdContest?.eventId).toBe(targetEvent.id);
    expect(createdContest?.categories).toHaveLength(1);
    expect(createdContest?.categories[0]?.criteria).toHaveLength(2);
  });
});
