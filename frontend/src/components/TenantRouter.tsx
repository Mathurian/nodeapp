import React, { Suspense, useMemo } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { TenantProvider } from '../contexts/TenantContext'
import ProtectedRoute from './ProtectedRoute'
import Layout from './Layout'
import { lazyWithRetry } from '../utils/lazyWithRetry'

// Lazy load pages
const LoginPage = lazyWithRetry(() => import('../pages/LoginPage'), 'LoginPage')
const DashboardPage = lazyWithRetry(() => import('../pages/DashboardPage'), 'DashboardPage')
const EventsPage = lazyWithRetry(() => import('../pages/EventsPage'), 'EventsPage')
const ContestsPage = lazyWithRetry(() => import('../pages/ContestsPage'), 'ContestsPage')
const CategoriesPage = lazyWithRetry(() => import('../pages/CategoriesPage'), 'CategoriesPage')
const ScoringPage = lazyWithRetry(() => import('../pages/ScoringPage'), 'ScoringPage')
const ResultsPage = lazyWithRetry(() => import('../pages/ResultsPage'), 'ResultsPage')
const WinnersPage = lazyWithRetry(() => import('../pages/WinnersPage'), 'WinnersPage')
const UsersPage = lazyWithRetry(() => import('../pages/UsersPage'), 'UsersPage')
const AdminPage = lazyWithRetry(() => import('../pages/AdminPage'), 'AdminPage')
const SettingsPage = lazyWithRetry(() => import('../pages/SettingsPage'), 'SettingsPage')
const ProfilePage = lazyWithRetry(() => import('../pages/ProfilePage'), 'ProfilePage')
const EmceePage = lazyWithRetry(() => import('../pages/EmceePage'), 'EmceePage')
const TemplatesPage = lazyWithRetry(() => import('../pages/TemplatesPage'), 'TemplatesPage')
const ReportsPage = lazyWithRetry(() => import('../pages/ReportsPage'), 'ReportsPage')
const NotificationsPage = lazyWithRetry(() => import('../pages/NotificationsPage'), 'NotificationsPage')
const BackupManagementPage = lazyWithRetry(() => import('../pages/BackupManagementPage'), 'BackupManagementPage')
const DisasterRecoveryPage = lazyWithRetry(() => import('../pages/DisasterRecoveryPage'), 'DisasterRecoveryPage')
const WorkflowManagementPage = lazyWithRetry(() => import('../pages/WorkflowManagementPage'), 'WorkflowManagementPage')
const SearchPage = lazyWithRetry(() => import('../pages/SearchPage'), 'SearchPage')
const FileManagementPage = lazyWithRetry(() => import('../pages/FileManagementPage'), 'FileManagementPage')
const EmailTemplatesPage = lazyWithRetry(() => import('../pages/EmailTemplatesPage'), 'EmailTemplatesPage')
const CustomFieldsPage = lazyWithRetry(() => import('../pages/CustomFieldsPage'), 'CustomFieldsPage')
const TenantManagementPage = lazyWithRetry(() => import('../pages/TenantManagementPage'), 'TenantManagementPage')
const MFASettingsPage = lazyWithRetry(() => import('../pages/MFASettingsPage'), 'MFASettingsPage')
const DatabaseBrowserPage = lazyWithRetry(() => import('../pages/DatabaseBrowserPage'), 'DatabaseBrowserPage')
const CacheManagementPage = lazyWithRetry(() => import('../pages/CacheManagementPage'), 'CacheManagementPage')
const ArchivePage = lazyWithRetry(() => import('../pages/ArchivePage'), 'ArchivePage')
const DeductionsPage = lazyWithRetry(() => import('../pages/DeductionsPage'), 'DeductionsPage')
const CertificationsPage = lazyWithRetry(() => import('../pages/CertificationsPage'), 'CertificationsPage')
const LogViewerPage = lazyWithRetry(() => import('../pages/LogViewerPage'), 'LogViewerPage')
const PerformancePage = lazyWithRetry(() => import('../pages/PerformancePage'), 'PerformancePage')
const DataWipePage = lazyWithRetry(() => import('../pages/DataWipePage'), 'DataWipePage')
const EventTemplatesPage = lazyWithRetry(() => import('../pages/EventTemplatesPage'), 'EventTemplatesPage')
const BulkOperationsPage = lazyWithRetry(() => import('../pages/BulkOperationsPage'), 'BulkOperationsPage')
const CategoryTypesPage = lazyWithRetry(() => import('../pages/CategoryTypesPage'), 'CategoryTypesPage')
const HelpPage = lazyWithRetry(() => import('../pages/HelpPage'), 'HelpPage')
const FieldVisibilityPage = lazyWithRetry(() => import('../pages/FieldVisibilityPage'), 'FieldVisibilityPage')
const TestEventSetupPage = lazyWithRetry(() => import('../pages/TestEventSetupPage'), 'TestEventSetupPage')
const BiosPage = lazyWithRetry(() => import('../pages/BiosPage'), 'BiosPage')
const AssignmentsPage = lazyWithRetry(() => import('../pages/AssignmentsPage'), 'AssignmentsPage')
const RateLimitConfigPage = lazyWithRetry(() => import('../pages/RateLimitConfigPage'), 'RateLimitConfigPage')
const ActivityLogPage = lazyWithRetry(() => import('../pages/ActivityLogPage'), 'ActivityLogPage')
const TestRunnerPage = lazyWithRetry(() => import('../pages/TestRunnerPage'), 'TestRunnerPage')
const AuditorPage = lazyWithRetry(() => import('../pages/AuditorPage'), 'AuditorPage')
const AuditorPendingAuditsPage = lazyWithRetry(() => import('../pages/AuditorPendingAuditsPage'), 'AuditorPendingAuditsPage')
const AuditorScoreVerificationPage = lazyWithRetry(() => import('../pages/AuditorScoreVerificationPage'), 'AuditorScoreVerificationPage')
const AuditorFinalCertificationPage = lazyWithRetry(() => import('../pages/AuditorFinalCertificationPage'), 'AuditorFinalCertificationPage')
const AuditorCertificationStatusPage = lazyWithRetry(() => import('../pages/AuditorCertificationStatusPage'), 'AuditorCertificationStatusPage')
const AuditorReportsPage = lazyWithRetry(() => import('../pages/AuditorReportsPage'), 'AuditorReportsPage')
const AuditorAuditLogPage = lazyWithRetry(() => import('../pages/AuditorAuditLogPage'), 'AuditorAuditLogPage')
const TallyDashboardPage = lazyWithRetry(() => import('../pages/TallyDashboardPage'), 'TallyDashboardPage')
const BoardPage = lazyWithRetry(() => import('../pages/BoardPage'), 'BoardPage')
const BoardCertificationsPage = lazyWithRetry(() => import('../pages/BoardCertificationsPage'), 'BoardCertificationsPage')
const BoardScoreRemovalPage = lazyWithRetry(() => import('../pages/BoardScoreRemovalPage'), 'BoardScoreRemovalPage')
const PermissionsPage = lazyWithRetry(() => import('../pages/PermissionsPage'), 'PermissionsPage')
const PermissionAuditLogPage = lazyWithRetry(() => import('../pages/PermissionAuditLogPage'), 'PermissionAuditLogPage')
const NotFoundPage = lazyWithRetry(() => import('../pages/NotFoundPage'), 'NotFoundPage')

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
)

