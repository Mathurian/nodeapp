/**
 * Routes Configuration
 * Central place to register all application routes
 *
 * Supports both legacy `/api/*` and versioned `/api/v1/*` routes
 * for backward compatibility during API versioning migration.
 */

import { Application } from 'express'

// Import all route modules - all routes are now TypeScript
import healthRoutes from '../routes/healthRoutes'
import authRoutes from '../routes/authRoutes'
import eventsRoutes from '../routes/eventsRoutes'
import contestsRoutes from '../routes/contestsRoutes'
import categoriesRoutes from '../routes/categoriesRoutes'
import usersRoutes from '../routes/usersRoutes'
import scoringRoutes from '../routes/scoringRoutes'
import resultsRoutes from '../routes/resultsRoutes'
import commentaryRoutes from '../routes/commentaryRoutes'
import deductionRoutes from '../routes/deductionRoutes'
import adminRoutes from '../routes/adminRoutes'
import uploadRoutes from '../routes/uploadRoutes'
import settingsRoutes from '../routes/settingsRoutes'
import smsRoutes from '../routes/smsRoutes'
import archiveRoutes from '../routes/archiveRoutes'
import backupRoutes from '../routes/backupRoutes'
import backupAdminRoutes from '../routes/backupAdmin'
import assignmentsRoutes from '../routes/assignmentsRoutes'
import fileRoutes from '../routes/fileRoutes'
import performanceRoutes from '../routes/performanceRoutes'
import certificationRoutes from '../routes/certificationRoutes'
import auditorRoutes from '../routes/auditorRoutes'
import boardRoutes from '../routes/boardRoutes'
import tallyMasterRoutes from '../routes/tallyMasterRoutes'
import judgeRoutes from '../routes/judgeRoutes'
import emailRoutes from '../routes/emailRoutes'
import reportsRoutes from '../routes/reportsRoutes'
import printRoutes from '../routes/printRoutes'
import exportRoutes from '../routes/exportRoutes'
import fileManagementRoutes from '../routes/fileManagementRoutes'
import fileBackupRoutes from '../routes/fileBackupRoutes'
import errorHandlingRoutes from '../routes/errorHandlingRoutes'
import templatesRoutes from '../routes/templatesRoutes'
import eventTemplateRoutes from '../routes/eventTemplateRoutes'
import notificationsRoutes from '../routes/notificationsRoutes'
import emceeRoutes from '../routes/emceeRoutes'
import categoryTypeRoutes from '../routes/categoryTypeRoutes'
import navigationRoutes from '../routes/navigationRoutes'
import advancedReportingRoutes from '../routes/advancedReportingRoutes'
import winnersRoutes from '../routes/winnersRoutes'
import contestCertificationRoutes from '../routes/contestCertificationRoutes'
import judgeContestantCertificationRoutes from '../routes/judgeContestantCertificationRoutes'
import categoryCertificationRoutes from '../routes/categoryCertificationRoutes'
import judgeCertificationsRoutes from '../routes/judgeCertificationsRoutes'
import judgeUncertificationRoutes from '../routes/judgeUncertificationRoutes'
import userFieldVisibilityRoutes from '../routes/userFieldVisibilityRoutes'
import cacheRoutes from '../routes/cacheRoutes'
import databaseBrowserRoutes from '../routes/databaseBrowserRoutes'
import logFilesRoutes from '../routes/logFilesRoutes'
import trackerRoutes from '../routes/trackerRoutes'
import roleAssignmentRoutes from '../routes/roleAssignmentRoutes'
import judgesRoutes from '../routes/judgesRoutes'
import contestantsRoutes from '../routes/contestantsRoutes'
import bioRoutes from '../routes/bioRoutes'
import rateLimitRoutes from '../routes/rateLimitRoutes'
import rateLimitConfigRoutes from '../routes/rateLimitConfigRoutes'
import scoreFileRoutes from '../routes/scoreFileRoutes'
import restrictionRoutes from '../routes/restrictionRoutes'
import dataWipeRoutes from '../routes/dataWipeRoutes'
import testEventSetupRoutes from '../routes/testEventSetupRoutes'
import bulkCertificationResetRoutes from '../routes/bulkCertificationResetRoutes'
import bulkRoutes from '../routes/bulkRoutes'
import customFieldsRoutes from '../routes/customFieldsRoutes'
import emailTemplateRoutes from '../routes/emailTemplateRoutes'
import docsRoutes from '../routes/docs'
import mfaRoutes from '../routes/mfa'
import notificationPreferencesRoutes from '../routes/notificationPreferencesRoutes'
import searchRoutes from '../routes/searchRoutes'
import tenantRoutes from '../routes/tenant'
import publicTenantRoutes from '../routes/publicTenantRoutes'
import drRoutes from '../routes/drRoutes'
import workflowRoutes from '../routes/workflowRoutes'
import eventsLogRoutes from '../routes/eventsLogRoutes'
import featureFlagsRoutes from '../routes/featureFlagsRoutes'

