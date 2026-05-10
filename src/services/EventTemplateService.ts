import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { CacheService } from './CacheService';
import { PrismaClient, Prisma, EventTemplate, Event } from '@prisma/client';

// Prisma payload types - Export all for external use
export type EventTemplateWithCreator = Prisma.EventTemplateGetPayload<{
  include: {
    creator: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

export type UserCreatorInfo = {
  id: string;
  name: string | null;
  email: string;
};

// Template data structure interfaces
export interface CriterionTemplate {
  name: string;
  maxScore: number;
}

export interface CategoryTemplate {
  id?: string;
  contestId?: string;
  name: string;
  description?: string;
  scoreCap?: number;
  timeLimit?: number;
  contestantMin?: number;
  contestantMax?: number;
  criteria?: CriterionTemplate[];
}

export interface ContestTemplate {
  id?: string;
  name: string;
  description?: string;
}

// DTO interfaces
export interface CreateTemplateDto {
  name: string;
  description?: string;
  contests: ContestTemplate[];
  categories: CategoryTemplate[];
  createdBy: string;
  tenantId: string;
}

export interface UpdateTemplateDto {
  name: string;
  description?: string;
  contests: ContestTemplate[];
  categories: CategoryTemplate[];
}

export interface CreateEventFromTemplateDto {
  templateId: string;
  eventName?: string;
  eventDescription?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  tenantId: string;
}

export interface CreateTemplateFromEventDto {
  eventId: string;
  name: string;
  description?: string;
  createdBy: string;
  tenantId: string;
}

export interface CreateContestFromTemplateDto {
  templateId: string;
  templateContestId: string;
  targetEventId: string;
  contestName?: string;
  contestDescription?: string;
  tenantId: string;
}

// Response interfaces
export interface TemplateResponse {
  id: string;
  name: string;
  description: string | null;
  contests: ContestTemplate[];
  categories: CategoryTemplate[];
  createdAt: Date;
}

export interface TemplateWithCreatorResponse extends TemplateResponse {
  creator: UserCreatorInfo | null;
  updatedAt: Date;
}

export interface TemplateUpdateResponse {
  id: string;
  name: string;
  description: string | null;
  contests: ContestTemplate[];
  categories: CategoryTemplate[];
  updatedAt: Date;
}

export interface EventCreationResponse {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export interface ContestCreationFromTemplateResponse {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  copiedCategoriesCount: number;
  copiedCriteriaCount: number;
}

@injectable()
export class EventTemplateService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('CacheService') private cacheService: CacheService
  ) {
    super();
  }

  private parseTemplatePayload(template: EventTemplate): { contests: ContestTemplate[]; categories: CategoryTemplate[] } {
    return {
      contests: JSON.parse(template.contests as string) as ContestTemplate[],
      categories: JSON.parse(template.categories as string) as CategoryTemplate[],
    };
  }

  private async invalidateTemplateDeploymentCaches(eventId?: string, contestId?: string): Promise<void> {
    if (eventId) {
      await this.cacheService.del(`contests:event:${eventId}`);
    }
    if (contestId) {
      await this.cacheService.del(`contest:${contestId}`);
      await this.cacheService.del(`contest:details:${contestId}`);
      await this.cacheService.del(`categories:contest:${contestId}`);
    }
    await this.cacheService.invalidatePattern('events:*');
    await this.cacheService.invalidatePattern('contests:*');
    await this.cacheService.invalidatePattern('categories:*');
  }

  private async createContestStructure(
    tx: Prisma.TransactionClient,
    input: {
      eventId: string;
      tenantId: string;
      contestTemplate: ContestTemplate;
      categories: CategoryTemplate[];
      contestName?: string;
      contestDescription?: string;
    }
  ): Promise<ContestCreationFromTemplateResponse> {
    const contest = await tx.contest.create({
      data: {
        eventId: input.eventId,
        name: input.contestName?.trim() || input.contestTemplate.name,
        description: input.contestDescription?.trim() || input.contestTemplate.description || null,
        tenantId: input.tenantId,
      },
    });

    const contestCategories = input.categories.filter((category) => category.contestId === input.contestTemplate.id);
    let copiedCategoriesCount = 0;
    let copiedCriteriaCount = 0;

    for (const categoryTemplate of contestCategories) {
      const createdCategory = await tx.category.create({
        data: {
          contestId: contest.id,
          name: categoryTemplate.name,
          description: categoryTemplate.description || null,
          scoreCap: categoryTemplate.scoreCap || null,
          timeLimit: categoryTemplate.timeLimit || null,
          contestantMin: categoryTemplate.contestantMin || null,
          contestantMax: categoryTemplate.contestantMax || null,
          tenantId: input.tenantId,
        },
      });
      copiedCategoriesCount += 1;

      if (categoryTemplate.criteria && categoryTemplate.criteria.length > 0) {
        await tx.criterion.createMany({
          data: categoryTemplate.criteria.map((criterion) => ({
            categoryId: createdCategory.id,
            name: criterion.name,
            maxScore: criterion.maxScore || 10,
            tenantId: input.tenantId,
          })),
        });
        copiedCriteriaCount += categoryTemplate.criteria.length;
      }
    }

    return {
      id: contest.id,
      eventId: contest.eventId,
      name: contest.name,
      description: contest.description,
      createdAt: contest.createdAt,
      copiedCategoriesCount,
      copiedCriteriaCount,
    };
  }

  async create(data: CreateTemplateDto): Promise<TemplateResponse> {
    if (!data.name || !data.contests || !data.categories) {
      throw this.badRequestError('Name, contests, and categories are required');
    }

    const template: EventTemplate = await this.prisma.eventTemplate.create({
      data: {
        name: data.name,
        description: data.description || null,
        contests: JSON.stringify(data.contests),
        categories: JSON.stringify(data.categories),
        createdBy: data.createdBy,
        tenantId: data.tenantId
      }
    });

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      contests: JSON.parse(template.contests as string) as ContestTemplate[],
      categories: JSON.parse(template.categories as string) as CategoryTemplate[],
      createdAt: template.createdAt
    };
  }

  async createFromEvent(data: CreateTemplateFromEventDto): Promise<TemplateResponse> {
    if (!data.eventId) {
      throw this.badRequestError('Event ID is required');
    }
    if (!data.name?.trim()) {
      throw this.badRequestError('Template name is required');
    }

    const event = await this.prisma.event.findFirst({
      where: {
        id: data.eventId,
        tenantId: data.tenantId,
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

    if (!event) {
      throw this.notFoundError('Event', data.eventId);
    }

    const contests: ContestTemplate[] = event.contests.map((contest) => ({
      id: contest.id,
      name: contest.name,
      description: contest.description || undefined,
    }));

    const categories: CategoryTemplate[] = event.contests.flatMap((contest) =>
      contest.categories.map((category) => ({
        id: category.id,
        contestId: contest.id,
        name: category.name,
        description: category.description || undefined,
        scoreCap: category.scoreCap ?? undefined,
        timeLimit: category.timeLimit ?? undefined,
        contestantMin: category.contestantMin ?? undefined,
        contestantMax: category.contestantMax ?? undefined,
        criteria: category.criteria.map((criterion) => ({
          name: criterion.name,
          maxScore: criterion.maxScore,
        })),
      }))
    );

    const template = await this.prisma.eventTemplate.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || event.description || null,
        contests: JSON.stringify(contests),
        categories: JSON.stringify(categories),
        createdBy: data.createdBy,
        tenantId: data.tenantId,
      },
    });

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      contests: JSON.parse(template.contests as string) as ContestTemplate[],
      categories: JSON.parse(template.categories as string) as CategoryTemplate[],
      createdAt: template.createdAt,
    };
  }

  async getAll(tenantId: string): Promise<TemplateWithCreatorResponse[]> {
    const templates: EventTemplateWithCreator[] = await this.prisma.eventTemplate.findMany({
      where: { tenantId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return templates.map((template): TemplateWithCreatorResponse => ({
      id: template.id,
      name: template.name,
      description: template.description,
      contests: JSON.parse(template.contests as string) as ContestTemplate[],
      categories: JSON.parse(template.categories as string) as CategoryTemplate[],
      creator: template.creator,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }));
  }

  async getById(id: string, tenantId: string): Promise<TemplateWithCreatorResponse> {
    const template: EventTemplateWithCreator | null = await this.prisma.eventTemplate.findFirst({
      where: { id, tenantId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!template) {
      throw this.notFoundError('Template', id);
    }

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      contests: JSON.parse(template.contests as string) as ContestTemplate[],
      categories: JSON.parse(template.categories as string) as CategoryTemplate[],
      creator: template.creator,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  }

  async update(id: string, tenantId: string, data: UpdateTemplateDto): Promise<TemplateUpdateResponse> {
    if (!data.name || !data.contests || !data.categories) {
      throw this.badRequestError('Name, contests, and categories are required');
    }

    // Verify template belongs to tenant
    const existing: EventTemplate | null = await this.prisma.eventTemplate.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      throw this.notFoundError('Template', id);
    }

    const template: EventTemplate = await this.prisma.eventTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        contests: JSON.stringify(data.contests),
        categories: JSON.stringify(data.categories)
      }
    });

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      contests: JSON.parse(template.contests as string) as ContestTemplate[],
      categories: JSON.parse(template.categories as string) as CategoryTemplate[],
      updatedAt: template.updatedAt
    };
  }

  async delete(id: string, tenantId: string): Promise<void> {
    // Verify template belongs to tenant
    const existing: EventTemplate | null = await this.prisma.eventTemplate.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      throw this.notFoundError('Template', id);
    }

    await this.prisma.eventTemplate.delete({ where: { id } });
  }

  async createEventFromTemplate(data: CreateEventFromTemplateDto): Promise<EventCreationResponse> {
    if (!data.templateId) {
      throw this.badRequestError('Template ID is required');
    }

    const template: EventTemplate | null = await this.prisma.eventTemplate.findFirst({
      where: { id: data.templateId, tenantId: data.tenantId }
    });

    if (!template) {
      throw this.notFoundError('Template', data.templateId);
    }

    const now = new Date();
    const startDate = data.startDate ? new Date(data.startDate) : now;
    const endDate = data.endDate ? new Date(data.endDate) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    const eventName = (data.eventName || `${template.name} - ${now.toISOString().slice(0, 10)}`).trim();
    if (!eventName) {
      throw this.badRequestError('Event name is required');
    }

    const { contests, categories } = this.parseTemplatePayload(template);

    const event: Event = await this.prisma.$transaction(async (tx) => {
      const createdEvent = await tx.event.create({
        data: {
          name: eventName,
          description: data.eventDescription || null,
          startDate,
          endDate,
          tenantId: data.tenantId
        }
      });

      for (const contestTemplate of contests) {
        await this.createContestStructure(tx, {
          eventId: createdEvent.id,
          tenantId: data.tenantId,
          contestTemplate,
          categories,
        });
      }

      return createdEvent;
    });

    await this.invalidateTemplateDeploymentCaches(event.id);

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      createdAt: event.createdAt
    };
  }

  async createContestFromTemplate(data: CreateContestFromTemplateDto): Promise<ContestCreationFromTemplateResponse> {
    if (!data.templateId) {
      throw this.badRequestError('Template ID is required');
    }
    if (!data.templateContestId) {
      throw this.badRequestError('Template contest ID is required');
    }
    if (!data.targetEventId) {
      throw this.badRequestError('Target event ID is required');
    }

    const template = await this.prisma.eventTemplate.findFirst({
      where: { id: data.templateId, tenantId: data.tenantId }
    });

    if (!template) {
      throw this.notFoundError('Template', data.templateId);
    }

    const targetEvent = await this.prisma.event.findFirst({
      where: {
        id: data.targetEventId,
        tenantId: data.tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!targetEvent) {
      throw this.notFoundError('Event', data.targetEventId);
    }

    const { contests, categories } = this.parseTemplatePayload(template);
    const contestTemplate = contests.find((contest) => contest.id === data.templateContestId);

    if (!contestTemplate) {
      throw this.notFoundError('Template contest', data.templateContestId);
    }

    const createdContest = await this.prisma.$transaction((tx) =>
      this.createContestStructure(tx, {
        eventId: targetEvent.id,
        tenantId: data.tenantId,
        contestTemplate,
        categories,
        contestName: data.contestName,
        contestDescription: data.contestDescription,
      })
    );

    await this.invalidateTemplateDeploymentCaches(targetEvent.id, createdContest.id);

    return createdContest;
  }
}
