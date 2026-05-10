import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { SettingsService } from '../services/SettingsService';
import { createTenantPrismaClient } from '../middleware/tenantMiddleware';
import { successResponse } from '../utils/responseHelpers';
import { logger } from '../utils/logger';
import {
  parsePublicLandingContentSetting,
  PublicLandingContent,
  PUBLIC_LANDING_CONTENT_SETTING_KEY,
} from '../utils/publicLandingContent';

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
    // Default to the request tenant context so slug/subdomain-scoped admin pages
    // act on the viewed tenant instead of the operator's home tenant.
    return req.tenantId || req.user?.tenantId || null;
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
    // Default to the request tenant context so slug/subdomain-scoped admin pages
    // reflect the viewed tenant instead of the operator's home tenant.
    return req.tenantId || req.user?.tenantId || null;
  }

  private inferManifestIconType(iconPath: string): string {
    const lowered = iconPath.toLowerCase();
    if (lowered.endsWith('.svg')) return 'image/svg+xml';
    if (lowered.endsWith('.png')) return 'image/png';
    if (lowered.endsWith('.jpg') || lowered.endsWith('.jpeg')) return 'image/jpeg';
    if (lowered.endsWith('.webp')) return 'image/webp';
    if (lowered.endsWith('.gif')) return 'image/gif';
    if (lowered.endsWith('.ico')) return 'image/x-icon';
    return 'image/png';
  }

  private buildManifestBasePath(tenantSlug: string | null): string {
    if (!tenantSlug) return '/';
    return `/${tenantSlug.replace(/^\/+|\/+$/g, '')}/`;
  }

  private applyNoStoreTenantVaryHeaders(res: Response): void {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.vary('Host');
    res.vary('X-Tenant-Slug');
  }

  private createGlobalReadPrisma(contextTenantId?: string | null) {
    const safeTenantId = String(contextTenantId || '').trim();
    if (!safeTenantId) {
      throw new Error('Tenant context is required for global settings reads');
    }
    return createTenantPrismaClient(safeTenantId, true);
  }

  private async getTenantBySlugUnscoped(
    slug: string,
    contextTenantId?: string | null
  ): Promise<{ id: string; name: string; slug: string } | null> {
    const prisma = this.createGlobalReadPrisma(contextTenantId);
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, isActive: true }
    });
    return tenant?.isActive ? { id: tenant.id, name: tenant.name, slug: tenant.slug } : null;
  }

  private async getSettingWithFallbackUnscoped(key: string, tenantId: string): Promise<string | null> {
    const prisma = this.createGlobalReadPrisma(tenantId);
    const tenantSetting = await prisma.systemSetting.findFirst({
      where: { key, tenantId },
      select: { value: true }
    });
    if (tenantSetting?.value) return tenantSetting.value;

    const globalSetting = await prisma.systemSetting.findFirst({
      where: { key, tenantId: null },
      select: { value: true }
    });

    return globalSetting?.value || null;
  }

  private async getPublicSettingsUnscoped(tenantId: string): Promise<{
    appName: string;
    appSubtitle: string;
    appDescription: string;
    showForgotPassword: boolean;
    logoPath: string | null;
    faviconPath: string | null;
    contactEmail: string | null;
    landingPage: PublicLandingContent;
  }> {
    const keys = [
      'app_name',
      'app_subtitle',
      'app_description',
      'show_forgot_password',
      'theme_logoPath',
      'theme_faviconPath',
      'footer_contactEmail',
    ] as const;

    const map: Record<string, string | null> = {};
    await Promise.all(
      keys.map(async (key) => {
        map[key] = await this.getSettingWithFallbackUnscoped(key, tenantId);
      })
    );

    return {
      appName: map['app_name'] || 'ConMGR',
      appSubtitle: map['app_subtitle'] || '',
      appDescription: map['app_description'] || 'Manage events, scoring, certifications, and reporting from one secure platform.',
      showForgotPassword: (map['show_forgot_password'] || 'true') === 'true',
      logoPath: map['theme_logoPath'] || null,
      faviconPath: map['theme_faviconPath'] || null,
      contactEmail: map['footer_contactEmail'] || null,
      landingPage: await this.getPublicLandingContentUnscoped(tenantId),
    };
  }

  private async getPublicLandingContentUnscoped(tenantId: string): Promise<PublicLandingContent> {
    const raw = await this.getSettingWithFallbackUnscoped(
      PUBLIC_LANDING_CONTENT_SETTING_KEY,
      tenantId
    );
    return parsePublicLandingContentSetting(raw);
  }

  private async getThemeSettingsUnscoped(tenantId: string): Promise<Record<string, string>> {
    const themeKeys = [
      'theme_primaryColor',
      'theme_secondaryColor',
      'theme_logoPath',
      'theme_faviconPath',
      'app_name',
      'app_subtitle'
    ] as const;

    const keyMap: Record<string, string> = {};
    await Promise.all(
      themeKeys.map(async (key) => {
        const value = await this.getSettingWithFallbackUnscoped(key, tenantId);
        if (value) keyMap[key] = value;
      })
    );

    return {
      theme_primaryColor: keyMap['theme_primaryColor'] || '#3b82f6',
      theme_secondaryColor: keyMap['theme_secondaryColor'] || '#8b5cf6',
      theme_logoPath: keyMap['theme_logoPath'] || '',
      theme_faviconPath: keyMap['theme_faviconPath'] || '',
      app_name: keyMap['app_name'] || 'ConMGR',
      app_subtitle: keyMap['app_subtitle'] || '',
    };
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
      res.json({ data: { appName: 'ConMGR', appSubtitle: '' } });
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
      let tenantId = this.getTenantIdForRead(req);
      let tenantResolvedBySlug = false;
      const tenantSlug = req.query['tenantSlug'];
      if (tenantSlug && typeof tenantSlug === 'string') {
        const tenant = await this.getTenantBySlugUnscoped(tenantSlug, tenantId);
        if (tenant) {
          tenantId = tenant.id;
          tenantResolvedBySlug = true;
        }
      }

      const publicSettings = tenantResolvedBySlug
        ? await this.getPublicSettingsUnscoped(String(tenantId))
        : await this.settingsService.getPublicSettings(tenantId);
      this.applyNoStoreTenantVaryHeaders(res);
      res.json(publicSettings);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get tenant-aware PWA manifest for runtime install metadata.
   */
  getPwaManifest = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      let tenantId = this.getTenantIdForRead(req);
      let manifestTenantSlug: string | null = null;
      let tenantResolvedBySlug = false;
      const tenantSlug = req.query['tenantSlug'];
      if (tenantSlug && typeof tenantSlug === 'string') {
        const tenant = await this.getTenantBySlugUnscoped(tenantSlug, tenantId);
        if (tenant) {
          tenantId = tenant.id;
          manifestTenantSlug = tenant.slug;
          tenantResolvedBySlug = true;
        }
      }

      const [publicSettings, themeSettings] = tenantResolvedBySlug
        ? await Promise.all([
            this.getPublicSettingsUnscoped(String(tenantId)),
            this.getThemeSettingsUnscoped(String(tenantId)),
          ])
        : await Promise.all([
            this.settingsService.getPublicSettings(tenantId),
            this.settingsService.getThemeSettings(tenantId),
          ]);

      const appName = String(publicSettings.appName || themeSettings['app_name'] || 'ConMGR').trim() || 'ConMGR';
      const appSubtitle = String(publicSettings.appSubtitle || themeSettings['app_subtitle'] || '').trim();
      const description = String(publicSettings.appDescription || appSubtitle || 'Event management platform').trim();
      const shortName = appName.length > 24 ? `${appName.slice(0, 21)}...` : appName;
      const primaryColor = String(themeSettings['theme_primaryColor'] || '#6366f1').trim() || '#6366f1';
      const basePath = this.buildManifestBasePath(manifestTenantSlug);

      const brandedIconPath = String(
        publicSettings.logoPath ||
        publicSettings.faviconPath ||
        themeSettings['theme_logoPath'] ||
        themeSettings['theme_faviconPath'] ||
        ''
      ).trim();

      const brandedIcons = brandedIconPath
        ? [{
            src: brandedIconPath,
            type: this.inferManifestIconType(brandedIconPath),
            purpose: 'any',
          }]
        : [];

      const manifest = {
        name: appName,
        short_name: shortName,
        description,
        id: basePath,
        theme_color: primaryColor,
        background_color: '#ffffff',
        display: 'standalone',
        scope: basePath,
        start_url: basePath,
        orientation: 'any',
        icons: [
          ...brandedIcons,
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        prefer_related_applications: false,
      };

      this.applyNoStoreTenantVaryHeaders(res);
      res.type('application/manifest+json');
      res.status(200).json(manifest);
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
      const settings = (req.body && typeof req.body === 'object')
        ? (req.body as Record<string, unknown>)
        : {};
      const userRole = String(req.user?.role || '').trim().toUpperCase();
      const isSecurityEmailWrite =
        Object.prototype.hasOwnProperty.call(settings, 'securityEmail') ||
        Object.prototype.hasOwnProperty.call(settings, 'security_email');
      if (isSecurityEmailWrite && !['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Only SUPER_ADMIN and ADMIN can update security email',
        });
        return;
      }
      const normalizedSettings = Object.fromEntries(
        Object.entries(settings).map(([key, value]) => [key, String(value ?? '')])
      ) as Record<string, string>;

      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);

      const updatedCount = await this.settingsService.updateSettings(
        normalizedSettings,
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
      } else if (type === 'backup') {
        const backupSettings = (req.body && typeof req.body === 'object') ? req.body : undefined;
        const result = await this.settingsService.testBackupConnection(tenantId, backupSettings);
        successResponse(
          res,
          result,
          result.success ? 'Backup connection test successful' : 'Backup connection test failed'
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

      let runtimeEnvPath: string | undefined;
      let runtimeEnvWarning: string | undefined;
      if (tenantId === null) {
        try {
          runtimeEnvPath = await this.settingsService.syncGlobalBackupRuntimeEnv();
        } catch (syncErr: any) {
          runtimeEnvWarning = syncErr?.message || 'Unable to sync backup runtime environment file';
          logger.warn('Backup runtime env sync failed after settings update', {
            warning: runtimeEnvWarning,
            tenantId,
            userId,
          });
        }
      }

      successResponse(
        res,
        { updatedCount, scope: tenantId ? 'tenant' : 'global', runtimeEnvPath, runtimeEnvWarning },
        'Backup settings updated successfully'
      );
    } catch (error: any) {
      const message = error?.message || 'Unable to update backup settings';
      if (
        message.includes('Invalid Google OAuth client ID format') ||
        message.includes('Invalid OAuth redirect URI')
      ) {
        res.status(400).json({ success: false, error: message });
        return;
      }
      return next(error);
    }
  };

  /**
   * Start Google Drive OAuth flow for backup connection
   */
  startGoogleDriveOAuth = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const tenantId = this.getTenantIdForRead(req);
      const origin = String(req.body?.origin || `${req.protocol}://${req.get('host') || ''}`);
      const result = await this.settingsService.startGoogleDriveOAuth(userId, tenantId, origin, {
        clientId: typeof req.body?.clientId === 'string' ? req.body.clientId : undefined,
        clientSecret: typeof req.body?.clientSecret === 'string' ? req.body.clientSecret : undefined,
        redirectUri: typeof req.body?.redirectUri === 'string' ? req.body.redirectUri : undefined,
      });
      successResponse(res, result, 'Google OAuth URL generated');
    } catch (error: any) {
      const message = error?.message || 'Unable to start Google OAuth';
      if (
        message.includes('Google OAuth client ID and secret are required') ||
        message.includes('Invalid OAuth redirect URI') ||
        message.includes('Invalid Google OAuth client ID format')
      ) {
        res.status(400).json({ success: false, error: message });
        return;
      }
      return next(error);
    }
  };

  /**
   * OAuth callback endpoint for Google Drive
   */
  completeGoogleDriveOAuth = async (
    req: TenantRequest,
    res: Response
  ): Promise<void> => {
    const code = String(req.query['code'] || '');
    const state = String(req.query['state'] || '');
    const error = String(req.query['error'] || '');
    const safeOrigin = `${req.protocol}://${req.get('host') || ''}`;
    const sendPopupHtml = (ok: boolean, message: string): void => {
      const escaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const callbackPayload = JSON.stringify({
        type: 'google-drive-oauth-result',
        success: ok,
        message,
      });
      const fallbackUrl = safeOrigin ? `${safeOrigin}/settings` : '/settings';
      res.status(ok ? 200 : 400).send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google Backup Connection</title></head><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;line-height:1.45;">
      <script>
        (function(){
          var resultPayload = ${callbackPayload};
          var expectedOrigin = ${JSON.stringify(safeOrigin)} || window.location.origin;
          try {
            window.sessionStorage.setItem('google-drive-oauth-result', JSON.stringify(resultPayload));
          } catch (e) {}
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(resultPayload, expectedOrigin);
              window.close();
              return;
            }
          } catch (e) {}
          try {
            var returnUrl = window.sessionStorage.getItem('google-drive-oauth-return-url');
            if (returnUrl) {
              window.sessionStorage.removeItem('google-drive-oauth-return-url');
              var parsed = new URL(returnUrl, expectedOrigin);
              if (parsed.origin === expectedOrigin) {
                window.location.replace(parsed.toString());
                return;
              }
            }
          } catch (e) {}
          var returnLink = document.getElementById('oauth-return-link');
          if (returnLink) {
            returnLink.setAttribute('href', ${JSON.stringify(fallbackUrl)});
          }
        })();
      </script>
      <h1 style="margin:0 0 12px;font-size:1.2rem;">Google Backup Connection</h1>
      <p style="margin:0 0 16px;">${escaped}</p>
      <p style="margin:0;"><a id="oauth-return-link" href="${fallbackUrl}">Return to Settings</a></p>
      </body></html>`);
    };

    try {
      if (error) {
        sendPopupHtml(false, `Google OAuth denied: ${error}`);
        return;
      }
      if (!code || !state) {
        sendPopupHtml(false, 'Missing OAuth code or state.');
        return;
      }
      const result = await this.settingsService.completeGoogleDriveOAuthCallback(code, state, safeOrigin);
      sendPopupHtml(true, `Google Drive connected${result.email ? ` (${result.email})` : ''}.`);
    } catch (err: any) {
      logger.error('Google OAuth callback failed', {
        error: err?.message || String(err),
        statePresent: Boolean(state),
        hasCode: Boolean(code),
      });
      sendPopupHtml(false, err?.message || 'Google OAuth callback failed');
    }
  };

  /**
   * Get Google Drive OAuth connection status
   */
  getGoogleDriveOAuthStatus = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const status = await this.settingsService.getGoogleDriveOAuthStatus(tenantId);
      successResponse(res, status, 'Google OAuth status retrieved');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Disconnect Google Drive OAuth connection
   */
  disconnectGoogleDriveOAuth = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const tenantId = this.getTenantIdForWrite(req, req.query['global'] === 'true');
      await this.settingsService.disconnectGoogleDriveOAuth(userId, tenantId);
      successResponse(res, { disconnected: true }, 'Google Drive disconnected');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Upload and save GCS service account credentials
   */
  uploadGcsServiceAccount = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const tenantId = this.getTenantIdForWrite(req, req.query['global'] === 'true');
      const serviceAccountJson = String(req.body?.serviceAccountJson || '');
      const projectNumber = String(req.body?.projectNumber || '');
      if (!serviceAccountJson) {
        res.status(400).json({ success: false, error: 'serviceAccountJson is required' });
        return;
      }
      await this.settingsService.setGcsServiceAccountFromUpload(userId, tenantId, serviceAccountJson, projectNumber);
      successResponse(res, { uploaded: true }, 'GCS service account uploaded');
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
      let tenantResolvedBySlug = false;

      // Allow unauthenticated users to specify tenantSlug for login page branding
      // Check tenantSlug first because it is more specific than a generic tenant fallback
      const tenantSlug = req.query['tenantSlug'];
      if (tenantSlug && typeof tenantSlug === 'string') {
        const tenant = await this.getTenantBySlugUnscoped(tenantSlug, tenantId);
        if (tenant) {
          tenantId = tenant.id;
          tenantResolvedBySlug = true;
        }
      }

      const themeSettings = tenantResolvedBySlug
        ? await this.getThemeSettingsUnscoped(String(tenantId))
        : await this.settingsService.getThemeSettings(tenantId);
      this.applyNoStoreTenantVaryHeaders(res);
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

  getPublicLandingContent = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const landingPage = await this.settingsService.getPublicLandingContent(tenantId);
      successResponse(res, landingPage, 'Public landing content retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  updatePublicLandingContent = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);
      const landingPage = await this.settingsService.updatePublicLandingContent(
        req.body,
        userId,
        tenantId
      );

      successResponse(
        res,
        { landingPage, scope: tenantId ? 'tenant' : 'global' },
        'Public landing content updated successfully'
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

      const logoPath = `/uploads/theme/${file.filename}`;
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

      const faviconPath = `/uploads/theme/${file.filename}`;
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
   * Get published results visibility settings (tenant-aware)
   */
  getPublishedResultsVisibilitySettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const visibilitySettings =
        await this.settingsService.getPublishedResultsVisibilitySettings(tenantId);

      successResponse(res, visibilitySettings, 'Published results visibility settings retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update published results visibility settings (tenant-aware)
   */
  updatePublishedResultsVisibilitySettings = async (
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
        await this.settingsService.updatePublishedResultsVisibilitySettings(
          visibilitySettings,
          userId,
          tenantId
        );

      successResponse(
        res,
        { updatedCount, scope: tenantId ? 'tenant' : 'global' },
        'Published results visibility settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get system health external alert settings
   * SUPER_ADMIN-only route.
   */
  getSystemHealthAlertSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const settings = await this.settingsService.getSystemHealthAlertSettings(tenantId);
      successResponse(res, settings, 'System health alert settings retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update system health external alert settings
   * SUPER_ADMIN-only route.
   */
  updateSystemHealthAlertSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);
      const updatedCount = await this.settingsService.updateSystemHealthAlertSettings(req.body || {}, userId, tenantId);
      successResponse(
        res,
        { updatedCount, scope: tenantId ? 'tenant' : 'global' },
        'System health alert settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get scoring workflow alert settings
   */
  getScoringWorkflowAlertSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const settings = await this.settingsService.getScoringWorkflowAlertSettings(tenantId);
      successResponse(res, settings, 'Scoring workflow alert settings retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update scoring workflow alert settings
   */
  updateScoringWorkflowAlertSettings = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const forGlobal = req.query['global'] === 'true';
      const tenantId = this.getTenantIdForWrite(req, forGlobal);
      const updatedCount = await this.settingsService.updateScoringWorkflowAlertSettings(req.body || {}, userId, tenantId);
      successResponse(
        res,
        { updatedCount, scope: tenantId ? 'tenant' : 'global' },
        'Scoring workflow alert settings updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get candidate tenant users for scoring workflow alert routing
   */
  getScoringWorkflowAlertCandidates = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = this.getTenantIdForRead(req);
      const candidates = await this.settingsService.getScoringWorkflowAlertCandidates(tenantId);
      successResponse(res, candidates, 'Scoring workflow alert candidates retrieved successfully');
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
export const getPwaManifest = controller.getPwaManifest;
export const updateSettings = controller.updateSettings;
export const testSettings = controller.testSettings;
export const getLoggingLevels = controller.getLoggingLevels;
export const updateLoggingLevel = controller.updateLoggingLevel;
export const getGeneralSettings = controller.getGeneralSettings;
export const getSecuritySettings = controller.getSecuritySettings;
export const updateSecuritySettings = controller.updateSecuritySettings;
export const getBackupSettings = controller.getBackupSettings;
export const updateBackupSettings = controller.updateBackupSettings;
export const startGoogleDriveOAuth = controller.startGoogleDriveOAuth;
export const completeGoogleDriveOAuth = controller.completeGoogleDriveOAuth;
export const getGoogleDriveOAuthStatus = controller.getGoogleDriveOAuthStatus;
export const disconnectGoogleDriveOAuth = controller.disconnectGoogleDriveOAuth;
export const uploadGcsServiceAccount = controller.uploadGcsServiceAccount;
export const getEmailSettings = controller.getEmailSettings;
export const updateEmailSettings = controller.updateEmailSettings;
export const getPasswordPolicy = controller.getPasswordPolicy;
export const updatePasswordPolicy = controller.updatePasswordPolicy;
export const getJWTConfig = controller.getJWTConfig;
export const updateJWTConfig = controller.updateJWTConfig;
export const getThemeSettings = controller.getThemeSettings;
export const updateThemeSettings = controller.updateThemeSettings;
export const getPublicLandingContent = controller.getPublicLandingContent;
export const updatePublicLandingContent = controller.updatePublicLandingContent;
export const uploadThemeLogo = controller.uploadThemeLogo;
export const uploadThemeFavicon = controller.uploadThemeFavicon;
export const getDatabaseConnectionInfo = controller.getDatabaseConnectionInfo;
export const getContestantVisibilitySettings =
  controller.getContestantVisibilitySettings;
export const updateContestantVisibilitySettings =
  controller.updateContestantVisibilitySettings;
export const getPublishedResultsVisibilitySettings =
  controller.getPublishedResultsVisibilitySettings;
export const updatePublishedResultsVisibilitySettings =
  controller.updatePublishedResultsVisibilitySettings;
export const getGlobalSettings = controller.getGlobalSettings;
export const resetSettingToGlobal = controller.resetSettingToGlobal;
export const getSystemHealthAlertSettings = controller.getSystemHealthAlertSettings;
export const updateSystemHealthAlertSettings = controller.updateSystemHealthAlertSettings;
export const getScoringWorkflowAlertSettings = controller.getScoringWorkflowAlertSettings;
export const updateScoringWorkflowAlertSettings = controller.updateScoringWorkflowAlertSettings;
export const getScoringWorkflowAlertCandidates = controller.getScoringWorkflowAlertCandidates;
