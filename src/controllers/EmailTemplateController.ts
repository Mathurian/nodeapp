import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmailTemplateService } from '../services/EmailTemplateService';
import { createLogger as loggerFactory } from '../utils/logger';
import { sendSuccess, sendError } from '../utils/responseHelpers';

const logger = loggerFactory('EmailTemplateController');
const prisma = new PrismaClient();
const emailTemplateService = new EmailTemplateService(prisma);

export class EmailTemplateController {
  /**
   * GET /api/email-templates
   * Get all email templates
   */
  async getAllTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.query;

      const templates = await emailTemplateService.getAllEmailTemplates(eventId as string, req.user!.tenantId);

      sendSuccess(res, templates, 'Email templates retrieved successfully');
    } catch (error: any) {
      logger.error('Error in getAllTemplates', { error });
      sendError(res, error.message || 'Failed to retrieve email templates', 500);
    }
  }

  /**
   * GET /api/email-templates/:id
   * Get email template by ID
   */
  async getTemplateById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const template = await emailTemplateService.getEmailTemplateById(id, req.user!.tenantId);

      if (!template) {
        sendError(res, 'Email template not found', 404);
        return;
      }

      sendSuccess(res, template, 'Email template retrieved successfully');
    } catch (error: any) {
      logger.error('Error in getTemplateById', { error });
      sendError(res, error.message || 'Failed to retrieve email template', 500);
    }
  }

  /**
   * GET /api/email-templates/type/:type
   * Get email templates by type
   */
  async getTemplatesByType(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const { eventId } = req.query;

      const templates = await emailTemplateService.getEmailTemplatesByType(type, eventId as string, req.user!.tenantId);

      sendSuccess(res, templates, 'Email templates retrieved successfully');
    } catch (error: any) {
      logger.error('Error in getTemplatesByType', { error });
      sendError(res, error.message || 'Failed to retrieve email templates', 500);
    }
  }

  /**
   * POST /api/email-templates
   * Create a new email template
   */
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        sendError(res, 'Unauthorized', 401);
        return;
      }

      if (!data.name || !data.subject || !data.body) {
        sendError(res, 'Missing required fields: name, subject, body', 400);
        return;
      }

      data.createdBy = userId;
      data.tenantId = req.user!.tenantId;

      const template = await emailTemplateService.createEmailTemplate(data);

      sendSuccess(res, template, 'Email template created successfully', 201);
    } catch (error: any) {
      logger.error('Error in createTemplate', { error });
      sendError(res, error.message || 'Failed to create email template', 500);
    }
  }

  /**
   * PUT /api/email-templates/:id
   * Update an email template
   */
  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const existing = await emailTemplateService.getEmailTemplateById(id, req.user!.tenantId);
      if (!existing) {
        sendError(res, 'Email template not found', 404);
        return;
      }

      const template = await emailTemplateService.updateEmailTemplate(id, req.user!.tenantId, data);

      sendSuccess(res, template, 'Email template updated successfully');
    } catch (error: any) {
      logger.error('Error in updateTemplate', { error });
      sendError(res, error.message || 'Failed to update email template', 500);
    }
  }

  /**
   * DELETE /api/email-templates/:id
   * Delete an email template
   */
  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const existing = await emailTemplateService.getEmailTemplateById(id, req.user!.tenantId);
      if (!existing) {
        sendError(res, 'Email template not found', 404);
        return;
      }

      await emailTemplateService.deleteEmailTemplate(id, req.user!.tenantId);

      sendSuccess(res, null, 'Email template deleted successfully');
    } catch (error: any) {
      logger.error('Error in deleteTemplate', { error });
      sendError(res, error.message || 'Failed to delete email template', 500);
    }
  }

  /**
   * POST /api/email-templates/:id/clone
   * Clone an email template
   */
  async cloneTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        sendError(res, 'Unauthorized', 401);
        return;
      }

      const cloned = await emailTemplateService.cloneEmailTemplate(id, userId, req.user!.tenantId);

      sendSuccess(res, cloned, 'Email template cloned successfully', 201);
    } catch (error: any) {
      logger.error('Error in cloneTemplate', { error });
      sendError(res, error.message || 'Failed to clone email template', 500);
    }
  }

  /**
   * POST /api/email-templates/:id/preview
   * Preview an email template with sample variables
   */
  async previewTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { variables } = req.body;

      const preview = await emailTemplateService.previewEmailTemplate(id, req.user!.tenantId, variables);

      sendSuccess(res, preview, 'Email template preview generated successfully');
    } catch (error: any) {
      logger.error('Error in previewTemplate', { error });
      sendError(res, error.message || 'Failed to preview email template', 500);
    }
  }

  /**
   * GET /api/email-templates/variables/:type
   * Get available variables for a template type
   */
  async getAvailableVariables(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;

      const variables = emailTemplateService.getAvailableVariables(type);

      sendSuccess(res, variables, 'Available variables retrieved successfully');
    } catch (error: any) {
      logger.error('Error in getAvailableVariables', { error });
      sendError(res, error.message || 'Failed to retrieve available variables', 500);
    }
  }
}

export const emailTemplateController = new EmailTemplateController();
