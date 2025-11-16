/**
 * Template Repository
 * Handles data access for category templates
 */

import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { CategoryTemplate } from '@prisma/client';
import { prisma } from '../config/database';

export interface TemplateWithCriteria extends CategoryTemplate {
  criteria: Array<{
    id: string;
    name: string;
    maxScore: number;
    templateId: string;
  }>;
}

export interface CreateTemplateData {
  name: string;
  description?: string | null;
  criteria?: Array<{
    name: string;
    maxScore: number;
  }>;
}

export interface UpdateTemplateData {
  name?: string;
  description?: string | null;
  criteria?: Array<{
    name: string;
    maxScore: number;
  }>;
}

@injectable()
export class TemplateRepository extends BaseRepository<CategoryTemplate> {
  constructor() {
    super(prisma);
  }

  protected getModelName(): string {
    return 'categoryTemplate';
  }

  /**
   * Find all templates with criteria
   */
  async findAllWithCriteria(): Promise<TemplateWithCriteria[]> {
    return this.getModel().findMany({
      include: {
        criteria: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Find template by ID with criteria
   */
  async findByIdWithCriteria(id: string): Promise<TemplateWithCriteria | null> {
    return this.getModel().findUnique({
      where: { id },
      include: {
        criteria: true
      }
    });
  }

  /**
   * Create template with criteria
   */
  async createWithCriteria(data: CreateTemplateData): Promise<TemplateWithCriteria> {
    return this.getModel().create({
      data: {
        name: data.name,
        description: data.description || null,
        criteria: data.criteria ? {
          create: data.criteria.map(c => ({
            name: c.name,
            maxScore: c.maxScore
          }))
        } : undefined
      },
      include: {
        criteria: true
      }
    });
  }

  /**
   * Update template with criteria
   */
  async updateWithCriteria(id: string, data: UpdateTemplateData): Promise<TemplateWithCriteria> {
    // If criteria are provided, handle them in transaction
    if (data.criteria) {
      return this.prisma.$transaction(async (tx) => {
        // Update template basic data
        await (tx as any).categoryTemplate.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description || null
          }
        });

        // Delete old criteria
        await (tx as any).templateCriterion.deleteMany({
          where: { templateId: id }
        });

        // Create new criteria
        if (data.criteria && data.criteria.length > 0) {
          await (tx as any).templateCriterion.createMany({
            data: data.criteria.map(c => ({
              templateId: id,
              name: c.name,
              maxScore: c.maxScore
            }))
          });
        }

        // Return updated template with criteria
        return (tx as any).categoryTemplate.findUnique({
          where: { id },
          include: {
            criteria: true
          }
        });
      });
    }

    // If no criteria update, just update template
    return this.getModel().update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null
      },
      include: {
        criteria: true
      }
    });
  }

  /**
   * Duplicate template with criteria
   */
  async duplicateTemplate(id: string): Promise<TemplateWithCriteria | null> {
    const original = await this.findByIdWithCriteria(id);

    if (!original) {
      return null;
    }

    return this.getModel().create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        criteria: {
          create: original.criteria.map(c => ({
            name: c.name,
            maxScore: c.maxScore
          }))
        }
      },
      include: {
        criteria: true
      }
    });
  }
}
