/**
 * Report Template Service
 * Manages report templates CRUD operations
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, ReportTemplate } from '@prisma/client';
import { BaseService } from './BaseService';

export interface CreateReportTemplateDTO {
  name: string;
  type: string;
  template: string;
  parameters?: string;
}

export interface UpdateReportTemplateDTO {
  name?: string;
  type?: string;
  template?: string;
  parameters?: string;
}

@injectable()
export class ReportTemplateService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {
    super();
  }

  /**
   * Get all report templates
   */
  async getAllTemplates(filters?: {
    type?: string;
  }): Promise<ReportTemplate[]> {
    try {
      const where: any = {};

      if (filters?.type) {
        where.type = filters.type;
      }

      const templates = await this.prisma.reportTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return templates;
    } catch (error) {
      this.handleError(error, { method: 'getAllTemplates', filters });
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<ReportTemplate> {
    try {
      const template = await this.prisma.reportTemplate.findUnique({
        where: { id: templateId }
      });

      this.assertExists(template, 'ReportTemplate', templateId);

      return template;
    } catch (error) {
      this.handleError(error, { method: 'getTemplateById', templateId });
    }
  }

  /**
   * Create a new report template
   */
  async createTemplate(data: CreateReportTemplateDTO): Promise<ReportTemplate> {
    try {
      this.validateRequired(data, ['name', 'type', 'template']);

      const template = await this.prisma.reportTemplate.create({
        data: {
          name: data.name,
          type: data.type,
          template: data.template,
          parameters: data.parameters
        }
      });

      this.logInfo('Report template created', { templateId: template.id, name: template.name });

      return template;
    } catch (error) {
      this.handleError(error, { method: 'createTemplate', name: data.name });
    }
  }

  /**
   * Update a report template
   */
  async updateTemplate(
    templateId: string,
    data: UpdateReportTemplateDTO
  ): Promise<ReportTemplate> {
    try {
      // Check if template exists
      const existing = await this.prisma.reportTemplate.findUnique({
        where: { id: templateId }
      });

      this.assertExists(existing, 'ReportTemplate', templateId);

      // Update template
      const template = await this.prisma.reportTemplate.update({
        where: { id: templateId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.type && { type: data.type }),
          ...(data.template && { template: data.template }),
          ...(data.parameters !== undefined && { parameters: data.parameters })
        }
      });

      this.logInfo('Report template updated', { templateId, name: template.name });

      return template;
    } catch (error) {
      this.handleError(error, { method: 'updateTemplate', templateId });
    }
  }

  /**
   * Delete a report template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const template = await this.prisma.reportTemplate.findUnique({
        where: { id: templateId }
      });

      this.assertExists(template, 'ReportTemplate', templateId);

      await this.prisma.reportTemplate.delete({
        where: { id: templateId }
      });

      this.logInfo('Report template deleted', { templateId, name: template.name });
    } catch (error) {
      this.handleError(error, { method: 'deleteTemplate', templateId });
    }
  }

  /**
   * Get templates by type
   */
  async getTemplatesByType(type: string): Promise<ReportTemplate[]> {
    try {
      return await this.prisma.reportTemplate.findMany({
        where: {
          type
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      this.handleError(error, { method: 'getTemplatesByType', type });
    }
  }
}
