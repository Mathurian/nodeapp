import React from 'react'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { adminAPI } from '../services/api'
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
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

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

const DashboardPage: React.FC = () => {
  const { user } = useAuth()

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>(
    'dashboard-stats',
    async () => {
      const response = await adminAPI.getStats()
      // Backend wraps response: { success, message, data: {...stats...}, timestamp }
      // So we need: response.data.data
      return response.data.data || response.data
    },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  )

  const { data: recentActivity, isLoading: activityLoading } = useQuery<RecentActivity[]>(
    'recent-activity',
    async () => {
      const response = await adminAPI.getActivityLogs()
      // Backend wraps response: { success, message, data: { data: [...], pagination: {} }, timestamp }
      // So we need to unwrap: response.data.data.data
      const unwrapped = response.data.data || response.data
      return unwrapped.data || unwrapped || []
    },
    {
      refetchInterval: 30000,
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
    return greetings[role as keyof typeof greetings] || 'Welcome to Event Manager'
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
      ORGANIZER: [
        { label: 'Create Event', href: '/events', icon: CalendarIcon, color: 'blue' },
        { label: 'Manage Users', href: '/users', icon: UsersIcon, color: 'green' },
        { label: 'View Reports', href: '/reports', icon: ChartBarIcon, color: 'purple' },
        { label: 'Templates', href: '/templates', icon: TrophyIcon, color: 'orange' },
      ],
      JUDGE: [
        { label: 'Score Categories', href: '/scoring', icon: TrophyIcon, color: 'blue' },
        { label: 'View Results', href: '/results', icon: ChartBarIcon, color: 'green' },
      ],
      CONTESTANT: [
        { label: 'My Events', href: '/events', icon: CalendarIcon, color: 'blue' },
        { label: 'View Results', href: '/results', icon: ChartBarIcon, color: 'green' },
      ],
      EMCEE: [
        { label: 'Emcee Console', href: '/emcee', icon: UsersIcon, color: 'blue' },
        { label: 'View Results', href: '/results', icon: ChartBarIcon, color: 'green' },
      ],
      TALLY_MASTER: [
        { label: 'View Results', href: '/results', icon: ChartBarIcon, color: 'blue' },
      ],
      AUDITOR: [
        { label: 'View Results', href: '/results', icon: ChartBarIcon, color: 'blue' },
      ],
      BOARD: [
        { label: 'Events', href: '/events', icon: CalendarIcon, color: 'blue' },
        { label: 'Users', href: '/users', icon: UsersIcon, color: 'green' },
        { label: 'Reports', href: '/reports', icon: ChartBarIcon, color: 'purple' },
      ],
      ADMIN: [
        { label: 'System Admin', href: '/admin', icon: UsersIcon, color: 'blue' },
        { label: 'Events', href: '/events', icon: CalendarIcon, color: 'green' },
        { label: 'Reports', href: '/reports', icon: ChartBarIcon, color: 'purple' },
        { label: 'Settings', href: '/settings', icon: UsersIcon, color: 'orange' },
      ],
    }
    return actions[role] || actions.ADMIN
  }

  const statCards = [
    { label: 'Total Events', value: stats?.totalEvents || 0, icon: CalendarIcon, color: 'blue' },
    { label: 'Total Contests', value: stats?.totalContests || 0, icon: TrophyIcon, color: 'green' },
    { label: 'Total Categories', value: stats?.totalCategories || 0, icon: ChartBarIcon, color: 'purple' },
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: UsersIcon, color: 'orange' },
    { label: 'Total Scores', value: stats?.totalScores || 0, icon: ArrowTrendingUpIcon, color: 'blue' },
    { label: 'Active Users (24h)', value: stats?.activeUsers || 0, icon: UsersIcon, color: 'green' },
    { label: 'System Uptime', value: stats?.uptime || 'N/A', icon: ClockIcon, color: 'purple', isText: true },
    { label: 'Database Size', value: stats?.databaseSize || 'N/A', icon: ChartBarIcon, color: 'orange', isText: true },
  ]

  const getActionColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800',
      green: 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800',
      purple: 'bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-800',
      orange: 'bg-orange-50 dark:bg-orange-900 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-800',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const getStatColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900',
      green: 'bg-green-50 dark:bg-green-900',
      purple: 'bg-purple-50 dark:bg-purple-900',
      orange: 'bg-orange-50 dark:bg-orange-900',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const getStatIconColor = (color: string) => {
    const colors = {
      blue: 'text-blue-600 dark:text-blue-400',
      green: 'text-green-600 dark:text-green-400',
      purple: 'text-purple-600 dark:text-purple-400',
      orange: 'text-orange-600 dark:text-orange-400',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const getStatTextColor = (color: string) => {
    const colors = {
      blue: 'text-blue-600 dark:text-blue-400',
      green: 'text-green-600 dark:text-green-400',
      purple: 'text-purple-600 dark:text-purple-400',
      orange: 'text-orange-600 dark:text-orange-400',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const getStatValueColor = (color: string) => {
    const colors = {
      blue: 'text-blue-900 dark:text-blue-100',
      green: 'text-green-900 dark:text-green-100',
      purple: 'text-purple-900 dark:text-purple-100',
      orange: 'text-orange-900 dark:text-orange-100',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {getRoleGreeting(user?.role || '')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {getRoleDescription(user?.role || '')}
          </p>
        </div>

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
                className={`p-6 rounded-lg transition-colors ${getActionColor(action.color)}`}
              >
                <action.icon className="h-8 w-8 mb-3" />
                <p className="font-semibold">{action.label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Statistics */}
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ORGANIZER' || user?.role === 'ADMIN' || user?.role === 'BOARD') && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              System Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat) => (
                <div key={stat.label} className={`${getStatColor(stat.color)} p-6 rounded-lg`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${getStatTextColor(stat.color)}`}>
                        {stat.label}
                      </p>
                      <p className={`text-3xl font-bold mt-2 ${getStatValueColor(stat.color)}`}>
                        {statsLoading ? '...' : stat.value}
                      </p>
                    </div>
                    <stat.icon className={`h-10 w-10 ${getStatIconColor(stat.color)}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Actions */}
        {(stats?.pendingCertifications || 0) > 0 && (
          <div className="mb-8">
            <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
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
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ORGANIZER' || user?.role === 'ADMIN' || user?.role === 'BOARD') && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {activityLoading ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Loading activity...
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
                            {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8">
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
            <div className="flex items-start">
              <BellIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Need Help?
                </h3>
                <p className="text-blue-800 dark:text-blue-200 mb-4">
                  Access documentation, tutorials, and support resources to get the most out of Event Manager.
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
