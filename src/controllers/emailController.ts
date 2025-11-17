import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { EmailService } from '../services/EmailService';
import { sendSuccess } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class EmailController {
  private emailService: EmailService;
  private prisma: PrismaClient;

  constructor() {
    this.emailService = container.resolve(EmailService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await this.emailService.getConfig();
      return sendSuccess(res, config);
    } catch (error) {
      return next(error);
    }
  };

  sendEmail = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { to, subject, body } = req.body;
      const result = await this.emailService.sendEmail(to, subject, body);
      return sendSuccess(res, result, 'Email sent');
    } catch (error) {
      return next(error);
    }
  };

  sendBulkEmail = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { recipients, subject, body } = req.body;
      const results = await this.emailService.sendBulkEmail(recipients, subject, body);
      return sendSuccess(res, results, 'Bulk email sent');
    } catch (error) {
      return next(error);
    }
  };

  getTemplates = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const type = req.query.type as string | undefined;
      const eventId = req.query.eventId as string | undefined;

      const skip = (page - 1) * limit;
      const where: any = {};

      if (type) where.type = type;
      if (eventId) where.eventId = eventId;

      const [templates, total] = await Promise.all([
        this.prisma.emailTemplate.findMany({
          where,
          select: {
            id: true,
            name: true,
            subject: true,
            body: true,
            type: true,
            eventId: true,
            variables: true,
            createdAt: true,
            updatedAt: true,
            // creator: { select: { id: true, name: true } }, // Removed - relation not in schema
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.emailTemplate.count({ where })
      ]);

      return sendSuccess(res, {
        templates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total
        }
      });
    } catch (error) {
      return next(error);
    }
  };

  createTemplate = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { name, subject, body, type, eventId, variables } = req.body;

      if (!req.user?.id) {
        return sendSuccess(res, {}, 'User not authenticated', 401);
      }

      const template = await this.prisma.emailTemplate.create({
        data: {
          tenantId: req.user.tenantId,
          name: name || '',
          subject: subject || '',
          body: body || '',
          type: type || 'CUSTOM',
          eventId: eventId || null,
          variables: variables ? JSON.parse(JSON.stringify(variables)) : null,
          createdBy: req.user.id
        },
        // include removed - no relations in schema
      });

      return sendSuccess(res, template, 'Template created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  updateTemplate = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { name, subject, body, type, eventId, variables } = req.body;

      const existing = await this.prisma.emailTemplate.findUnique({
        where: { id }
      });

      if (!existing) {
        return sendSuccess(res, {}, 'Template not found', 404);
      }

      const template = await this.prisma.emailTemplate.update({
        where: { id },
        data: {
          name: name !== undefined ? name : existing.name,
          subject: subject !== undefined ? subject : existing.subject,
          body: body !== undefined ? body : existing.body,
          type: type !== undefined ? type : existing.type,
          eventId: eventId !== undefined ? eventId : existing.eventId,
          variables: variables !== undefined ? JSON.parse(JSON.stringify(variables)) : existing.variables
        },
        // include removed - no relations in schema
      });

      return sendSuccess(res, template, 'Template updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  deleteTemplate = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;

      const template = await this.prisma.emailTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        return sendSuccess(res, {}, 'Template not found', 404);
      }

      await this.prisma.emailTemplate.delete({
        where: { id }
      });

      return sendSuccess(res, {}, 'Template deleted successfully');
    } catch (error) {
      return next(error);
    }
  };

  getCampaigns = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // Email campaigns would be tracked through email logs
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;

      const where: any = {};
      if (status) where.status = status;

      const logs = await this.prisma.emailLog.findMany({
        where,
        take: limit,
        orderBy: { sentAt: 'desc' }
      });

      return sendSuccess(res, { campaigns: logs });
    } catch (error) {
      return next(error);
    }
  };

  createCampaign = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { name, templateId, recipientList } = req.body;

      // Campaign creation would typically involve scheduling emails
      // For now, return a simple success response
      return sendSuccess(res, {
        id: `campaign_${Date.now()}`,
        name,
        templateId,
        recipientCount: recipientList?.length || 0,
        status: 'CREATED',
        createdAt: new Date().toISOString()
      }, 'Campaign created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  sendCampaign = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { campaignId } = req.params;
      const { recipients, templateId, subject, body } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return sendSuccess(res, {}, 'Recipients list is required', 400);
      }

      // Send emails to all recipients
      const results = await Promise.allSettled(
        recipients.map(async (email: string) => {
          return this.emailService.sendEmail(email, subject, body);
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return sendSuccess(res, {
        campaignId,
        sent: successful,
        failed: failed,
        total: recipients.length
      }, 'Campaign sent');
    } catch (error) {
      return next(error);
    }
  };

  getLogs = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const status = req.query.status as string | undefined;

      const skip = (page - 1) * limit;
      const where: any = {};

      if (status) where.status = status;

      const [logs, total] = await Promise.all([
        this.prisma.emailLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { sentAt: 'desc' }
        }),
        this.prisma.emailLog.count({ where })
      ]);

      return sendSuccess(res, {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total
        }
      });
    } catch (error) {
      return next(error);
    }
  };

  sendMultipleEmails = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { emails } = req.body;

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return sendSuccess(res, {}, 'Emails array is required', 400);
      }

      const results = await Promise.allSettled(
        emails.map(async (email: { to: string; subject: string; body: string }) => {
          return this.emailService.sendEmail(email.to, email.subject, email.body);
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return sendSuccess(res, {
        sent: successful,
        failed: failed,
        total: emails.length
      }, 'Multiple emails sent');
    } catch (error) {
      return next(error);
    }
  };

  sendEmailByRole = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { role, subject, body } = req.body;

      if (!role) {
        return sendSuccess(res, {}, 'Role is required', 400);
      }

      // Get all users with the specified role
      const users = await this.prisma.user.findMany({
        where: { role },
        select: { email: true }
      });

      if (users.length === 0) {
        return sendSuccess(res, { sent: 0 }, 'No users found with that role');
      }

      // Send email to all users
      const results = await Promise.allSettled(
        users.map(user => this.emailService.sendEmail(user.email, subject, body))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return sendSuccess(res, {
        sent: successful,
        failed: failed,
        total: users.length,
        role
      }, `Emails sent to users with role: ${role}`);
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new EmailController();
export const getConfig = controller.getConfig;
export const sendEmail = controller.sendEmail;
export const sendBulkEmail = controller.sendBulkEmail;
export const getTemplates = controller.getTemplates;
export const createTemplate = controller.createTemplate;
export const updateTemplate = controller.updateTemplate;
export const deleteTemplate = controller.deleteTemplate;
export const getCampaigns = controller.getCampaigns;
export const createCampaign = controller.createCampaign;
export const sendCampaign = controller.sendCampaign;
export const getLogs = controller.getLogs;
export const sendMultipleEmails = controller.sendMultipleEmails;
export const sendEmailByRole = controller.sendEmailByRole;
