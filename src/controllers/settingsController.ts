import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { SettingsService } from '../services/SettingsService';
import { successResponse } from '../utils/responseHelpers';

/**
 * Settings Controller
 * Handles system settings management
 */
export class SettingsController {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = container.resolve(SettingsService);
  }

  /**
   * Get all settings
   */
  getAllSettings = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const settings = await this.settingsService.getAllSettings();
      res.json(settings);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get settings (alias for getAllSettings)
   */
  getSettings = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const settings = await this.settingsService.getAllSettings();
      res.json(settings);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get app name and subtitle
   */
  getAppName = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const appNameSettings = await this.settingsService.getAppName();
      res.json({ data: appNameSettings });
    } catch (error) {
      // Return defaults on error
      res.json({ data: { appName: 'Event Manager', appSubtitle: '' } });
    }
  };

  /**
   * Get public settings (no authentication required)
   */
  getPublicSettings = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const publicSettings = await this.settingsService.getPublicSettings();
      res.json(publicSettings);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update settings
   */
  updateSettings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const settings = req.body;
      const userId = req.user?.id || '';

      const updatedCount = await this.settingsService.updateSettings(
        settings,
        userId
      );

      successResponse(
        res,
        { updatedCount },
        'Settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Test settings
   */
  testSettings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { type } = req.params;
      const { testEmail } = req.body;

      if (type === 'email') {
        const success = await this.settingsService.testEmailSettings(testEmail);
        successResponse(
          res,
          { success },
          'Email test successful'
        );
      } else {
        res.status(400).json({ error: 'Invalid test type' });
      }
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get logging levels
   */
  getLoggingLevels = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const loggingLevels = await this.settingsService.getLoggingLevels();
      res.json(loggingLevels);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update logging level
   */
  updateLoggingLevel = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { level } = req.body;
      const userId = req.user?.id || '';

      const setting = await this.settingsService.updateLoggingLevel(
        level,
        userId
      );

      successResponse(res, setting, 'Logging level updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get security settings
   */
  getSecuritySettings = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const securitySettings =
        await this.settingsService.getSecuritySettings();
      res.json(securitySettings);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update security settings
   */
  updateSecuritySettings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const securitySettings = req.body;
      const userId = req.user?.id || '';

      const updatedCount =
        await this.settingsService.updateSecuritySettings(
          securitySettings,
          userId
        );

      successResponse(
        res,
        { updatedCount },
        'Security settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get backup settings
   */
  getBackupSettings = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const backupSettings = await this.settingsService.getBackupSettings();
      res.json(backupSettings);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update backup settings
   */
  updateBackupSettings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const backupSettings = req.body;
      const userId = req.user?.id || '';

      const updatedCount = await this.settingsService.updateBackupSettings(
        backupSettings,
        userId
      );

      successResponse(
        res,
        { updatedCount },
        'Backup settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get email settings
   */
  getEmailSettings = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const emailSettings = await this.settingsService.getEmailSettings();
      res.json(emailSettings);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update email settings
   */
  updateEmailSettings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const emailSettings = req.body;
      const userId = req.user?.id || '';

      const updatedCount = await this.settingsService.updateEmailSettings(
        emailSettings,
        userId
      );

      successResponse(
        res,
        { updatedCount },
        'Email settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get password policy
   */
  getPasswordPolicy = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const passwordPolicy = await this.settingsService.getPasswordPolicy();
      res.json(passwordPolicy);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update password policy
   */
  updatePasswordPolicy = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const passwordPolicy = req.body;
      const userId = req.user?.id || '';

      const updatedCount = await this.settingsService.updatePasswordPolicy(
        passwordPolicy,
        userId
      );

      successResponse(
        res,
        { updatedCount },
        'Password policy updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get JWT configuration
   */
  getJWTConfig = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const jwtConfig = await this.settingsService.getJWTConfig();
      res.json(jwtConfig);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update JWT configuration
   */
  updateJWTConfig = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const jwtConfig = req.body;
      const userId = req.user?.id || '';

      const updatedCount = await this.settingsService.updateJWTConfig(
        jwtConfig,
        userId
      );

      successResponse(
        res,
        { updatedCount },
        'JWT configuration updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get theme settings
   */
  getThemeSettings = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const themeSettings = await this.settingsService.getThemeSettings();
      res.json(themeSettings);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update theme settings
   */
  updateThemeSettings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const themeSettings = req.body;
      const userId = req.user?.id || '';

      const updatedCount = await this.settingsService.updateThemeSettings(
        themeSettings,
        userId
      );

      successResponse(
        res,
        { updatedCount },
        'Theme settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Upload theme logo
   */
  uploadThemeLogo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const file = req.file;
      const userId = req.user?.id || '';

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const logoPath = `/uploads/${file.filename}`;
      await this.settingsService.updateSetting(
        'theme_logoPath',
        logoPath,
        userId
      );

      successResponse(res, { logoPath }, 'Logo uploaded successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Upload theme favicon
   */
  uploadThemeFavicon = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const file = req.file;
      const userId = req.user?.id || '';

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const faviconPath = `/uploads/${file.filename}`;
      await this.settingsService.updateSetting(
        'theme_faviconPath',
        faviconPath,
        userId
      );

      successResponse(res, { faviconPath }, 'Favicon uploaded successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get database connection info
   */
  getDatabaseConnectionInfo = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const info = await this.settingsService.getDatabaseConnectionInfo();
      res.json(info);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get contestant visibility settings
   */
  getContestantVisibilitySettings = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const visibilitySettings =
        await this.settingsService.getContestantVisibilitySettings();
      
      // Transform from { "contestant_visibility_canViewWinners": "true" } 
      // to { canViewWinners: true, canViewOverallResults: true }
      const transformed = {
        canViewWinners: visibilitySettings['contestant_visibility_canViewWinners'] === 'true' || 
                       visibilitySettings['canViewWinners'] === 'true',
        canViewOverallResults: visibilitySettings['contestant_visibility_canViewOverallResults'] === 'true' ||
                              visibilitySettings['canViewOverallResults'] === 'true'
      };
      
      successResponse(res, transformed, 'Contestant visibility settings retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update contestant visibility settings
   */
  updateContestantVisibilitySettings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const visibilitySettings = req.body;
      const userId = req.user?.id || '';

      const updatedCount =
        await this.settingsService.updateContestantVisibilitySettings(
          visibilitySettings,
          userId
        );

      successResponse(
        res,
        { updatedCount },
        'Contestant visibility settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new SettingsController();

export const getAllSettings = controller.getAllSettings;
export const getSettings = controller.getSettings;
export const getAppName = controller.getAppName;
export const getPublicSettings = controller.getPublicSettings;
export const updateSettings = controller.updateSettings;
export const testSettings = controller.testSettings;
export const getLoggingLevels = controller.getLoggingLevels;
export const updateLoggingLevel = controller.updateLoggingLevel;
export const getSecuritySettings = controller.getSecuritySettings;
export const updateSecuritySettings = controller.updateSecuritySettings;
export const getBackupSettings = controller.getBackupSettings;
export const updateBackupSettings = controller.updateBackupSettings;
export const getEmailSettings = controller.getEmailSettings;
export const updateEmailSettings = controller.updateEmailSettings;
export const getPasswordPolicy = controller.getPasswordPolicy;
export const updatePasswordPolicy = controller.updatePasswordPolicy;
export const getJWTConfig = controller.getJWTConfig;
export const updateJWTConfig = controller.updateJWTConfig;
export const getThemeSettings = controller.getThemeSettings;
export const updateThemeSettings = controller.updateThemeSettings;
export const uploadThemeLogo = controller.uploadThemeLogo;
export const uploadThemeFavicon = controller.uploadThemeFavicon;
export const getDatabaseConnectionInfo = controller.getDatabaseConnectionInfo;
export const getContestantVisibilitySettings =
  controller.getContestantVisibilitySettings;
export const updateContestantVisibilitySettings =
  controller.updateContestantVisibilitySettings;
