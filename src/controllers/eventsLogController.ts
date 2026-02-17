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
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant context required' });
      return;
    }

    const logs = await prisma.eventLog.findMany({
      where: {
        tenantId,
        ...(eventType && { eventType: eventType as string }),
        ...(entityType && { entityType: entityType as string })
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.eventLog.count({
      where: {
        tenantId,
        ...(eventType && { eventType: eventType as string }),
        ...(entityType && { entityType: entityType as string })
      }
    });

    sendSuccess(res, { logs, total, limit, offset });
  } catch (error) {
    return next(error);
  }
};

export const getEventLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant context required' });
      return;
    }
    const log = await prisma.eventLog.findFirst({
      where: {
        id: req.params['id'],
        tenantId
      }
    });
    if (!log) {
      res.status(404).json({ success: false, error: 'Event log not found' });
      return;
    }
    sendSuccess(res, log);
  } catch (error) {
    return next(error);
  }
};

export const listWebhooks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant context required' });
      return;
    }
    const webhooks = await prisma.webhookConfig.findMany({
      where: { tenantId }
    });
    sendSuccess(res, webhooks);
  } catch (error) {
    return next(error);
  }
};

export const createWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant context required' });
      return;
    }
    const webhook = await prisma.webhookConfig.create({
      data: {
        ...req.body,
        tenantId
      }
    });
    sendSuccess(res, webhook, 'Webhook created', 201);
  } catch (error) {
    return next(error);
  }
};

export const updateWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant context required' });
      return;
    }
    const webhook = await prisma.webhookConfig.updateMany({
      where: {
        id: req.params['id'],
        tenantId
      },
      data: req.body
    });
    if (webhook.count === 0) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }
    const updatedWebhook = await prisma.webhookConfig.findFirst({
      where: {
        id: req.params['id'],
        tenantId
      }
    });
    sendSuccess(res, updatedWebhook, 'Webhook updated');
  } catch (error) {
    return next(error);
  }
};

export const deleteWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant context required' });
      return;
    }
    const result = await prisma.webhookConfig.deleteMany({
      where: {
        id: req.params['id'],
        tenantId
      }
    });
    if (result.count === 0) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }
    sendSuccess(res, null, 'Webhook deleted');
  } catch (error) {
    return next(error);
  }
};
