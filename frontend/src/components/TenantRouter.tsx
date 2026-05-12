import React, { Suspense, useMemo } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { TenantProvider } from '../contexts/TenantContext'
import { useAuth } from '../contexts/AuthContext'
import ProtectedRoute from './ProtectedRoute'
import Layout from './Layout'
import EnvironmentIndicator from './EnvironmentIndicator'
import { lazyWithRetry } from '../utils/lazyWithRetry'
import { isKnownRoute } from '../utils/routeSegments'
import ResultsPage from '../pages/ResultsPage'
import ScoreGovernancePage from '../pages/ScoreGovernancePage'

// Lazy load pages
const LoginPage = lazyWithRetry(() => import('../pages/LoginPage'), 'LoginPage')
const PublicLandingPage = lazyWithRetry(() => import('../pages/PublicLandingPage'), 'PublicLandingPage')
const ForgotPasswordPage = lazyWithRetry(() => import('../pages/ForgotPasswordPage'), 'ForgotPasswordPage')
const RegisterPage = lazyWithRetry(() => import('../pages/RegisterPage'), 'RegisterPage')
const DashboardPage = lazyWithRetry(() => import('../pages/DashboardPage'), 'DashboardPage')
const EventsPage = lazyWithRetry(() => import('../pages/EventsPage'), 'EventsPage')
const ContestsPage = lazyWithRetry(() => import('../pages/ContestsPage'), 'ContestsPage')
const CategoriesPage = lazyWithRetry(() => import('../pages/CategoriesPage'), 'CategoriesPage')
const ScoringPage = lazyWithRetry(() => import('../pages/ScoringPage'), 'ScoringPage')
// Keep critical UAT routes eagerly loaded to avoid lazy chunk fetch flakiness.
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
const JudgeSchedulesPage = lazyWithRetry(() => import('../pages/JudgeSchedulesPage'), 'JudgeSchedulesPage')
const RateLimitConfigPage = lazyWithRetry(() => import('../pages/RateLimitConfigPage'), 'RateLimitConfigPage')
const ActivityLogPage = lazyWithRetry(() => import('../pages/ActivityLogPage'), 'ActivityLogPage')
const LoginLocationsPage = lazyWithRetry(() => import('../pages/LoginLocationsPage'), 'LoginLocationsPage')
const TestRunnerPage = lazyWithRetry(() => import('../pages/TestRunnerPage'), 'TestRunnerPage')
const UatIdsPage = lazyWithRetry(() => import('../pages/UatIdsPage'), 'UatIdsPage')
const AuditorPendingAuditsPage = lazyWithRetry(() => import('../pages/AuditorPendingAuditsPage'), 'AuditorPendingAuditsPage')
const AuditorFinalCertificationPage = lazyWithRetry(() => import('../pages/AuditorFinalCertificationPage'), 'AuditorFinalCertificationPage')
const AuditorReportsPage = lazyWithRetry(() => import('../pages/AuditorReportsPage'), 'AuditorReportsPage')
const AuditorAuditLogPage = lazyWithRetry(() => import('../pages/AuditorAuditLogPage'), 'AuditorAuditLogPage')
const TallyDashboardPage = lazyWithRetry(() => import('../pages/TallyDashboardPage'), 'TallyDashboardPage')
const BoardPage = lazyWithRetry(() => import('../pages/BoardPage'), 'BoardPage')
const BoardCertificationsPage = lazyWithRetry(() => import('../pages/BoardCertificationsPage'), 'BoardCertificationsPage')
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

const AliasRedirect: React.FC<{ targetPath: string }> = ({ targetPath }) => {
  const location = useLocation()
  const { tenantSlug } = parseUrlPath(location.pathname)
  const basePath = tenantSlug ? `/${tenantSlug}` : ''

  const [targetWithSearch, targetHash = ''] = targetPath.split('#')
  const [pathname, targetSearch = ''] = targetWithSearch.split('?')
  const params = new URLSearchParams(location.search)
  const targetParams = new URLSearchParams(targetSearch)
  targetParams.forEach((value, key) => {
    params.set(key, value)
  })
  const search = params.toString()
  const hash = targetHash ? `#${targetHash}` : location.hash

  return <Navigate to={`${basePath}${pathname}${search ? `?${search}` : ''}${hash}`} replace />
}

