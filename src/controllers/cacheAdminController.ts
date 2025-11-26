/**
 * Cache Admin Controller
 * Admin endpoints for cache management and monitoring
 */

import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { getCacheService } from '../services/RedisCacheService';
import { CacheNamespace } from '../config/redis.config';
import { createLogger } from '../utils/logger';

const logger = createLogger('CacheAdminController');

export class CacheAdminController {
  /**
   * Get cache statistics
   */
  public static async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const cacheService = getCacheService();
      const stats = await cacheService.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting cache statistics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get cache statistics',
      });
    }
  }

  /**
   * Health check
   */
  public static async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const cacheService = getCacheService();
      const isHealthy = await cacheService.healthCheck();

      res.json({
        success: true,
        data: {
          healthy: isHealthy,
          status: isHealthy ? 'connected' : 'disconnected',
        },
      });
    } catch (error) {
      logger.error('Error checking cache health', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to check cache health',
      });
    }
  }

  /**
   * Clear specific namespace
   */
  public static async clearNamespace(req: Request, res: Response): Promise<void> {
    try {
      const { namespace } = req.params;

      // Validate namespace
      const validNamespaces = Object.values(CacheNamespace);
      if (!validNamespaces.includes(namespace as any)) {
        res.status(400).json({
          success: false,
          error: 'Invalid namespace',
          validNamespaces,
        });
        return;
      }

      const cacheService = getCacheService();
      const deletedCount = await cacheService.deletePattern('*', namespace);

      res.json({
        success: true,
        data: {
          namespace,
          deletedCount,
        },
      });
    } catch (error) {
      logger.error('Error clearing cache namespace', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache namespace',
      });
    }
  }

  /**
   * Clear entire cache (dangerous!)
   */
  public static async clearAll(_req: Request, res: Response): Promise<void> {
    try {
      const cacheService = getCacheService();
      const success = await cacheService.clear();

      if (success) {
        res.json({
          success: true,
          message: 'Cache cleared successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to clear cache',
        });
      }
    } catch (error) {
      logger.error('Error clearing cache', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
      });
    }
  }

  /**
   * Delete specific cache key
   */
  public static async deleteKey(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const { namespace } = req.query;

      const cacheService = getCacheService();
      const success = await cacheService.delete(key!, namespace as string);

      res.json({
        success,
        data: {
          key,
          namespace: namespace || 'default',
          deleted: success,
        },
      });
    } catch (error) {
      logger.error('Error deleting cache key', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete cache key',
      });
    }
  }

  /**
   * Invalidate cache by tag
   */
  public static async invalidateTag(req: Request, res: Response): Promise<void> {
    try {
      const { tag } = req.params;

      const cacheService = getCacheService();
      const deletedCount = await cacheService.invalidateTag(tag!);

      res.json({
        success: true,
        data: {
          tag,
          deletedCount,
        },
      });
    } catch (error) {
      logger.error('Error invalidating cache tag', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to invalidate cache tag',
      });
    }
  }

  /**
   * Warm cache for common queries
   * Pre-loads frequently accessed data into cache to improve cold-start performance
   */
  public static async warmCache(_req: Request, res: Response): Promise<void> {
    try {
      const cacheService = getCacheService();
      const prisma = container.resolve<PrismaClient>('PrismaClient');
      let warmedCount = 0;

      logger.info('Starting cache warming process');

      // 1. Warm system settings
      try {
        const settings = await prisma.systemSetting.findMany();
        for (const setting of settings) {
          await cacheService.set(
            `system:setting:${setting.key}`,
            JSON.stringify(setting),
            CacheNamespace.SYSTEM,
            3600 // 1 hour TTL
          );
          warmedCount++;
        }
        logger.info('System settings cached', { count: settings.length });
      } catch (error) {
        logger.warn('Failed to warm system settings', { error });
      }

      // 2. Warm active tenants
      try {
        const tenants = await prisma.tenant.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            subdomain: true,
            isActive: true,
            plan: true,
            maxUsers: true,
            maxEvents: true,
          },
        });

        for (const tenant of tenants) {
          await cacheService.set(
            `tenant:${tenant.id}`,
            JSON.stringify(tenant),
            CacheNamespace.TENANT,
            1800 // 30 minutes TTL
          );
          warmedCount++;
        }
        logger.info('Active tenants cached', { count: tenants.length });
      } catch (error) {
        logger.warn('Failed to warm tenant cache', { error });
      }

      // 3. Warm active events (upcoming and in-progress)
      try {
        const now = new Date();
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

        const events = await prisma.event.findMany({
          where: {
            OR: [
              { status: 'IN_PROGRESS' },
              {
                AND: [
                  { status: 'SCHEDULED' },
                  { startDate: { lte: oneWeekFromNow } },
                  { endDate: { gte: now } },
                ],
              },
            ],
          },
          select: {
            id: true,
            name: true,
            tenantId: true,
            status: true,
            startDate: true,
            endDate: true,
          },
          take: 100, // Limit to avoid overloading cache
        });

        for (const event of events) {
          await cacheService.set(
            `event:${event.id}`,
            JSON.stringify(event),
            CacheNamespace.SESSION,
            900 // 15 minutes TTL
          );
          warmedCount++;
        }
        logger.info('Active events cached', { count: events.length });
      } catch (error) {
        logger.warn('Failed to warm event cache', { error });
      }

      // 4. Warm role permissions
      try {
        const roles = await prisma.role.findMany({
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        });

        for (const role of roles) {
          await cacheService.set(
            `role:${role.id}:permissions`,
            JSON.stringify(role.rolePermissions.map(rp => rp.permission)),
            CacheNamespace.SYSTEM,
            3600 // 1 hour TTL
          );
          warmedCount++;
        }
        logger.info('Role permissions cached', { count: roles.length });
      } catch (error) {
        logger.warn('Failed to warm role permissions', { error });
      }

      logger.info('Cache warming completed', { warmedCount });

      res.json({
        success: true,
        message: 'Cache warming completed',
        warmedCount,
        details: {
          note: 'Pre-loaded system settings, active tenants, upcoming events, and role permissions',
        },
      });
    } catch (error) {
      logger.error('Error warming cache', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to warm cache',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Reset cache statistics
   */
  public static async resetStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const cacheService = getCacheService();
      cacheService.resetStatistics();

      res.json({
        success: true,
        message: 'Cache statistics reset',
      });
    } catch (error) {
      logger.error('Error resetting cache statistics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to reset statistics',
      });
    }
  }
}

export default CacheAdminController;
