/**
 * Templates Controller
 * Handles HTTP requests for category templates
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { TemplateService } from '../services/TemplateService';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/responseHelpers';

export class TemplatesController {
  private templateService: TemplateService;

  constructor() {
    this.templateService = container.resolve(TemplateService);
  }

  /**
   * Get all templates
   */
  getAllTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templates = await this.templateService.getAllTemplates();
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
      const id = req.params.id as string;
      const template = await this.templateService.getTemplateById(id);
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
      const { name, description, criteria } = req.body;

      const template = await this.templateService.createTemplate({
        name,
        description,
        criteria
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
      const id = req.params.id as string;
      const { name, description, criteria } = req.body;

      const template = await this.templateService.updateTemplate(id, {
        name,
        description,
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
      const id = req.params.id as string;
      await this.templateService.deleteTemplate(id);
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
      const id = req.params.id as string;
      const template = await this.templateService.duplicateTemplate(id);
      sendCreated(res, template, 'Template duplicated successfully');
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