/**
 * Helper to register routes for both legacy and versioned paths
 */
const registerRoute = (app: Application, path: string, router: any): void => {
  // Register versioned route (v1)
  app.use(`/api/v1${path}`, router);

  // Register legacy route (for backward compatibility)
  app.use(`/api${path}`, router);
};

/**
 * Register all application routes
 */
export const registerRoutes = (app: Application): void => {
  // Documentation viewer (no versioning needed)
  app.use('/api/docs', docsRoutes);
  app.use('/api/v1/docs', docsRoutes);

  // Public tenant routes (no auth required) - must be before authenticated routes
  registerRoute(app, '/tenants', publicTenantRoutes);

  // Multi-tenancy management (authenticated) - Note: this overlaps with public, but with auth
  registerRoute(app, '/tenants', tenantRoutes);

  // Disaster Recovery and Workflow
  registerRoute(app, '/dr', drRoutes);
  registerRoute(app, '/workflows', workflowRoutes);
  registerRoute(app, '/events/logs', eventsLogRoutes);

  // Health and monitoring
  registerRoute(app, '/health', healthRoutes);
  registerRoute(app, '/performance', performanceRoutes);
  registerRoute(app, '/cache', cacheRoutes);
  registerRoute(app, '/logs', logFilesRoutes);
  registerRoute(app, '/error-handling', errorHandlingRoutes);

  // Authentication and users
  registerRoute(app, '/auth', authRoutes);
  registerRoute(app, '/mfa', mfaRoutes);
  registerRoute(app, '/users', usersRoutes);
  registerRoute(app, '/role-assignments', roleAssignmentRoutes);
  registerRoute(app, '/navigation', navigationRoutes);
  registerRoute(app, '/user-field-visibility', userFieldVisibilityRoutes);

  // Core entities
  registerRoute(app, '/events', eventsRoutes);
  registerRoute(app, '/contests', contestsRoutes);
  registerRoute(app, '/categories', categoriesRoutes);
  registerRoute(app, '/category-types', categoryTypeRoutes);

  // Scoring and results
  registerRoute(app, '/scoring', scoringRoutes);
  registerRoute(app, '/score-files', scoreFileRoutes);
  registerRoute(app, '/results', resultsRoutes);
  registerRoute(app, '/winners', winnersRoutes);
  registerRoute(app, '/deductions', deductionRoutes);
  registerRoute(app, '/commentary', commentaryRoutes);

  // Certification and verification
  registerRoute(app, '/certifications', certificationRoutes);
  registerRoute(app, '/category-certifications', categoryCertificationRoutes);
  registerRoute(app, '/contest-certifications', contestCertificationRoutes);
  registerRoute(app, '/judge-contestant-certifications', judgeContestantCertificationRoutes);
  registerRoute(app, '/judge-certifications', judgeCertificationsRoutes);
  registerRoute(app, '/judge-uncertifications', judgeUncertificationRoutes);
  registerRoute(app, '/judge-uncertification', judgeUncertificationRoutes); // Alias
  registerRoute(app, '/bulk-certification-reset', bulkCertificationResetRoutes);

  // Bulk operations
  registerRoute(app, '/bulk', bulkRoutes);

  // Role-specific features
  registerRoute(app, '/admin', adminRoutes);
  registerRoute(app, '/judge', judgeRoutes);
  registerRoute(app, '/auditor', auditorRoutes);
  registerRoute(app, '/board', boardRoutes);
  registerRoute(app, '/tally-master', tallyMasterRoutes);
  registerRoute(app, '/emcee', emceeRoutes);

  // Reports and exports
  registerRoute(app, '/reports', reportsRoutes);
  registerRoute(app, '/advanced-reporting', advancedReportingRoutes);
  registerRoute(app, '/print', printRoutes);
  registerRoute(app, '/export', exportRoutes);

  // File management
  registerRoute(app, '/upload', uploadRoutes);
  registerRoute(app, '/files', fileRoutes);
  registerRoute(app, '/file-management', fileManagementRoutes);
  registerRoute(app, '/file-backups', fileBackupRoutes);

  // System and settings
  registerRoute(app, '/settings', settingsRoutes);
  registerRoute(app, '/restrictions', restrictionRoutes);
  registerRoute(app, '/custom-fields', customFieldsRoutes);
  registerRoute(app, '/backups', backupRoutes);
  registerRoute(app, '/feature-flags', featureFlagsRoutes); // Backlog enhancement

  // Admin routes with /admin prefix
  app.use('/api/admin/backups', backupAdminRoutes);
  app.use('/api/v1/admin/backups', backupAdminRoutes);
  app.use('/api/admin/rate-limit-configs', rateLimitConfigRoutes);
  app.use('/api/v1/admin/rate-limit-configs', rateLimitConfigRoutes);

  registerRoute(app, '/archive', archiveRoutes);
  registerRoute(app, '/templates', templatesRoutes);
  registerRoute(app, '/event-templates', eventTemplateRoutes);
  registerRoute(app, '/test-event-setup', testEventSetupRoutes);
  registerRoute(app, '/data-wipe', dataWipeRoutes);
  registerRoute(app, '/database-browser', databaseBrowserRoutes);
  registerRoute(app, '/rate-limits', rateLimitRoutes);

  // Communication
  registerRoute(app, '/email', emailRoutes);
  app.use('/api', emailTemplateRoutes);
  app.use('/api/v1', emailTemplateRoutes);
  registerRoute(app, '/sms', smsRoutes);
  registerRoute(app, '/notifications', notificationsRoutes);
  registerRoute(app, '/notification-preferences', notificationPreferencesRoutes);
  registerRoute(app, '/search', searchRoutes);

  // Assignments and tracking
  registerRoute(app, '/assignments', assignmentsRoutes);
  registerRoute(app, '/judges', judgesRoutes);
  registerRoute(app, '/contestants', contestantsRoutes);
  registerRoute(app, '/tracker', trackerRoutes);
  registerRoute(app, '/bios', bioRoutes);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      message: 'Event Manager API',
      version: '1.0.0',
      apiVersion: 'v1',
      status: 'running',
      timestamp: new Date().toISOString(),
      documentation: '/api/docs',
    })
  })

  // API root endpoint
  app.get('/api', (_req, res) => {
    res.json({
      message: 'Event Manager API',
      currentVersion: 'v1',
      latestVersion: 'v1',
      supportedVersions: ['v1'],
      documentation: '/api/docs',
      endpoints: {
        v1: '/api/v1',
        legacy: '/api (maps to v1)',
      },
    })
  })

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not found',
      message: `Cannot ${_req.method} ${_req.path}`,
      timestamp: new Date().toISOString(),
    })
  })
}
