import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { UserFieldVisibilityService } from '../services/UserFieldVisibilityService';
import { createRequestLogger } from '../utils/logger';

/**
 * Controller for User Field Visibility management
 * Handles configuration of user field visibility and requirements
 */
export class UserFieldVisibilityController {
  private userFieldVisibilityService: UserFieldVisibilityService;

  constructor() {
    this.userFieldVisibilityService = container.resolve(UserFieldVisibilityService);
  }

  /**
   * Get field visibility settings
   */
  getFieldVisibilitySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'userfieldvisibility');
    try {
      const settings = await this.userFieldVisibilityService.getFieldVisibilitySettings();
      res.json(settings);
    } catch (error) {
      log.error('Get field visibility settings error:', error);
      next(error);
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

      if (!field || typeof visible !== 'boolean') {
        res.status(400).json({ error: 'Field name and visible status are required' });
        return;
      }

      const result = await this.userFieldVisibilityService.updateFieldVisibility(field, visible, required, userId);
      res.json(result);
    } catch (error) {
      log.error('Update field visibility error:', error);
      next(error);
    }
  };

  /**
   * Reset field visibility to defaults
   */
  resetFieldVisibility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'userfieldvisibility');
    try {
      const result = await this.userFieldVisibilityService.resetFieldVisibility();
      res.json(result);
    } catch (error) {
      log.error('Reset field visibility error:', error);
      next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new UserFieldVisibilityController();
export const getFieldVisibilitySettings = controller.getFieldVisibilitySettings;
export const updateFieldVisibility = controller.updateFieldVisibility;
export const resetFieldVisibility = controller.resetFieldVisibility;
