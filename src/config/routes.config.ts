/**
 * Routes Configuration
 * Central place to register all application routes
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

/**
 * Register all application routes
 */
export const registerRoutes = (app: Application): void => {
  // Documentation viewer
  app.use('/api/docs', docsRoutes)

  // Public tenant routes (no auth required) - must be before authenticated routes
  app.use('/api/tenants', publicTenantRoutes)

  // Multi-tenancy management (authenticated)
  app.use('/api/tenants', tenantRoutes)

  // Disaster Recovery and Workflow
  app.use('/api/dr', drRoutes)
  app.use('/api/workflows', workflowRoutes)
  app.use('/api/events/logs', eventsLogRoutes)

  // Health and monitoring
  app.use('/api/health', healthRoutes)
  app.use('/api/performance', performanceRoutes)
  app.use('/api/cache', cacheRoutes)
  app.use('/api/logs', logFilesRoutes)
  app.use('/api/error-handling', errorHandlingRoutes)

  // Authentication and users
  app.use('/api/auth', authRoutes)
  app.use('/api/mfa', mfaRoutes)
  app.use('/api/users', usersRoutes)
  app.use('/api/role-assignments', roleAssignmentRoutes)
  app.use('/api/navigation', navigationRoutes)
  app.use('/api/user-field-visibility', userFieldVisibilityRoutes)

  // Core entities
  app.use('/api/events', eventsRoutes)
  app.use('/api/contests', contestsRoutes)
  app.use('/api/categories', categoriesRoutes)
  app.use('/api/category-types', categoryTypeRoutes)

  // Scoring and results
  app.use('/api/scoring', scoringRoutes)
  app.use('/api/score-files', scoreFileRoutes)
  app.use('/api/results', resultsRoutes)
  app.use('/api/winners', winnersRoutes)
  app.use('/api/deductions', deductionRoutes)
  app.use('/api/commentary', commentaryRoutes)

  // Certification and verification
  app.use('/api/certifications', certificationRoutes)
  app.use('/api/category-certifications', categoryCertificationRoutes)
  app.use('/api/contest-certifications', contestCertificationRoutes)
  app.use('/api/judge-contestant-certifications', judgeContestantCertificationRoutes)
  app.use('/api/judge-certifications', judgeCertificationsRoutes)
  app.use('/api/judge-uncertifications', judgeUncertificationRoutes)
  app.use('/api/judge-uncertification', judgeUncertificationRoutes) // Alias for frontend compatibility
  app.use('/api/bulk-certification-reset', bulkCertificationResetRoutes)

  // Bulk operations
  app.use('/api/bulk', bulkRoutes)

  // Role-specific features
  app.use('/api/admin', adminRoutes)
  app.use('/api/judge', judgeRoutes)
  app.use('/api/auditor', auditorRoutes)
  app.use('/api/board', boardRoutes)
  app.use('/api/tally-master', tallyMasterRoutes)
  app.use('/api/emcee', emceeRoutes)

  // Reports and exports
  app.use('/api/reports', reportsRoutes)
  app.use('/api/advanced-reporting', advancedReportingRoutes)
  app.use('/api/print', printRoutes)
  app.use('/api/export', exportRoutes)

  // File management
  app.use('/api/upload', uploadRoutes)
  app.use('/api/files', fileRoutes)
  app.use('/api/file-management', fileManagementRoutes)
  app.use('/api/file-backups', fileBackupRoutes)

  // System and settings
  app.use('/api/settings', settingsRoutes)
  app.use('/api/restrictions', restrictionRoutes)
  app.use('/api/custom-fields', customFieldsRoutes)
  app.use('/api/backups', backupRoutes)
  app.use('/api/admin/backups', backupAdminRoutes)
  app.use('/api/archive', archiveRoutes)
  app.use('/api/templates', templatesRoutes)
  app.use('/api/event-templates', eventTemplateRoutes)
  app.use('/api/test-event-setup', testEventSetupRoutes)
  app.use('/api/data-wipe', dataWipeRoutes)
  app.use('/api/database-browser', databaseBrowserRoutes)
  app.use('/api/rate-limits', rateLimitRoutes)

  // Communication
  app.use('/api/email', emailRoutes)
  app.use('/api', emailTemplateRoutes)
  app.use('/api/sms', smsRoutes)
  app.use('/api/notifications', notificationsRoutes)
  app.use('/api/notification-preferences', notificationPreferencesRoutes)
  app.use('/api/search', searchRoutes)

  // Assignments and tracking
  app.use('/api/assignments', assignmentsRoutes)
  app.use('/api/judges', judgesRoutes)
  app.use('/api/contestants', contestantsRoutes)
  app.use('/api/tracker', trackerRoutes)
  app.use('/api/bios', bioRoutes)

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      message: 'Event Manager API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
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
