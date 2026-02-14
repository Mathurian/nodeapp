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
import { Card, PageHeader, StatsCard } from '../components/ui'

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
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

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
      title: 'Permission Management',
      description: 'Manage role-based CRUD permissions',
      icon: ShieldCheckIcon,
      link: '/permissions',
      color: 'teal',
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
      teal: 'bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400',
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="cgr-page-container">
        <PageHeader
          title="Admin Dashboard"
          subtitle="System overview and administrative controls"
          icon={ShieldCheckIcon}
        />

        {/* Statistics Grid */}
        {isLoading ? (
          <Card className="p-12 text-center mb-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading statistics...</p>
          </Card>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard icon={CalendarIcon} value={stats.totalEvents || 0} label="Total Events" color="blue" />
            <StatsCard icon={TrophyIcon} value={stats.totalContests || 0} label="Total Contests" color="indigo" />
            <StatsCard icon={ChartBarIcon} value={stats.totalCategories || 0} label="Total Categories" color="green" />
            <StatsCard icon={UsersIcon} value={stats.totalUsers || 0} label="Total Users" color="amber" />
            <StatsCard icon={ClockIcon} value={stats.activeUsers || 0} label="Active Users" color="teal" />
            <StatsCard icon={CheckCircleIcon} value={stats.totalScores || 0} label="Total Scores" color="indigo" />
            <StatsCard icon={ClockIcon} value={stats.uptime || 'N/A'} label="System Uptime" color="green" compactText />
            <StatsCard icon={ExclamationTriangleIcon} value={stats.pendingCertifications || 0} label="Pending Certifications" color="orange" />
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
                className="block"
              >
                <Card hover>
                  <div className={`rounded-full p-3 inline-flex ${getColorClasses(card.color)} mb-4`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {card.description}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
