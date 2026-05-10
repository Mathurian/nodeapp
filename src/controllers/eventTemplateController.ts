import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { EventTemplateService } from '../services/EventTemplateService';
import { sendSuccess , sendUnauthorized} from '../utils/responseHelpers';

export class EventTemplateController {
  private eventTemplateService: EventTemplateService;

  constructor() {
    this.eventTemplateService = container.resolve(EventTemplateService);
  }

  createTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { name, description, contests, categories } = req.body;
      const template = await this.eventTemplateService.create({
        name,
        description,
        contests,
        categories,
        createdBy: req.user.id,
        tenantId: req.user.tenantId
      });
      return sendSuccess(res, template, 'Template created', 201);
    } catch (error) {
      return next(error);
    }
  };

  createTemplateFromEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const eventId = req.params['id'] as string;
      const { name, description } = req.body;
      const template = await this.eventTemplateService.createFromEvent({
        eventId,
        name,
        description,
        createdBy: req.user.id,
        tenantId: req.user.tenantId,
      });
      return sendSuccess(res, template, 'Template created from event', 201);
    } catch (error) {
      return next(error);
    }
  };

  getTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const templates = await this.eventTemplateService.getAll(req.user.tenantId);
      return sendSuccess(res, templates);
    } catch (error) {
      return next(error);
    }
  };

  getTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { id } = req.params;
      const template = await this.eventTemplateService.getById(id!, req.user.tenantId);
      return sendSuccess(res, template);
    } catch (error) {
      return next(error);
    }
  };

  updateTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { id } = req.params;
      const { name, description, contests, categories } = req.body;
      const template = await this.eventTemplateService.update(id!, req.user.tenantId, {
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

  deleteTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { id } = req.params;
      await this.eventTemplateService.delete(id!, req.user.tenantId);
      return sendSuccess(res, null, 'Template deleted');
    } catch (error) {
      return next(error);
    }
  };

  createEventFromTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const templateId = req.params['id'] || req.body.templateId;
      const { eventName, eventDescription, startDate, endDate } = req.body;
      const event = await this.eventTemplateService.createEventFromTemplate({
        templateId,
        eventName,
        eventDescription,
        startDate,
        endDate,
        tenantId: req.user.tenantId
      });
      return sendSuccess(res, event, 'Event created from template', 201);
    } catch (error) {
      return next(error);
    }
  };

  createContestFromTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const templateId = req.params['id'] || req.body.templateId;
      const {
        templateContestId,
        targetEventId,
        contestName,
        contestDescription,
        commentaryMode,
        commentaryScope,
      } = req.body;
      const contest = await this.eventTemplateService.createContestFromTemplate({
        templateId,
        templateContestId,
        targetEventId,
        contestName,
        contestDescription,
        commentaryMode,
        commentaryScope,
        tenantId: req.user.tenantId
      });
      return sendSuccess(res, contest, 'Contest created from template', 201);
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new EventTemplateController();
export const createTemplate = controller.createTemplate;
export const createTemplateFromEvent = controller.createTemplateFromEvent;
export const getTemplates = controller.getTemplates;
export const getTemplate = controller.getTemplate;
export const updateTemplate = controller.updateTemplate;
export const deleteTemplate = controller.deleteTemplate;
export const createEventFromTemplate = controller.createEventFromTemplate;
export const createContestFromTemplate = controller.createContestFromTemplate;
