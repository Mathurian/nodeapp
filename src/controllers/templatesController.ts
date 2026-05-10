/**
 * Templates Controller
 * Handles HTTP requests for category templates
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { TemplateService } from '../services/TemplateService';
import { StructureCopyService } from '../services/StructureCopyService';
import { sendSuccess, sendCreated, sendNoContent , sendUnauthorized} from '../utils/responseHelpers';

export class TemplatesController {
  private templateService: TemplateService;
  private structureCopyService: StructureCopyService;

  constructor() {
    this.templateService = container.resolve(TemplateService);
    this.structureCopyService = container.resolve(StructureCopyService);
  }

  /**
   * Get all templates
   */
  getAllTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const templates = await this.templateService.getAllTemplates(req.user.tenantId);
      sendSuccess(res, templates, 'Templates retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get template by ID
   */
  getTemplateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const id = req.params['id'] as string;
      const template = await this.templateService.getTemplateById(id, req.user.tenantId);
      sendSuccess(res, template, 'Template retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Create new template
   */
  createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { name, description, commentaryMode, commentaryScope, criteria } = req.body;

      const template = await this.templateService.createTemplate({
        name,
        description,
        commentaryMode,
        commentaryScope,
        criteria,
        tenantId: req.user.tenantId
      });

      sendCreated(res, template, 'Template created successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update template
   */
  updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const id = req.params['id'] as string;
      const { name, description, commentaryMode, commentaryScope, criteria } = req.body;

      const template = await this.templateService.updateTemplate(id, req.user.tenantId, {
        name,
        description,
        commentaryMode,
        commentaryScope,
        criteria
      });

      sendSuccess(res, template, 'Template updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete template
   */
  deleteTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const id = req.params['id'] as string;
      await this.templateService.deleteTemplate(id, req.user.tenantId);
      sendNoContent(res);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Duplicate template
   */
  duplicateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const id = req.params['id'] as string;
      const template = await this.templateService.duplicateTemplate(id, req.user.tenantId);
      sendCreated(res, template, 'Template duplicated successfully');
    } catch (error) {
      return next(error);
    }
  };

  createTemplateFromCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const id = req.params['id'] as string;
      const { name, description } = req.body;
      const template = await this.structureCopyService.createCategoryTemplateFromCategory({
        tenantId: req.user.tenantId,
        sourceCategoryId: id,
        name,
        description,
      });
      sendCreated(res, template, 'Template created from category successfully');
    } catch (error) {
      return next(error);
    }
  };

  createCategoryFromTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const id = req.params['id'] as string;
      const { contestId, name, description, scoreCap, timeLimit, contestantMin, contestantMax, commentaryMode, commentaryScope } = req.body;
      const category = await this.structureCopyService.createCategoryFromTemplate({
        tenantId: req.user.tenantId,
        templateId: id,
        contestId,
        name,
        description,
        scoreCap,
        timeLimit,
        contestantMin,
        contestantMax,
        commentaryMode,
        commentaryScope,
      });
      sendCreated(res, category, 'Category created from template successfully');
    } catch (error) {
      return next(error);
    }
  };
}

// Create instance and export methods
const controller = new TemplatesController();

export const getAllTemplates = controller.getAllTemplates;
export const getTemplateById = controller.getTemplateById;
export const createTemplate = controller.createTemplate;
export const updateTemplate = controller.updateTemplate;
export const deleteTemplate = controller.deleteTemplate;
export const duplicateTemplate = controller.duplicateTemplate;
export const createTemplateFromCategory = controller.createTemplateFromCategory;
export const createCategoryFromTemplate = controller.createCategoryFromTemplate;