const TenantPublicOrAppRoute: React.FC<{ onOpenCommandPalette: () => void }> = ({ onOpenCommandPalette }) => {
  const location = useLocation()
  const slug = location.pathname.split('/').filter(Boolean)[0] || ''
  if (isKnownRoute(slug)) {
    return <AppRoutes onOpenCommandPalette={onOpenCommandPalette} />
  }
  return <PublicLandingPage />
}

const getRoleHomePath = (role?: string): string => {
  switch (role) {
    case 'TALLY_MASTER':
      return '/tally-master'
    case 'EMCEE':
      return '/emcee'
    case 'BOARD':
      return '/board'
    default:
      return '/dashboard'
  }
}

const RoleDefaultRoute: React.FC<{ basePath: string }> = ({ basePath }) => {
  const { user } = useAuth()
  return <Navigate to={`${basePath}${getRoleHomePath(user?.role)}`} replace />
}

const ADMIN_STANDARD_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']
const ADMIN_STRICT_ROLES = ['SUPER_ADMIN', 'ADMIN']
const MONITORING_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']
const SUPER_ADMIN_ONLY = ['SUPER_ADMIN']
const SCORING_ROLES = ['JUDGE', 'BOARD', 'ADMIN', 'SUPER_ADMIN']
const EMCEE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'EMCEE', 'ORGANIZER', 'BOARD']
const DEDUCTION_ROLES = ['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']

