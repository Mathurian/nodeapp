import { injectable, inject } from 'tsyringe';
import { CommentaryMode, PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
import { CacheService } from './CacheService';

interface CloneContestInput {
  tenantId: string;
  sourceContestId: string;
  targetEventId: string;
  name?: string;
  includeCategories?: boolean;
  includeCriteria?: boolean;
  actorRole?: string | null;
}

interface CloneCategoryInput {
  tenantId: string;
  sourceCategoryId: string;
  targetEventId: string;
  targetContestId: string;
  name?: string;
  includeCriteria?: boolean;
  actorRole?: string | null;
}

interface ImportCriteriaAppendInput {
  tenantId: string;
  targetCategoryId: string;
  sourceCategoryId?: string;
  templateId?: string;
}

interface CreateCategoryTemplateFromCategoryInput {
  tenantId: string;
  sourceCategoryId: string;
  name: string;
  description?: string;
}

interface CreateCategoryFromTemplateInput {
  tenantId: string;
  templateId: string;
  contestId: string;
  name?: string;
  description?: string;
  scoreCap?: number;
  timeLimit?: number;
  contestantMin?: number;
  contestantMax?: number;
  commentaryMode?: CommentaryMode;
}

@injectable()
export class StructureCopyService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('CacheService') private cacheService: CacheService
  ) {
    super();
  }

  private buildCloneName(name: string, override?: string): string {
    const normalized = override?.trim();
    if (normalized) return normalized;
    return `${name} (Copy)`;
  }

  private isSuperAdmin(actorRole?: string | null): boolean {
    return String(actorRole || '').trim().toUpperCase() === 'SUPER_ADMIN';
  }

  private async invalidateContestFamily(contestId?: string, eventId?: string): Promise<void> {
    if (contestId) {
      await this.cacheService.del(`contest:${contestId}`);
      await this.cacheService.del(`contest:details:${contestId}`);
      await this.cacheService.del(`categories:contest:${contestId}`);
    }
    if (eventId) {
      await this.cacheService.del(`contests:event:${eventId}`);
    }
    await this.cacheService.invalidatePattern('contests:*');
    await this.cacheService.invalidatePattern('categories:*');
  }

  private async invalidateCategoryFamily(categoryId?: string, contestId?: string): Promise<void> {
    if (categoryId) {
      await this.cacheService.del(`category:${categoryId}`);
      await this.cacheService.del(`category:details:${categoryId}`);
    }
    if (contestId) {
      await this.cacheService.del(`categories:contest:${contestId}`);
      await this.cacheService.del(`contest:${contestId}`);
      await this.cacheService.del(`contest:details:${contestId}`);
    }
    await this.cacheService.invalidatePattern('categories:*');
  }

  async cloneContest(input: CloneContestInput) {
    try {
      const sourceContestWhere = this.isSuperAdmin(input.actorRole)
        ? {
            id: input.sourceContestId,
            deletedAt: null,
          }
        : {
            id: input.sourceContestId,
            tenantId: input.tenantId,
            deletedAt: null,
          };

      const sourceContest = await this.prisma.contest.findFirst({
        where: sourceContestWhere,
        include: {
          categories: {
            where: { deletedAt: null },
            include: {
              criteria: true,
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          },
        },
      });

      if (!sourceContest) {
        throw this.notFoundError('Contest', input.sourceContestId);
      }

      const targetEventWhere = this.isSuperAdmin(input.actorRole)
        ? {
            id: input.targetEventId,
            deletedAt: null,
          }
        : {
            id: input.targetEventId,
            tenantId: input.tenantId,
            deletedAt: null,
          };

      const targetEvent = await this.prisma.event.findFirst({
        where: targetEventWhere,
        select: { id: true, tenantId: true },
      });

      if (!targetEvent) {
        throw this.notFoundError('Event', input.targetEventId);
      }

      if (sourceContest.tenantId !== targetEvent.tenantId) {
        throw this.validationError('Source contest and target event must belong to the same tenant');
      }

      const resolvedTenantId = sourceContest.tenantId;

      const result = await this.prisma.$transaction(async (tx) => {
        const clonedContest = await tx.contest.create({
          data: {
            eventId: targetEvent.id,
            name: this.buildCloneName(sourceContest.name, input.name),
            description: sourceContest.description,
            contestantNumberingMode: sourceContest.contestantNumberingMode,
            nextContestantNumber: 1,
            contestantViewRestricted: sourceContest.contestantViewRestricted,
            contestantViewReleaseDate: sourceContest.contestantViewReleaseDate,
            scoringType: sourceContest.scoringType,
            tenantId: resolvedTenantId,
            archived: false,
            isLocked: false,
            lockedAt: null,
            lockVerifiedBy: null,
            winnersPublished: false,
            publishedAt: null,
            publishedBy: null,
            deletedAt: null,
            deletedBy: null,
          },
        });

        let copiedCategoriesCount = 0;
        let copiedCriteriaCount = 0;

        if (input.includeCategories !== false) {
          for (const category of sourceContest.categories) {
            const clonedCategory = await tx.category.create({
              data: {
                contestId: clonedContest.id,
                name: category.name,
                description: category.description,
                scoreCap: category.scoreCap,
                timeLimit: category.timeLimit,
                contestantMin: category.contestantMin,
                contestantMax: category.contestantMax,
                commentaryMode: category.commentaryMode,
                tenantId: resolvedTenantId,
                totalsCertified: false,
                boardApproved: false,
                approvedAt: null,
                approvedBy: null,
                deletedAt: null,
                deletedBy: null,
              },
            });

            copiedCategoriesCount += 1;

            if (input.includeCriteria !== false && category.criteria.length > 0) {
              await tx.criterion.createMany({
                data: category.criteria.map((criterion) => ({
                  categoryId: clonedCategory.id,
                  name: criterion.name,
                  maxScore: criterion.maxScore,
                  tenantId: resolvedTenantId,
                })),
              });
              copiedCriteriaCount += category.criteria.length;
            }
          }
        }

        return {
          ...clonedContest,
          copiedCategoriesCount,
          copiedCriteriaCount,
        };
      });

      await this.invalidateContestFamily(result.id, input.targetEventId);
      return result;
    } catch (error) {
      return this.handleError(error, { operation: 'cloneContest', input });
    }
  }

  async cloneCategory(input: CloneCategoryInput) {
    try {
      const sourceCategoryWhere = this.isSuperAdmin(input.actorRole)
        ? {
            id: input.sourceCategoryId,
            deletedAt: null,
          }
        : {
            id: input.sourceCategoryId,
            tenantId: input.tenantId,
            deletedAt: null,
          };

      const sourceCategory = await this.prisma.category.findFirst({
        where: sourceCategoryWhere,
        include: {
          criteria: {
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          },
        },
      });

      if (!sourceCategory) {
        throw this.notFoundError('Category', input.sourceCategoryId);
      }

      const targetContestWhere = this.isSuperAdmin(input.actorRole)
        ? {
            id: input.targetContestId,
            deletedAt: null,
          }
        : {
            id: input.targetContestId,
            tenantId: input.tenantId,
            deletedAt: null,
          };

      const targetContest = await this.prisma.contest.findFirst({
        where: targetContestWhere,
        select: { id: true, tenantId: true, eventId: true },
      });

      if (!targetContest) {
        throw this.notFoundError('Contest', input.targetContestId);
      }

      if (sourceCategory.tenantId !== targetContest.tenantId) {
        throw this.validationError('Source category and target contest must belong to the same tenant');
      }

      if (targetContest.eventId !== input.targetEventId) {
        throw this.validationError('Target contest must belong to the selected destination event');
      }

      const resolvedTenantId = sourceCategory.tenantId;

      const result = await this.prisma.$transaction(async (tx) => {
        const clonedCategory = await tx.category.create({
          data: {
            contestId: targetContest.id,
            name: this.buildCloneName(sourceCategory.name, input.name),
            description: sourceCategory.description,
            scoreCap: sourceCategory.scoreCap,
            timeLimit: sourceCategory.timeLimit,
            contestantMin: sourceCategory.contestantMin,
            contestantMax: sourceCategory.contestantMax,
            commentaryMode: sourceCategory.commentaryMode,
            tenantId: resolvedTenantId,
            totalsCertified: false,
            boardApproved: false,
            approvedAt: null,
            approvedBy: null,
            deletedAt: null,
            deletedBy: null,
          },
        });

        let copiedCriteriaCount = 0;
        if (input.includeCriteria !== false && sourceCategory.criteria.length > 0) {
          await tx.criterion.createMany({
            data: sourceCategory.criteria.map((criterion) => ({
              categoryId: clonedCategory.id,
              name: criterion.name,
              maxScore: criterion.maxScore,
              tenantId: resolvedTenantId,
            })),
          });
          copiedCriteriaCount = sourceCategory.criteria.length;
        }

        return {
          ...clonedCategory,
          copiedCriteriaCount,
        };
      });

      await this.invalidateCategoryFamily(result.id, input.targetContestId);
      return result;
    } catch (error) {
      return this.handleError(error, { operation: 'cloneCategory', input });
    }
  }

  async importCriteriaAppend(input: ImportCriteriaAppendInput) {
    try {
      const targetCategory = await this.prisma.category.findFirst({
        where: {
          id: input.targetCategoryId,
          tenantId: input.tenantId,
          deletedAt: null,
        },
        select: { id: true, contestId: true },
      });

      if (!targetCategory) {
        throw this.notFoundError('Category', input.targetCategoryId);
      }

      let criteriaToCopy: Array<{ name: string; maxScore: number }> = [];

      if (input.sourceCategoryId) {
        if (input.sourceCategoryId === input.targetCategoryId) {
          throw this.badRequestError('Cannot import criteria from the same category');
        }

        const sourceCategory = await this.prisma.category.findFirst({
          where: {
            id: input.sourceCategoryId,
            tenantId: input.tenantId,
            deletedAt: null,
          },
          include: {
            criteria: {
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            },
          },
        });

        if (!sourceCategory) {
          throw this.notFoundError('Category', input.sourceCategoryId);
        }

        criteriaToCopy = sourceCategory.criteria.map((criterion) => ({
          name: criterion.name,
          maxScore: criterion.maxScore,
        }));
      } else if (input.templateId) {
        const template = await this.prisma.categoryTemplate.findFirst({
          where: {
            id: input.templateId,
            tenantId: input.tenantId,
          },
          include: {
            templateCriteria: {
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            },
          },
        });

        if (!template) {
          throw this.notFoundError('Template', input.templateId);
        }

        criteriaToCopy = template.templateCriteria.map((criterion) => ({
          name: criterion.name,
          maxScore: criterion.maxScore,
        }));
      } else {
        throw this.badRequestError('Either sourceCategoryId or templateId is required');
      }

      if (criteriaToCopy.length === 0) {
        return { importedCount: 0, categoryId: targetCategory.id };
      }

      await this.prisma.criterion.createMany({
        data: criteriaToCopy.map((criterion) => ({
          categoryId: targetCategory.id,
          name: criterion.name,
          maxScore: criterion.maxScore,
          tenantId: input.tenantId,
        })),
      });

      await this.invalidateCategoryFamily(targetCategory.id, targetCategory.contestId);

      return {
        importedCount: criteriaToCopy.length,
        categoryId: targetCategory.id,
      };
    } catch (error) {
      return this.handleError(error, { operation: 'importCriteriaAppend', input });
    }
  }

  async createCategoryTemplateFromCategory(input: CreateCategoryTemplateFromCategoryInput) {
    try {
      const sourceCategory = await this.prisma.category.findFirst({
        where: {
          id: input.sourceCategoryId,
          tenantId: input.tenantId,
          deletedAt: null,
        },
        include: {
          criteria: {
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          },
        },
      });

      if (!sourceCategory) {
        throw this.notFoundError('Category', input.sourceCategoryId);
      }

      const template = await this.prisma.$transaction(async (tx) => {
        const createdTemplate = await tx.categoryTemplate.create({
          data: {
            name: input.name.trim(),
            description: input.description?.trim() || sourceCategory.description || null,
            commentaryMode: sourceCategory.commentaryMode,
            tenantId: input.tenantId,
          },
        });

        if (sourceCategory.criteria.length > 0) {
          await tx.templateCriterion.createMany({
            data: sourceCategory.criteria.map((criterion) => ({
              templateId: createdTemplate.id,
              name: criterion.name,
              maxScore: criterion.maxScore,
              tenantId: input.tenantId,
            })),
          });
        }

        const createdCriteria = await tx.templateCriterion.findMany({
          where: { templateId: createdTemplate.id, tenantId: input.tenantId },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });

        return {
          ...createdTemplate,
          templateCriteria: createdCriteria,
        };
      });

      return template;
    } catch (error) {
      return this.handleError(error, { operation: 'createCategoryTemplateFromCategory', input });
    }
  }

  async createCategoryFromTemplate(input: CreateCategoryFromTemplateInput) {
    try {
      const targetContest = await this.prisma.contest.findFirst({
        where: {
          id: input.contestId,
          tenantId: input.tenantId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!targetContest) {
        throw this.notFoundError('Contest', input.contestId);
      }

      const template = await this.prisma.categoryTemplate.findFirst({
        where: {
          id: input.templateId,
          tenantId: input.tenantId,
        },
        include: {
          templateCriteria: {
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          },
        },
      });

      if (!template) {
        throw this.notFoundError('Template', input.templateId);
      }

      const createdCategory = await this.prisma.$transaction(async (tx) => {
        const category = await tx.category.create({
          data: {
            contestId: targetContest.id,
            name: input.name?.trim() || template.name,
            description: input.description?.trim() || template.description || null,
            scoreCap: input.scoreCap ?? null,
            timeLimit: input.timeLimit ?? null,
            contestantMin: input.contestantMin ?? null,
            contestantMax: input.contestantMax ?? null,
            commentaryMode: input.commentaryMode ?? template.commentaryMode,
            tenantId: input.tenantId,
            totalsCertified: false,
            boardApproved: false,
            approvedAt: null,
            approvedBy: null,
            deletedAt: null,
            deletedBy: null,
          },
        });

        if (template.templateCriteria.length > 0) {
          await tx.criterion.createMany({
            data: template.templateCriteria.map((criterion) => ({
              categoryId: category.id,
              name: criterion.name,
              maxScore: criterion.maxScore,
              tenantId: input.tenantId,
            })),
          });
        }

        return {
          ...category,
          copiedCriteriaCount: template.templateCriteria.length,
        };
      });

      await this.invalidateCategoryFamily(createdCategory.id, targetContest.id);

      return createdCategory;
    } catch (error) {
      return this.handleError(error, { operation: 'createCategoryFromTemplate', input });
    }
  }
}
