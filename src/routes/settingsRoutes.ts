import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAllSettings,
  getSettings,
  getAppName,
  getPublicSettings,
  updateSettings,
  testSettings,
  updateJWTConfig,
  getJWTConfig,
  getLoggingLevels,
  updateLoggingLevel,
  getSecuritySettings,
  updateSecuritySettings,
  getBackupSettings,
  updateBackupSettings,
  getEmailSettings,
  updateEmailSettings,
  getPasswordPolicy,
  updatePasswordPolicy,
  getThemeSettings,
  updateThemeSettings,
  uploadThemeLogo,
  uploadThemeFavicon,
  getContestantVisibilitySettings,
  updateContestantVisibilitySettings,
  getDatabaseConnectionInfo
} from '../controllers/settingsController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { maxFileSize } from '../utils/config';

const router: Router = express.Router();

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
router.get('/theme', getThemeSettings) // Public - theme settings needed for login page styling

// Protected routes (require authentication)
router.use(authenticateToken)

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
router.get('/', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), getAllSettings)
router.get('/settings', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), getSettings)
router.put('/', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_SETTINGS', 'SETTINGS'), updateSettings)
router.put('/settings', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_SETTINGS', 'SETTINGS'), updateSettings)
router.post('/test/:type', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), testSettings)

// Logging settings
router.get('/logging-levels', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), getLoggingLevels)
router.put('/logging-levels', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_LOGGING_LEVEL', 'SETTINGS'), updateLoggingLevel)

// Security settings
router.get('/security', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), getSecuritySettings)
router.put('/security', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_SECURITY_SETTINGS', 'SETTINGS'), updateSecuritySettings)

// Backup settings
router.get('/backup', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), getBackupSettings)
router.put('/backup', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_BACKUP_SETTINGS', 'SETTINGS'), updateBackupSettings)

// Email settings
router.get('/email', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), getEmailSettings)
router.put('/email', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_EMAIL_SETTINGS', 'SETTINGS'), updateEmailSettings)

// Password policy (update requires auth)
router.put('/password-policy', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_PASSWORD_POLICY', 'SETTINGS'), updatePasswordPolicy)

// JWT configuration routes
router.get('/jwt-config', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), getJWTConfig)
router.put('/jwt-config', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), logActivity('UPDATE_JWT_CONFIG', 'SETTINGS'), updateJWTConfig)

// Theme configuration routes - GET is public (for login page), PUT requires auth
router.put('/theme', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), logActivity('UPDATE_THEME_SETTINGS', 'SETTINGS'), updateThemeSettings)
router.post('/theme/logo', 
  requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), 
  themeUpload.single('logo'),
  logActivity('UPLOAD_THEME_LOGO', 'SETTINGS'), 
  uploadThemeLogo
)
router.post('/theme/favicon', 
  requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), 
  themeUpload.single('favicon'),
  logActivity('UPLOAD_THEME_FAVICON', 'SETTINGS'), 
  uploadThemeFavicon
)

// Contestant visibility settings
// Allow contestants to read, but only ADMIN/ORGANIZER can update
router.get('/contestant-visibility', getContestantVisibilitySettings)
router.put('/contestant-visibility', requireRole(['ADMIN', 'ORGANIZER']), logActivity('UPDATE_CONTESTANT_VISIBILITY_SETTINGS', 'SETTINGS'), updateContestantVisibilitySettings)

// Database connection info (read-only, masked)
router.get('/database-connection-info', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), getDatabaseConnectionInfo)

// Field configuration routes (for user field visibility settings)
router.get('/field-configurations', requireRole(['ADMIN', 'ORGANIZER']), async (_req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const configurations = await prisma.userFieldConfiguration.findMany({
      orderBy: { order: 'asc' }
    });

    await prisma.$disconnect();

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

router.get('/field-configurations/:fieldName', requireRole(['ADMIN', 'ORGANIZER']), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const fieldName = req.params['fieldName'];
    const configuration = await prisma.userFieldConfiguration.findUnique({
      where: { fieldName }
    });

    await prisma.$disconnect();

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

router.put('/field-configurations/:fieldName', requireRole(['ADMIN', 'ORGANIZER']), logActivity('UPDATE_FIELD_CONFIGURATION', 'SETTINGS'), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const fieldName = req.params['fieldName'];
    if (!fieldName) {
      res.status(400).json({
        success: false,
        error: 'fieldName is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { isVisible, isRequired, order } = req.body;

    const configuration = await prisma.userFieldConfiguration.upsert({
      where: { fieldName },
      update: {
        isVisible: isVisible !== undefined ? isVisible : undefined,
        isRequired: isRequired !== undefined ? isRequired : undefined,
        order: order !== undefined ? order : undefined,
      },
      create: {
        fieldName,
        isVisible: isVisible ?? true,
        isRequired: isRequired ?? false,
        order: order ?? 0,
      }
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      data: configuration,
      message: 'Field configuration updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

router.put('/field-configurations/bulk', requireRole(['ADMIN', 'ORGANIZER']), logActivity('UPDATE_FIELD_CONFIGURATIONS_BULK', 'SETTINGS'), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const { configurations } = req.body;

    if (!Array.isArray(configurations)) {
      res.status(400).json({
        success: false,
        error: 'configurations must be an array',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const results = await Promise.all(
      configurations.map((config: any) =>
        prisma.userFieldConfiguration.upsert({
          where: { fieldName: config.fieldName },
          update: {
            isVisible: config.isVisible !== undefined ? config.isVisible : undefined,
            isRequired: config.isRequired !== undefined ? config.isRequired : undefined,
            order: config.order !== undefined ? config.order : undefined,
          },
          create: {
            fieldName: config.fieldName,
            isVisible: config.isVisible ?? true,
            isRequired: config.isRequired ?? false,
            order: config.order ?? 0,
          }
        })
      )
    );

    await prisma.$disconnect();

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

router.post('/field-configurations/reset', requireRole(['ADMIN']), logActivity('RESET_FIELD_CONFIGURATIONS', 'SETTINGS'), async (_req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Delete all existing configurations
    await prisma.userFieldConfiguration.deleteMany({});

    // Create default configurations for common user fields
    const defaultFields = [
      { fieldName: 'name', isVisible: true, isRequired: true, order: 1 },
      { fieldName: 'preferredName', isVisible: true, isRequired: false, order: 2 },
      { fieldName: 'email', isVisible: true, isRequired: true, order: 3 },
      { fieldName: 'phone', isVisible: true, isRequired: false, order: 4 },
      { fieldName: 'gender', isVisible: true, isRequired: false, order: 5 },
      { fieldName: 'pronouns', isVisible: true, isRequired: false, order: 6 },
      { fieldName: 'bio', isVisible: true, isRequired: false, order: 7 },
    ];

    const results = await prisma.userFieldConfiguration.createMany({
      data: defaultFields
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      data: results,
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