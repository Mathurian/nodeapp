import React from 'react'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { adminAPI } from '../services/api'
import {
  ChartBarIcon,
  UsersIcon,
  CalendarIcon,
  TrophyIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

interface DashboardStats {
  totalEvents: number
  totalContests: number
  totalCategories: number
  totalUsers: number
  totalScores: number
  activeUsers: number
  pendingCertifications: number
  certificationBreakdown?: {
    judge: number
    tallyMaster: number
    auditor: number
    board: number
  }
  systemHealth?: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  lastBackup?: string | null
  databaseSize?: string
  uptime?: string
  uptimeSeconds?: number
}

const AdminPage: React.FC = () => {
  const { user } = useAuth()

  // Fetch admin statistics
  const { data: stats, isLoading } = useQuery<DashboardStats>(
    'admin-stats',
    async () => {
      const response = await adminAPI.getStats()
      // Backend wraps response: { success, message, data: {...stats...}, timestamp }
      return response.data.data || response.data
    },
    {
      refetchInterval: 30000,
    }
  )

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN'

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You must be an administrator to access this page.
          </p>
        </div>
      </div>
    )
  }

  const adminCards = [
    {
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions',
      icon: UsersIcon,
      link: '/users',
      color: 'blue',
    },
    {
      title: 'Event Management',
      description: 'Create and manage competition events',
      icon: CalendarIcon,
      link: '/events',
      color: 'green',
    },
    {
      title: 'Contest Management',
      description: 'Organize contests within events',
      icon: TrophyIcon,
      link: '/contests',
      color: 'purple',
    },
    {
      title: 'System Logs',
      description: 'View application logs and activity',
      icon: DocumentTextIcon,
      link: '/logs',
      color: 'yellow',
    },
    {
      title: 'Backup Management',
      description: 'Database backup and restore',
      icon: ServerIcon,
      link: '/backups',
      color: 'red',
    },
    {
      title: 'Certifications',
      description: 'Review and manage score certifications',
      icon: CheckCircleIcon,
      link: '/certifications',
      color: 'indigo',
    },
    {
      title: 'Cache Management',
      description: 'Monitor and clear application cache',
      icon: ServerIcon,
      link: '/cache',
      color: 'pink',
    },
    {
      title: 'Performance',
      description: 'System performance metrics',
      icon: ChartBarIcon,
      link: '/performance',
      color: 'orange',
    },
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
      green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
      purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
      yellow: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
      red: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
      indigo: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400',
      pink: 'bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-400',
      orange: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <ShieldCheckIcon className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
            Admin Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            System overview and administrative controls
          </p>
        </div>

        {/* Statistics Grid */}
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center mb-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading statistics...</p>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Events</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.totalEvents || 0}</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
                  <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Contests</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.totalContests || 0}</p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-3">
                  <TrophyIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Categories</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCategories || 0}</p>
                </div>
                <div className="bg-green-100 dark:bg-green-900 rounded-full p-3">
                  <ChartBarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUsers || 0}</p>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900 rounded-full p-3">
                  <UsersIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.activeUsers || 0}</p>
                </div>
                <div className="bg-green-100 dark:bg-green-900 rounded-full p-3">
                  <ClockIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Scores</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.totalScores || 0}</p>
                </div>
                <div className="bg-indigo-100 dark:bg-indigo-900 rounded-full p-3">
                  <CheckCircleIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Uptime</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stats.uptime || 'N/A'}</p>
                </div>
                <div className="bg-green-100 dark:bg-green-900 rounded-full p-3">
                  <ClockIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Certifications</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.pendingCertifications || 0}</p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900 rounded-full p-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Admin Action Cards */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {adminCards.map((card, index) => (
              <Link
                key={index}
                to={card.link}
                className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className={`rounded-full p-3 inline-flex ${getColorClasses(card.color)} mb-4`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
