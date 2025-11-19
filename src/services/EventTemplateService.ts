import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma, EventTemplate, Event, Contest, Category } from '@prisma/client';

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
  eventName: string;
  eventDescription?: string;
  startDate: Date;
  endDate: Date;
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
  creator: UserCreatorInfo;
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

@injectable()
export class EventTemplateService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
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
    if (!data.templateId || !data.eventName || !data.startDate || !data.endDate) {
      throw this.badRequestError('Template ID, event name, start date, and end date are required');
    }

    const template: EventTemplate | null = await this.prisma.eventTemplate.findFirst({
      where: { id: data.templateId, tenantId: data.tenantId }
    });

    if (!template) {
      throw this.notFoundError('Template', data.templateId);
    }

    const contests: ContestTemplate[] = JSON.parse(template.contests as string) as ContestTemplate[];
    const categories: CategoryTemplate[] = JSON.parse(template.categories as string) as CategoryTemplate[];

    const event: Event = await this.prisma.event.create({
      data: {
        name: data.eventName,
        description: data.eventDescription || null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        tenantId: data.tenantId
      }
    });

    for (const contestTemplate of contests) {
      const contest: Contest = await this.prisma.contest.create({
        data: {
          eventId: event.id,
          name: contestTemplate.name,
          description: contestTemplate.description || null,
          tenantId: data.tenantId
        }
      });

      const contestCategories: CategoryTemplate[] = categories.filter((cat: CategoryTemplate) => cat.contestId === contestTemplate.id);
      for (const categoryTemplate of contestCategories) {
        const createdCategory: Category = await this.prisma.category.create({
          data: {
            contestId: contest.id,
            name: categoryTemplate.name,
            description: categoryTemplate.description || null,
            scoreCap: categoryTemplate.scoreCap || null,
            timeLimit: categoryTemplate.timeLimit || null,
            contestantMin: categoryTemplate.contestantMin || null,
            contestantMax: categoryTemplate.contestantMax || null,
            tenantId: data.tenantId
          }
        });

        if (categoryTemplate.criteria && categoryTemplate.criteria.length > 0) {
          await this.prisma.criterion.createMany({
            data: categoryTemplate.criteria.map((c: CriterionTemplate) => ({
              categoryId: createdCategory.id,
              name: c.name,
              maxScore: c.maxScore || 10,
              tenantId: data.tenantId
            }))
          });
        }
      }
    }

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      createdAt: event.createdAt
    };
  }
}
