/**
 * Feature Flags Controller
 * Admin endpoints for managing feature flags
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { FeatureFlagService, FeatureFlagStrategy } from '../services/FeatureFlagService';
import { sendSuccess, sendCreated, sendNoContent, sendError } from '../utils/responseHelpers';

export class FeatureFlagsController {
  private featureFlagService: FeatureFlagService;

  constructor() {
    this.featureFlagService = container.resolve(FeatureFlagService);
  }

  /**
   * Get all feature flags
   */
  getAllFlags = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const flags = await this.featureFlagService.getAllFlags();
      return sendSuccess(res, flags, 'Feature flags retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Create or update a feature flag
   */
  upsertFlag = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { name } = req.params;
      const {
        description,
        enabled,
        strategy,
        percentage,
        userIds,
        tenantIds,
        startDate,
        endDate,
        targetPercentage,
      } = req.body;

      if (!name) {
        return sendError(res, 'Flag name is required', 400);
      }

      // Validate strategy
      if (strategy && !Object.values(FeatureFlagStrategy).includes(strategy)) {
        return sendError(res, `Invalid strategy. Must be one of: ${Object.values(FeatureFlagStrategy).join(', ')}`, 400);
      }

      // Validate percentage
      if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
        return sendError(res, 'Percentage must be between 0 and 100', 400);
      }

      await this.featureFlagService.setFlag(
        name,
        {
          enabled,
          strategy,
          percentage,
          userIds,
          tenantIds,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          targetPercentage,
        },
        description
      );

      return sendSuccess(res, null, 'Feature flag updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete a feature flag
   */
  deleteFlag = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { name } = req.params;

      if (!name) {
        return sendError(res, 'Flag name is required', 400);
      }

      await this.featureFlagService.deleteFlag(name);
      return sendNoContent(res);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Evaluate a feature flag for current user
   */
  evaluateFlag = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { name } = req.params;

      if (!name) {
        return sendError(res, 'Flag name is required', 400);
      }

      const context = {
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
        email: req.user?.email,
        role: req.user?.role,
      };

      const enabled = await this.featureFlagService.isEnabled(name, context);

      return sendSuccess(res, { name, enabled, context }, 'Feature flag evaluated');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Evaluate all feature flags for current user
   */
  evaluateAllFlags = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const context = {
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
        email: req.user?.email,
        role: req.user?.role,
      };

      const evaluations = await this.featureFlagService.evaluateAllFlags(context);

      return sendSuccess(res, { evaluations, context }, 'All feature flags evaluated');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Invalidate cache for a feature flag
   */
  invalidateCache = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { name } = req.params;

      if (!name) {
        return sendError(res, 'Flag name is required', 400);
      }

      await this.featureFlagService.invalidateCache(name);

      return sendSuccess(res, null, 'Cache invalidated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Invalidate all feature flag caches
   */
  invalidateAllCaches = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      await this.featureFlagService.invalidateAllCaches();
      return sendSuccess(res, null, 'All caches invalidated successfully');
    } catch (error) {
      return next(error);
    }
  };
}

// Export controller instance and methods
const controller = new FeatureFlagsController();
export const getAllFlags = controller.getAllFlags;
export const upsertFlag = controller.upsertFlag;
export const deleteFlag = controller.deleteFlag;
export const evaluateFlag = controller.evaluateFlag;
export const evaluateAllFlags = controller.evaluateAllFlags;
export const invalidateCache = controller.invalidateCache;
export const invalidateAllCaches = controller.invalidateAllCaches;
