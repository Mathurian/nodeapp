// @ts-nocheck - FIXME: Schema mismatches need to be resolved
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

interface CreateTemplateDto {
  name: string;
  description?: string;
  contests: any;
  categories: any;
  createdBy: string;
  tenantId: string;
}

interface UpdateTemplateDto {
  name: string;
  description?: string;
  contests: any;
  categories: any;
}

interface CreateEventFromTemplateDto {
  templateId: string;
  eventName: string;
  eventDescription?: string;
  startDate: Date;
  endDate: Date;
  tenantId: string;
}

@injectable()
export class EventTemplateService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async create(data: CreateTemplateDto) {
    if (!data.name || !data.contests || !data.categories) {
      throw this.badRequestError('Name, contests, and categories are required');
    }

    const template = await this.prisma.eventTemplate.create({
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
      contests: JSON.parse(template.contests),
      categories: JSON.parse(template.categories),
      createdAt: template.createdAt
    };
  }

  async getAll(tenantId: string) {
    const templates = await this.prisma.eventTemplate.findMany({
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

    return templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      contests: JSON.parse(template.contests),
      categories: JSON.parse(template.categories),
      creator: template.creator,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }));
  }

  async getById(id: string, tenantId: string) {
    const template = await this.prisma.eventTemplate.findFirst({
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
      contests: JSON.parse(template.contests),
      categories: JSON.parse(template.categories),
      creator: template.creator,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  }

  async update(id: string, tenantId: string, data: UpdateTemplateDto) {
    if (!data.name || !data.contests || !data.categories) {
      throw this.badRequestError('Name, contests, and categories are required');
    }

    // Verify template belongs to tenant
    const existing = await this.prisma.eventTemplate.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      throw this.notFoundError('Template', id);
    }

    const template = await this.prisma.eventTemplate.update({
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
      contests: JSON.parse(template.contests),
      categories: JSON.parse(template.categories),
      updatedAt: template.updatedAt
    };
  }

  async delete(id: string, tenantId: string) {
    // Verify template belongs to tenant
    const existing = await this.prisma.eventTemplate.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      throw this.notFoundError('Template', id);
    }

    await this.prisma.eventTemplate.delete({ where: { id } });
  }

  async createEventFromTemplate(data: CreateEventFromTemplateDto) {
    if (!data.templateId || !data.eventName || !data.startDate || !data.endDate) {
      throw this.badRequestError('Template ID, event name, start date, and end date are required');
    }

    const template = await this.prisma.eventTemplate.findFirst({
      where: { id: data.templateId, tenantId: data.tenantId }
    });

    if (!template) {
      throw this.notFoundError('Template', data.templateId);
    }

    const contests = JSON.parse(template.contests);
    const categories = JSON.parse(template.categories);

    const event = await this.prisma.event.create({
      data: {
        name: data.eventName,
        description: data.eventDescription || null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        tenantId: data.tenantId
      }
    });

    for (const contestTemplate of contests) {
      const contest = await this.prisma.contest.create({
        data: {
          eventId: event.id,
          name: contestTemplate.name,
          description: contestTemplate.description || null,
          tenantId: data.tenantId
        }
      });

      const contestCategories = categories.filter((cat: any) => cat.contestId === contestTemplate.id);
      for (const categoryTemplate of contestCategories) {
        const createdCategory = await this.prisma.category.create({
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
            data: categoryTemplate.criteria.map((c: any) => ({
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
