import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { SMSService } from '../services/SMSService';
import { sendSuccess } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class SMSController {
  private smsService: SMSService;
  private prisma: PrismaClient;

  constructor() {
    this.smsService = container.resolve(SMSService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getSMSConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await this.smsService.getSettings();
      return sendSuccess(res, settings);
    } catch (error) {
      return next(error);
    }
  };

  updateSMSConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { enabled, apiKey, apiSecret, fromNumber, provider } = req.body;
      await this.smsService.updateSettings(
        { enabled, apiKey, apiSecret, fromNumber, provider },
        req.user?.id
      );
      return sendSuccess(res, null, 'SMS settings updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  sendSMS = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { to, message } = req.body;
      const result = await this.smsService.sendSMS(to, message);
      return sendSuccess(res, result, 'SMS sent successfully');
    } catch (error) {
      return next(error);
    }
  };

  sendBulkSMS = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { recipients, message } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return sendSuccess(res, {}, 'Recipients array is required', 400);
      }

      if (!message) {
        return sendSuccess(res, {}, 'Message is required', 400);
      }

      const results = await Promise.allSettled(
        recipients.map(async (phone: string) => {
          return await this.smsService.sendSMS(phone, message);
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return sendSuccess(res, {
        sent: successful,
        failed,
        total: recipients.length
      }, `Bulk SMS sent: ${successful} succeeded, ${failed} failed`);
    } catch (error) {
      return next(error);
    }
  };

  sendNotificationSMS = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId, userRole, message } = req.body;

      if (!message) {
        return sendSuccess(res, {}, 'Message is required', 400);
      }

      // Get users by role and event
      const users = await this.prisma.user.findMany({
        where: {
          role: userRole || undefined,
          phone: { not: null }
        },
        select: {
          phone: true,
          name: true
        }
      });

      const results = await Promise.allSettled(
        users.map(async (user) => {
          if (user.phone) {
            return await this.smsService.sendSMS(user.phone, message);
          }
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;

      return sendSuccess(res, {
        sent: successful,
        total: users.length
      }, `Notification SMS sent to ${successful} users`);
    } catch (error) {
      return next(error);
    }
  };

  getSMSHistory = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      // Get SMS logs from activity log
      const [smsLogs, total] = await Promise.all([
        this.prisma.activityLog.findMany({
          where: {
            action: 'SMS_SENT'
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.activityLog.count({
          where: { action: 'SMS_SENT' }
        })
      ]);

      return sendSuccess(res, {
        history: smsLogs,
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
}

const controller = new SMSController();
export const getSMSConfig = controller.getSMSConfig;
export const updateSMSConfig = controller.updateSMSConfig;
export const sendSMS = controller.sendSMS;
export const sendBulkSMS = controller.sendBulkSMS;
export const sendNotificationSMS = controller.sendNotificationSMS;
export const getSMSHistory = controller.getSMSHistory;
