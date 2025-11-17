import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { EventTemplateService } from '../services/EventTemplateService';
import { successResponse, sendSuccess } from '../utils/responseHelpers';

export class EventTemplateController {
  private eventTemplateService: EventTemplateService;

  constructor() {
    this.eventTemplateService = container.resolve(EventTemplateService);
  }

  createTemplate = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, contests, categories } = req.body;
      const template = await this.eventTemplateService.create({
        name,
        description,
        contests,
        categories,
        createdBy: req.user!.id
      });
      return sendSuccess(res, template, 'Template created', 201);
    } catch (error) {
      return next(error);
    }
  };

  getTemplates = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = await this.eventTemplateService.getAll();
      return sendSuccess(res, templates);
    } catch (error) {
      return next(error);
    }
  };

  getTemplate = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const template = await this.eventTemplateService.getById(id);
      return sendSuccess(res, template);
    } catch (error) {
      return next(error);
    }
  };

  updateTemplate = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, description, contests, categories } = req.body;
      const template = await this.eventTemplateService.update(id, {
        name,
        description,
        contests,
        categories
      });
      return sendSuccess(res, template, 'Template updated');
    } catch (error) {
      return next(error);
    }
  };

  deleteTemplate = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.eventTemplateService.delete(id);
      return sendSuccess(res, null, 'Template deleted');
    } catch (error) {
      return next(error);
    }
  };

  createEventFromTemplate = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateId, eventName, eventDescription, startDate, endDate } = req.body;
      const event = await this.eventTemplateService.createEventFromTemplate({
        templateId,
        eventName,
        eventDescription,
        startDate,
        endDate
      });
      return sendSuccess(res, event, 'Event created from template', 201);
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new EventTemplateController();
export const createTemplate = controller.createTemplate;
export const getTemplates = controller.getTemplates;
export const getTemplate = controller.getTemplate;
export const updateTemplate = controller.updateTemplate;
export const deleteTemplate = controller.deleteTemplate;
export const createEventFromTemplate = controller.createEventFromTemplate;