interface TenantRouterProps {
  onOpenCommandPalette: () => void
}

// List of known application routes that should NOT be treated as tenant slugs
// This must be kept in sync with the routes defined below
const KNOWN_ROUTES = new Set([
  'login', 'dashboard', 'events', 'contests', 'categories',
  'scoring', 'results', 'users', 'admin', 'settings', 'profile', 'emcee',
  'templates', 'reports', 'notifications', 'backups', 'disaster-recovery',
  'workflows', 'search', 'files', 'email-templates', 'custom-fields',
  'tenants', 'mfa', 'database', 'cache', 'archive', 'deductions',
  'certifications', 'logs', 'performance', 'data-wipe', 'event-templates',
  'bulk-operations', 'commentary', 'category-types', 'field-visibility',
  'test-event-setup', 'help', 'bios', 'assignments', 'rate-limit-configs', 'activity',
  'auditor', 'board', 'permissions', 'test-runner', 'tally-master', 'winners'
])

// Helper to check if a path segment is a known route
export const isKnownRoute = (segment: string): boolean => KNOWN_ROUTES.has(segment)

/**
 * Extracts the application route from the URL path.
 * Handles both tenant-prefixed URLs (/:slug/route) and direct URLs (/route).
 *
 * Examples:
 * - /settings -> { tenantSlug: null, route: 'settings', restPath: '' }
 * - /acme-events/settings -> { tenantSlug: 'acme-events', route: 'settings', restPath: '' }
 * - /events/123/contests -> { tenantSlug: null, route: 'events', restPath: '123/contests' }
 */
