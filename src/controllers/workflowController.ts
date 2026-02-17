/**
 * Workflow Controller
 */

import { Request, Response, NextFunction } from 'express';
import { WorkflowService } from '../services/WorkflowService';
import { sendSuccess } from '../utils/responseHelpers';
import { getRequiredParam } from '../utils/routeHelpers';

interface LegacyWorkflowAction {
  id?: string;
  type: string;
  config?: Record<string, unknown>;
  order?: number;
}

interface LegacyWorkflowBody {
  name?: string;
  description?: string;
  type?: string;
  trigger?: string;
  isDefault?: boolean;
  isActive?: boolean;
  config?: Record<string, unknown>;
  steps?: Array<Record<string, unknown>>;
  actions?: LegacyWorkflowAction[];
}

const normalizeTemplatePayload = (
  body: LegacyWorkflowBody,
  tenantId: string,
  options?: { requireName?: boolean }
): {
  tenantId: string;
  name?: string;
  description?: string;
  type: string;
  isDefault?: boolean;
  isActive?: boolean;
  config?: Record<string, unknown>;
  steps: any[];
} => {
  const normalizedType = body.type || body.trigger || 'custom';
  const normalizedName = typeof body.name === 'string' ? body.name : undefined;
  const name = options?.requireName ? (normalizedName || '') : normalizedName;
  if (Array.isArray(body.steps) && body.steps.length > 0) {
    return {
      tenantId,
      name,
      description: body.description,
      type: normalizedType,
      isDefault: body.isDefault,
      isActive: body.isActive,
      config: body.config,
      steps: body.steps,
    };
  }

  if (Array.isArray(body.actions) && body.actions.length > 0) {
    const orderedActions = [...body.actions].sort((a, b) => (a.order || 0) - (b.order || 0));
    return {
      tenantId,
      name,
      description: body.description,
      type: normalizedType,
      isDefault: body.isDefault,
      isActive: body.isActive,
      config: body.config,
      steps: [
        {
          name: body.trigger ? `${body.trigger} Actions` : 'Workflow Actions',
          description: 'Legacy action set migrated into step-based workflow',
          stepOrder: 1,
          actions: { items: orderedActions },
          requireApproval: true,
          autoAdvance: false,
        },
      ],
    };
  }

  return {
    tenantId,
    name,
    description: body.description,
    type: normalizedType,
    isDefault: body.isDefault,
    isActive: body.isActive,
    config: body.config,
    steps: [],
  };
};

export const createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant context is required'
      });
      return;
    }

    const input = normalizeTemplatePayload(req.body as LegacyWorkflowBody, req.tenantId, { requireName: true });
    if (!input.name || !input.name.trim()) {
      res.status(400).json({
        success: false,
        error: 'Workflow template name is required'
      });
      return;
    }

    const template = await WorkflowService.createTemplate({
      ...input,
      name: input.name as string,
    });
    sendSuccess(res, template, 'Workflow template created', 201);
  } catch (error) {
    return next(error);
  }
};

export const getTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const template = await WorkflowService.getTemplate(req.params['id']!, req.tenantId!);
    sendSuccess(res, template);
  } catch (error) {
    return next(error);
  }
};

export const listTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type } = req.query;
    const templates = await WorkflowService.listTemplates(req.tenantId!, type as string);
    sendSuccess(res, templates);
  } catch (error) {
    return next(error);
  }
};

export const updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = getRequiredParam(req, 'id');
    const payload = normalizeTemplatePayload(req.body as LegacyWorkflowBody, req.tenantId!);
    const template = await WorkflowService.updateTemplate(id, req.tenantId!, payload);
    sendSuccess(res, template, 'Workflow template updated');
  } catch (error) {
    return next(error);
  }
};

export const deleteTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = getRequiredParam(req, 'id');
    await WorkflowService.deleteTemplate(id, req.tenantId!);
    sendSuccess(res, null, 'Workflow template deleted');
  } catch (error) {
    return next(error);
  }
};

export const startWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { templateId, entityType, entityId } = req.body;
    if (!templateId || !entityType || !entityId) {
      res.status(400).json({
        success: false,
        error: 'templateId, entityType, and entityId are required'
      });
      return;
    }

    const instance = await WorkflowService.startWorkflow(templateId, req.tenantId!, entityType, entityId);
    sendSuccess(res, instance, 'Workflow started', 201);
  } catch (error) {
    return next(error);
  }
};

export const advanceWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = getRequiredParam(req, 'id');
    const { approvalStatus, comments } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication is required'
      });
      return;
    }
    if (!approvalStatus || !['approved', 'rejected'].includes(approvalStatus)) {
      res.status(400).json({
        success: false,
        error: "approvalStatus must be 'approved' or 'rejected'"
      });
      return;
    }

    const instance = await WorkflowService.advanceWorkflow(id, req.tenantId!, userId, userRole, approvalStatus, comments);
    sendSuccess(res, instance, 'Workflow advanced');
  } catch (error) {
    return next(error);
  }
};

export const getInstance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const instance = await WorkflowService.getInstance(req.params['id']!, req.tenantId!);
    sendSuccess(res, instance);
  } catch (error) {
    return next(error);
  }
};

export const listInstancesForEntity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;
    const instances = await WorkflowService.listInstancesForEntity(req.tenantId!, entityType!, entityId!);
    sendSuccess(res, instances);
  } catch (error) {
    return next(error);
  }
};
