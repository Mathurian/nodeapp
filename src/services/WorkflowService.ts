/**
 * Workflow Service
 * Handles workflow template and instance management
 */

import prisma from '../config/database';
import { Prisma, WorkflowInstance, WorkflowStep } from '@prisma/client';
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
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>;
  notifyRoles?: string[];
}

export interface WorkflowTemplateView extends Prisma.WorkflowTemplateGetPayload<{}> {
  steps: Prisma.WorkflowStepGetPayload<{}>[];
}

export interface WorkflowInstanceView extends Prisma.WorkflowInstanceGetPayload<{}> {
  currentStep: Prisma.WorkflowStepGetPayload<{}> | null;
  steps: Prisma.WorkflowStepExecutionGetPayload<{}>[];
}

const STATUS_ACTIVE = 'active';
const STATUS_COMPLETED = 'completed';
const STATUS_CANCELLED = 'cancelled';
const EXECUTION_PENDING = 'pending';
const EXECUTION_IN_PROGRESS = 'in_progress';
const EXECUTION_COMPLETED = 'completed';

export class WorkflowService {
  private static async initializeDefaultsForTenant(tenantId: string): Promise<void> {
    const existingCount = await prisma.workflowTemplate.count({ where: { tenantId } });
    if (existingCount > 0) return;

    const defaults: WorkflowTemplateInput[] = [
      {
        tenantId,
        name: 'Score Certification Pipeline',
        description: 'Judge -> Tally -> Auditor -> Board/Organizer multi-step certification workflow',
        type: 'certification',
        isDefault: true,
        isActive: true,
        steps: [
          { name: 'Judge Certification', stepOrder: 1, requiredRole: 'JUDGE', requireApproval: true },
          { name: 'Tally Review', stepOrder: 2, requiredRole: 'TALLY_MASTER', requireApproval: true },
          { name: 'Auditor Review', stepOrder: 3, requiredRole: 'AUDITOR', requireApproval: true },
          { name: 'Board/Organizer Final', stepOrder: 4, requiredRole: 'ORGANIZER', requireApproval: true },
        ],
      },
      {
        tenantId,
        name: 'Score Governance Request Flow',
        description: 'Governed request/approval flow for score removals or uncertifications',
        type: 'governance',
        isDefault: true,
        isActive: true,
        steps: [
          { name: 'Request Submitted', stepOrder: 1, requiredRole: 'JUDGE', requireApproval: true },
          { name: 'Primary Review', stepOrder: 2, requiredRole: 'TALLY_MASTER', requireApproval: true },
          { name: 'Secondary Approval', stepOrder: 3, requiredRole: 'AUDITOR', requireApproval: true },
          { name: 'Final Authorization', stepOrder: 4, requiredRole: 'ADMIN', requireApproval: true },
        ],
      },
    ];

    for (const template of defaults) {
      await this.createTemplate(template);
    }
  }

  private static normalizeStepInput(steps: WorkflowStepInput[]): WorkflowStepInput[] {
    return steps
      .filter((step) => step?.name?.trim())
      .map((step, index) => ({
        ...step,
        stepOrder: Number.isFinite(step.stepOrder) ? step.stepOrder : index + 1,
      }))
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((step, index) => ({ ...step, stepOrder: index + 1 }));
  }

  private static mapTemplate(
    template: Prisma.WorkflowTemplateGetPayload<{}>,
    steps: Prisma.WorkflowStepGetPayload<{}>[]
  ): WorkflowTemplateView {
    return {
      ...template,
      steps,
    };
  }

  private static async getStepMap(templateId: string, tenantId: string): Promise<Map<string, WorkflowStep>> {
    const steps = await prisma.workflowStep.findMany({
      where: { templateId, tenantId },
      orderBy: { stepOrder: 'asc' },
    });
    return new Map(steps.map((step) => [step.id, step]));
  }

  /**
   * Create workflow template
   */
  static async createTemplate(input: WorkflowTemplateInput): Promise<WorkflowTemplateView> {
    try {
      const { steps = [], ...templateData } = input;
      const normalizedTenantId = templateData.tenantId?.trim();
      if (!normalizedTenantId) {
        throw new Error('Tenant context is required for workflow templates');
      }

      if (!templateData.name?.trim()) {
        throw new Error('Workflow template name is required');
      }

      const normalizedSteps = this.normalizeStepInput(steps);

      const result = await prisma.$transaction(async (tx) => {
        const createdTemplate = await tx.workflowTemplate.create({
          data: {
            tenantId: normalizedTenantId || null,
            name: templateData.name,
            description: templateData.description,
            type: templateData.type || 'custom',
            isDefault: templateData.isDefault ?? false,
            isActive: templateData.isActive ?? true,
            config: ({ steps: normalizedSteps } as unknown as Prisma.InputJsonValue),
          }
        });

        if (normalizedSteps.length > 0) {
          await tx.workflowStep.createMany({
            data: normalizedSteps.map((step, index) => ({
              templateId: createdTemplate.id,
              name: step.name,
              description: step.description,
              stepOrder: Number.isFinite(step.stepOrder) ? step.stepOrder : index + 1,
              requiredRole: step.requiredRole,
              autoAdvance: step.autoAdvance ?? false,
              requireApproval: step.requireApproval ?? true,
              conditions: step.conditions as Prisma.InputJsonValue | undefined,
              actions: step.actions as Prisma.InputJsonValue | undefined,
              notifyRoles: (step.notifyRoles || []) as Prisma.InputJsonValue,
              tenantId: normalizedTenantId,
            })),
          });
        }

        const createdSteps = await tx.workflowStep.findMany({
          where: { templateId: createdTemplate.id, tenantId: normalizedTenantId },
          orderBy: { stepOrder: 'asc' },
        });

        return { createdTemplate, createdSteps };
      });

      logger.info(`Created workflow template: ${result.createdTemplate.name}`);
      return this.mapTemplate(result.createdTemplate, result.createdSteps);
    } catch (error) {
      logger.error('Error creating workflow template:', error);
      throw error;
    }
  }

  /**
   * Get workflow template by ID
   */
  static async getTemplate(id: string, tenantId: string): Promise<WorkflowTemplateView | null> {
    try {
      const template = await prisma.workflowTemplate.findFirst({
        where: { id, tenantId }
      });
      if (!template) {
        return null;
      }
      const steps = await prisma.workflowStep.findMany({
        where: { templateId: id, tenantId },
        orderBy: { stepOrder: 'asc' },
      });
      return this.mapTemplate(template, steps);
    } catch (error) {
      logger.error('Error getting workflow template:', error);
      throw error;
    }
  }

  /**
   * List workflow templates
   */
  static async listTemplates(tenantId: string, type?: string): Promise<WorkflowTemplateView[]> {
    try {
      let templates = await prisma.workflowTemplate.findMany({
        where: {
          tenantId,
          ...(type ? { type } : {})
        },
        orderBy: { createdAt: 'desc' }
      });

      if (templates.length === 0) {
        await this.initializeDefaultsForTenant(tenantId);
        templates = await prisma.workflowTemplate.findMany({
          where: {
            tenantId,
            ...(type ? { type } : {})
          },
          orderBy: { createdAt: 'desc' }
        });
      }

      const steps = await prisma.workflowStep.findMany({
        where: {
          tenantId,
          templateId: { in: templates.map((t) => t.id) },
        },
        orderBy: [{ templateId: 'asc' }, { stepOrder: 'asc' }],
      });

      const stepMap = steps.reduce<Record<string, Prisma.WorkflowStepGetPayload<{}>[]>>((acc, step) => {
        const templateKey = step.templateId;
        if (!acc[templateKey]) {
          acc[templateKey] = [];
        }
        const bucket = acc[templateKey] as Prisma.WorkflowStepGetPayload<{}>[];
        bucket.push(step);
        return acc;
      }, {});

      return templates.map((template) => this.mapTemplate(template, stepMap[template.id] || []));
    } catch (error) {
      logger.error('Error listing workflow templates:', error);
      throw error;
    }
  }

  /**
   * Update workflow template
   */
  static async updateTemplate(id: string, tenantId: string, data: Partial<WorkflowTemplateInput>): Promise<WorkflowTemplateView> {
    try {
      const existing = await prisma.workflowTemplate.findFirst({ where: { id, tenantId } });
      if (!existing) {
        throw new Error(`Workflow template ${id} not found`);
      }

      const result = await prisma.$transaction(async (tx) => {
        const nextSteps = Array.isArray(data.steps) ? this.normalizeStepInput(data.steps) : null;
        const updatedTemplate = await tx.workflowTemplate.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description,
            type: data.type,
            isActive: data.isActive,
            isDefault: data.isDefault,
            ...(nextSteps
              ? { config: ({ steps: nextSteps } as unknown as Prisma.InputJsonValue) }
              : {}),
          }
        });

        if (nextSteps) {
          await tx.workflowStep.deleteMany({ where: { templateId: id, tenantId } });
          if (nextSteps.length > 0) {
            await tx.workflowStep.createMany({
              data: nextSteps.map((step, index) => ({
                templateId: id,
                name: step.name,
                description: step.description,
                stepOrder: Number.isFinite(step.stepOrder) ? step.stepOrder : index + 1,
                requiredRole: step.requiredRole,
                autoAdvance: step.autoAdvance ?? false,
                requireApproval: step.requireApproval ?? true,
                conditions: step.conditions as Prisma.InputJsonValue | undefined,
                actions: step.actions as Prisma.InputJsonValue | undefined,
                notifyRoles: (step.notifyRoles || []) as Prisma.InputJsonValue,
                tenantId,
              })),
            });
          }
        }

        const updatedSteps = await tx.workflowStep.findMany({
          where: { templateId: id, tenantId },
          orderBy: { stepOrder: 'asc' },
        });

        return { updatedTemplate, updatedSteps };
      });

      logger.info(`Updated workflow template: ${id}`);

      return this.mapTemplate(result.updatedTemplate, result.updatedSteps);
    } catch (error) {
      logger.error('Error updating workflow template:', error);
      throw error;
    }
  }

  /**
   * Delete workflow template
   */
  static async deleteTemplate(id: string, tenantId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const instances = await tx.workflowInstance.findMany({
          where: { templateId: id, tenantId },
          select: { id: true },
        });
        const instanceIds = instances.map((instance) => instance.id);
        if (instanceIds.length > 0) {
          await tx.workflowStepExecution.deleteMany({
            where: { instanceId: { in: instanceIds }, tenantId },
          });
        }
        await tx.workflowInstance.deleteMany({ where: { templateId: id, tenantId } });
        await tx.workflowStep.deleteMany({ where: { templateId: id, tenantId } });
        await tx.workflowTemplate.deleteMany({
          where: { id, tenantId }
        });
      });

      logger.info(`Deleted workflow template: ${id}`);
    } catch (error) {
      logger.error('Error deleting workflow template:', error);
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
  ): Promise<WorkflowInstance> {
    try {
      const template = await prisma.workflowTemplate.findFirst({
        where: {
          id: workflowId,
          tenantId,
          isActive: true,
        },
      });

      if (!template) {
        throw new Error(`Workflow template ${workflowId} not found or inactive`);
      }

      const steps = await prisma.workflowStep.findMany({
        where: { templateId: workflowId, tenantId },
        orderBy: { stepOrder: 'asc' },
      });

      const firstStep = steps[0];

      const instance = await prisma.workflowInstance.create({
        data: {
          templateId: workflowId,
          tenantId,
          entityType,
          entityId,
          currentStepId: firstStep?.id || null,
          status: STATUS_ACTIVE
        }
      });

      if (steps.length > 0) {
        await prisma.workflowStepExecution.createMany({
          data: steps.map((step, index) => ({
            instanceId: instance.id,
            stepId: step.id,
            status: index === 0 ? EXECUTION_IN_PROGRESS : EXECUTION_PENDING,
            startedAt: index === 0 ? new Date() : null,
            tenantId,
          })),
        });
      }

      logger.info(`Started workflow instance for ${entityType} ${entityId}`);

      try {
        await EventBusService.publish(
          AppEventType.USER_CREATED,
          { workflowId: instance.id, entityType, entityId },
          { source: 'WorkflowService' }
        );
      } catch (publishError) {
        logger.warn('Workflow started but event publish failed', {
          workflowInstanceId: instance.id,
          error: publishError instanceof Error ? publishError.message : String(publishError),
        });
      }

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
    userId: string,
    userRole: string | undefined,
    approvalStatus: 'approved' | 'rejected',
    comments?: string
  ): Promise<WorkflowInstanceView> {
    try {
      const instance = await prisma.workflowInstance.findFirst({
        where: { id: instanceId, tenantId }
      });

      if (!instance) {
        throw new Error(`Workflow instance ${instanceId} not found`);
      }

      if (instance.status !== STATUS_ACTIVE) {
        throw new Error(`Workflow instance ${instanceId} is not active`);
      }

      if (!instance.currentStepId) {
        throw new Error(`Workflow instance ${instanceId} does not have a current step`);
      }

      const stepMap = await this.getStepMap(instance.templateId, tenantId);
      const currentStep = stepMap.get(instance.currentStepId);
      if (!currentStep) {
        throw new Error(`Current workflow step ${instance.currentStepId} not found`);
      }

      const privilegedRoles = new Set(['SUPER_ADMIN', 'ADMIN']);
      if (currentStep.requiredRole && userRole !== currentStep.requiredRole && !privilegedRoles.has(userRole || '')) {
        throw new Error(`Role ${userRole || 'UNKNOWN'} is not allowed to advance this step`);
      }

      await prisma.workflowStepExecution.updateMany({
        where: {
          instanceId,
          stepId: currentStep.id,
          tenantId,
        },
        data: {
          status: EXECUTION_COMPLETED,
          completedAt: new Date(),
          completedBy: userId || null,
          approvalStatus,
          comments: comments || null,
        }
      });

      if (approvalStatus === 'rejected') {
        await prisma.workflowInstance.update({
          where: { id: instanceId },
          data: {
            status: STATUS_CANCELLED,
            currentStepId: null,
            completedAt: new Date(),
          }
        });
        logger.info(`Workflow ${instanceId} rejected`);
        return this.getInstance(instanceId, tenantId);
      }

      const orderedSteps = Array.from(stepMap.values()).sort((a, b) => a.stepOrder - b.stepOrder);
      const currentStepIndex = orderedSteps.findIndex((step) => step.id === currentStep.id);
      const nextStep = currentStepIndex >= 0 ? orderedSteps[currentStepIndex + 1] : null;

      if (!nextStep) {
        await prisma.workflowInstance.update({
          where: { id: instanceId },
          data: {
            status: STATUS_COMPLETED,
            currentStepId: null,
            completedAt: new Date(),
          }
        });
        logger.info(`Workflow ${instanceId} completed`);
        return this.getInstance(instanceId, tenantId);
      }

      await prisma.workflowStepExecution.updateMany({
        where: {
          instanceId,
          stepId: nextStep.id,
          tenantId,
        },
        data: {
          status: EXECUTION_IN_PROGRESS,
          startedAt: new Date(),
        }
      });

      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { currentStepId: nextStep.id, status: STATUS_ACTIVE }
      });

      logger.info(`Workflow ${instanceId} advanced to step ${nextStep.id}`);
      return this.getInstance(instanceId, tenantId);
    } catch (error) {
      logger.error('Error advancing workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow instance
   */
  static async getInstance(id: string, tenantId: string): Promise<WorkflowInstanceView> {
    try {
      const instance = await prisma.workflowInstance.findFirst({
        where: { id, tenantId }
      });
      if (!instance) {
        throw new Error(`Workflow instance ${id} not found`);
      }

      const [currentStep, steps] = await Promise.all([
        instance.currentStepId
          ? prisma.workflowStep.findFirst({
              where: { id: instance.currentStepId, tenantId },
            })
          : null,
        prisma.workflowStepExecution.findMany({
          where: { instanceId: id, tenantId },
          orderBy: { startedAt: 'asc' },
        }),
      ]);

      return {
        ...instance,
        currentStep,
        steps,
      };
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
  ): Promise<Prisma.WorkflowInstanceGetPayload<{}>[]> {
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
