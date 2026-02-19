import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { UserFieldVisibilityService } from '../services/UserFieldVisibilityService';
import { createRequestLogger } from '../utils/logger';
import { resolveRequestTenantId } from '../utils/tenantContext';

/**
 * Controller for User Field Visibility management
 * Handles configuration of user field visibility and requirements
 */
export class UserFieldVisibilityController {
  private userFieldVisibilityService: UserFieldVisibilityService;

  constructor() {
    this.userFieldVisibilityService = container.resolve(UserFieldVisibilityService);
  }

  private isSuperAdmin(req: Request): boolean {
    return String(req.user?.role || '').trim().toUpperCase() === 'SUPER_ADMIN';
  }

  private resolveTenantScope(req: Request): string | null {
    if (this.isSuperAdmin(req) && req.query['global'] === 'true') {
      return null;
    }
    return resolveRequestTenantId(req, { allowSuperAdminQueryOverride: true });
  }

  /**
   * Get field visibility settings
   */
  getFieldVisibilitySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'userfieldvisibility');
    try {
      const tenantId = this.resolveTenantScope(req);
      const settings = await this.userFieldVisibilityService.getFieldVisibilitySettings(tenantId);
      res.json(settings);
    } catch (error) {
      log.error('Get field visibility settings error:', error);
      return next(error);
    }
  };

  /**
   * Update field visibility
   */
  updateFieldVisibility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'userfieldvisibility');
    try {
      const { field } = req.params;
      const { visible, required } = req.body;
      const userId = req.user?.id;
      const tenantId = this.resolveTenantScope(req);

      if (!field || typeof visible !== 'boolean') {
        res.status(400).json({ error: 'Field name and visible status are required' });
        return;
      }

      const result = await this.userFieldVisibilityService.updateFieldVisibility(field, visible, required, userId, tenantId);
      res.json(result);
    } catch (error) {
      log.error('Update field visibility error:', error);
      return next(error);
    }
  };

  /**
   * Reset field visibility to defaults
   */
  resetFieldVisibility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'userfieldvisibility');
    try {
      const tenantId = this.resolveTenantScope(req);
      const result = await this.userFieldVisibilityService.resetFieldVisibility(tenantId);
      res.json(result);
    } catch (error) {
      log.error('Reset field visibility error:', error);
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new UserFieldVisibilityController();
export const getFieldVisibilitySettings = controller.getFieldVisibilitySettings;
export const updateFieldVisibility = controller.updateFieldVisibility;
export const resetFieldVisibility = controller.resetFieldVisibility;
