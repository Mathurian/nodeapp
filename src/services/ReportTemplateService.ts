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
  tenantId: string;
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
  async getAllTemplates(tenantId: string, filters?: {
    type?: string;
  }): Promise<ReportTemplate[]> {
    try {
      const where: any = { tenantId };

      if (filters?.type) {
        where.type = filters.type;
      }

      const templates = await this.prisma.reportTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return templates;
    } catch (error) {
      this.handleError(error, { method: 'getAllTemplates', tenantId, filters });
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string, tenantId: string): Promise<ReportTemplate> {
    try {
      const template = await this.prisma.reportTemplate.findFirst({
        where: { id: templateId, tenantId }
      });

      this.assertExists(template, 'ReportTemplate', templateId);

      return template;
    } catch (error) {
      this.handleError(error, { method: 'getTemplateById', templateId, tenantId });
    }
  }

  /**
   * Create a new report template
   */
  async createTemplate(data: CreateReportTemplateDTO): Promise<ReportTemplate> {
    try {
      this.validateRequired(data, ['name', 'type', 'template', 'tenantId']);

      const template = await this.prisma.reportTemplate.create({
        data: {
          name: data.name,
          type: data.type,
          template: data.template,
          parameters: data.parameters,
          tenantId: data.tenantId
        }
      });

      this.logInfo('Report template created', { templateId: template.id, name: template.name, tenantId: data.tenantId });

      return template;
    } catch (error) {
      this.handleError(error, { method: 'createTemplate', name: data.name, tenantId: data.tenantId });
    }
  }

  /**
   * Update a report template
   */
  async updateTemplate(
    templateId: string,
    tenantId: string,
    data: UpdateReportTemplateDTO
  ): Promise<ReportTemplate> {
    try {
      // Check if template exists and belongs to tenant
      const existing = await this.prisma.reportTemplate.findFirst({
        where: { id: templateId, tenantId }
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

      this.logInfo('Report template updated', { templateId, name: template.name, tenantId });

      return template;
    } catch (error) {
      this.handleError(error, { method: 'updateTemplate', templateId, tenantId });
    }
  }

  /**
   * Delete a report template
   */
  async deleteTemplate(templateId: string, tenantId: string): Promise<void> {
    try {
      const template = await this.prisma.reportTemplate.findFirst({
        where: { id: templateId, tenantId }
      });

      this.assertExists(template, 'ReportTemplate', templateId);

      await this.prisma.reportTemplate.delete({
        where: { id: templateId }
      });

      this.logInfo('Report template deleted', { templateId, name: template.name, tenantId });
    } catch (error) {
      this.handleError(error, { method: 'deleteTemplate', templateId, tenantId });
    }
  }

  /**
   * Get templates by type
   */
  async getTemplatesByType(type: string, tenantId: string): Promise<ReportTemplate[]> {
    try {
      return await this.prisma.reportTemplate.findMany({
        where: {
          type,
          tenantId
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      this.handleError(error, { method: 'getTemplatesByType', type, tenantId });
    }
  }
}