const parseUrlPath = (pathname: string): { tenantSlug: string | null; route: string; restPath: string } => {
  const parts = pathname.split('/').filter(Boolean)

  if (parts.length === 0) {
    return { tenantSlug: null, route: '', restPath: '' }
  }

  const firstSegment = parts[0]

  // If first segment is a known route, no tenant slug in URL
  if (isKnownRoute(firstSegment)) {
    return {
      tenantSlug: null,
      route: firstSegment,
      restPath: parts.slice(1).join('/')
    }
  }

  // Otherwise, first segment is the tenant slug
  const route = parts[1] || ''
  return {
    tenantSlug: firstSegment,
    route,
    restPath: parts.slice(2).join('/')
  }
}

// Main app routes component that handles routing based on parsed URL
const AppRoutes: React.FC<{ onOpenCommandPalette: () => void }> = ({ onOpenCommandPalette }) => {
  const location = useLocation()
  const { tenantSlug, route, restPath } = useMemo(
    () => parseUrlPath(location.pathname),
    [location.pathname]
  )

  // Build base path for navigation (with or without tenant prefix)
  const basePath = tenantSlug ? `/${tenantSlug}` : ''

  return (
    <ProtectedRoute>
      <Layout onOpenCommandPalette={onOpenCommandPalette}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/*
              These routes match relative to the current location.
              Since we've already parsed the URL, we handle routing based on location.
            */}
            <Route path="/" element={<Navigate to={`${basePath}/dashboard`} replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/contests" element={<ContestsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/events/:eventId/contests" element={<ContestsPage />} />
            <Route path="/contests/:contestId/categories" element={<CategoriesPage />} />
            <Route path="/scoring" element={<ProtectedRoute requiredRole={['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD', 'ADMIN', 'SUPER_ADMIN']}><ScoringPage /></ProtectedRoute>} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/winners" element={<ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']}><WinnersPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD']}><UsersPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD']}><AdminPage /></ProtectedRoute>} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/emcee" element={<EmceePage />} />
            <Route path="/templates" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN']}><TemplatesPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'TALLY_MASTER', 'ORGANIZER', 'BOARD']}><ReportsPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/backups" element={<BackupManagementPage />} />
            <Route path="/disaster-recovery" element={<DisasterRecoveryPage />} />
            <Route path="/workflows" element={<WorkflowManagementPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/files" element={<FileManagementPage />} />
            <Route path="/email-templates" element={<EmailTemplatesPage />} />
            <Route path="/custom-fields" element={<CustomFieldsPage />} />
            <Route path="/tenants" element={<TenantManagementPage />} />
            <Route path="/mfa" element={<MFASettingsPage />} />
            <Route path="/database" element={<DatabaseBrowserPage />} />
            <Route path="/cache" element={<CacheManagementPage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/deductions" element={<DeductionsPage />} />
            <Route path="/certifications" element={<CertificationsPage />} />
            <Route path="/logs" element={<LogViewerPage />} />
            <Route path="/activity" element={<ActivityLogPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/data-wipe" element={<DataWipePage />} />
            <Route path="/event-templates" element={<EventTemplatesPage />} />
            <Route path="/bulk-operations" element={<BulkOperationsPage />} />
            <Route path="/category-types" element={<CategoryTypesPage />} />
            <Route path="/field-visibility" element={<FieldVisibilityPage />} />
            <Route path="/test-event-setup" element={<TestEventSetupPage />} />
            <Route path="/bios" element={<BiosPage />} />
            <Route path="/assignments" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD']}><AssignmentsPage /></ProtectedRoute>} />
            <Route path="/rate-limit-configs" element={<RateLimitConfigPage />} />
            <Route path="/test-runner" element={<TestRunnerPage />} />
            <Route path="/tally-master" element={<ProtectedRoute requiredRole={['TALLY_MASTER', 'ADMIN', 'SUPER_ADMIN']}><TallyDashboardPage /></ProtectedRoute>} />
            <Route path="/auditor" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorPage /></ProtectedRoute>} />
            <Route path="/auditor/pending-audits" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorPendingAuditsPage /></ProtectedRoute>} />
            <Route path="/auditor/score-verification" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorScoreVerificationPage /></ProtectedRoute>} />
            <Route path="/auditor/final-certification" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorFinalCertificationPage /></ProtectedRoute>} />
            <Route path="/auditor/certification-status" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorCertificationStatusPage /></ProtectedRoute>} />
            <Route path="/auditor/reports" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorReportsPage /></ProtectedRoute>} />
            <Route path="/auditor/audit-log" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorAuditLogPage /></ProtectedRoute>} />
            <Route path="/board" element={<ProtectedRoute requiredRole={['BOARD', 'ADMIN', 'SUPER_ADMIN']}><BoardPage /></ProtectedRoute>} />
            <Route path="/board/certifications" element={<ProtectedRoute requiredRole={['BOARD', 'ADMIN', 'SUPER_ADMIN']}><BoardCertificationsPage /></ProtectedRoute>} />
            <Route path="/board/score-removal" element={<ProtectedRoute requiredRole={['BOARD', 'ADMIN', 'SUPER_ADMIN']}><BoardScoreRemovalPage /></ProtectedRoute>} />
            <Route path="/permissions" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER']}><PermissionsPage /></ProtectedRoute>} />
            <Route path="/permissions/audit-logs" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER']}><PermissionAuditLogPage /></ProtectedRoute>} />

            {/* Tenant-prefixed routes - these match the same pages under /:slug prefix */}
            <Route path="/:slug/dashboard" element={<DashboardPage />} />
            <Route path="/:slug/events" element={<EventsPage />} />
            <Route path="/:slug/contests" element={<ContestsPage />} />
            <Route path="/:slug/categories" element={<CategoriesPage />} />
            <Route path="/:slug/events/:eventId/contests" element={<ContestsPage />} />
            <Route path="/:slug/contests/:contestId/categories" element={<CategoriesPage />} />
            <Route path="/:slug/scoring" element={<ProtectedRoute requiredRole={['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD', 'ADMIN', 'SUPER_ADMIN']}><ScoringPage /></ProtectedRoute>} />
            <Route path="/:slug/results" element={<ResultsPage />} />
            <Route path="/:slug/winners" element={<ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']}><WinnersPage /></ProtectedRoute>} />
            <Route path="/:slug/users" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD']}><UsersPage /></ProtectedRoute>} />
            <Route path="/:slug/admin" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD']}><AdminPage /></ProtectedRoute>} />
            <Route path="/:slug/settings" element={<SettingsPage />} />
            <Route path="/:slug/profile" element={<ProfilePage />} />
            <Route path="/:slug/emcee" element={<EmceePage />} />
            <Route path="/:slug/templates" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN']}><TemplatesPage /></ProtectedRoute>} />
            <Route path="/:slug/reports" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'TALLY_MASTER', 'ORGANIZER', 'BOARD']}><ReportsPage /></ProtectedRoute>} />
            <Route path="/:slug/notifications" element={<NotificationsPage />} />
            <Route path="/:slug/backups" element={<BackupManagementPage />} />
            <Route path="/:slug/disaster-recovery" element={<DisasterRecoveryPage />} />
            <Route path="/:slug/workflows" element={<WorkflowManagementPage />} />
            <Route path="/:slug/search" element={<SearchPage />} />
            <Route path="/:slug/files" element={<FileManagementPage />} />
            <Route path="/:slug/email-templates" element={<EmailTemplatesPage />} />
            <Route path="/:slug/custom-fields" element={<CustomFieldsPage />} />
            <Route path="/:slug/tenants" element={<TenantManagementPage />} />
            <Route path="/:slug/mfa" element={<MFASettingsPage />} />
            <Route path="/:slug/database" element={<DatabaseBrowserPage />} />
            <Route path="/:slug/cache" element={<CacheManagementPage />} />
            <Route path="/:slug/archive" element={<ArchivePage />} />
            <Route path="/:slug/deductions" element={<DeductionsPage />} />
            <Route path="/:slug/certifications" element={<CertificationsPage />} />
            <Route path="/:slug/logs" element={<LogViewerPage />} />
            <Route path="/:slug/performance" element={<PerformancePage />} />
            <Route path="/:slug/data-wipe" element={<DataWipePage />} />
            <Route path="/:slug/event-templates" element={<EventTemplatesPage />} />
            <Route path="/:slug/bulk-operations" element={<BulkOperationsPage />} />
            <Route path="/:slug/category-types" element={<CategoryTypesPage />} />
            <Route path="/:slug/field-visibility" element={<FieldVisibilityPage />} />
            <Route path="/:slug/test-event-setup" element={<TestEventSetupPage />} />
            <Route path="/:slug/bios" element={<BiosPage />} />
            <Route path="/:slug/assignments" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD']}><AssignmentsPage /></ProtectedRoute>} />
            <Route path="/:slug/rate-limit-configs" element={<RateLimitConfigPage />} />
            <Route path="/:slug/tally-master" element={<ProtectedRoute requiredRole={['TALLY_MASTER', 'ADMIN', 'SUPER_ADMIN']}><TallyDashboardPage /></ProtectedRoute>} />
            <Route path="/:slug/auditor" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorPage /></ProtectedRoute>} />
            <Route path="/:slug/auditor/pending-audits" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorPendingAuditsPage /></ProtectedRoute>} />
            <Route path="/:slug/auditor/score-verification" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorScoreVerificationPage /></ProtectedRoute>} />
            <Route path="/:slug/auditor/final-certification" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorFinalCertificationPage /></ProtectedRoute>} />
            <Route path="/:slug/auditor/certification-status" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorCertificationStatusPage /></ProtectedRoute>} />
            <Route path="/:slug/auditor/reports" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorReportsPage /></ProtectedRoute>} />
            <Route path="/:slug/auditor/audit-log" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorAuditLogPage /></ProtectedRoute>} />
            <Route path="/:slug/board" element={<ProtectedRoute requiredRole={['BOARD', 'ADMIN', 'SUPER_ADMIN']}><BoardPage /></ProtectedRoute>} />
            <Route path="/:slug/board/certifications" element={<ProtectedRoute requiredRole={['BOARD', 'ADMIN', 'SUPER_ADMIN']}><BoardCertificationsPage /></ProtectedRoute>} />
            <Route path="/:slug/board/score-removal" element={<ProtectedRoute requiredRole={['BOARD', 'ADMIN', 'SUPER_ADMIN']}><BoardScoreRemovalPage /></ProtectedRoute>} />
            <Route path="/:slug/permissions" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER']}><PermissionsPage /></ProtectedRoute>} />
            <Route path="/:slug/permissions/audit-logs" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER']}><PermissionAuditLogPage /></ProtectedRoute>} />
            <Route path="/:slug/activity" element={<ActivityLogPage />} />
            <Route path="/:slug/test-runner" element={<TestRunnerPage />} />
            <Route path="/:slug" element={<Navigate to={`${basePath}/dashboard`} replace />} />

            {/* 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </ProtectedRoute>
  )
}

const TenantRouter: React.FC<TenantRouterProps> = ({ onOpenCommandPalette }) => {
  return (
    <TenantProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes - no authentication required */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/:slug/login" element={<LoginPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/help/*" element={<HelpPage />} />
            <Route path="/:slug/help" element={<HelpPage />} />
            <Route path="/:slug/help/*" element={<HelpPage />} />

            {/* All other routes go through AppRoutes (with authentication) */}
            <Route path="/*" element={<AppRoutes onOpenCommandPalette={onOpenCommandPalette} />} />
          </Routes>
        </Suspense>
      </div>
    </TenantProvider>
  )
}

export default TenantRouter
