import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
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
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { SendNotificationModal } from '../components/SendNotificationModal'

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
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [showPreferences, setShowPreferences] = useState(false)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    eventUpdates: true,
    scoreUpdates: true,
    systemAlerts: true,
  })

  // Fetch notifications with proper error handling
  const { data: notifications = [], isLoading: notificationsLoading, error: notificationsError } = useQuery<Notification[]>(
    'notifications',
    async () => {
      const response = await api.get('/notifications')
      const unwrapped = response.data.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      retry: 1,
      onError: (err) => console.error('Fetch notifications failed:', err),
    }
  )

  // Fetch preferences with proper error handling
  const { data: preferences, isLoading: preferencesLoading, error: preferencesError } = useQuery<NotificationPreferences>(
    'notification-preferences',
    async () => {
      const response = await api.get('/notification-preferences')
      return response.data
    },
    {
      retry: 1,
      onError: (err) => console.error('Fetch preferences failed:', err),
    }
  )

  // Update local preferences when fetched data changes
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences)
    }
  }, [preferences])

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}`, { isRead: true })
      queryClient.invalidateQueries('notifications')
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read')
      queryClient.invalidateQueries('notifications')
    } catch (err: any) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`)
      queryClient.invalidateQueries('notifications')
    } catch (err: any) {
      console.error('Failed to delete notification:', err)
    }
  }

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      await api.put('/notification-preferences', newPreferences)
      queryClient.invalidateQueries('notification-preferences')
      setShowPreferences(false)
    } catch (err: any) {
      console.error('Failed to update preferences:', err)
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

  // Check if user can send notifications
  const canSendNotifications = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  // Handle errors with early return
  if (notificationsError) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Notifications</h2>
        <p className="text-red-800 dark:text-red-200 mb-4">{String(notificationsError)}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">Reload Page</button>
      </div>
    )
  }

  if (preferencesError) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Preferences</h2>
        <p className="text-red-800 dark:text-red-200 mb-4">{String(preferencesError)}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">Reload Page</button>
      </div>
    )
  }

  if (notificationsLoading || preferencesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Loading notifications...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mt-2">
              {notifications.filter(n => !n.isRead).length} unread notifications
            </p>
          </div>
          <div className="flex gap-3">
            {canSendNotifications && (
              <button
                onClick={() => setIsSendModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
                Send Notification
              </button>
            )}
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              Preferences
            </button>
            {notifications.some(n => !n.isRead) && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Mark All as Read
              </button>
            )}
          </div>
        </div>

        {/* Preferences Panel */}
        {showPreferences && (
          <div className="mb-6 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
              Notification Preferences
            </h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localPreferences.emailNotifications}
                  onChange={(e) => setLocalPreferences({ ...localPreferences, emailNotifications: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-gray-900 dark:text-white dark:text-white">Email Notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localPreferences.pushNotifications}
                  onChange={(e) => setLocalPreferences({ ...localPreferences, pushNotifications: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-gray-900 dark:text-white dark:text-white">Push Notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localPreferences.eventUpdates}
                  onChange={(e) => setLocalPreferences({ ...localPreferences, eventUpdates: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-gray-900 dark:text-white dark:text-white">Event Updates</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localPreferences.scoreUpdates}
                  onChange={(e) => setLocalPreferences({ ...localPreferences, scoreUpdates: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-gray-900 dark:text-white dark:text-white">Score Updates</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localPreferences.systemAlerts}
                  onChange={(e) => setLocalPreferences({ ...localPreferences, systemAlerts: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-gray-900 dark:text-white dark:text-white">System Alerts</span>
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => updatePreferences(localPreferences)}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Save Preferences
              </button>
              <button
                onClick={() => setShowPreferences(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'unread'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'read'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Read
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <BellIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">No notifications to display</p>
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
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
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

      {/* Send Notification Modal */}
      <SendNotificationModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries('notifications')}
      />
    </div>
  )
}

export default NotificationsPage
