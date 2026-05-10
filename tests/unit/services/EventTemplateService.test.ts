import 'reflect-metadata';

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import {
  CreateContestFromTemplateDto,
  CreateEventFromTemplateDto,
  CreateTemplateFromEventDto,
  CreateTemplateDto,
  EventTemplateService,
  UpdateTemplateDto,
} from '../../../src/services/EventTemplateService';
import { NotFoundError } from '../../../src/services/BaseService';
import { CacheService } from '../../../src/services/CacheService';

describe('EventTemplateService', () => {
  let service: EventTemplateService;
  let prismaMock: DeepMockProxy<PrismaClient>;
  let cacheServiceMock: Pick<CacheService, 'del' | 'invalidatePattern'>;

  const TEST_TENANT_ID = 'tenant-1';
  const TEST_USER_ID = 'user-1';
  const BASE_TIME = new Date('2026-02-25T12:00:00.000Z');

  const buildTemplateRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 'template-1',
    name: 'Standard Competition',
    description: 'Template description',
    contests: JSON.stringify([{ id: 'contest-template-1', name: 'Talent', description: 'Talent show' }]),
    categories: JSON.stringify([
      {
        id: 'category-template-1',
        contestId: 'contest-template-1',
        name: 'Solo',
        description: 'Solo division',
        scoreCap: 100,
        timeLimit: 300,
        contestantMin: 1,
        contestantMax: 20,
        criteria: [
          { name: 'Technique', maxScore: 10 },
          { name: 'Creativity', maxScore: 15 },
        ],
      },
    ]),
    createdBy: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    creator: { id: TEST_USER_ID, name: 'Template Owner', email: 'owner@example.com' },
    ...overrides,
  });

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    cacheServiceMock = {
      del: jest.fn().mockResolvedValue(undefined),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
    };
    service = new EventTemplateService(prismaMock as any, cacheServiceMock as CacheService);
  });

  afterEach(() => {
    mockReset(prismaMock);
  });

  describe('create', () => {
    it('creates an event template with tenant-aware data', async () => {
      const input: CreateTemplateDto = {
        name: 'Standard Competition',
        description: 'Template description',
        contests: [{ id: 'contest-template-1', name: 'Talent', description: 'Talent show' }],
        categories: [
          { id: 'category-template-1', contestId: 'contest-template-1', name: 'Solo', scoreCap: 100 },
        ],
        createdBy: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
      };
      prismaMock.eventTemplate.create.mockResolvedValue(buildTemplateRecord() as any);

      const result = await service.create(input);

      expect(prismaMock.eventTemplate.create).toHaveBeenCalledWith({
        data: {
          name: input.name,
          description: input.description,
          contests: JSON.stringify(input.contests),
          categories: JSON.stringify(input.categories),
          createdBy: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
        },
      });
      expect(result).toMatchObject({
        id: 'template-1',
        name: input.name,
        description: input.description,
        contests: input.contests,
        categories: input.categories,
      });
    });

    it('rejects missing required template fields', async () => {
      await expect(
        service.create({
          name: '',
          contests: [],
          categories: [],
          createdBy: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
        })
      ).rejects.toThrow('Name, contests, and categories are required');
    });
  });

  describe('getAll', () => {
    it('returns templates scoped to the tenant', async () => {
      prismaMock.eventTemplate.findMany.mockResolvedValue([buildTemplateRecord()] as any);

      const result = await service.getAll(TEST_TENANT_ID);

      expect(prismaMock.eventTemplate.findMany).toHaveBeenCalledWith({
        where: { tenantId: TEST_TENANT_ID },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].creator).toEqual({
        id: TEST_USER_ID,
        name: 'Template Owner',
        email: 'owner@example.com',
      });
    });
  });

  describe('createFromEvent', () => {
    it('creates a tenant-scoped template from the event structure', async () => {
      const input: CreateTemplateFromEventDto = {
        eventId: 'event-1',
        name: 'Spring Competition Template',
        description: 'Reusable spring structure',
        createdBy: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
      };

      prismaMock.event.findFirst.mockResolvedValue({
        id: 'event-1',
        name: 'Spring Competition',
        description: 'Event source description',
        contests: [
          {
            id: 'contest-1',
            name: 'Talent',
            description: 'Talent show',
            categories: [
              {
                id: 'category-1',
                name: 'Solo',
                description: 'Solo division',
                scoreCap: 100,
                timeLimit: 300,
                contestantMin: 1,
                contestantMax: 20,
                criteria: [
                  { name: 'Technique', maxScore: 10 },
                  { name: 'Creativity', maxScore: 15 },
                ],
              },
            ],
          },
        ],
      } as any);
      prismaMock.eventTemplate.create.mockResolvedValue(
        buildTemplateRecord({
          name: input.name,
          description: input.description,
        }) as any
      );

      const result = await service.createFromEvent(input);

      expect(prismaMock.event.findFirst).toHaveBeenCalledWith({
        where: {
          id: input.eventId,
          tenantId: TEST_TENANT_ID,
          deletedAt: null,
        },
        include: {
          contests: {
            where: {
              deletedAt: null,
              archived: false,
            },
            orderBy: { createdAt: 'asc' },
            include: {
              categories: {
                where: {
                  deletedAt: null,
                },
                orderBy: { createdAt: 'asc' },
                include: {
                  criteria: {
                    orderBy: { createdAt: 'asc' },
                  },
                },
              },
            },
          },
        },
      });
      expect(prismaMock.eventTemplate.create).toHaveBeenCalledWith({
        data: {
          name: input.name,
          description: input.description,
          contests: JSON.stringify([
            { id: 'contest-1', name: 'Talent', description: 'Talent show' },
          ]),
          categories: JSON.stringify([
            {
              id: 'category-1',
              contestId: 'contest-1',
              name: 'Solo',
              description: 'Solo division',
              scoreCap: 100,
              timeLimit: 300,
              contestantMin: 1,
              contestantMax: 20,
              criteria: [
                { name: 'Technique', maxScore: 10 },
                { name: 'Creativity', maxScore: 15 },
              ],
            },
          ]),
          createdBy: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
        },
      });
      expect(result).toMatchObject({
        id: 'template-1',
        name: input.name,
        description: input.description,
      });
    });

    it('falls back to the source event description when a template description is omitted', async () => {
      prismaMock.event.findFirst.mockResolvedValue({
        id: 'event-1',
        name: 'Spring Competition',
        description: 'Event source description',
        contests: [],
      } as any);
      prismaMock.eventTemplate.create.mockResolvedValue(
        buildTemplateRecord({
          name: 'Spring Competition Template',
          description: 'Event source description',
          contests: JSON.stringify([]),
          categories: JSON.stringify([]),
        }) as any
      );

      await service.createFromEvent({
        eventId: 'event-1',
        name: 'Spring Competition Template',
        createdBy: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
      });

      expect(prismaMock.eventTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'Event source description',
        }),
      });
    });

    it('throws NotFoundError when the source event is missing', async () => {
      prismaMock.event.findFirst.mockResolvedValue(null);

      await expect(
        service.createFromEvent({
          eventId: 'missing',
          name: 'Missing Event Template',
          createdBy: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getById', () => {
    it('returns a single template scoped to the tenant', async () => {
      prismaMock.eventTemplate.findFirst.mockResolvedValue(buildTemplateRecord() as any);

      const result = await service.getById('template-1', TEST_TENANT_ID);

      expect(prismaMock.eventTemplate.findFirst).toHaveBeenCalledWith({
        where: { id: 'template-1', tenantId: TEST_TENANT_ID },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      expect(result.name).toBe('Standard Competition');
      expect(result.contests[0].name).toBe('Talent');
    });

    it('throws NotFoundError when the template does not exist', async () => {
      prismaMock.eventTemplate.findFirst.mockResolvedValue(null);

      await expect(service.getById('missing', TEST_TENANT_ID)).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates an existing tenant-owned template', async () => {
      const input: UpdateTemplateDto = {
        name: 'Updated Template',
        description: 'Updated description',
        contests: [{ id: 'contest-template-1', name: 'Updated Contest' }],
        categories: [{ id: 'category-template-1', contestId: 'contest-template-1', name: 'Updated Category' }],
      };
      prismaMock.eventTemplate.findFirst.mockResolvedValue(buildTemplateRecord() as any);
      prismaMock.eventTemplate.update.mockResolvedValue(
        buildTemplateRecord({
          name: input.name,
          description: input.description,
          contests: JSON.stringify(input.contests),
          categories: JSON.stringify(input.categories),
        }) as any
      );

      const result = await service.update('template-1', TEST_TENANT_ID, input);

      expect(prismaMock.eventTemplate.findFirst).toHaveBeenCalledWith({
        where: { id: 'template-1', tenantId: TEST_TENANT_ID },
      });
      expect(prismaMock.eventTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: {
          name: input.name,
          description: input.description,
          contests: JSON.stringify(input.contests),
          categories: JSON.stringify(input.categories),
        },
      });
      expect(result.categories[0].name).toBe('Updated Category');
    });

    it('rejects missing update fields', async () => {
      await expect(
        service.update('template-1', TEST_TENANT_ID, {
          name: '',
          contests: [],
          categories: [],
        })
      ).rejects.toThrow('Name, contests, and categories are required');
    });
  });

  describe('delete', () => {
    it('deletes a tenant-owned template', async () => {
      prismaMock.eventTemplate.findFirst.mockResolvedValue(buildTemplateRecord() as any);
      prismaMock.eventTemplate.delete.mockResolvedValue(buildTemplateRecord() as any);

      await service.delete('template-1', TEST_TENANT_ID);

      expect(prismaMock.eventTemplate.findFirst).toHaveBeenCalledWith({
        where: { id: 'template-1', tenantId: TEST_TENANT_ID },
      });
      expect(prismaMock.eventTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
    });

    it('throws NotFoundError when deleting a missing template', async () => {
      prismaMock.eventTemplate.findFirst.mockResolvedValue(null);

      await expect(service.delete('missing', TEST_TENANT_ID)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createEventFromTemplate', () => {
    it('creates an event, contests, categories, and criteria from the template', async () => {
      const input: CreateEventFromTemplateDto = {
        templateId: 'template-1',
        eventName: 'Spring Competition 2026',
        eventDescription: 'Annual spring event',
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        endDate: new Date('2026-05-03T00:00:00.000Z'),
        tenantId: TEST_TENANT_ID,
      };
      prismaMock.eventTemplate.findFirst.mockResolvedValue(buildTemplateRecord() as any);
      const tx = {
        event: {
          create: jest.fn().mockResolvedValue({
            id: 'event-1',
            name: input.eventName,
            description: input.eventDescription,
            startDate: input.startDate,
            endDate: input.endDate,
            createdAt: BASE_TIME,
          }),
        },
        contest: {
          create: jest.fn().mockResolvedValue({
            id: 'contest-1',
            eventId: 'event-1',
            name: 'Talent',
            description: 'Talent show',
            tenantId: TEST_TENANT_ID,
            createdAt: BASE_TIME,
          }),
        },
        category: {
          create: jest.fn().mockResolvedValue({
            id: 'category-1',
            contestId: 'contest-1',
            name: 'Solo',
            description: 'Solo division',
            tenantId: TEST_TENANT_ID,
          }),
        },
        criterion: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback: any) => callback(tx));

      const result = await service.createEventFromTemplate(input);

      expect(tx.event.create).toHaveBeenCalledWith({
        data: {
          name: input.eventName,
          description: input.eventDescription,
          startDate: input.startDate,
          endDate: input.endDate,
          tenantId: TEST_TENANT_ID,
        },
      });
      expect(tx.contest.create).toHaveBeenCalledWith({
        data: {
          eventId: 'event-1',
          name: 'Talent',
          description: 'Talent show',
          commentaryMode: 'PER_CRITERION',
          commentaryScope: 'CATEGORY',
          tenantId: TEST_TENANT_ID,
        },
      });
      expect(tx.category.create).toHaveBeenCalledWith({
        data: {
          contestId: 'contest-1',
          name: 'Solo',
          description: 'Solo division',
          scoreCap: 100,
          timeLimit: 300,
          contestantMin: 1,
          contestantMax: 20,
          commentaryMode: 'PER_CRITERION',
          commentaryScope: 'CATEGORY',
          tenantId: TEST_TENANT_ID,
        },
      });
      expect(tx.criterion.createMany).toHaveBeenCalledWith({
        data: [
          {
            categoryId: 'category-1',
            name: 'Technique',
            maxScore: 10,
            tenantId: TEST_TENANT_ID,
          },
          {
            categoryId: 'category-1',
            name: 'Creativity',
            maxScore: 15,
            tenantId: TEST_TENANT_ID,
          },
        ],
      });
      expect(result).toEqual({
        id: 'event-1',
        name: 'Spring Competition 2026',
        description: 'Annual spring event',
        startDate: input.startDate,
        endDate: input.endDate,
        createdAt: BASE_TIME,
      });
      expect(cacheServiceMock.del).toHaveBeenCalledWith('contests:event:event-1');
      expect(cacheServiceMock.invalidatePattern).toHaveBeenCalledWith('events:*');
    });

    it('rejects a missing template id', async () => {
      await expect(
        service.createEventFromTemplate({
          templateId: '',
          tenantId: TEST_TENANT_ID,
        })
      ).rejects.toThrow('Template ID is required');
    });

    it('throws NotFoundError when the template is missing', async () => {
      prismaMock.eventTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.createEventFromTemplate({
          templateId: 'missing',
          tenantId: TEST_TENANT_ID,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('createContestFromTemplate', () => {
    it('creates a contest and its category structure from the selected template contest', async () => {
      const input: CreateContestFromTemplateDto = {
        templateId: 'template-1',
        templateContestId: 'contest-template-1',
        targetEventId: 'event-1',
        contestName: 'Talent Finals',
        contestDescription: 'Final round',
        tenantId: TEST_TENANT_ID,
      };

      prismaMock.eventTemplate.findFirst.mockResolvedValue(buildTemplateRecord() as any);
      prismaMock.event.findFirst.mockResolvedValue({ id: 'event-1' } as any);
      const tx = {
        contest: {
          create: jest.fn().mockResolvedValue({
            id: 'contest-1',
            eventId: 'event-1',
            name: 'Talent Finals',
            description: 'Final round',
            createdAt: BASE_TIME,
          }),
        },
        category: {
          create: jest.fn().mockResolvedValue({
            id: 'category-1',
          }),
        },
        criterion: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };
      prismaMock.$transaction.mockImplementation(async (callback: any) => callback(tx));

      const result = await service.createContestFromTemplate(input);

      expect(tx.contest.create).toHaveBeenCalledWith({
        data: {
          eventId: 'event-1',
          name: 'Talent Finals',
          description: 'Final round',
          commentaryMode: 'PER_CRITERION',
          commentaryScope: 'CATEGORY',
          tenantId: TEST_TENANT_ID,
        },
      });
      expect(result).toMatchObject({
        id: 'contest-1',
        eventId: 'event-1',
        name: 'Talent Finals',
        description: 'Final round',
        copiedCategoriesCount: 1,
        copiedCriteriaCount: 2,
      });
      expect(cacheServiceMock.del).toHaveBeenCalledWith('contests:event:event-1');
      expect(cacheServiceMock.del).toHaveBeenCalledWith('contest:contest-1');
      expect(cacheServiceMock.invalidatePattern).toHaveBeenCalledWith('contests:*');
      expect(cacheServiceMock.invalidatePattern).toHaveBeenCalledWith('categories:*');
    });
  });
});
