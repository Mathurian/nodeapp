/**
 * Rate Limit Controller
 * Handles rate limit configuration management
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { RateLimitService } from '../services/RateLimitService';
import { sendSuccess, sendBadRequest } from '../utils/responseHelpers';

export class RateLimitController {
  private rateLimitService: RateLimitService;

  constructor() {
    this.rateLimitService = container.resolve(RateLimitService);
  }

  /**
   * Get all rate limit configurations
   */
  getAllConfigs = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const configs = await this.rateLimitService.getAllConfigs();
      return sendSuccess(res, configs, 'Rate limit configurations retrieved');
    } catch (error: any) {
      return next(error);
    }
  };

  /**
   * Get rate limit configuration for a specific tier
   */
  getConfig = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { tier } = req.params;
      if (!tier) {
        return sendBadRequest(res, 'Tier parameter is required');
      }

      const config = await this.rateLimitService.getConfig(tier);
      return sendSuccess(res, config, `Rate limit configuration for tier: ${tier}`);
    } catch (error: any) {
      return next(error);
    }
  };

  /**
   * Update rate limit configuration
   */
  updateConfig = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { tier } = req.params;
      const { points, duration, blockDuration } = req.body;

      if (!tier) {
        return sendBadRequest(res, 'Tier parameter is required');
      }

      const updates: any = {};
      if (points !== undefined) updates.points = parseInt(points);
      if (duration !== undefined) updates.duration = parseInt(duration);
      if (blockDuration !== undefined) updates.blockDuration = parseInt(blockDuration);

      if (Object.keys(updates).length === 0) {
        return sendBadRequest(res, 'At least one field (points, duration, blockDuration) must be provided');
      }

      const updated = await this.rateLimitService.updateConfig(tier, updates);
      return sendSuccess(res, updated, `Rate limit configuration updated for tier: ${tier}`);
    } catch (error: any) {
      return next(error);
    }
  };

  /**
   * Get current user's rate limit status
   */
  getMyRateLimitStatus = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const tier = this.rateLimitService.getTierFromRequest(req);
      const config = await this.rateLimitService.getConfig(tier);
      
      return sendSuccess(res, {
        tier,
        limit: config.points,
        window: config.duration,
        blockDuration: config.blockDuration,
      }, 'Rate limit status retrieved');
    } catch (error: any) {
      return next(error);
    }
  };
}

const controller = new RateLimitController();

export const getAllConfigs = controller.getAllConfigs;
export const getConfig = controller.getConfig;
export const updateConfig = controller.updateConfig;
export const getMyRateLimitStatus = controller.getMyRateLimitStatus;

export default controller;

