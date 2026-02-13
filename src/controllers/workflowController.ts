/**
 * Workflow Controller
 */

import { Request, Response, NextFunction } from 'express';
import { WorkflowService } from '../services/WorkflowService';
import { sendSuccess } from '../utils/responseHelpers';
import { getRequiredParam } from '../utils/routeHelpers';

export const createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant context is required'
      });
      return;
    }

    const input = {
      ...req.body,
      // Frontend currently sends `trigger` + `actions`; normalize to workflow service shape.
      type: req.body?.type || req.body?.trigger || 'custom',
      steps: Array.isArray(req.body?.steps)
        ? req.body.steps
        : [],
      tenantId: req.tenantId,
    };

    const template = await WorkflowService.createTemplate(input);
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
    const template = await WorkflowService.updateTemplate(id, req.tenantId!, req.body);
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
    if (!approvalStatus || !['approved', 'rejected'].includes(approvalStatus)) {
      res.status(400).json({
        success: false,
        error: "approvalStatus must be 'approved' or 'rejected'"
      });
      return;
    }

    const instance = await WorkflowService.advanceWorkflow(id, req.tenantId!, userId, approvalStatus, comments);
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
