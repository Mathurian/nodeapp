import React from 'react'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { useSystemSettings } from '../contexts/SystemSettingsContext'
import { adminAPI, tenantsAPI, eventsAPI, contestsAPI, scoreGovernanceAPI, tallyMasterAPI, auditorAPI, boardAPI } from '../services/api'
import { DEFAULT_APP_BASELINE } from '../config/appBaseline'
import {
  ChartBarIcon,
  UsersIcon,
  CalendarIcon,
  TrophyIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  BellIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { StatCardSkeleton, ActivityItemSkeleton, TableRowSkeleton } from '../components/ui/SkeletonPatterns'
import { Card, PageHeader, ResponsiveTable, StatsCard } from '../components/ui'
import { safeFormatDate, safeLocaleDateString } from '../utils/dateUtils'

interface DashboardStats {
  totalUsers: number
  totalEvents: number
  totalContests: number
  totalCategories: number
  totalScores: number
  activeUsers: number
  pendingCertifications: number
  certificationBreakdown: {
    judge: number
    tallyMaster: number
    auditor: number
    board: number
  }
  systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  lastBackup: string | null
  databaseSize: string
  uptime: string
  uptimeSeconds: number
}

interface RecentActivity {
  id: string
  action: string
  resourceType: string
  resourceId: string
  userId: string
  user: {
    id: string
    name: string
    role: string
  }
  createdAt: string
}

interface ScopedEvent {
  id: string
  name: string
  startDate: string
  endDate: string
}

interface ScopedContest {
  id: string
  name: string
  eventId: string
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const { settings } = useSystemSettings()
  const appName = settings.app_name || DEFAULT_APP_BASELINE.appName

  // Admin endpoints only allow SUPER_ADMIN, ADMIN, ORGANIZER, BOARD
  const canViewAdminData = !!user && (
    user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ||
    user.role === 'ORGANIZER' || user.role === 'BOARD'
  )

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>(
    'dashboard-stats',
    async () => {
      const response = await adminAPI.getStats()
      // Backend wraps response: { success, message, data: {...stats...}, timestamp }
      // So we need: response.data.data
      return response.data.data || response.data
    },
    {
      enabled: canViewAdminData,
      refetchInterval: 30000, // Refresh every 30 seconds
      retry: 1,
      onError: (err) => console.error('Dashboard stats fetch failed:', err),
    }
  )

  const { data: recentActivity, isLoading: activityLoading, error: activityError } = useQuery<RecentActivity[]>(
    'recent-activity',
    async () => {
      const response = await adminAPI.getActivityLogs()
      // Backend wraps response: { success, message, data: { data: [...], pagination: {} }, timestamp }
      // So we need to unwrap: response.data.data.data
      const unwrapped = response.data.data || response.data
      return unwrapped.data || unwrapped || []
    },
    {
      enabled: canViewAdminData,
      refetchInterval: 30000,
      retry: 1,
      onError: (err) => console.error('Recent activity fetch failed:', err),
    }
  )

  // Fetch tenants for super admin
  const { data: tenants, isLoading: tenantsLoading } = useQuery(
    'all-tenants',
    async () => {
      const response = await tenantsAPI.getAll({ limit: 100 })
      // Backend returns { tenants: [...], total, skip, take }
      return response.data.tenants || []
    },
    {
      enabled: user?.role === 'SUPER_ADMIN',
      retry: 1,
      onError: (err) => console.error('Tenants fetch failed:', err),
    }
  )

  const { data: contestantEvents = [] } = useQuery<ScopedEvent[]>(
    ['contestant-events', user?.id],
    async () => {
      const response = await eventsAPI.getAll()
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      enabled: user?.role === 'CONTESTANT',
      retry: 1,
    }
  )

  const { data: contestantContests = [] } = useQuery<ScopedContest[]>(
    ['contestant-contests', user?.id],
    async () => {
      const response = await contestsAPI.getAll()
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      enabled: user?.role === 'CONTESTANT',
      retry: 1,
    }
  )

  const getRoleGreeting = (role: string) => {
    const greetings = {
      ORGANIZER: 'Welcome to your Event Organizer Dashboard',
      JUDGE: 'Welcome to your Judge Dashboard',
      CONTESTANT: 'Welcome to your Contestant Dashboard',
      EMCEE: 'Welcome to your Emcee Dashboard',
      TALLY_MASTER: 'Welcome to your Tally Master Dashboard',
      AUDITOR: 'Welcome to your Auditor Dashboard',
      BOARD: 'Welcome to your Board Dashboard',
      ADMIN: 'Welcome to your Admin Dashboard',
    }
    return greetings[role as keyof typeof greetings] || DEFAULT_APP_BASELINE.dashboardWelcome
  }

  const getRoleDescription = (role: string) => {
    const descriptions = {
      ORGANIZER: 'Manage events, contests, and oversee all activities',
      JUDGE: 'View assigned categories and submit scores',
      CONTESTANT: 'View your events, contests, and results',
      EMCEE: 'Access scripts and manage event flow',
      TALLY_MASTER: 'Verify and certify scores',
      AUDITOR: 'Audit and review score certifications',
      BOARD: 'Review and approve final certifications',
      ADMIN: 'Full system administration and configuration',
    }
    return descriptions[role as keyof typeof descriptions] || 'Your personal dashboard'
  }

  const getQuickActions = (role: string) => {
    const actions: Record<string, Array<{ label: string; href: string; icon: any; color: string }>> = {
      JUDGE: [
        { label: 'Score Categories', href: '/scoring', icon: TrophyIcon, color: 'blue' },
        { label: 'My Schedule', href: '/judge-schedules', icon: CalendarIcon, color: 'indigo' },
        { label: 'View Results', href: '/results', icon: ChartBarIcon, color: 'green' },
      ],
      CONTESTANT: [
        { label: 'Bios Directory', href: '/bios', icon: CalendarIcon, color: 'blue' },
        { label: 'View Results', href: '/results', icon: ChartBarIcon, color: 'green' },
      ],
      EMCEE: [
        { label: 'Emcee Console', href: '/emcee', icon: UsersIcon, color: 'blue' },
        { label: 'Scripts', href: '/emcee?tab=scripts', icon: TrophyIcon, color: 'indigo' },
        { label: 'Bios Directory', href: '/bios', icon: UsersIcon, color: 'green' },
      ],
      TALLY_MASTER: [
        { label: 'Tally Dashboard', href: '/tally-master', icon: ChartBarIcon, color: 'blue' },
        { label: 'Certifications', href: '/certifications', icon: CheckCircleIcon, color: 'green' },
        { label: 'Governance Queue', href: '/score-governance', icon: ExclamationTriangleIcon, color: 'orange' },
      ],
      AUDITOR: [
        { label: 'Certifications', href: '/certifications', icon: CheckCircleIcon, color: 'blue' },
        { label: 'Audit Queue', href: '/auditor/pending-audits', icon: ClockIcon, color: 'green' },
        { label: 'Deductions', href: '/deductions', icon: TrophyIcon, color: 'indigo' },
        { label: 'Governance Queue', href: '/score-governance', icon: ExclamationTriangleIcon, color: 'orange' },
      ],
      BOARD: [
        { label: 'Events', href: '/events', icon: CalendarIcon, color: 'blue' },
        { label: 'Users', href: '/users', icon: UsersIcon, color: 'green' },
        { label: 'Reports', href: '/reports', icon: ChartBarIcon, color: 'purple' },
        { label: 'Governance Queue', href: '/score-governance', icon: ExclamationTriangleIcon, color: 'orange' },
      ],
      ADMIN: [
        { label: 'System Admin', href: '/admin', icon: UsersIcon, color: 'blue' },
        { label: 'Events', href: '/events', icon: CalendarIcon, color: 'green' },
        { label: 'Judge Schedules', href: '/judge-schedules', icon: CalendarIcon, color: 'indigo' },
        { label: 'Manage Users', href: '/users', icon: UsersIcon, color: 'indigo' },
        { label: 'Reports', href: '/reports', icon: ChartBarIcon, color: 'purple' },
        { label: 'Settings', href: '/settings', icon: UsersIcon, color: 'orange' },
        { label: 'Governance Queue', href: '/score-governance', icon: ExclamationTriangleIcon, color: 'orange' },
      ],
      ORGANIZER: [
        { label: 'Create Event', href: '/events', icon: CalendarIcon, color: 'blue' },
        { label: 'Manage Users', href: '/users', icon: UsersIcon, color: 'green' },
        { label: 'Judge Schedules', href: '/judge-schedules', icon: CalendarIcon, color: 'indigo' },
        { label: 'View Reports', href: '/reports', icon: ChartBarIcon, color: 'purple' },
        { label: 'Event Templates', href: '/event-templates', icon: TrophyIcon, color: 'orange' },
        { label: 'Governance Queue', href: '/score-governance', icon: ExclamationTriangleIcon, color: 'orange' },
      ],
    }
    return actions[role] || actions.ADMIN
  }

  const statCards = [
    { label: 'Total Events', value: stats?.totalEvents || 0, icon: CalendarIcon, color: 'blue' },
    { label: 'Total Contests', value: stats?.totalContests || 0, icon: TrophyIcon, color: 'green' },
    { label: 'Total Categories', value: stats?.totalCategories || 0, icon: ChartBarIcon, color: 'indigo' },
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: UsersIcon, color: 'orange' },
    { label: 'Total Scores', value: stats?.totalScores || 0, icon: ArrowTrendingUpIcon, color: 'blue' },
    { label: 'Recently Active (24h)', value: stats?.activeUsers || 0, icon: UsersIcon, color: 'green' },
    { label: 'System Uptime', value: stats?.uptime || 'N/A', icon: ClockIcon, color: 'indigo', isText: true },
    { label: 'Database Size', value: stats?.databaseSize || 'N/A', icon: ChartBarIcon, color: 'orange', isText: true },
  ]

  const getActionColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800',
      green: 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800',
      purple: 'bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-800',
      orange: 'bg-orange-50 dark:bg-orange-900 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-800',
      indigo: 'bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const roleNeedsWorkflowQueue = ['TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER', 'ADMIN'].includes(user?.role || '')

  const { data: governancePendingCount = 0 } = useQuery<number>(
    ['dashboard-governance-pending', user?.role],
    async () => {
      const response = await scoreGovernanceAPI.getRequests({ status: 'PENDING' })
      const rows = response.data?.data || response.data || []
      return Array.isArray(rows) ? rows.length : 0
    },
    { enabled: roleNeedsWorkflowQueue, retry: 1, refetchInterval: 30000 }
  )

  const { data: roleCertificationPending = 0 } = useQuery<number>(
    ['dashboard-role-cert-pending', user?.role],
    async () => {
      if (user?.role === 'TALLY_MASTER') {
        const res = await tallyMasterAPI.getPendingCertifications()
        const rows = res.data?.data || res.data || []
        return Array.isArray(rows) ? rows.length : 0
      }
      if (user?.role === 'AUDITOR') {
        const res = await auditorAPI.getPendingAudits()
        const rows = res.data?.data || res.data || []
        return Array.isArray(rows) ? rows.length : 0
      }
      if (user?.role === 'BOARD') {
        const res = await boardAPI.getCertifications()
        const rows = res.data?.data || res.data || []
        return Array.isArray(rows) ? rows.filter((r: any) => String(r.status || '').toUpperCase() === 'PENDING').length : 0
      }
      const res = await adminAPI.getStats()
      const data = res.data?.data || res.data || {}
      return Number(data?.pendingCertifications || 0)
    },
    { enabled: roleNeedsWorkflowQueue, retry: 1, refetchInterval: 30000 }
  )

  // Handle errors — only show error state for roles that should have access
  if (canViewAdminData && (statsError || activityError)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Dashboard
            </h2>
            <p className="text-red-800 dark:text-red-200 mb-4">
              {statsError ? String(statsError) : String(activityError)}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="cgr-page-container">
        {/* Header */}
        <PageHeader
          title={getRoleGreeting(user?.role || '')}
          subtitle={getRoleDescription(user?.role || '')}
          icon={ChartBarIcon}
        />

        {/* Super Admin Cross-Tenant Indicator */}
        {user?.role === 'SUPER_ADMIN' && (
          <Card className="mb-8 bg-indigo-50 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                  Cross-Tenant View Active
                </h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                  You are viewing aggregated data across all tenants in the system.
                </p>
              </div>
            </div>
          </Card>
        )}

        {user?.role === 'CONTESTANT' && (
          <Card className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              My Scoped Participation
            </h2>
            {contestantEvents.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No event access is currently released for your contestant account.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Events: {contestantEvents.length} • Contests: {contestantContests.length}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {contestantEvents.slice(0, 6).map((event) => (
                    <div key={event.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{event.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {safeFormatDate(event.startDate, 'PP', 'N/A')} - {safeFormatDate(event.endDate, 'PP', 'N/A')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getQuickActions(user?.role || '').map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className="block"
              >
                <Card hover className={getActionColor(action.color)}>
                  <action.icon className="h-8 w-8 mb-3" />
                  <p className="font-semibold">{action.label}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Statistics */}
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ORGANIZER' || user?.role === 'ADMIN' || user?.role === 'BOARD') && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {user?.role === 'SUPER_ADMIN' ? 'System-Wide Overview (All Tenants)' : 'System Overview'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsLoading
                ? Array.from({ length: 8 }).map((_, index) => (
                    <StatCardSkeleton key={index} />
                  ))
                : statCards.map((stat) => (
                    <StatsCard
                      key={stat.label}
                      icon={stat.icon}
                      value={stat.value}
                      label={stat.label}
                      color={stat.color as 'blue' | 'green' | 'amber' | 'red' | 'indigo' | 'teal' | 'orange'}
                      compactText={Boolean(stat.isText)}
                    />
                  ))}
            </div>
          </div>
        )}

        {/* Tenant Breakdown - Super Admin Only */}
        {user?.role === 'SUPER_ADMIN' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Tenant Breakdown
            </h2>
            <Card className="overflow-hidden p-0">
              {tenantsLoading ? (
                <ResponsiveTable caption="Tenant breakdown loading">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tenant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Slug</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    <TableRowSkeleton columns={5} rows={5} hasActions />
                  </tbody>
                </table>
                </ResponsiveTable>
              ) : !tenants || tenants.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No tenants found
                </div>
              ) : (
                <ResponsiveTable caption="Tenant breakdown">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Tenant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Slug
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Plan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {tenants.map((tenant: any) => {
                        const statusLabel = tenant?.isActive === false ? 'inactive' : 'active'
                        const statusClasses = statusLabel === 'active'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        return (
                        <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {tenant.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {tenant.slug}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              statusClasses
                            }`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {tenant.planType || 'free'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {safeLocaleDateString(tenant.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              to={`/tenants`}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </ResponsiveTable>
              )}
            </Card>
          </div>
        )}

        {/* Pending Actions */}
        {(stats?.pendingCertifications || 0) > 0 && (
          <div className="mb-8">
            <Card className="bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                    Pending Certifications
                  </h3>
                  <p className="text-yellow-800 dark:text-yellow-200 mb-4">
                    You have {stats.pendingCertifications} certification(s) requiring your attention.
                  </p>
                  <Link
                    to="/results"
                    className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors"
                  >
                    View Certifications
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        )}

        {roleNeedsWorkflowQueue && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Workflow Action Queue
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link to="/certifications" className="block">
                <Card hover className="border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Pending Certifications</p>
                      <p className="text-2xl font-semibold text-blue-700 dark:text-blue-300">{roleCertificationPending}</p>
                    </div>
                    <CheckCircleIcon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                </Card>
              </Link>
              <Link to="/score-governance" className="block">
                <Card hover className="border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-amber-700 dark:text-amber-300">Pending Governance Requests</p>
                      <p className="text-2xl font-semibold text-amber-700 dark:text-amber-300">{governancePendingCount}</p>
                    </div>
                    <ExclamationTriangleIcon className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                  </div>
                </Card>
              </Link>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ORGANIZER' || user?.role === 'ADMIN' || user?.role === 'BOARD') && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h2>
            <Card className="overflow-hidden p-0">
              {activityLoading ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  <ActivityItemSkeleton count={10} />
                </div>
              ) : !recentActivity || recentActivity.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No recent activity to display
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentActivity.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {activity.user?.name || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {activity.action} {activity.resourceType?.toLowerCase() || 'resource'}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {safeFormatDate(activity.createdAt, 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8">
          <Card className="bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
            <div className="flex items-start">
              <BellIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Need Help?
                </h3>
                <p className="text-blue-800 dark:text-blue-200 mb-4">
                  {DEFAULT_APP_BASELINE.dashboardHelp.replace('platform', appName)}
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="/api-docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    API Documentation
                  </a>
                  <Link
                    to="/settings"
                    className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-900 dark:text-blue-100 rounded-md transition-colors"
                  >
                    Settings
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
