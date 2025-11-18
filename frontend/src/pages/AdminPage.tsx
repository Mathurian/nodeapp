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
  events: number
  contests: number
  categories: number
  users: number
  contestants: number
  judges: number
  scores: number
  activeUsers: number
  totalScores: number
  averageScore: number
  completedCategories: number
  pendingCertifications: number
}

const AdminPage: React.FC = () => {
  const { user } = useAuth()

  // Fetch admin statistics
  const { data: stats, isLoading } = useQuery<DashboardStats>(
    'admin-stats',
    async () => {
      const response = await adminAPI.getStats()
      return response.data
    },
    {
      refetchInterval: 30000,
    }
  )

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN'

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500">
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
      link: '/backup',
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
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      red: 'bg-red-100 text-red-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      pink: 'bg-pink-100 text-pink-600',
      orange: 'bg-orange-100 text-orange-600',
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ShieldCheckIcon className="h-8 w-8 mr-3 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            System overview and administrative controls
          </p>
        </div>

        {/* Statistics Grid */}
        {isLoading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center mb-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading statistics...</p>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.events}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <CalendarIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Contests</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.contests}</p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <TrophyIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Categories</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.categories}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <ChartBarIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.users}</p>
                </div>
                <div className="bg-yellow-100 rounded-full p-3">
                  <UsersIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.activeUsers}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <ClockIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Scores</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalScores}</p>
                </div>
                <div className="bg-indigo-100 rounded-full p-3">
                  <CheckCircleIcon className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed Categories</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.completedCategories}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Certifications</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.pendingCertifications}</p>
                </div>
                <div className="bg-orange-100 rounded-full p-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Admin Action Cards */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {adminCards.map((card, index) => (
              <Link
                key={index}
                to={card.link}
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className={`rounded-full p-3 inline-flex ${getColorClasses(card.color)} mb-4`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-600">
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
