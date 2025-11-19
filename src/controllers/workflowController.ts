/**
 * Workflow Controller
 */

import { Request, Response, NextFunction } from 'express';
import { WorkflowService } from '../services/WorkflowService';
import { sendSuccess } from '../utils/responseHelpers';
import { getRequiredParam } from '../utils/routeHelpers';

export const createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const template = await WorkflowService.createTemplate({ ...req.body, tenantId: req.tenantId });
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

export const startWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { templateId, entityType, entityId } = req.body;
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
    const instance = await WorkflowService.advanceWorkflow(id, userId, approvalStatus, comments);
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
