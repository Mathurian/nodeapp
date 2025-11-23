import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { SettingsService } from '../services/SettingsService';
import { successResponse } from '../utils/responseHelpers';

// Type for tenant-aware request - uses intersection instead of extends
type TenantRequest = Request & {
  user?: {
    id: string;
    role: string;
    tenantId?: string;
  } & Record<string, unknown>;
  tenantId?: string;
};

/**
 * Settings Controller
 * Handles system settings management with tenant-aware context
 *
 * Architecture:
 * - Global settings have tenantId = NULL (platform defaults)
 * - Tenant-specific settings have tenantId = <tenant_id>
 * - When fetching: First try tenant-specific, then fall back to global
 * - SUPER_ADMIN can edit global/platform settings (tenantId = null)
 * - ADMIN can edit their tenant's settings (creates override if doesn't exist)
 */
export class SettingsController {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = container.resolve(SettingsService);
  }

  /**
   * Helper: Get tenant ID from request context
   * - If ?global=true (SUPER_ADMIN only), returns null for platform-wide settings
   * - If ?tenantId=xxx (SUPER_ADMIN only), returns that tenant ID
   * - Otherwise, returns the user's own tenant ID
   */
  private isSuperAdmin(req: TenantRequest): boolean {
    return req.user?.role === 'SUPER_ADMIN';
  }

  private getTenantIdForWrite(req: TenantRequest, forGlobal?: boolean): string | null {
    // If explicitly editing global settings (SUPER_ADMIN only)
    if (forGlobal && this.isSuperAdmin(req)) {
      return null;
    }
    // If SUPER_ADMIN specifies a tenant ID in query params, use that
    const queryTenantId = req.query['tenantId'];
    if (this.isSuperAdmin(req) && queryTenantId && typeof queryTenantId === 'string') {
      return queryTenantId;
    }
    // Use user's tenantId or request tenantId
    return req.user?.tenantId || req.tenantId || null;
  }

  private getTenantIdForRead(req: TenantRequest): string | null {
    // If SUPER_ADMIN specifies ?global=true, return null for global settings
    if (this.isSuperAdmin(req) && req.query['global'] === 'true') {
      return null;
    }
    // If SUPER_ADMIN specifies a tenant ID in query params, use that
    const queryTenantId = req.query['tenantId'];
    if (this.isSuperAdmin(req) && queryTenantId && typeof queryTenantId === 'string') {
      return queryTenantId;
    }
    // For read operations, use the tenant context from user or request
    return req.user?.tenantId || req.tenantId || null;
  }

  /**
   * Get all settings (tenant-aware with fallback to global)
   */
  getAllSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const settings = await this.settingsService.getAllSettings(tenantId);
      res.json(settings);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get settings (alias for getAllSettings, tenant-aware)
   */
  getSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const settings = await this.settingsService.getAllSettings(tenantId);
      successResponse(res, settings, 'Settings retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get global/platform settings only (SUPER_ADMIN only)
   */
  getGlobalSettings = async (
    _req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const settings = await this.settingsService.getGlobalSettings();
      successResponse(res, settings, 'Global settings retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get app name and subtitle (tenant-aware with branding fallback)
   */
  getAppName = async (
    req: TenantRequest,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const appNameSettings = await this.settingsService.getAppName(tenantId);
      res.json({ data: appNameSettings });
    } catch (error) {
      // Return defaults on error
      res.json({ data: { appName: 'Event Manager', appSubtitle: '' } });
    }
  };

  /**
   * Get public settings (tenant-aware with branding fallback)
   * Uses tenant context from request headers/subdomain if available
   */
  getPublicSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const publicSettings = await this.settingsService.getPublicSettings(tenantId);
      res.json(publicSettings);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update settings (tenant-aware)
   * - SUPER_ADMIN with ?global=true updates global settings
   * - ADMIN updates their tenant's settings (creates override)
   */
  updateSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const settings = req.body;
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);

      const updatedCount = await this.settingsService.updateSettings(
        settings,
        userId,
        tenantId
      );

      successResponse(
        res,
        { updatedCount, scope: tenantId ? 'tenant' : 'global' },
        'Settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Test settings (tenant-aware - tests tenant's SMTP if configured)
   */
  testSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { type } = req.params;
      const { testEmail } = req.body;
      const tenantId = this.getTenantIdForRead(req);

      if (type === 'email') {
        const success = await this.settingsService.testEmailSettings(testEmail, tenantId);
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
   * Get logging levels (tenant-aware)
   */
  getLoggingLevels = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const loggingLevels = await this.settingsService.getLoggingLevels(tenantId);
      res.json(loggingLevels);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update logging level (tenant-aware)
   */
  updateLoggingLevel = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { level } = req.body;
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);

      const setting = await this.settingsService.updateLoggingLevel(
        level,
        userId,
        tenantId
      );

      successResponse(res, setting, 'Logging level updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get security settings (tenant-aware - inherited initially from global)
   */
  getSecuritySettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const securitySettings =
        await this.settingsService.getSecuritySettings(tenantId);
      successResponse(res, securitySettings, 'Security settings retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update security settings (tenant-aware)
   */
  updateSecuritySettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const securitySettings = req.body;
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);

      const updatedCount =
        await this.settingsService.updateSecuritySettings(
          securitySettings,
          userId,
          tenantId
        );

      successResponse(
        res,
        { updatedCount, scope: tenantId ? 'tenant' : 'global' },
        'Security settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get backup settings (tenant-aware)
   */
  getBackupSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const backupSettings = await this.settingsService.getBackupSettings(tenantId);
      res.json(backupSettings);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update backup settings (tenant-aware)
   */
  updateBackupSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const backupSettings = req.body;
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);

      const updatedCount = await this.settingsService.updateBackupSettings(
        backupSettings,
        userId,
        tenantId
      );

      successResponse(
        res,
        { updatedCount, scope: tenantId ? 'tenant' : 'global' },
        'Backup settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get email settings (tenant-aware - tenants can override with their own SMTP)
   */
  getEmailSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const emailSettings = await this.settingsService.getEmailSettings(tenantId);

      // Wrap response in standard format with data wrapper
      res.json({
        success: true,
        data: emailSettings,
        message: 'Email settings retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update email settings (tenant-aware)
   */
  updateEmailSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const emailSettings = req.body;
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);

      const updatedCount = await this.settingsService.updateEmailSettings(
        emailSettings,
        userId,
        tenantId
      );

      successResponse(
        res,
        { updatedCount, scope: tenantId ? 'tenant' : 'global' },
        'Email settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get password policy (tenant-aware)
   */
  getPasswordPolicy = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const passwordPolicy = await this.settingsService.getPasswordPolicy(tenantId);
      successResponse(res, passwordPolicy, 'Password policy retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update password policy (tenant-aware)
   */
  updatePasswordPolicy = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const passwordPolicy = req.body;
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);

      const updatedCount = await this.settingsService.updatePasswordPolicy(
        passwordPolicy,
        userId,
        tenantId
      );

      successResponse(
        res,
        { updatedCount, scope: tenantId ? 'tenant' : 'global' },
        'Password policy updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get JWT configuration (tenant-aware)
   */
  getJWTConfig = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const jwtConfig = await this.settingsService.getJWTConfig(tenantId);
      res.json(jwtConfig);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update JWT configuration (tenant-aware)
   */
  updateJWTConfig = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const jwtConfig = req.body;
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);

      const updatedCount = await this.settingsService.updateJWTConfig(
        jwtConfig,
        userId,
        tenantId
      );

      successResponse(
        res,
        { updatedCount, scope: tenantId ? 'tenant' : 'global' },
        'JWT configuration updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get theme settings (tenant-aware with branding fallback)
   */
  getThemeSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      let tenantId = this.getTenantIdForRead(req);

      // Allow unauthenticated users to specify tenantSlug for login page branding
      // Check tenantSlug first as it's more specific than default_tenant fallback
      const tenantSlug = req.query['tenantSlug'];
      if (tenantSlug && typeof tenantSlug === 'string') {
        const tenant = await this.settingsService.getTenantBySlug(tenantSlug);
        if (tenant) {
          tenantId = tenant.id;
        }
      }

      const themeSettings = await this.settingsService.getThemeSettings(tenantId);
      successResponse(res, themeSettings, 'Theme settings retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update theme settings (tenant-aware)
   */
  updateThemeSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const themeSettings = req.body;
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);

      const updatedCount = await this.settingsService.updateThemeSettings(
        themeSettings,
        userId,
        tenantId
      );

      successResponse(
        res,
        { updatedCount, scope: tenantId ? 'tenant' : 'global' },
        'Theme settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Upload theme logo (tenant-aware)
   */
  uploadThemeLogo = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const file = req.file;
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const logoPath = `/uploads/${file.filename}`;
      await this.settingsService.updateSetting(
        'theme_logoPath',
        logoPath,
        userId,
        tenantId
      );

      successResponse(res, { logoPath, scope: tenantId ? 'tenant' : 'global' }, 'Logo uploaded successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Upload theme favicon (tenant-aware)
   */
  uploadThemeFavicon = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const file = req.file;
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const faviconPath = `/uploads/${file.filename}`;
      await this.settingsService.updateSetting(
        'theme_faviconPath',
        faviconPath,
        userId,
        tenantId
      );

      successResponse(res, { faviconPath, scope: tenantId ? 'tenant' : 'global' }, 'Favicon uploaded successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get database connection info (global only - not tenant-specific)
   */
  getDatabaseConnectionInfo = async (
    _req: TenantRequest,
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
   * Get general settings (tenant-aware)
   */
  getGeneralSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const generalSettings = await this.settingsService.getGeneralSettings(tenantId);
      successResponse(res, generalSettings, 'General settings retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get contestant visibility settings (tenant-aware)
   */
  getContestantVisibilitySettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const visibilitySettings =
        await this.settingsService.getContestantVisibilitySettings(tenantId);

      successResponse(res, visibilitySettings, 'Contestant visibility settings retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update contestant visibility settings (tenant-aware)
   */
  updateContestantVisibilitySettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const visibilitySettings = req.body;
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);

      const updatedCount =
        await this.settingsService.updateContestantVisibilitySettings(
          visibilitySettings,
          userId,
          tenantId
        );

      successResponse(
        res,
        { updatedCount, scope: tenantId ? 'tenant' : 'global' },
        'Contestant visibility settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Reset tenant setting to global default (delete tenant-specific override)
   */
  resetSettingToGlobal = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { key } = req.params;
      const tenantId = req.user?.tenantId || req.tenantId;

      if (!tenantId || !key) {
        res.status(400).json({ error: 'Tenant context and key are required' });
        return;
      }

      const deleted = await this.settingsService.deleteTenantSetting(key, tenantId);

      successResponse(
        res,
        { deleted, key },
        deleted ? 'Setting reset to global default' : 'No tenant override found'
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
export const getGeneralSettings = controller.getGeneralSettings;
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
export const getGlobalSettings = controller.getGlobalSettings;
export const resetSettingToGlobal = controller.resetSettingToGlobal;
