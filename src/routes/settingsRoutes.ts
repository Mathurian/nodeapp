import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAllSettings,
  getSettings,
  getAppName,
  getPublicSettings,
  getPwaManifest,
  updateSettings,
  testSettings,
  updateJWTConfig,
  getJWTConfig,
  getLoggingLevels,
  updateLoggingLevel,
  getGeneralSettings,
  getSecuritySettings,
  updateSecuritySettings,
  getBackupSettings,
  updateBackupSettings,
  startGoogleDriveOAuth,
  completeGoogleDriveOAuth,
  getGoogleDriveOAuthStatus,
  disconnectGoogleDriveOAuth,
  uploadGcsServiceAccount,
  getEmailSettings,
  updateEmailSettings,
  getPasswordPolicy,
  updatePasswordPolicy,
  getThemeSettings,
  updateThemeSettings,
  getPublicLandingContent,
  updatePublicLandingContent,
  uploadThemeLogo,
  uploadThemeFavicon,
  getContestantVisibilitySettings,
  updateContestantVisibilitySettings,
  getPublishedResultsVisibilitySettings,
  updatePublishedResultsVisibilitySettings,
  getDatabaseConnectionInfo,
  getSystemHealthAlertSettings,
  updateSystemHealthAlertSettings,
  getScoringWorkflowAlertSettings,
  updateScoringWorkflowAlertSettings,
  getScoringWorkflowAlertCandidates
} from '../controllers/settingsController';
import { authenticateToken, optionalAuth, requirePermission, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { maxFileSize } from '../utils/config';
import { resolveRequestTenantId } from '../utils/tenantContext';
import { UserFieldVisibilityService } from '../services/UserFieldVisibilityService';

const router: Router = express.Router();
const userFieldVisibilityService = new UserFieldVisibilityService();

// Configure multer for theme uploads (logo and favicon)
const themeStorage = multer.diskStorage({
  destination: (_req: express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/theme/');
  },
  filename: (_req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fieldname = file.fieldname === 'logo' ? 'logo' : 'favicon';
    cb(null, fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const themeUpload = multer({
  storage: themeStorage,
  limits: { fileSize: maxFileSize },
  fileFilter: (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Validate MIME types for images (logo and favicon)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed for logo and favicon.') as any, false);
    }
  }
})

// Public routes (no auth required)
/**
 * @swagger
 * /api/settings/password-policy:
 *   get:
 *     summary: Get password policy (public)
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Password policy retrieved
 */
router.get('/password-policy', getPasswordPolicy)

/**
 * @swagger
 * /api/settings/app-name:
 *   get:
 *     summary: Get application name (public)
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Application name retrieved
 */
router.get('/app-name', getAppName) // Public - app name is not sensitive

/**
 * @swagger
 * /api/settings/public:
 *   get:
 *     summary: Get public settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Public settings retrieved
 */
router.get('/public', getPublicSettings)
router.get('/pwa-manifest', getPwaManifest)

/**
 * @swagger
 * /api/settings/theme:
 *   get:
 *     summary: Get theme settings (public)
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Theme settings retrieved
 */
router.get('/theme', optionalAuth, getThemeSettings) // Public with optional auth - uses tenant context when logged in
router.get('/backup/google-drive/oauth/callback', completeGoogleDriveOAuth)

// Protected routes (require authentication)
router.use(authenticateToken)
const requireSettingsRead = requirePermission('settings:read')
const requireSettingsWrite = requirePermission('settings:write')

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get all settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *   put:
 *     summary: Update settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsRead, getAllSettings)
router.get('/settings', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsRead, getSettings)
router.put('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, logActivity('UPDATE_SETTINGS', 'SETTINGS'), updateSettings)
router.put('/settings', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, logActivity('UPDATE_SETTINGS', 'SETTINGS'), updateSettings)
router.post('/test/:type', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, testSettings)

// Logging settings
router.get('/logging-levels', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsRead, getLoggingLevels)
router.put('/logging-levels', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, logActivity('UPDATE_LOGGING_LEVEL', 'SETTINGS'), updateLoggingLevel)

// General settings
router.get('/general', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsRead, getGeneralSettings)

// Security settings
router.get('/security', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsRead, getSecuritySettings)
router.put('/security', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, logActivity('UPDATE_SECURITY_SETTINGS', 'SETTINGS'), updateSecuritySettings)

// Backup settings
router.get('/backup', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsRead, getBackupSettings)
router.put('/backup', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, logActivity('UPDATE_BACKUP_SETTINGS', 'SETTINGS'), updateBackupSettings)
router.post('/backup/google-drive/oauth/start', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, startGoogleDriveOAuth)
router.get('/backup/google-drive/oauth/status', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsRead, getGoogleDriveOAuthStatus)
router.post('/backup/google-drive/oauth/disconnect', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, disconnectGoogleDriveOAuth)
router.post('/backup/gcs/service-account', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, uploadGcsServiceAccount)

// Email settings
router.get('/email', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsRead, getEmailSettings)
router.put('/email', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, logActivity('UPDATE_EMAIL_SETTINGS', 'SETTINGS'), updateEmailSettings)

// Password policy (update requires auth)
router.put('/password-policy', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, logActivity('UPDATE_PASSWORD_POLICY', 'SETTINGS'), updatePasswordPolicy)

// JWT configuration routes
router.get('/jwt-config', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsRead, getJWTConfig)
router.put('/jwt-config', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, logActivity('UPDATE_JWT_CONFIG', 'SETTINGS'), updateJWTConfig)

// Theme configuration routes - GET is public (for login page), PUT requires auth
router.put('/theme', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, logActivity('UPDATE_THEME_SETTINGS', 'SETTINGS'), updateThemeSettings)
router.get('/public-content', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsRead, getPublicLandingContent)
router.put('/public-content', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, logActivity('UPDATE_PUBLIC_LANDING_CONTENT', 'SETTINGS'), updatePublicLandingContent)
router.post('/theme/logo', 
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), 
  requireSettingsWrite,
  themeUpload.single('logo'),
  logActivity('UPLOAD_THEME_LOGO', 'SETTINGS'), 
  uploadThemeLogo
)
router.post('/theme/favicon', 
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), 
  requireSettingsWrite,
  themeUpload.single('favicon'),
  logActivity('UPLOAD_THEME_FAVICON', 'SETTINGS'), 
  uploadThemeFavicon
)

// Contestant visibility settings
// Allow contestants to read, but only ADMIN/ORGANIZER can update
router.get('/contestant-visibility', getContestantVisibilitySettings)
router.put('/contestant-visibility', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), requireSettingsWrite, logActivity('UPDATE_CONTESTANT_VISIBILITY_SETTINGS', 'SETTINGS'), updateContestantVisibilitySettings)
router.get('/published-results-visibility', getPublishedResultsVisibilitySettings)
router.put('/published-results-visibility', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, logActivity('UPDATE_PUBLISHED_RESULTS_VISIBILITY_SETTINGS', 'SETTINGS'), updatePublishedResultsVisibilitySettings)

// Alert settings
router.get('/alerts/system-health', requireRole(['SUPER_ADMIN']), requireSettingsRead, getSystemHealthAlertSettings)
router.put('/alerts/system-health', requireRole(['SUPER_ADMIN']), requireSettingsWrite, logActivity('UPDATE_SYSTEM_HEALTH_ALERT_SETTINGS', 'SETTINGS'), updateSystemHealthAlertSettings)
router.get('/alerts/scoring-workflow', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsRead, getScoringWorkflowAlertSettings)
router.put('/alerts/scoring-workflow', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsWrite, logActivity('UPDATE_SCORING_WORKFLOW_ALERT_SETTINGS', 'SETTINGS'), updateScoringWorkflowAlertSettings)
router.get('/alerts/scoring-workflow/candidates', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsRead, getScoringWorkflowAlertCandidates)

// Database connection info (read-only, masked)
router.get('/database-connection-info', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireSettingsRead, getDatabaseConnectionInfo)

const isSuperAdmin = (req: express.Request): boolean =>
  String(req.user?.role || '').trim().toUpperCase() === 'SUPER_ADMIN';

const resolveFieldConfigTenantScope = (req: express.Request): string | null => {
  if (isSuperAdmin(req) && req.query['global'] === 'true') {
    return null;
  }
  return resolveRequestTenantId(req, { allowSuperAdminQueryOverride: true });
};

const toFieldConfigRows = (settings: Record<string, any>): Array<{
  fieldName: string;
  isVisible: boolean;
  isRequired: boolean;
  order: number;
}> =>
  Object.entries(settings).map(([fieldName, config], index) => ({
    fieldName,
    isVisible: Boolean(config?.visible),
    isRequired: Boolean(config?.required),
    order: index + 1,
  }));

// Field configuration routes (tenant-scoped via system settings)
router.get('/field-configurations', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), requireSettingsRead, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const tenantId = resolveFieldConfigTenantScope(req);
    const settings = await userFieldVisibilityService.getFieldVisibilitySettings(tenantId);
    const configurations = toFieldConfigRows(settings);

    res.json({
      success: true,
      data: configurations,
      message: 'Field configurations retrieved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

router.get('/field-configurations/:fieldName', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), requireSettingsRead, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const fieldName = String(req.params['fieldName'] || '').trim();
    if (!fieldName) {
      res.status(400).json({
        success: false,
        error: 'fieldName is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const tenantId = resolveFieldConfigTenantScope(req);
    const settings = await userFieldVisibilityService.getFieldVisibilitySettings(tenantId);
    const configurations = toFieldConfigRows(settings);
    const configuration = configurations.find((item) => item.fieldName === fieldName);

    if (!configuration) {
      res.status(404).json({
        success: false,
        error: 'Field configuration not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      data: configuration,
      message: 'Field configuration retrieved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

router.put('/field-configurations/:fieldName', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), requireSettingsWrite, logActivity('UPDATE_FIELD_CONFIGURATION', 'SETTINGS'), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const fieldName = String(req.params['fieldName'] || '').trim();
    if (!fieldName) {
      res.status(400).json({
        success: false,
        error: 'fieldName is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const isVisible = req.body?.isVisible;
    const isRequired = req.body?.isRequired;
    if (typeof isVisible !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'isVisible must be a boolean',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const tenantId = resolveFieldConfigTenantScope(req);
    const userId = req.user?.id;
    await userFieldVisibilityService.updateFieldVisibility(fieldName, isVisible, isRequired, userId, tenantId);

    res.json({
      success: true,
      data: {
        fieldName,
        isVisible,
        isRequired: Boolean(isRequired),
      },
      message: 'Field configuration updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

router.put('/field-configurations/bulk', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), requireSettingsWrite, logActivity('UPDATE_FIELD_CONFIGURATIONS_BULK', 'SETTINGS'), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { configurations } = req.body;

    if (!Array.isArray(configurations)) {
      res.status(400).json({
        success: false,
        error: 'configurations must be an array',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const tenantId = resolveFieldConfigTenantScope(req);
    const userId = req.user?.id;
    const results = await Promise.all(configurations.map(async (config: any) => {
      const fieldName = String(config?.fieldName || '').trim();
      if (!fieldName || typeof config?.isVisible !== 'boolean') {
        throw new Error('Each configuration requires fieldName and boolean isVisible');
      }

      await userFieldVisibilityService.updateFieldVisibility(
        fieldName,
        config.isVisible,
        config.isRequired,
        userId,
        tenantId
      );

      return {
        fieldName,
        isVisible: config.isVisible,
        isRequired: Boolean(config.isRequired),
      };
    }));

    res.json({
      success: true,
      data: results,
      message: 'Field configurations updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

router.post('/field-configurations/reset', requireRole(['SUPER_ADMIN', 'ADMIN']), requireSettingsWrite, logActivity('RESET_FIELD_CONFIGURATIONS', 'SETTINGS'), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const tenantId = resolveFieldConfigTenantScope(req);
    const result = await userFieldVisibilityService.resetFieldVisibility(tenantId);

    res.json({
      success: true,
      data: result,
      message: 'Field configurations reset to defaults',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
