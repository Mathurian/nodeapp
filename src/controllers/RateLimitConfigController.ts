/**
 * Rate Limit Configuration Controller
 *
 * Admin endpoints for managing rate limit configurations through the UI.
 * Super Admin only.
 */

import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';
import { RATE_LIMIT_TIERS } from '../config/rate-limit.config';

const logger = createLogger('RateLimitConfigController');

export class RateLimitConfigController {
  /**
   * Get all rate limit configurations
   * Supports filtering by tenant, user, tier, and endpoint
   */
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const prisma = container.resolve<PrismaClient>('PrismaClient');
      const { tenantId, userId, tier, endpoint, enabled } = req.query;

      const where: any = {};

      if (tenantId) where.tenantId = tenantId as string;
      if (userId) where.userId = userId as string;
      if (tier) where.tier = tier as string;
      if (endpoint) where.endpoint = endpoint as string;
      if (enabled !== undefined) where.enabled = enabled === 'true';

      const configs = await prisma.rateLimitConfig.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              planType: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' }, // Higher priority first
          { createdAt: 'desc' },
        ],
      });

      res.json({
        success: true,
        data: configs,
        count: configs.length,
      });
    } catch (error) {
      logger.error('Error fetching rate limit configs', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rate limit configurations',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get a single rate limit configuration by ID
   */
  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const prisma = container.resolve<PrismaClient>('PrismaClient');
      const { id } = req.params;

      const config = await prisma.rateLimitConfig.findUnique({
        where: { id },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              planType: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'Rate limit configuration not found',
        });
        return;
      }

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error('Error fetching rate limit config', { error, id: req.params['id'] });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rate limit configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a new rate limit configuration
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const prisma = container.resolve<PrismaClient>('PrismaClient');
      const user = (req as any).user;

      const {
        name,
        tier,
        tenantId,
        userId,
        endpoint,
        requestsPerHour,
        requestsPerMinute,
        burstLimit,
        enabled,
        priority,
        description,
      } = req.body;

      // Validation
      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Name is required',
        });
        return;
      }

      if (requestsPerHour < 1 || requestsPerMinute < 1 || burstLimit < 1) {
        res.status(400).json({
          success: false,
          error: 'Rate limit values must be positive numbers',
        });
        return;
      }

      if (requestsPerMinute > requestsPerHour / 60 * 2) {
        res.status(400).json({
          success: false,
          error: 'Requests per minute should not exceed hourly rate',
        });
        return;
      }

      // Check for existing config with same tenant/user/endpoint combination
      if (tenantId || userId || endpoint) {
        const existing = await prisma.rateLimitConfig.findFirst({
          where: {
            tenantId: tenantId || null,
            userId: userId || null,
            endpoint: endpoint || null,
          },
        });

        if (existing) {
          res.status(409).json({
            success: false,
            error: 'A rate limit configuration already exists for this tenant/user/endpoint combination',
            existingId: existing.id,
          });
          return;
        }
      }

      const config = await prisma.rateLimitConfig.create({
        data: {
          name,
          tier,
          tenantId,
          userId,
          endpoint,
          requestsPerHour,
          requestsPerMinute,
          burstLimit,
          enabled: enabled !== false,
          priority: priority || 0,
          description,
          createdBy: user?.['id'],
          updatedBy: user?.['id'],
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              planType: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      logger.info('Rate limit config created', {
        configId: config.id,
        name: config.name,
        createdBy: user?.['id'],
      });

      res.status(201).json({
        success: true,
        data: config,
        message: 'Rate limit configuration created successfully',
      });
    } catch (error) {
      logger.error('Error creating rate limit config', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create rate limit configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update an existing rate limit configuration
   */
  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const prisma = container.resolve<PrismaClient>('PrismaClient');
      const user = (req as any).user;
      const { id } = req.params;

      const {
        name,
        tier,
        tenantId,
        userId,
        endpoint,
        requestsPerHour,
        requestsPerMinute,
        burstLimit,
        enabled,
        priority,
        description,
      } = req.body;

      // Check if config exists
      const existing = await prisma.rateLimitConfig.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Rate limit configuration not found',
        });
        return;
      }

      // Validation
      if (requestsPerHour !== undefined && requestsPerHour < 1) {
        res.status(400).json({
          success: false,
          error: 'Requests per hour must be a positive number',
        });
        return;
      }

      if (requestsPerMinute !== undefined && requestsPerMinute < 1) {
        res.status(400).json({
          success: false,
          error: 'Requests per minute must be a positive number',
        });
        return;
      }

      if (burstLimit !== undefined && burstLimit < 1) {
        res.status(400).json({
          success: false,
          error: 'Burst limit must be a positive number',
        });
        return;
      }

      const config = await prisma.rateLimitConfig.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(tier !== undefined && { tier }),
          ...(tenantId !== undefined && { tenantId }),
          ...(userId !== undefined && { userId }),
          ...(endpoint !== undefined && { endpoint }),
          ...(requestsPerHour !== undefined && { requestsPerHour }),
          ...(requestsPerMinute !== undefined && { requestsPerMinute }),
          ...(burstLimit !== undefined && { burstLimit }),
          ...(enabled !== undefined && { enabled }),
          ...(priority !== undefined && { priority }),
          ...(description !== undefined && { description }),
          updatedBy: user?.['id'],
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              planType: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      logger.info('Rate limit config updated', {
        configId: config.id,
        name: config.name,
        updatedBy: user?.['id'],
      });

      res.json({
        success: true,
        data: config,
        message: 'Rate limit configuration updated successfully',
      });
    } catch (error) {
      logger.error('Error updating rate limit config', { error, id: req.params['id'] });
      res.status(500).json({
        success: false,
        error: 'Failed to update rate limit configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete a rate limit configuration
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const prisma = container.resolve<PrismaClient>('PrismaClient');
      const user = (req as any).user;
      const { id } = req.params;

      // Check if config exists
      const existing = await prisma.rateLimitConfig.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Rate limit configuration not found',
        });
        return;
      }

      // Prevent deletion of default tier configs
      if (existing.tier && !existing.tenantId && !existing.userId && !existing.endpoint) {
        res.status(403).json({
          success: false,
          error: 'Cannot delete default tier configurations. Disable them instead.',
        });
        return;
      }

      await prisma.rateLimitConfig.delete({
        where: { id },
      });

      logger.info('Rate limit config deleted', {
        configId: id,
        name: existing.name,
        deletedBy: user?.['id'],
      });

      res.json({
        success: true,
        message: 'Rate limit configuration deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting rate limit config', { error, id: req.params['id'] });
      res.status(500).json({
        success: false,
        error: 'Failed to delete rate limit configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get available rate limit tiers
   */
  public static async getTiers(_req: Request, res: Response): Promise<void> {
    try {
      const tiers = Object.entries(RATE_LIMIT_TIERS).map(([key, value]) => ({
        key,
        ...value,
      }));

      res.json({
        success: true,
        data: tiers,
      });
    } catch (error) {
      logger.error('Error fetching rate limit tiers', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rate limit tiers',
      });
    }
  }

  /**
   * Get rate limit configuration for a specific tenant/user
   * Resolves the effective config based on priority
   */
  public static async getEffectiveConfig(req: Request, res: Response): Promise<void> {
    try {
      const prisma = container.resolve<PrismaClient>('PrismaClient');
      const { tenantId, userId, endpoint } = req.query;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'tenantId is required',
        });
        return;
      }

      // Find all applicable configs in priority order
      const configs = await prisma.rateLimitConfig.findMany({
        where: {
          enabled: true,
          OR: [
            // User-specific for this endpoint
            { tenantId: tenantId as string, userId: userId as string, endpoint: endpoint as string },
            // Tenant-specific for this endpoint
            { tenantId: tenantId as string, userId: null, endpoint: endpoint as string },
            // User-specific general
            { tenantId: tenantId as string, userId: userId as string, endpoint: null },
            // Tenant-specific general
            { tenantId: tenantId as string, userId: null, endpoint: null },
            // Global endpoint override
            { tenantId: null, userId: null, endpoint: endpoint as string },
            // Global tier default
            { tenantId: null, userId: null, endpoint: null },
          ],
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      // The first config is the most specific/highest priority
      const effectiveConfig = configs[0];

      if (!effectiveConfig) {
        res.status(404).json({
          success: false,
          error: 'No rate limit configuration found',
        });
        return;
      }

      res.json({
        success: true,
        data: effectiveConfig,
        appliedConfigs: configs.length,
      });
    } catch (error) {
      logger.error('Error fetching effective config', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch effective rate limit configuration',
      });
    }
  }
}

export default RateLimitConfigController;
