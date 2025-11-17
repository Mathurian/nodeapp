/**
 * Workflow Service
 * Handles workflow template and instance management
 */

import prisma from '../config/database';
import { createLogger } from '../utils/logger';
import EventBusService, { AppEventType } from './EventBusService';

const logger = createLogger('WorkflowService');

export interface WorkflowTemplateInput {
  tenantId?: string;
  name: string;
  description?: string;
  type?: string;
  isDefault?: boolean;
  isActive?: boolean;
  steps: WorkflowStepInput[];
}

export interface WorkflowStepInput {
  name: string;
  description?: string;
  stepOrder: number;
  requiredRole?: string;
  autoAdvance?: boolean;
  requireApproval?: boolean;
  conditions?: any;
  actions?: any;
  notifyRoles?: string[];
}

export class WorkflowService {
  /**
   * Create workflow template
   */
  static async createTemplate(input: WorkflowTemplateInput): Promise<any> {
    try {
      const { steps, ...templateData } = input;

      const template = await prisma.workflowTemplate.create({
        data: {
          ...templateData,
          tenantId: templateData.tenantId || ''
        }
      });

      logger.info(`Created workflow template: ${template.name}`);
      return template;
    } catch (error) {
      logger.error('Error creating workflow template:', error);
      throw error;
    }
  }

  /**
   * Get workflow template by ID
   */
  static async getTemplate(id: string, tenantId: string): Promise<any> {
    try {
      return await prisma.workflowTemplate.findFirst({
        where: { id, tenantId }
      });
    } catch (error) {
      logger.error('Error getting workflow template:', error);
      throw error;
    }
  }

  /**
   * List workflow templates
   */
  static async listTemplates(tenantId: string, type?: string): Promise<any[]> {
    try {
      return await prisma.workflowTemplate.findMany({
        where: {
          tenantId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('Error listing workflow templates:', error);
      throw error;
    }
  }

  /**
   * Start workflow instance
   */
  static async startWorkflow(
    workflowId: string,
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<any> {
    try {
      const instance = await prisma.workflowInstance.create({
        data: {
          templateId: workflowId,
          tenantId,
          entityType,
          entityId,
          status: 'active'
        }
      });

      logger.info(`Started workflow instance for ${entityType} ${entityId}`);

      await EventBusService.publish(
        AppEventType.USER_CREATED,
        { workflowId: instance.id, entityType, entityId },
        { source: 'WorkflowService' }
      );

      return instance;
    } catch (error) {
      logger.error('Error starting workflow:', error);
      throw error;
    }
  }

  /**
   * Advance workflow to next step
   */
  static async advanceWorkflow(
    instanceId: string,
    tenantId: string,
    _userId: string,
    approvalStatus: 'approved' | 'rejected',
    _comments?: string
  ): Promise<any> {
    try {
      const instance = await prisma.workflowInstance.findFirst({
        where: { id: instanceId, tenantId }
      });

      if (!instance) {
        throw new Error(`Workflow instance ${instanceId} not found`);
      }

      if (approvalStatus === 'rejected') {
        await prisma.workflowInstance.update({
          where: { id: instanceId },
          data: { status: 'CANCELLED', completedAt: new Date() }
        });

        logger.info(`Workflow ${instanceId} rejected`);
        return instance;
      }

      // Workflow complete
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      logger.info(`Workflow ${instanceId} completed`);

      return instance;
    } catch (error) {
      logger.error('Error advancing workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow instance
   */
  static async getInstance(id: string, tenantId: string): Promise<any> {
    try {
      return await prisma.workflowInstance.findFirst({
        where: { id, tenantId }
      });
    } catch (error) {
      logger.error('Error getting workflow instance:', error);
      throw error;
    }
  }

  /**
   * List workflow instances for entity
   */
  static async listInstancesForEntity(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<any[]> {
    try {
      return await prisma.workflowInstance.findMany({
        where: { tenantId, entityType, entityId },
        orderBy: { startedAt: 'desc' }
      });
    } catch (error) {
      logger.error('Error listing workflow instances:', error);
      throw error;
    }
  }
}

export default WorkflowService;