// Main app routes component that handles routing based on parsed URL
const AppRoutes: React.FC<{ onOpenCommandPalette: () => void }> = ({ onOpenCommandPalette }) => {
  const location = useLocation()
  const { user } = useAuth()
  const { tenantSlug, route, restPath } = useMemo(
    () => parseUrlPath(location.pathname),
    [location.pathname]
  )

  const userTenantSlug = user?.tenant?.slug
  const shouldCanonicalizeToTenantPath =
    !tenantSlug &&
    Boolean(userTenantSlug)

  if (shouldCanonicalizeToTenantPath) {
    return (
      <Navigate
        to={`/${userTenantSlug}${location.pathname}${location.search}${location.hash}`}
        replace
      />
    )
  }

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
            <Route path="/" element={<RoleDefaultRoute basePath={basePath} />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/events" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><EventsPage /></ProtectedRoute>} />
            <Route path="/contests" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><ContestsPage /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><CategoriesPage /></ProtectedRoute>} />
            <Route path="/events/:eventId/contests" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><ContestsPage /></ProtectedRoute>} />
            <Route path="/contests/:contestId/categories" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><CategoriesPage /></ProtectedRoute>} />
            <Route path="/scoring" element={<ProtectedRoute requiredRole={SCORING_ROLES}><ScoringPage /></ProtectedRoute>} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/winners" element={<ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']}><WinnersPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD']}><UsersPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><AdminPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><SettingsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/emcee" element={<ProtectedRoute requiredRole={EMCEE_ROLES}><EmceePage /></ProtectedRoute>} />
            <Route path="/emcee-scripts" element={<AliasRedirect targetPath="/emcee?tab=scripts" />} />
            <Route path="/templates" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><TemplatesPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD']}><ReportsPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/backups" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><BackupManagementPage /></ProtectedRoute>} />
            <Route path="/disaster-recovery" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><DisasterRecoveryPage /></ProtectedRoute>} />
            <Route path="/workflows" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><WorkflowManagementPage /></ProtectedRoute>} />
            <Route path="/files" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><FileManagementPage /></ProtectedRoute>} />
            <Route path="/email-templates" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><EmailTemplatesPage /></ProtectedRoute>} />
            <Route path="/custom-fields" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><CustomFieldsPage /></ProtectedRoute>} />
            <Route path="/tenants" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><TenantManagementPage /></ProtectedRoute>} />
            <Route path="/mfa" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><MFASettingsPage /></ProtectedRoute>} />
            <Route path="/database" element={<ProtectedRoute requiredRole={SUPER_ADMIN_ONLY}><DatabaseBrowserPage /></ProtectedRoute>} />
            <Route path="/cache" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><CacheManagementPage /></ProtectedRoute>} />
            <Route path="/archive" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><ArchivePage /></ProtectedRoute>} />
            <Route path="/deductions" element={<ProtectedRoute requiredRole={DEDUCTION_ROLES}><DeductionsPage /></ProtectedRoute>} />
            <Route path="/certifications" element={<ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']}><CertificationsPage /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><LogViewerPage /></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><ActivityLogPage /></ProtectedRoute>} />
            <Route path="/login-locations" element={<ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']}><LoginLocationsPage /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute requiredRole={MONITORING_ROLES}><PerformancePage /></ProtectedRoute>} />
            <Route path="/data-wipe" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><DataWipePage /></ProtectedRoute>} />
            <Route path="/event-templates" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><EventTemplatesPage /></ProtectedRoute>} />
            <Route path="/bulk-operations" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><BulkOperationsPage /></ProtectedRoute>} />
            <Route path="/send-email" element={<AliasRedirect targetPath="/bulk-operations" />} />
            <Route path="/category-types" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><CategoryTypesPage /></ProtectedRoute>} />
            <Route path="/field-visibility" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><FieldVisibilityPage /></ProtectedRoute>} />
            <Route path="/test-event-setup" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><TestEventSetupPage /></ProtectedRoute>} />
            <Route path="/bios" element={<BiosPage />} />
            <Route path="/contestant-bios" element={<AliasRedirect targetPath="/bios" />} />
            <Route path="/judge-bios" element={<AliasRedirect targetPath="/bios" />} />
            <Route path="/event-management" element={<AliasRedirect targetPath="/emcee" />} />
            <Route path="/assignments" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD']}><AssignmentsPage /></ProtectedRoute>} />
            <Route path="/judge-schedules" element={<ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE']}><JudgeSchedulesPage /></ProtectedRoute>} />
            <Route path="/judges-schedules" element={<AliasRedirect targetPath="/judge-schedules" />} />
            <Route path="/rate-limit-configs" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><RateLimitConfigPage /></ProtectedRoute>} />
            <Route path="/uat-ids" element={<ProtectedRoute requiredRole={MONITORING_ROLES}><UatIdsPage /></ProtectedRoute>} />
            <Route path="/test-runner" element={<ProtectedRoute requiredRole={SUPER_ADMIN_ONLY}><TestRunnerPage /></ProtectedRoute>} />
            <Route path="/tally-master" element={<ProtectedRoute requiredRole={['TALLY_MASTER', 'ADMIN', 'SUPER_ADMIN']}><TallyDashboardPage /></ProtectedRoute>} />
            <Route path="/score-governance" element={<ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']}><ScoreGovernancePage /></ProtectedRoute>} />
            <Route path="/governance" element={<AliasRedirect targetPath="/score-governance" />} />
            <Route path="/score-removal" element={<AliasRedirect targetPath="/score-governance" />} />
            <Route path="/score-removal-requests" element={<AliasRedirect targetPath="/score-governance" />} />
            <Route path="/auditor" element={<AliasRedirect targetPath="/dashboard" />} />
            <Route path="/auditor/pending-audits" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorPendingAuditsPage /></ProtectedRoute>} />
            <Route path="/auditor/score-verification" element={<AliasRedirect targetPath="/certifications" />} />
            <Route path="/auditor/final-certification" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorFinalCertificationPage /></ProtectedRoute>} />
            <Route path="/auditor/certification-status" element={<AliasRedirect targetPath="/certifications" />} />
            <Route path="/auditor/reports" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorReportsPage /></ProtectedRoute>} />
            <Route path="/auditor/audit-log" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorAuditLogPage /></ProtectedRoute>} />
            <Route path="/board" element={<ProtectedRoute requiredRole={['BOARD', 'ADMIN', 'SUPER_ADMIN']}><BoardPage /></ProtectedRoute>} />
            <Route path="/board/certifications" element={<ProtectedRoute requiredRole={['BOARD', 'ADMIN', 'SUPER_ADMIN']}><BoardCertificationsPage /></ProtectedRoute>} />
            <Route path="/board/score-removal" element={<AliasRedirect targetPath="/score-governance" />} />
            <Route path="/permissions" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER']}><PermissionsPage /></ProtectedRoute>} />
            <Route path="/permissions/audit-logs" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER']}><PermissionAuditLogPage /></ProtectedRoute>} />

            {/* Tenant-prefixed routes - these match the same pages under /:slug prefix */}
            <Route path="/:slug/dashboard" element={<DashboardPage />} />
            <Route path="/:slug/events" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><EventsPage /></ProtectedRoute>} />
            <Route path="/:slug/contests" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><ContestsPage /></ProtectedRoute>} />
            <Route path="/:slug/categories" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><CategoriesPage /></ProtectedRoute>} />
            <Route path="/:slug/events/:eventId/contests" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><ContestsPage /></ProtectedRoute>} />
            <Route path="/:slug/contests/:contestId/categories" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><CategoriesPage /></ProtectedRoute>} />
            <Route path="/:slug/scoring" element={<ProtectedRoute requiredRole={SCORING_ROLES}><ScoringPage /></ProtectedRoute>} />
            <Route path="/:slug/results" element={<ResultsPage />} />
            <Route path="/:slug/winners" element={<ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']}><WinnersPage /></ProtectedRoute>} />
            <Route path="/:slug/users" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD']}><UsersPage /></ProtectedRoute>} />
            <Route path="/:slug/admin" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><AdminPage /></ProtectedRoute>} />
            <Route path="/:slug/settings" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><SettingsPage /></ProtectedRoute>} />
            <Route path="/:slug/profile" element={<ProfilePage />} />
            <Route path="/:slug/emcee" element={<ProtectedRoute requiredRole={EMCEE_ROLES}><EmceePage /></ProtectedRoute>} />
            <Route path="/:slug/emcee-scripts" element={<AliasRedirect targetPath="/emcee?tab=scripts" />} />
            <Route path="/:slug/templates" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><TemplatesPage /></ProtectedRoute>} />
            <Route path="/:slug/reports" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD']}><ReportsPage /></ProtectedRoute>} />
            <Route path="/:slug/notifications" element={<NotificationsPage />} />
            <Route path="/:slug/backups" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><BackupManagementPage /></ProtectedRoute>} />
            <Route path="/:slug/disaster-recovery" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><DisasterRecoveryPage /></ProtectedRoute>} />
            <Route path="/:slug/workflows" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><WorkflowManagementPage /></ProtectedRoute>} />
            <Route path="/:slug/files" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><FileManagementPage /></ProtectedRoute>} />
            <Route path="/:slug/email-templates" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><EmailTemplatesPage /></ProtectedRoute>} />
            <Route path="/:slug/custom-fields" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><CustomFieldsPage /></ProtectedRoute>} />
            <Route path="/:slug/tenants" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><TenantManagementPage /></ProtectedRoute>} />
            <Route path="/:slug/mfa" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><MFASettingsPage /></ProtectedRoute>} />
            <Route path="/:slug/database" element={<ProtectedRoute requiredRole={SUPER_ADMIN_ONLY}><DatabaseBrowserPage /></ProtectedRoute>} />
            <Route path="/:slug/cache" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><CacheManagementPage /></ProtectedRoute>} />
            <Route path="/:slug/archive" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><ArchivePage /></ProtectedRoute>} />
            <Route path="/:slug/deductions" element={<ProtectedRoute requiredRole={DEDUCTION_ROLES}><DeductionsPage /></ProtectedRoute>} />
            <Route path="/:slug/certifications" element={<ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']}><CertificationsPage /></ProtectedRoute>} />
            <Route path="/:slug/logs" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><LogViewerPage /></ProtectedRoute>} />
            <Route path="/:slug/performance" element={<ProtectedRoute requiredRole={MONITORING_ROLES}><PerformancePage /></ProtectedRoute>} />
            <Route path="/:slug/data-wipe" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><DataWipePage /></ProtectedRoute>} />
            <Route path="/:slug/event-templates" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><EventTemplatesPage /></ProtectedRoute>} />
            <Route path="/:slug/bulk-operations" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><BulkOperationsPage /></ProtectedRoute>} />
            <Route path="/:slug/send-email" element={<AliasRedirect targetPath="/bulk-operations" />} />
            <Route path="/:slug/category-types" element={<ProtectedRoute requiredRole={ADMIN_STANDARD_ROLES}><CategoryTypesPage /></ProtectedRoute>} />
            <Route path="/:slug/field-visibility" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><FieldVisibilityPage /></ProtectedRoute>} />
            <Route path="/:slug/test-event-setup" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><TestEventSetupPage /></ProtectedRoute>} />
            <Route path="/:slug/bios" element={<BiosPage />} />
            <Route path="/:slug/contestant-bios" element={<AliasRedirect targetPath="/bios" />} />
            <Route path="/:slug/judge-bios" element={<AliasRedirect targetPath="/bios" />} />
            <Route path="/:slug/event-management" element={<AliasRedirect targetPath="/emcee" />} />
            <Route path="/:slug/assignments" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD']}><AssignmentsPage /></ProtectedRoute>} />
            <Route path="/:slug/judge-schedules" element={<ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE']}><JudgeSchedulesPage /></ProtectedRoute>} />
            <Route path="/:slug/judges-schedules" element={<AliasRedirect targetPath="/judge-schedules" />} />
            <Route path="/:slug/rate-limit-configs" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><RateLimitConfigPage /></ProtectedRoute>} />
            <Route path="/:slug/uat-ids" element={<ProtectedRoute requiredRole={MONITORING_ROLES}><UatIdsPage /></ProtectedRoute>} />
            <Route path="/:slug/tally-master" element={<ProtectedRoute requiredRole={['TALLY_MASTER', 'ADMIN', 'SUPER_ADMIN']}><TallyDashboardPage /></ProtectedRoute>} />
            <Route path="/:slug/score-governance" element={<ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']}><ScoreGovernancePage /></ProtectedRoute>} />
            <Route path="/:slug/governance" element={<AliasRedirect targetPath="/score-governance" />} />
            <Route path="/:slug/score-removal" element={<AliasRedirect targetPath="/score-governance" />} />
            <Route path="/:slug/score-removal-requests" element={<AliasRedirect targetPath="/score-governance" />} />
            <Route path="/:slug/auditor" element={<AliasRedirect targetPath="/dashboard" />} />
            <Route path="/:slug/auditor/pending-audits" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorPendingAuditsPage /></ProtectedRoute>} />
            <Route path="/:slug/auditor/score-verification" element={<AliasRedirect targetPath="/certifications" />} />
            <Route path="/:slug/auditor/final-certification" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorFinalCertificationPage /></ProtectedRoute>} />
            <Route path="/:slug/auditor/certification-status" element={<AliasRedirect targetPath="/certifications" />} />
            <Route path="/:slug/auditor/reports" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorReportsPage /></ProtectedRoute>} />
            <Route path="/:slug/auditor/audit-log" element={<ProtectedRoute requiredRole={['AUDITOR', 'ADMIN', 'SUPER_ADMIN']}><AuditorAuditLogPage /></ProtectedRoute>} />
            <Route path="/:slug/board" element={<ProtectedRoute requiredRole={['BOARD', 'ADMIN', 'SUPER_ADMIN']}><BoardPage /></ProtectedRoute>} />
            <Route path="/:slug/board/certifications" element={<ProtectedRoute requiredRole={['BOARD', 'ADMIN', 'SUPER_ADMIN']}><BoardCertificationsPage /></ProtectedRoute>} />
            <Route path="/:slug/board/score-removal" element={<AliasRedirect targetPath="/score-governance" />} />
            <Route path="/:slug/permissions" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER']}><PermissionsPage /></ProtectedRoute>} />
            <Route path="/:slug/permissions/audit-logs" element={<ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN', 'ORGANIZER']}><PermissionAuditLogPage /></ProtectedRoute>} />
            <Route path="/:slug/activity" element={<ProtectedRoute requiredRole={ADMIN_STRICT_ROLES}><ActivityLogPage /></ProtectedRoute>} />
            <Route path="/:slug/login-locations" element={<ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']}><LoginLocationsPage /></ProtectedRoute>} />
            <Route path="/:slug/test-runner" element={<ProtectedRoute requiredRole={SUPER_ADMIN_ONLY}><TestRunnerPage /></ProtectedRoute>} />
            <Route path="/:slug" element={<RoleDefaultRoute basePath={basePath} />} />

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
        <EnvironmentIndicator />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes - no authentication required */}
            <Route path="/" element={<PublicLandingPage />} />
            <Route path="/:slug" element={<TenantPublicOrAppRoute onOpenCommandPalette={onOpenCommandPalette} />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/:slug/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/:slug/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/:slug/register" element={<RegisterPage />} />
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
