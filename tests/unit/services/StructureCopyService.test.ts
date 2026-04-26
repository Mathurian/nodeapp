import 'reflect-metadata';

import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { CacheService } from '../../../src/services/CacheService';
import { StructureCopyService } from '../../../src/services/StructureCopyService';

describe('StructureCopyService', () => {
  let service: StructureCopyService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockCacheService: Pick<CacheService, 'del' | 'invalidatePattern'>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    mockCacheService = {
      del: jest.fn().mockResolvedValue(undefined),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
    };
    service = new StructureCopyService(mockPrisma as any, mockCacheService as CacheService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('cloneContest', () => {
    it('copies structure and resets operational state', async () => {
      mockPrisma.contest.findFirst.mockResolvedValue({
        id: 'contest-source',
        name: 'Original Contest',
        description: 'Source',
        contestantNumberingMode: 'AUTO_INDEXED',
        contestantViewRestricted: true,
        contestantViewReleaseDate: new Date('2025-01-01T00:00:00Z'),
        scoringType: 'OLYMPIC',
        categories: [
          {
            id: 'category-source',
            name: 'Talent',
            description: 'Category',
            scoreCap: 100,
            timeLimit: 15,
            contestantMin: 1,
            contestantMax: 8,
            criteria: [
              { id: 'criterion-1', name: 'Stage Presence', maxScore: 40 },
              { id: 'criterion-2', name: 'Execution', maxScore: 60 },
            ],
          },
        ],
      } as any);
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-target' } as any);

      mockPrisma.$transaction.mockImplementation(async (callback: any) =>
        callback({
          contest: {
            create: jest.fn().mockResolvedValue({
              id: 'contest-clone',
              eventId: 'event-target',
              name: 'Original Contest (Copy)',
              nextContestantNumber: 1,
              winnersPublished: false,
            }),
          },
          category: {
            create: jest.fn().mockResolvedValue({ id: 'category-clone' }),
          },
          criterion: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        })
      );

      const result = await service.cloneContest({
        tenantId: 'tenant-1',
        sourceContestId: 'contest-source',
        targetEventId: 'event-target',
        includeCategories: true,
        includeCriteria: true,
      });

      expect(result).toMatchObject({
        id: 'contest-clone',
        copiedCategoriesCount: 1,
        copiedCriteriaCount: 2,
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockCacheService.del).toHaveBeenCalledWith('contest:contest-clone');
      expect(mockCacheService.del).toHaveBeenCalledWith('contests:event:event-target');
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('contests:*');
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('categories:*');
    });

    it('allows a super admin to clone across request-tenant context when source and target event share a tenant', async () => {
      mockPrisma.contest.findFirst.mockResolvedValue({
        id: 'contest-source',
        tenantId: 'tenant-b',
        name: 'Original Contest',
        description: 'Source',
        contestantNumberingMode: 'AUTO_INDEXED',
        contestantViewRestricted: false,
        contestantViewReleaseDate: null,
        scoringType: 'STRAIGHT',
        categories: [],
      } as any);
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-target', tenantId: 'tenant-b' } as any);
      mockPrisma.$transaction.mockImplementation(async (callback: any) =>
        callback({
          contest: {
            create: jest.fn().mockResolvedValue({
              id: 'contest-clone',
              eventId: 'event-target',
              tenantId: 'tenant-b',
              name: 'Original Contest (Copy)',
            }),
          },
          category: {
            create: jest.fn(),
          },
          criterion: {
            createMany: jest.fn(),
          },
        })
      );

      const result = await service.cloneContest({
        tenantId: 'default_tenant',
        sourceContestId: 'contest-source',
        targetEventId: 'event-target',
        actorRole: 'SUPER_ADMIN',
      });

      expect(result).toMatchObject({
        id: 'contest-clone',
        copiedCategoriesCount: 0,
        copiedCriteriaCount: 0,
      });
      expect(mockPrisma.contest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'contest-source',
            deletedAt: null,
          }),
        })
      );
      expect(mockPrisma.event.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'event-target',
            deletedAt: null,
          }),
        })
      );
    });
  });

  describe('cloneCategory', () => {
    it('clones a category without criteria when disabled', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'category-source',
        name: 'Interview',
        description: 'Source category',
        scoreCap: 50,
        timeLimit: 5,
        contestantMin: 1,
        contestantMax: 3,
        criteria: [{ id: 'criterion-1', name: 'Content', maxScore: 50 }],
      } as any);
      mockPrisma.contest.findFirst.mockResolvedValue({ id: 'contest-target' } as any);

      const tx = {
        category: {
          create: jest.fn().mockResolvedValue({
            id: 'category-clone',
            contestId: 'contest-target',
            name: 'Interview Clone',
          }),
        },
        criterion: {
          createMany: jest.fn(),
        },
      };
      mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

      const result = await service.cloneCategory({
        tenantId: 'tenant-1',
        sourceCategoryId: 'category-source',
        targetContestId: 'contest-target',
        name: 'Interview Clone',
        includeCriteria: false,
      });

      expect(result).toMatchObject({
        id: 'category-clone',
        copiedCriteriaCount: 0,
      });
      expect(tx.criterion.createMany).not.toHaveBeenCalled();
    });

    it('rejects a super admin clone when the target contest belongs to a different tenant', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'category-source',
        tenantId: 'tenant-a',
        name: 'Interview',
        description: 'Source category',
        scoreCap: 50,
        timeLimit: 5,
        contestantMin: 1,
        contestantMax: 3,
        criteria: [],
      } as any);
      mockPrisma.contest.findFirst.mockResolvedValue({
        id: 'contest-target',
        tenantId: 'tenant-b',
      } as any);

      await expect(
        service.cloneCategory({
          tenantId: 'default_tenant',
          sourceCategoryId: 'category-source',
          targetContestId: 'contest-target',
          actorRole: 'SUPER_ADMIN',
        })
      ).rejects.toThrow('Source category and target contest must belong to the same tenant');
    });
  });

  describe('importCriteriaAppend', () => {
    it('imports template criteria into the target category', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'category-target',
        contestId: 'contest-1',
      } as any);
      mockPrisma.categoryTemplate.findFirst.mockResolvedValue({
        id: 'template-1',
        templateCriteria: [
          { id: 'criterion-1', name: 'Poise', maxScore: 25 },
          { id: 'criterion-2', name: 'Delivery', maxScore: 25 },
        ],
      } as any);
      mockPrisma.criterion.createMany.mockResolvedValue({ count: 2 } as any);

      const result = await service.importCriteriaAppend({
        tenantId: 'tenant-1',
        targetCategoryId: 'category-target',
        templateId: 'template-1',
      });

      expect(result).toEqual({
        importedCount: 2,
        categoryId: 'category-target',
      });
      expect(mockPrisma.criterion.createMany).toHaveBeenCalledWith({
        data: [
          {
            categoryId: 'category-target',
            name: 'Poise',
            maxScore: 25,
            tenantId: 'tenant-1',
          },
          {
            categoryId: 'category-target',
            name: 'Delivery',
            maxScore: 25,
            tenantId: 'tenant-1',
          },
        ],
      });
    });
  });

  describe('createCategoryTemplateFromCategory', () => {
    it('persists a reusable category template with criteria', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'category-source',
        description: 'Original category',
        criteria: [{ id: 'criterion-1', name: 'Clarity', maxScore: 10 }],
      } as any);

      mockPrisma.$transaction.mockImplementation(async (callback: any) =>
        callback({
          categoryTemplate: {
            create: jest.fn().mockResolvedValue({
              id: 'template-1',
              name: 'Interview Template',
              description: 'Original category',
            }),
          },
          templateCriterion: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
            findMany: jest.fn().mockResolvedValue([
              { id: 'template-criterion-1', name: 'Clarity', maxScore: 10 },
            ]),
          },
        })
      );

      const result = await service.createCategoryTemplateFromCategory({
        tenantId: 'tenant-1',
        sourceCategoryId: 'category-source',
        name: 'Interview Template',
      });

      expect(result).toMatchObject({
        id: 'template-1',
        name: 'Interview Template',
        templateCriteria: [{ name: 'Clarity', maxScore: 10 }],
      });
    });
  });
});
