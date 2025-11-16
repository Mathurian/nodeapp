import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  BellIcon,
  CheckCircleIcon,
  TrashIcon,
  FunnelIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  data?: any
}

interface NotificationPreferences {
  emailNotifications: boolean
  pushNotifications: boolean
  eventUpdates: boolean
  scoreUpdates: boolean
  systemAlerts: boolean
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    eventUpdates: true,
    scoreUpdates: true,
    systemAlerts: true,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [showPreferences, setShowPreferences] = useState(false)

  useEffect(() => {
    fetchNotifications()
    fetchPreferences()
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await api.get('/notifications')
      setNotifications(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/notification-preferences')
      setPreferences(response.data)
    } catch (err: any) {
      console.error('Failed to load preferences:', err)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}`, { isRead: true })
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to mark notification as read')
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read')
      setNotifications(notifications.map(n => ({ ...n, isRead: true })))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to mark all as read')
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(notifications.filter(n => n.id !== id))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete notification')
    }
  }

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      await api.put('/notification-preferences', newPreferences)
      setPreferences(newPreferences)
      setShowPreferences(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update preferences')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return EnvelopeIcon
      case 'ALERT':
        return BellAlertIcon
      default:
        return BellIcon
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead
    if (filter === 'read') return n.isRead
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading notifications...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {notifications.filter(n => !n.isRead).length} unread notifications
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              Preferences
            </button>
            {notifications.some(n => !n.isRead) && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Mark All as Read
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Preferences Panel */}
        {showPreferences && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Notification Preferences
            </h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-gray-900 dark:text-white">Email Notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.pushNotifications}
                  onChange={(e) => setPreferences({ ...preferences, pushNotifications: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-gray-900 dark:text-white">Push Notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.eventUpdates}
                  onChange={(e) => setPreferences({ ...preferences, eventUpdates: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-gray-900 dark:text-white">Event Updates</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.scoreUpdates}
                  onChange={(e) => setPreferences({ ...preferences, scoreUpdates: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-gray-900 dark:text-white">Score Updates</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.systemAlerts}
                  onChange={(e) => setPreferences({ ...preferences, systemAlerts: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-gray-900 dark:text-white">System Alerts</span>
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => updatePreferences(preferences)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Preferences
              </button>
              <button
                onClick={() => setShowPreferences(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'read'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Read
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <BellIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No notifications to display</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type)
              return (
                <div
                  key={notification.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors ${
                    !notification.isRead ? 'border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      <Icon className={`h-6 w-6 mt-1 ${!notification.isRead ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationsPage
