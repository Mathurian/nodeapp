/**
 * Workflow Service
 * Handles workflow template and instance management
 */

import prisma from '../config/database';
import { Prisma, PrismaClient, WorkflowInstance, WorkflowStep } from '@prisma/client';
import { createLogger } from '../utils/logger';
import EventBusService, { AppEventType } from './EventBusService';
import { withTenantDbRlsContext } from '../utils/prismaRlsContext';

const logger = createLogger('WorkflowService');

export interface WorkflowTemplateInput {
  tenantId?: string;
  name: string;
  description?: string;
  type?: string;
  isDefault?: boolean;
  isActive?: boolean;
  config?: Record<string, unknown>;
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

interface WinnerUnlockConfig {
  enabled: boolean;
  contestId?: string;
  mode?: 'trigger' | 'scheduled';
  triggerEvent?: string;
  unlockAt?: string;
}

export class WorkflowService {
  private static async withOptionalTenantDbContext<T>(
    tenantId: string,
    client: PrismaClient | undefined,
    operation: (db: PrismaClient) => Promise<T>
  ): Promise<T> {
    if (client) {
      return operation(client);
    }

    return withTenantDbRlsContext(
      prisma as PrismaClient,
      { tenantId, isSuperAdmin: false },
      async tx => operation(tx)
    );
  }

  private static async withOptionalSystemDbContext<T>(
    client: PrismaClient | undefined,
    operation: (db: PrismaClient) => Promise<T>
  ): Promise<T> {
    if (client) {
      return operation(client);
    }

    return withTenantDbRlsContext(
      prisma as PrismaClient,
      { tenantId: null, isSuperAdmin: true },
      async tx => operation(tx)
    );
  }

  private static async initializeDefaultsForTenant(tenantId: string, client?: PrismaClient): Promise<void> {
    const db = client || prisma;
    const existingCount = await db.workflowTemplate.count({ where: { tenantId } });
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
      await this.createTemplate(template, db);
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

  private static async getStepMap(templateId: string, tenantId: string, client?: PrismaClient): Promise<Map<string, WorkflowStep>> {
    const steps = await this.withOptionalTenantDbContext(tenantId, client, async db =>
      db.workflowStep.findMany({
        where: { templateId, tenantId },
        orderBy: { stepOrder: 'asc' },
      })
    );
    return new Map(steps.map((step) => [step.id, step]));
  }

  private static parseWinnerUnlockConfig(config: Prisma.JsonValue | null | undefined): WinnerUnlockConfig | null {
    if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
    const winnerUnlockRaw = (config as Record<string, unknown>)['winnerUnlock'];
    if (!winnerUnlockRaw || typeof winnerUnlockRaw !== 'object' || Array.isArray(winnerUnlockRaw)) return null;

    const winnerUnlock = winnerUnlockRaw as Record<string, unknown>;
    return {
      enabled: winnerUnlock['enabled'] === true,
      contestId: typeof winnerUnlock['contestId'] === 'string' ? winnerUnlock['contestId'] : undefined,
      mode: winnerUnlock['mode'] === 'scheduled' ? 'scheduled' : 'trigger',
      triggerEvent: typeof winnerUnlock['triggerEvent'] === 'string' ? winnerUnlock['triggerEvent'] : undefined,
      unlockAt: typeof winnerUnlock['unlockAt'] === 'string' ? winnerUnlock['unlockAt'] : undefined,
    };
  }

  private static async publishWinnersIfEligible(
    contestId: string,
    tenantId: string,
    context: { source: string; templateId?: string; eventType?: string },
    client?: PrismaClient
  ): Promise<boolean> {
    const publishedContest = await this.withOptionalTenantDbContext(tenantId, client, async db => {
      const contest = await db.contest.findFirst({
        where: { id: contestId, tenantId },
        select: {
          id: true,
          name: true,
          winnersPublished: true,
          categories: {
            select: {
              id: true,
              name: true,
              categoryCertifications: {
                where: { role: 'BOARD', tenantId },
                select: { id: true },
              },
            },
          },
        },
      });

      if (!contest || contest.winnersPublished || contest.categories.length === 0) return null;

      const missingApprovals = contest.categories.filter((category) => category.categoryCertifications.length === 0);
      if (missingApprovals.length > 0) return null;

      await db.contest.update({
        where: { id: contestId },
        data: {
          winnersPublished: true,
          publishedAt: new Date(),
          publishedBy: 'workflow-system',
        },
      });

      return {
        name: contest.name,
      };
    });

    if (!publishedContest) return false;

    logger.info('Workflow auto-published winners', {
      contestId,
      contestName: publishedContest.name,
      tenantId,
      templateId: context.templateId,
      source: context.source,
      eventType: context.eventType,
    });

    return true;
  }

  private static async maybeTriggerWinnerUnlockFromConfig(
    config: Prisma.JsonValue | null | undefined,
    tenantId: string,
    eventType: string,
    payload: Record<string, unknown>,
    options?: { now?: Date; source?: string; templateId?: string },
    client?: PrismaClient
  ): Promise<boolean> {
    const winnerUnlock = this.parseWinnerUnlockConfig(config);
    if (!winnerUnlock?.enabled) return false;

    const mode = winnerUnlock.mode || 'trigger';
    if (mode === 'trigger') {
      if (winnerUnlock.triggerEvent && winnerUnlock.triggerEvent !== eventType) return false;
    } else {
      const unlockAt = winnerUnlock.unlockAt ? new Date(winnerUnlock.unlockAt) : null;
      if (!unlockAt || Number.isNaN(unlockAt.getTime())) return false;
      const now = options?.now || new Date();
      if (unlockAt.getTime() > now.getTime()) return false;
    }

    const contestIdFromPayload =
      (typeof payload['contestId'] === 'string' && payload['contestId']) ||
      (typeof payload['entityId'] === 'string' && payload['entityId']) ||
      '';
    const contestId = winnerUnlock.contestId || contestIdFromPayload;
    if (!contestId) return false;

    return this.publishWinnersIfEligible(contestId, tenantId, {
      source: options?.source || 'workflow-automation',
      templateId: options?.templateId,
      eventType,
    }, client);
  }

  static async runScheduledWinnerUnlocks(now: Date = new Date(), client?: PrismaClient): Promise<number> {
    try {
      const templates = await this.withOptionalSystemDbContext(client, async db =>
        db.workflowTemplate.findMany({
          where: {
            isActive: true,
            type: 'winners.unlock.time',
            tenantId: { not: null },
          },
          select: {
            id: true,
            tenantId: true,
            config: true,
          },
        })
      );

      let publishedCount = 0;
      for (const template of templates) {
        const templateTenantId = template.tenantId;
        if (!templateTenantId) continue;

        const didPublish = await this.withOptionalTenantDbContext(templateTenantId, client, async db =>
          this.maybeTriggerWinnerUnlockFromConfig(
            template.config,
            templateTenantId,
            'winners.unlock.time',
            {},
            { now, source: 'workflow-scheduler', templateId: template.id },
            db
          )
        );

        if (didPublish) publishedCount += 1;
      }

      return publishedCount;
    } catch (error) {
      logger.error('Error running scheduled winner unlock workflows', { error });
      return 0;
    }
  }

  /**
   * Create workflow template
   */
  static async createTemplate(input: WorkflowTemplateInput, client?: PrismaClient): Promise<WorkflowTemplateView> {
    try {
      const db = client || prisma;
      const { steps = [], ...templateData } = input;
      const normalizedTenantId = templateData.tenantId?.trim();
      if (!normalizedTenantId) {
        throw new Error('Tenant context is required for workflow templates');
      }

      if (!templateData.name?.trim()) {
        throw new Error('Workflow template name is required');
      }

      const normalizedSteps = this.normalizeStepInput(steps);
      const baseConfig = (
        templateData.config &&
        typeof templateData.config === 'object' &&
        !Array.isArray(templateData.config)
      ) ? (templateData.config as Record<string, unknown>) : {};
      const templateConfig = ({ ...baseConfig, steps: normalizedSteps } as unknown as Prisma.InputJsonValue);

      const result = await db.$transaction(async (tx) => {
        const createdTemplate = await tx.workflowTemplate.create({
          data: {
            tenantId: normalizedTenantId || null,
            name: templateData.name,
            description: templateData.description,
            type: templateData.type || 'custom',
            isDefault: templateData.isDefault ?? false,
            isActive: templateData.isActive ?? true,
            config: templateConfig,
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
  static async getTemplate(id: string, tenantId: string, client?: PrismaClient): Promise<WorkflowTemplateView | null> {
    try {
      return this.withOptionalTenantDbContext(tenantId, client, async db => {
        const template = await db.workflowTemplate.findFirst({
          where: { id, tenantId }
        });
        if (!template) {
          return null;
        }
        const steps = await db.workflowStep.findMany({
          where: { templateId: id, tenantId },
          orderBy: { stepOrder: 'asc' },
        });
        return this.mapTemplate(template, steps);
      });
    } catch (error) {
      logger.error('Error getting workflow template:', error);
      throw error;
    }
  }

  /**
   * List workflow templates
   */
  static async listTemplates(tenantId: string, type?: string, client?: PrismaClient): Promise<WorkflowTemplateView[]> {
    try {
      const db = client || prisma;
      let templates = await db.workflowTemplate.findMany({
        where: {
          tenantId,
          ...(type ? { type } : {})
        },
        orderBy: { createdAt: 'desc' }
      });

      if (templates.length === 0) {
        await this.initializeDefaultsForTenant(tenantId, db);
        templates = await db.workflowTemplate.findMany({
          where: {
            tenantId,
            ...(type ? { type } : {})
          },
          orderBy: { createdAt: 'desc' }
        });
      }

      const steps = await db.workflowStep.findMany({
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
  static async updateTemplate(id: string, tenantId: string, data: Partial<WorkflowTemplateInput>, client?: PrismaClient): Promise<WorkflowTemplateView> {
    try {
      const db = client || prisma;
      const existing = await db.workflowTemplate.findFirst({ where: { id, tenantId } });
      if (!existing) {
        throw new Error(`Workflow template ${id} not found`);
      }

      const result = await db.$transaction(async (tx) => {
        const nextSteps = Array.isArray(data.steps) ? this.normalizeStepInput(data.steps) : null;
        const existingConfig = (
          existing.config &&
          typeof existing.config === 'object' &&
          !Array.isArray(existing.config)
        ) ? (existing.config as Record<string, unknown>) : {};
        const incomingConfig = (
          data.config &&
          typeof data.config === 'object' &&
          !Array.isArray(data.config)
        ) ? (data.config as Record<string, unknown>) : null;
        const nextConfig = (incomingConfig || nextSteps)
          ? ({
              ...(incomingConfig || existingConfig),
              ...(nextSteps ? { steps: nextSteps } : {}),
            } as Prisma.InputJsonValue)
          : undefined;
        const updatedTemplate = await tx.workflowTemplate.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description,
            type: data.type,
            isActive: data.isActive,
            isDefault: data.isDefault,
            ...(nextConfig ? { config: nextConfig } : {}),
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
  static async deleteTemplate(id: string, tenantId: string, client?: PrismaClient): Promise<void> {
    try {
      const db = client || prisma;
      await db.$transaction(async (tx) => {
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
    entityId: string,
    client?: PrismaClient
  ): Promise<WorkflowInstance> {
    try {
      const db = client || prisma;
      const template = await db.workflowTemplate.findFirst({
        where: {
          id: workflowId,
          tenantId,
          isActive: true,
        },
      });

      if (!template) {
        throw new Error(`Workflow template ${workflowId} not found or inactive`);
      }

      const steps = await db.workflowStep.findMany({
        where: { templateId: workflowId, tenantId },
        orderBy: { stepOrder: 'asc' },
      });

      const firstStep = steps[0];

      const instance = await db.workflowInstance.create({
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
        await db.workflowStepExecution.createMany({
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
          { workflowId: instance.id, entityType, entityId, tenantId },
          { source: 'WorkflowService', tenantId }
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
   * Auto-start active workflow templates that are configured for a given event type.
   */
  static async autoStartForEvent(
    eventType: string,
    tenantId: string,
    payload: Record<string, unknown>,
    client?: PrismaClient
  ): Promise<number> {
    try {
      return this.withOptionalTenantDbContext(tenantId, client, async db => {
        const templates = await db.workflowTemplate.findMany({
          where: {
            tenantId,
            isActive: true,
            type: eventType,
          },
          select: { id: true, config: true },
        });

        if (templates.length === 0) return 0;

        const entityId =
          String(
            payload['entityId'] ||
            payload['categoryId'] ||
            payload['contestId'] ||
            payload['eventId'] ||
            payload['scoreId'] ||
            payload['assignmentId'] ||
            payload['userId'] ||
            payload['id'] ||
            `${eventType}-${Date.now()}`
          );

        const lowerType = eventType.toLowerCase();
        const entityType =
          lowerType.startsWith('event.') ? 'EVENT'
          : lowerType.startsWith('contest.') ? 'CONTEST'
          : lowerType.startsWith('category.') ? 'CATEGORY'
          : lowerType.startsWith('score.') ? 'SCORE'
          : lowerType.startsWith('assignment.') ? 'ASSIGNMENT'
          : lowerType.startsWith('certification.') ? 'CERTIFICATION'
          : lowerType.startsWith('user.') ? 'USER'
          : 'SYSTEM';

        let started = 0;
        for (const template of templates) {
          const existing = await db.workflowInstance.findFirst({
            where: {
              tenantId,
              templateId: template.id,
              entityId,
              entityType,
              status: STATUS_ACTIVE,
            },
            select: { id: true },
          });
          if (existing) continue;
          await this.startWorkflow(template.id, tenantId, entityType, entityId, db);
          await this.maybeTriggerWinnerUnlockFromConfig(
            template.config,
            tenantId,
            eventType,
            payload,
            { source: 'workflow-event', templateId: template.id },
            db
          );
          started += 1;
        }
        return started;
      });
    } catch (error) {
      logger.error('Error auto-starting workflow for event', { eventType, tenantId, error });
      return 0;
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
    comments?: string,
    client?: PrismaClient
  ): Promise<WorkflowInstanceView> {
    try {
      const db = client || prisma;
      const instance = await db.workflowInstance.findFirst({
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

      const stepMap = await this.getStepMap(instance.templateId, tenantId, db);
      const currentStep = stepMap.get(instance.currentStepId);
      if (!currentStep) {
        throw new Error(`Current workflow step ${instance.currentStepId} not found`);
      }

      const privilegedRoles = new Set(['SUPER_ADMIN', 'ADMIN']);
      if (currentStep.requiredRole && userRole !== currentStep.requiredRole && !privilegedRoles.has(userRole || '')) {
        throw new Error(`Role ${userRole || 'UNKNOWN'} is not allowed to advance this step`);
      }

      await db.workflowStepExecution.updateMany({
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
        await db.workflowInstance.update({
          where: { id: instanceId },
          data: {
            status: STATUS_CANCELLED,
            currentStepId: null,
            completedAt: new Date(),
          }
        });
        logger.info(`Workflow ${instanceId} rejected`);
        return this.getInstance(instanceId, tenantId, db);
      }

      const orderedSteps = Array.from(stepMap.values()).sort((a, b) => a.stepOrder - b.stepOrder);
      const currentStepIndex = orderedSteps.findIndex((step) => step.id === currentStep.id);
      const nextStep = currentStepIndex >= 0 ? orderedSteps[currentStepIndex + 1] : null;

      if (!nextStep) {
        await db.workflowInstance.update({
          where: { id: instanceId },
          data: {
            status: STATUS_COMPLETED,
            currentStepId: null,
            completedAt: new Date(),
          }
        });
        logger.info(`Workflow ${instanceId} completed`);
        return this.getInstance(instanceId, tenantId, db);
      }

      await db.workflowStepExecution.updateMany({
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

      await db.workflowInstance.update({
        where: { id: instanceId },
        data: { currentStepId: nextStep.id, status: STATUS_ACTIVE }
      });

      logger.info(`Workflow ${instanceId} advanced to step ${nextStep.id}`);
      return this.getInstance(instanceId, tenantId, db);
    } catch (error) {
      logger.error('Error advancing workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow instance
   */
  static async getInstance(id: string, tenantId: string, client?: PrismaClient): Promise<WorkflowInstanceView> {
    try {
      return this.withOptionalTenantDbContext(tenantId, client, async db => {
        const instance = await db.workflowInstance.findFirst({
          where: { id, tenantId }
        });
        if (!instance) {
          throw new Error(`Workflow instance ${id} not found`);
        }

        const [currentStep, steps] = await Promise.all([
          instance.currentStepId
            ? db.workflowStep.findFirst({
                where: { id: instance.currentStepId, tenantId },
              })
            : null,
          db.workflowStepExecution.findMany({
            where: { instanceId: id, tenantId },
            orderBy: { startedAt: 'asc' },
          }),
        ]);

        return {
          ...instance,
          currentStep,
          steps,
        };
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
    entityId: string,
    client?: PrismaClient
  ): Promise<Prisma.WorkflowInstanceGetPayload<{}>[]> {
    try {
      return await this.withOptionalTenantDbContext(tenantId, client, async db =>
        db.workflowInstance.findMany({
          where: { tenantId, entityType, entityId },
          orderBy: { startedAt: 'desc' }
        })
      );
    } catch (error) {
      logger.error('Error listing workflow instances:', error);
      throw error;
    }
  }
}

export default WorkflowService;
