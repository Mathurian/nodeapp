import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { CacheService } from '../services/CacheService';
import { createRequestLogger } from '../utils/logger';

/**
 * Controller for Cache management
 * Handles cache operations via CacheService
 */
export class CacheController {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = container.resolve(CacheService);
  }

  /**
   * Get cache statistics
   */
  getCacheStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'cache');
    try {
      const stats = await this.cacheService.getStats();
      res.json(stats);
    } catch (error) {
      log.error('Get cache stats error:', error);
      return next(error);
    }
  };

  /**
   * Flush all cache
   */
  flushCache = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'cache');
    try {
      await this.cacheService.flushAll();
      res.json({
        success: true,
        message: 'Cache flushed successfully',
      });
    } catch (error) {
      log.error('Flush cache error:', error);
      return next(error);
    }
  };

  /**
   * Delete specific cache key
   */
  deleteCacheKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'cache');
    try {
      const { key } = req.params;

      if (!key) {
        res.status(400).json({ error: 'Cache key is required' });
        return;
      }

      await this.cacheService.del(key);
      res.json({
        success: true,
        message: `Cache key "${key}" deleted successfully`,
      });
    } catch (error) {
      log.error('Delete cache key error:', error);
      return next(error);
    }
  };

  /**
   * Delete cache keys by pattern
   */
  deleteCachePattern = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'cache');
    try {
      const { pattern } = req.body;

      if (!pattern) {
        res.status(400).json({ error: 'Pattern is required' });
        return;
      }

      await this.cacheService.invalidatePattern(pattern);
      res.json({
        success: true,
        message: `Cache keys matching "${pattern}" deleted successfully`,
      });
    } catch (error) {
      log.error('Delete cache pattern error:', error);
      return next(error);
    }
  };

  /**
   * Check cache status
   */
  getCacheStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'cache');
    try {
      const stats = await this.cacheService.getStats();
      res.json({
        enabled: stats.enabled,
        status: stats.enabled ? 'connected' : 'disconnected',
      });
    } catch (error) {
      log.error('Get cache status error:', error);
      return next(error);
    }
  };

  /**
   * Get all cache keys
   */
  getCacheKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'cache');
    try {
      const keys = await this.cacheService.getAllKeys();
      res.json({
        success: true,
        data: keys,
      });
    } catch (error) {
      log.error('Get cache keys error:', error);
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new CacheController();
export const getCacheStats = controller.getCacheStats;
export const flushCache = controller.flushCache;
export const deleteCacheKey = controller.deleteCacheKey;
export const deleteCachePattern = controller.deleteCachePattern;
export const getCacheStatus = controller.getCacheStatus;
export const getCacheKeys = controller.getCacheKeys;
