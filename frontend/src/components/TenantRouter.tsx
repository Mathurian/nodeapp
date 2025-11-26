import React, { Suspense, lazy, useMemo } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { TenantProvider } from '../contexts/TenantContext'
import ProtectedRoute from './ProtectedRoute'
import Layout from './Layout'

// Lazy load pages
const LoginPage = lazy(() => import('../pages/LoginPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const EventsPage = lazy(() => import('../pages/EventsPage'))
const ContestsPage = lazy(() => import('../pages/ContestsPage'))
const CategoriesPage = lazy(() => import('../pages/CategoriesPage'))
const ScoringPage = lazy(() => import('../pages/ScoringPage'))
const ResultsPage = lazy(() => import('../pages/ResultsPage'))
const UsersPage = lazy(() => import('../pages/UsersPage'))
const AdminPage = lazy(() => import('../pages/AdminPage'))
const SettingsPage = lazy(() => import('../pages/SettingsPage'))
const ProfilePage = lazy(() => import('../pages/ProfilePage'))
const EmceePage = lazy(() => import('../pages/EmceePage'))
const TemplatesPage = lazy(() => import('../pages/TemplatesPage'))
const ReportsPage = lazy(() => import('../pages/ReportsPage'))
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'))
const BackupManagementPage = lazy(() => import('../pages/BackupManagementPage'))
const DisasterRecoveryPage = lazy(() => import('../pages/DisasterRecoveryPage'))
const WorkflowManagementPage = lazy(() => import('../pages/WorkflowManagementPage'))
const SearchPage = lazy(() => import('../pages/SearchPage'))
const FileManagementPage = lazy(() => import('../pages/FileManagementPage'))
const EmailTemplatesPage = lazy(() => import('../pages/EmailTemplatesPage'))
const CustomFieldsPage = lazy(() => import('../pages/CustomFieldsPage'))
const TenantManagementPage = lazy(() => import('../pages/TenantManagementPage'))
const MFASettingsPage = lazy(() => import('../pages/MFASettingsPage'))
const DatabaseBrowserPage = lazy(() => import('../pages/DatabaseBrowserPage'))
const CacheManagementPage = lazy(() => import('../pages/CacheManagementPage'))
const ArchivePage = lazy(() => import('../pages/ArchivePage'))
const DeductionsPage = lazy(() => import('../pages/DeductionsPage'))
const CertificationsPage = lazy(() => import('../pages/CertificationsPage'))
const LogViewerPage = lazy(() => import('../pages/LogViewerPage'))
const PerformancePage = lazy(() => import('../pages/PerformancePage'))
const DataWipePage = lazy(() => import('../pages/DataWipePage'))
const EventTemplatesPage = lazy(() => import('../pages/EventTemplatesPage'))
const BulkOperationsPage = lazy(() => import('../pages/BulkOperationsPage'))
const CommentaryPage = lazy(() => import('../pages/CommentaryPage'))
const CategoryTypesPage = lazy(() => import('../pages/CategoryTypesPage'))
const HelpPage = lazy(() => import('../pages/HelpPage'))
const FieldVisibilityPage = lazy(() => import('../pages/FieldVisibilityPage'))
const TestEventSetupPage = lazy(() => import('../pages/TestEventSetupPage'))
const BiosPage = lazy(() => import('../pages/BiosPage'))
const AssignmentsPage = lazy(() => import('../pages/AssignmentsPage'))
const RateLimitConfigPage = lazy(() => import('../pages/RateLimitConfigPage'))

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
  'test-event-setup', 'help', 'bios', 'assignments', 'rate-limit-configs'
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
            <Route path="/scoring" element={<ScoringPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/emcee" element={<EmceePage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
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
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/data-wipe" element={<DataWipePage />} />
            <Route path="/event-templates" element={<EventTemplatesPage />} />
            <Route path="/bulk-operations" element={<BulkOperationsPage />} />
            <Route path="/commentary" element={<CommentaryPage />} />
            <Route path="/category-types" element={<CategoryTypesPage />} />
            <Route path="/field-visibility" element={<FieldVisibilityPage />} />
            <Route path="/test-event-setup" element={<TestEventSetupPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/bios" element={<BiosPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/rate-limit-configs" element={<RateLimitConfigPage />} />

            {/* Tenant-prefixed routes - these match the same pages under /:slug prefix */}
            <Route path="/:slug/dashboard" element={<DashboardPage />} />
            <Route path="/:slug/events" element={<EventsPage />} />
            <Route path="/:slug/contests" element={<ContestsPage />} />
            <Route path="/:slug/categories" element={<CategoriesPage />} />
            <Route path="/:slug/events/:eventId/contests" element={<ContestsPage />} />
            <Route path="/:slug/contests/:contestId/categories" element={<CategoriesPage />} />
            <Route path="/:slug/scoring" element={<ScoringPage />} />
            <Route path="/:slug/results" element={<ResultsPage />} />
            <Route path="/:slug/users" element={<UsersPage />} />
            <Route path="/:slug/admin" element={<AdminPage />} />
            <Route path="/:slug/settings" element={<SettingsPage />} />
            <Route path="/:slug/profile" element={<ProfilePage />} />
            <Route path="/:slug/emcee" element={<EmceePage />} />
            <Route path="/:slug/templates" element={<TemplatesPage />} />
            <Route path="/:slug/reports" element={<ReportsPage />} />
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
            <Route path="/:slug/commentary" element={<CommentaryPage />} />
            <Route path="/:slug/category-types" element={<CategoryTypesPage />} />
            <Route path="/:slug/field-visibility" element={<FieldVisibilityPage />} />
            <Route path="/:slug/test-event-setup" element={<TestEventSetupPage />} />
            <Route path="/:slug/help" element={<HelpPage />} />
            <Route path="/:slug/bios" element={<BiosPage />} />
            <Route path="/:slug/assignments" element={<AssignmentsPage />} />
            <Route path="/:slug/rate-limit-configs" element={<RateLimitConfigPage />} />
            <Route path="/:slug" element={<Navigate to={`${basePath}/dashboard`} replace />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to={`${basePath}/dashboard`} replace />} />
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
            {/* Login routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/:slug/login" element={<LoginPage />} />

            {/* All other routes go through AppRoutes */}
            <Route path="/*" element={<AppRoutes onOpenCommandPalette={onOpenCommandPalette} />} />
          </Routes>
        </Suspense>
      </div>
    </TenantProvider>
  )
}

export default TenantRouter
