import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { EmailService } from '../services/EmailService';
import { sendSuccess, sendNotFound, sendBadRequest, sendUnauthorized} from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class EmailController {
  private emailService: EmailService;
  private prisma: PrismaClient;

  constructor() {
    this.emailService = container.resolve(EmailService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  private summarizeDispatchResults(results: PromiseSettledResult<any>[]): { sent: number; failed: number; skipped: number } {
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const result of results) {
      if (result.status === 'rejected') {
        failed += 1;
        continue;
      }

      const payload = result.value || {};
      const message = String(payload.message || '').toLowerCase();
      const explicitlySkipped = message.includes('smtp disabled') || message.includes('skipped');

      if (explicitlySkipped) {
        skipped += 1;
      } else if (payload.success === false) {
        failed += 1;
      } else {
        sent += 1;
      }
    }

    return { sent, failed, skipped };
  }

  getConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await this.emailService.getConfig();
      return sendSuccess(res, config);
    } catch (error) {
      return next(error);
    }
  };

  sendEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { to, subject, body } = req.body;
      const result = await this.emailService.sendEmail(to, subject, body, {
        tenantId: req.tenantId || req.user?.tenantId,
        userId: req.user?.id,
      });
      const wasSkipped = String(result.message || '').toLowerCase().includes('skipped');
      const message = wasSkipped ? 'Email skipped because SMTP is disabled for this tenant configuration' : 'Email sent';
      return sendSuccess(res, result, message);
    } catch (error) {
      return next(error);
    }
  };

  sendBulkEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { recipients, subject, body } = req.body;
      const results = await this.emailService.sendBulkEmail(recipients, subject, body, {
        tenantId: req.tenantId || req.user?.tenantId,
        userId: req.user?.id,
      });
      const skipped = results.filter((item) => String(item.error || '').toLowerCase().includes('smtp disabled')).length;
      const failed = results.filter((item) => item.success === false).length;
      const sent = results.length - skipped - failed;
      const message = skipped === results.length
        ? 'No emails were delivered because SMTP is disabled for this tenant configuration'
        : failed > 0
          ? 'Bulk email processed with some failures'
          : 'Bulk email sent';
      return sendSuccess(res, { results, sent, failed, skipped, total: results.length }, message);
    } catch (error) {
      return next(error);
    }
  };

  getTemplates = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const type = req.query['type'] as string | undefined;
      const eventId = req.query['eventId'] as string | undefined;

      const skip = (page - 1) * limit;
      const where: any = {};
      const isSuperAdmin = req.isSuperAdmin === true || req.user?.role === 'SUPER_ADMIN';
      const tenantId = req.tenantId || req.user?.tenantId;

      if (type) where.type = type;
      if (eventId) where.eventId = eventId;
      if (!isSuperAdmin && tenantId) {
        where.tenantId = tenantId;
      }

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

  createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { name, subject, body, type, eventId, variables } = req.body;

      if (!req.user?.id) {
        return sendUnauthorized(res, 'User not authenticated');
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
      });

      return sendSuccess(res, template, 'Template created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { name, subject, body, type, eventId, variables } = req.body;

      const existing = await this.prisma.emailTemplate.findUnique({
        where: { id }
      });

      if (!existing) {
        return sendNotFound(res, 'Template not found');
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
      });

      return sendSuccess(res, template, 'Template updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  deleteTemplate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;

      const template = await this.prisma.emailTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        return sendNotFound(res, 'Template not found');
      }

      await this.prisma.emailTemplate.delete({
        where: { id }
      });

      return sendSuccess(res, {}, 'Template deleted successfully');
    } catch (error) {
      return next(error);
    }
  };

  getCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // Email campaigns would be tracked through email logs
      const limit = parseInt(req.query['limit'] as string) || 50;
      const status = req.query['status'] as string | undefined;

      const where: any = {};
      const isSuperAdmin = req.isSuperAdmin === true || req.user?.role === 'SUPER_ADMIN';
      const tenantId = req.tenantId || req.user?.tenantId;
      if (status) where.status = status;
      if (!isSuperAdmin && tenantId) where.tenantId = tenantId;

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

  createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
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

  sendCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { campaignId } = req.params;
      const { recipients, subject, body } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return sendBadRequest(res, 'Recipients list is required');
      }

      // Send emails to all recipients
      const results = await Promise.allSettled(
        recipients.map(async (email: string) => {
          return this.emailService.sendEmail(email, subject, body, {
            tenantId: req.tenantId || req.user?.tenantId,
            userId: req.user?.id,
          });
        })
      );

      const { sent, failed, skipped } = this.summarizeDispatchResults(results);
      const message = skipped === recipients.length
        ? 'Campaign email skipped because SMTP is disabled for this tenant configuration'
        : 'Campaign sent';

      return sendSuccess(res, {
        campaignId,
        sent,
        failed,
        skipped,
        total: recipients.length
      }, message);
    } catch (error) {
      return next(error);
    }
  };

  getLogs = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 100;
      const status = req.query['status'] as string | undefined;

      const skip = (page - 1) * limit;
      const where: any = {};
      const isSuperAdmin = req.isSuperAdmin === true || req.user?.role === 'SUPER_ADMIN';
      const tenantId = req.tenantId || req.user?.tenantId;
      const requestedTenantId = req.query['tenantId'] as string | undefined;

      if (status) where.status = status;
      if (isSuperAdmin) {
        if (requestedTenantId) where.tenantId = requestedTenantId;
      } else if (tenantId) {
        where.tenantId = tenantId;
      }

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

  sendMultipleEmails = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { recipients, subject, body, html } = req.body;

      if (!Array.isArray(recipients) || recipients.length === 0) {
        return sendBadRequest(res, 'Recipients array is required');
      }
      if (!subject || !body) {
        return sendBadRequest(res, 'Subject and body are required');
      }

      const results = await Promise.allSettled(
        recipients.map(async (to: string) => {
          return this.emailService.sendEmail(to, subject, body, {
            html,
            tenantId: req.tenantId || req.user?.tenantId,
            userId: req.user?.id,
          });
        })
      );

      const { sent, failed, skipped } = this.summarizeDispatchResults(results);
      const message = skipped === recipients.length
        ? 'No emails were delivered because SMTP is disabled for this tenant configuration'
        : 'Multiple emails sent';

      return sendSuccess(res, {
        sent,
        failed,
        skipped,
        total: recipients.length
      }, message);
    } catch (error) {
      return next(error);
    }
  };

  sendEmailByRole = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { roles, subject, body, html } = req.body;

      if (!Array.isArray(roles) || roles.length === 0) {
        return sendBadRequest(res, 'At least one role is required');
      }

      // Get all users with the specified role
      const users = await this.prisma.user.findMany({
        where: {
          role: { in: roles } as any,
          tenantId: req.tenantId || req.user?.tenantId
        },
        select: { email: true }
      });

      if (users.length === 0) {
        return sendSuccess(res, { sent: 0 }, 'No users found with those roles');
      }

      // Send email to all users
      const results = await Promise.allSettled(
        users.map(user => this.emailService.sendEmail(user.email, subject, body, {
          html,
          tenantId: req.tenantId || req.user?.tenantId,
          userId: req.user?.id,
        }))
      );

      const { sent, failed, skipped } = this.summarizeDispatchResults(results);
      const message = skipped === users.length
        ? `No emails were delivered for roles ${roles.join(', ')} because SMTP is disabled for this tenant configuration`
        : `Emails sent to users with roles: ${roles.join(', ')}`;

      return sendSuccess(res, {
        sent,
        failed,
        skipped,
        total: users.length,
        roles
      }, message);
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
