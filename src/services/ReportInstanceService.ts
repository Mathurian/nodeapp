/**
 * Report Instance Service
 * Manages report instance records (history of generated reports)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, ReportInstance } from '@prisma/client';
import { BaseService } from './BaseService';

export interface CreateReportInstanceDTO {
  type: string;
  name: string;
  generatedById: string;
  format: string;
  tenantId: string;
  data?: string;
  templateId?: string;
}

export interface ReportInstanceFilters {
  type?: string;
  generatedById?: string;
  format?: string;
  startDate?: Date;
  endDate?: Date;
}

@injectable()
export class ReportInstanceService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {
    super();
  }

  /**
   * Create a new report instance record
   */
  async createInstance(data: CreateReportInstanceDTO): Promise<ReportInstance> {
    try {
      this.validateRequired(data, ['type', 'name', 'generatedById', 'format', 'tenantId']);

      const instance = await this.prisma.reportInstance.create({
        data: {
          tenantId: data.tenantId,
          type: data.type,
          name: data.name,
          generatedById: data.generatedById,
          format: data.format,
          data: data.data,
          templateId: data.templateId
        }
      });

      this.logInfo('Report instance created', {
        instanceId: instance.id,
        type: data.type
      });

      return instance;
    } catch (error) {
      this.handleError(error, { method: 'createInstance', type: data.type });
    }
  }

  /**
   * Get all report instances with filters
   */
  async getInstances(filters?: ReportInstanceFilters): Promise<ReportInstance[]> {
    try {
      const where: any = {};

      if (filters?.type) {
        where.type = filters.type;
      }

      if (filters?.generatedById) {
        where.generatedById = filters.generatedById;
      }

      if (filters?.format) {
        where.format = filters.format;
      }

      if (filters?.startDate || filters?.endDate) {
        where.generatedAt = {};
        if (filters.startDate) {
          where.generatedAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.generatedAt.lte = filters.endDate;
        }
      }

      const instances = await this.prisma.reportInstance.findMany({
        where,
        orderBy: { generatedAt: 'desc' }
      });

      return instances;
    } catch (error) {
      this.handleError(error, { method: 'getInstances', filters });
    }
  }

  /**
   * Get report instance by ID
   */
  async getInstanceById(instanceId: string): Promise<ReportInstance> {
    try {
      const instance = await this.prisma.reportInstance.findUnique({
        where: { id: instanceId }
      });

      this.assertExists(instance, 'ReportInstance', instanceId);

      return instance;
    } catch (error) {
      this.handleError(error, { method: 'getInstanceById', instanceId });
    }
  }

  /**
   * Delete a report instance
   */
  async deleteInstance(instanceId: string): Promise<void> {
    try {
      const instance = await this.prisma.reportInstance.findUnique({
        where: { id: instanceId }
      });

      this.assertExists(instance, 'ReportInstance', instanceId);

      await this.prisma.reportInstance.delete({
        where: { id: instanceId }
      });

      this.logInfo('Report instance deleted', {
        instanceId,
        type: instance.type
      });
    } catch (error) {
      this.handleError(error, { method: 'deleteInstance', instanceId });
    }
  }

  /**
   * Delete old report instances
   */
  async deleteOldInstances(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.prisma.reportInstance.deleteMany({
        where: {
          generatedAt: {
            lt: cutoffDate
          }
        }
      });

      this.logInfo('Old report instances deleted', {
        count: result.count,
        olderThanDays
      });

      return result.count;
    } catch (error) {
      this.handleError(error, { method: 'deleteOldInstances', olderThanDays });
    }
  }

  /**
   * Get instance statistics
   */
  async getInstanceStats(filters?: {
    type?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalInstances: number;
    byType: Record<string, number>;
    byFormat: Record<string, number>;
    topGenerators: Array<{ userId: string; userName: string; count: number }>;
  }> {
    try {
      const where: any = {};

      if (filters?.type) {
        where.type = filters.type;
      }

      if (filters?.startDate || filters?.endDate) {
        where.generatedAt = {};
        if (filters.startDate) {
          where.generatedAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.generatedAt.lte = filters.endDate;
        }
      }

      const instances = await this.prisma.reportInstance.findMany({
        where
      });

      // Calculate statistics
      const byType: Record<string, number> = {};
      const byFormat: Record<string, number> = {};
      const generatorCounts: Record<string, { name: string; count: number }> = {};

      instances.forEach(instance => {
        // By type
        byType[instance.type] = (byType[instance.type] || 0) + 1;

        // By format
        if (instance.format) {
          byFormat[instance.format] = (byFormat[instance.format] || 0) + 1;
        }

        // By generator
        if (instance.generatedById) {
          const key = instance.generatedById;
          if (!generatorCounts[key]) {
            generatorCounts[key] = {
              name: instance.generatedById,
              count: 0
            };
          }
          generatorCounts[key].count++;
        }
      });

      // Get top generators
      const topGenerators = Object.entries(generatorCounts)
        .map(([userId, data]) => ({
          userId,
          userName: data.name,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalInstances: instances.length,
        byType,
        byFormat,
        topGenerators
      };
    } catch (error) {
      this.handleError(error, { method: 'getInstanceStats', filters });
    }
  }
}
