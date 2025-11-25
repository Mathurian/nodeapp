/**
 * Template Repository
 * Handles data access for category templates
 */

import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { CategoryTemplate } from '@prisma/client';
import { prisma } from '../config/database';

export interface TemplateWithCriteria extends CategoryTemplate {
  templateCriteria: Array<{
    id: string;
    name: string;
    maxScore: number;
    templateId: string;
  }>;
}

export interface CreateTemplateData {
  name: string;
  description?: string | null;
  tenantId: string;
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
  async findAllWithCriteria(tenantId: string): Promise<TemplateWithCriteria[]> {
    const templates = await this.prisma.categoryTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    
    const templateIds = templates.map(t => t.id);
    const criteria = await this.prisma.templateCriterion.findMany({
      where: { templateId: { in: templateIds }, tenantId }
    });
    
    return templates.map(template => ({
      ...template,
      templateCriteria: criteria.filter(c => c.templateId === template.id)
    }));
  }

  /**
   * Find template by ID with criteria
   */
  async findByIdWithCriteria(id: string, tenantId: string): Promise<TemplateWithCriteria | null> {
    const template = await this.prisma.categoryTemplate.findFirst({
      where: { id, tenantId }
    });
    
    if (!template) {
      return null;
    }
    
    const templateCriteria = await this.prisma.templateCriterion.findMany({
      where: { templateId: id, tenantId }
    });
    
    return {
      ...template,
      templateCriteria
    };
  }

  /**
   * Create template with criteria
   */
  async createWithCriteria(data: CreateTemplateData): Promise<TemplateWithCriteria> {
    const template = await this.prisma.categoryTemplate.create({
      data: {
        name: data.name,
        description: data.description || null,
        tenantId: data.tenantId
      }
    });
    
    if (data.criteria && data.criteria.length > 0) {
      await this.prisma.templateCriterion.createMany({
        data: data.criteria.map(c => ({
          name: c.name,
          maxScore: c.maxScore,
          templateId: template.id,
          tenantId: data.tenantId
        }))
      });
    }
    
    const templateCriteria = await this.prisma.templateCriterion.findMany({
      where: { templateId: template.id, tenantId: data.tenantId }
    });
    
    return {
      ...template,
      templateCriteria
    };
  }

  /**
   * Update template with criteria
   */
  async updateWithCriteria(id: string, tenantId: string, data: UpdateTemplateData): Promise<TemplateWithCriteria> {
    // If criteria are provided, handle them in transaction
    if (data.criteria) {
      return this.prisma.$transaction(async (tx) => {
        // Update template basic data
        await tx.categoryTemplate.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description || null
          }
        });

        // Delete old criteria
        await tx.templateCriterion.deleteMany({
          where: { templateId: id, tenantId }
        });

        // Create new criteria
        if (data.criteria && data.criteria.length > 0) {
          await tx.templateCriterion.createMany({
            data: data.criteria.map(c => ({
              templateId: id,
              tenantId,
              name: c.name,
              maxScore: c.maxScore
            }))
          });
        }

        // Return updated template with criteria
        const updated = await tx.categoryTemplate.findFirst({
          where: { id, tenantId }
        });
        if (!updated) {
          throw new Error('Template not found after update');
        }
        const updatedCriteria = await tx.templateCriterion.findMany({
          where: { templateId: id, tenantId }
        });
        return {
          ...updated,
          templateCriteria: updatedCriteria
        };
      });
    }

    // If no criteria update, just update template
    const updated = await this.prisma.categoryTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null
      }
    });
    const updatedCriteria = await this.prisma.templateCriterion.findMany({
      where: { templateId: id, tenantId }
    });
    return {
      ...updated,
      templateCriteria: updatedCriteria
    };
  }

  /**
   * Duplicate template with criteria
   */
  async duplicateTemplate(id: string, tenantId: string): Promise<TemplateWithCriteria | null> {
    const original = await this.findByIdWithCriteria(id, tenantId);

    if (!original) {
      return null;
    }

    const duplicated = await this.prisma.categoryTemplate.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        tenantId
      }
    });
    
    if (original.templateCriteria.length > 0) {
      await this.prisma.templateCriterion.createMany({
        data: original.templateCriteria.map((c: { name: string; maxScore: number }) => ({
          name: c.name,
          maxScore: c.maxScore,
          templateId: duplicated.id,
          tenantId
        }))
      });
    }
    
    const duplicatedCriteria = await this.prisma.templateCriterion.findMany({
      where: { templateId: duplicated.id, tenantId }
    });
    
    return {
      ...duplicated,
      templateCriteria: duplicatedCriteria
    };
  }
}
