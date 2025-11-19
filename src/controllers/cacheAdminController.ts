/**
 * Cache Admin Controller
 * Admin endpoints for cache management and monitoring
 */

import { Request, Response } from 'express';
import { getCacheService } from '../services/RedisCacheService';
import { CacheNamespace } from '../config/redis.config';

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
      console.error('Error getting cache statistics:', error);
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
      console.error('Error checking cache health:', error);
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
      console.error('Error clearing cache namespace:', error);
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
      console.error('Error clearing cache:', error);
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
      console.error('Error deleting cache key:', error);
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
      console.error('Error invalidating cache tag:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to invalidate cache tag',
      });
    }
  }

  /**
   * Warm cache for common queries
   */
  public static async warmCache(_req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement cache warming logic
      // This would pre-load frequently accessed data into cache

      res.json({
        success: true,
        message: 'Cache warming started',
      });
    } catch (error) {
      console.error('Error warming cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to warm cache',
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
      console.error('Error resetting cache statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset statistics',
      });
    }
  }
}

export default CacheAdminController;
