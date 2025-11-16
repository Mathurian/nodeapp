/**
 * Events Log Controller
 * Handles viewing of event logs and webhook management
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess } from '../utils/responseHelpers';

export const listEventLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { eventType, entityType, limit = 100, offset = 0 } = req.query;

    const logs = await prisma.eventLog.findMany({
      where: {
        tenantId: req.tenantId,
        ...(eventType && { eventType: eventType as string }),
        ...(entityType && { entityType: entityType as string })
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.eventLog.count({
      where: {
        tenantId: req.tenantId,
        ...(eventType && { eventType: eventType as string }),
        ...(entityType && { entityType: entityType as string })
      }
    });

    sendSuccess(res, { logs, total, limit, offset });
  } catch (error) {
    next(error);
  }
};

export const getEventLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const log = await prisma.eventLog.findUnique({
      where: { id: req.params.id }
    });
    sendSuccess(res, log);
  } catch (error) {
    next(error);
  }
};

export const listWebhooks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const webhooks = await prisma.webhookConfig.findMany({
      where: { tenantId: req.tenantId! }
    });
    sendSuccess(res, webhooks);
  } catch (error) {
    next(error);
  }
};

export const createWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const webhook = await prisma.webhookConfig.create({
      data: {
        ...req.body,
        tenantId: req.tenantId!
      }
    });
    sendSuccess(res, webhook, 'Webhook created', 201);
  } catch (error) {
    next(error);
  }
};

export const updateWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const webhook = await prisma.webhookConfig.update({
      where: { id: req.params.id },
      data: req.body
    });
    sendSuccess(res, webhook, 'Webhook updated');
  } catch (error) {
    next(error);
  }
};

export const deleteWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.webhookConfig.delete({
      where: { id: req.params.id }
    });
    sendSuccess(res, null, 'Webhook deleted');
  } catch (error) {
    next(error);
  }
};
