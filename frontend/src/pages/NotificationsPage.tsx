import React, { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import api, { notificationPreferencesAPI } from '../services/api'
import {
  BellIcon,
  CheckCircleIcon,
  TrashIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  BellAlertIcon,
  PaperAirplaneIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline'
import { SendNotificationModal } from '../components/SendNotificationModal'
import { Button, Card, PageHeader } from '../components/ui'
import { safeFormatDate } from '../utils/dateUtils'

interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  data?: any
  user?: {
    id: string
    name: string
    email: string
  }
}

interface NotificationPreferences {
  emailEnabled: boolean
  pushEnabled: boolean
  inAppEnabled: boolean
  eventUpdates: boolean
  scoreUpdates: boolean
  systemAlerts: boolean
}

interface PushConfigResponse {
  enabled: boolean
  publicKey?: string
  reason?: string
}

const extractApiData = <T,>(payload: any): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T
  }
  return payload as T
}

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(item => String(item).toUpperCase())
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item).toUpperCase())
      }
    } catch {
      // Ignore parse failures and use empty list.
    }
  }
  return []
}

const toNotificationPreferences = (raw: any): NotificationPreferences => {
  const emailTypes = parseStringArray(raw?.emailTypes)
  const pushTypes = parseStringArray(raw?.pushTypes)
  const inAppTypes = parseStringArray(raw?.inAppTypes)
  const mergedTypes = new Set([...emailTypes, ...pushTypes, ...inAppTypes])

  return {
    emailEnabled: Boolean(raw?.emailEnabled ?? raw?.emailNotifications ?? true),
    pushEnabled: Boolean(raw?.pushEnabled ?? raw?.pushNotifications ?? false),
    inAppEnabled: Boolean(raw?.inAppEnabled ?? raw?.systemAlerts ?? true),
    eventUpdates: Boolean(raw?.eventUpdates ?? mergedTypes.has('EVENT')),
    scoreUpdates: Boolean(raw?.scoreUpdates ?? mergedTypes.has('SCORE')),
    systemAlerts: Boolean(raw?.systemAlerts ?? mergedTypes.has('SYSTEM')),
  }
}

const toVapidUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

const PUSH_OPERATION_TIMEOUT_MS = 15000

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null
  try {
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    })
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }
}

const uint8ArrayToBase64Url = (bytes: Uint8Array): string => {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] as number)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const extractPushKey = (
  subscription: PushSubscription,
  payloadKeys: Record<string, string> | undefined,
  keyName: 'p256dh' | 'auth'
): string | null => {
  const fromPayload = payloadKeys?.[keyName]
  if (fromPayload && fromPayload.length > 0) {
    return fromPayload
  }

  try {
    const rawKey = subscription.getKey(keyName)
    if (!rawKey) return null
    return uint8ArrayToBase64Url(new Uint8Array(rawKey))
  } catch {
    return null
  }
}

const resolvePushServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration> => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('This browser does not support service workers.')
  }

  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) {
    return existing
  }

  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    // Best effort; ready check below will still fail with a clear timeout message.
  }

  return withTimeout(
    navigator.serviceWorker.ready,
    PUSH_OPERATION_TIMEOUT_MS,
    'Timed out waiting for push service worker initialization.'
  )
}

const getPushSupport = (): { supported: boolean; reason?: string } => {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Push notifications are unavailable in this context.' }
  }

  if (!window.isSecureContext) {
    return { supported: false, reason: 'Push notifications require HTTPS.' }
  }

  if (!('serviceWorker' in navigator)) {
    return { supported: false, reason: 'This browser does not support service workers.' }
  }

  if (!('PushManager' in window)) {
    return { supported: false, reason: 'This browser does not support push notifications.' }
  }

  if (typeof Notification === 'undefined') {
    return { supported: false, reason: 'Notification API is not available on this device.' }
  }

  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  if (isIOS) {
    const standaloneMatch = window.matchMedia('(display-mode: standalone)').matches
    const navigatorStandalone = (window.navigator as any).standalone === true
    if (!standaloneMatch && !navigatorStandalone) {
      return {
        supported: false,
        reason: 'On iOS, install the app to your home screen first, then enable push inside the installed app.',
      }
    }
  }

  return { supported: true }
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'sent' | 'deleted'>('all')
  const [showPreferences, setShowPreferences] = useState(false)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [isUpdatingPush, setIsUpdatingPush] = useState(false)
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null)
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>({
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true,
    eventUpdates: true,
    scoreUpdates: true,
    systemAlerts: true,
  })

  const [pushSupport, setPushSupport] = useState(() => getPushSupport())

  useEffect(() => {
    const refreshPushSupport = () => {
      setPushSupport(getPushSupport())
    }

    refreshPushSupport()
    window.addEventListener('focus', refreshPushSupport)
    document.addEventListener('visibilitychange', refreshPushSupport)
    return () => {
      window.removeEventListener('focus', refreshPushSupport)
      document.removeEventListener('visibilitychange', refreshPushSupport)
    }
  }, [])

  const refreshNotificationQueries = () => {
    queryClient.invalidateQueries('notifications')
    queryClient.invalidateQueries('sent-notifications')
    queryClient.invalidateQueries('deleted-notifications')
    queryClient.invalidateQueries(['notifications-unread-count', user?.id, user?.tenantId])
  }

  const { data: notifications = [], isLoading: notificationsLoading, error: notificationsError } = useQuery<Notification[]>(
    'notifications',
    async () => {
      const response = await api.get('/notifications')
      const unwrapped = extractApiData<Notification[]>(response.data)
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      retry: 1,
      onError: (err) => console.error('Fetch notifications failed:', err),
      enabled: filter !== 'sent' && filter !== 'deleted',
    }
  )

  const { data: sentNotificationsData } = useQuery<{ notifications: Notification[], total: number }>(
    'sent-notifications',
    async () => {
      const response = await api.get('/notifications/sent')
      return extractApiData(response.data)
    },
    {
      retry: 1,
      onError: (err) => console.error('Fetch sent notifications failed:', err),
      enabled: filter === 'sent',
    }
  )

  const { data: deletedNotifications = [] } = useQuery<Notification[]>(
    'deleted-notifications',
    async () => {
      const response = await api.get('/notifications/deleted')
      const unwrapped = extractApiData<Notification[]>(response.data)
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      retry: 1,
      onError: (err) => console.error('Fetch deleted notifications failed:', err),
      enabled: filter === 'deleted',
    }
  )

  const { data: preferences, isLoading: preferencesLoading, error: preferencesError } = useQuery<NotificationPreferences>(
    'notification-preferences',
    async () => {
      const response = await notificationPreferencesAPI.getPreferences()
      return toNotificationPreferences(extractApiData(response.data))
    },
    {
      retry: 1,
      onError: (err) => console.error('Fetch preferences failed:', err),
    }
  )

  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences)
    }
  }, [preferences])

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`)
      refreshNotificationQueries()
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      refreshNotificationQueries()
    } catch (err: any) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`)
      refreshNotificationQueries()
    } catch (err: any) {
      console.error('Failed to delete notification:', err)
    }
  }

  const restoreNotification = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/restore`)
      refreshNotificationQueries()
    } catch (err: any) {
      console.error('Failed to restore notification:', err)
    }
  }

  const buildCategoryTypes = (values: NotificationPreferences): string[] => {
    const types: string[] = []
    if (values.eventUpdates) types.push('EVENT')
    if (values.scoreUpdates) types.push('SCORE')
    if (values.systemAlerts) types.push('SYSTEM')
    return types
  }

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    setIsSavingPreferences(true)
    try {
      const selectedTypes = buildCategoryTypes(newPreferences)
      await notificationPreferencesAPI.updatePreferences({
        emailEnabled: newPreferences.emailEnabled,
        pushEnabled: newPreferences.pushEnabled,
        inAppEnabled: newPreferences.inAppEnabled,
        emailTypes: newPreferences.emailEnabled ? selectedTypes : [],
        pushTypes: newPreferences.pushEnabled ? selectedTypes : [],
        inAppTypes: newPreferences.inAppEnabled ? selectedTypes : [],
        emailNotifications: newPreferences.emailEnabled,
        pushNotifications: newPreferences.pushEnabled,
        systemAlerts: newPreferences.inAppEnabled,
        eventUpdates: newPreferences.eventUpdates,
        scoreUpdates: newPreferences.scoreUpdates,
      })
      queryClient.invalidateQueries('notification-preferences')
      setShowPreferences(false)
    } catch (err: any) {
      console.error('Failed to update preferences:', err)
    } finally {
      setIsSavingPreferences(false)
    }
  }

  const enablePushSubscription = async (): Promise<boolean> => {
    const support = getPushSupport()
    if (!support.supported) {
      setPushStatusMessage(support.reason || 'Push notifications are not supported on this device.')
      return false
    }

    const configResponse = await notificationPreferencesAPI.getPushConfig()
    const config = extractApiData<PushConfigResponse>(configResponse.data)
    if (!config.enabled || !config.publicKey) {
      setPushStatusMessage(config.reason || 'Push notifications are not configured.')
      return false
    }

    let permission = Notification.permission
    if (permission === 'default') {
      permission = await withTimeout(
        Notification.requestPermission(),
        PUSH_OPERATION_TIMEOUT_MS,
        'Timed out while waiting for notification permission.'
      )
    }
    if (permission !== 'granted') {
      setPushStatusMessage(
        permission === 'denied'
          ? 'Notifications are blocked for this app. Re-enable them in device/browser settings.'
          : 'Notification permission was not granted.'
      )
      return false
    }

    const registration = await resolvePushServiceWorkerRegistration()
    let subscription = await withTimeout(
      registration.pushManager.getSubscription(),
      PUSH_OPERATION_TIMEOUT_MS,
      'Timed out while reading existing push subscription.'
    )
    if (!subscription) {
      subscription = await withTimeout(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toVapidUint8Array(config.publicKey) as unknown as BufferSource,
        }),
        PUSH_OPERATION_TIMEOUT_MS,
        'Timed out while creating push subscription.'
      )
    }

    const payload = subscription.toJSON()
    const endpoint = payload.endpoint
    const p256dh = extractPushKey(subscription, payload.keys as Record<string, string> | undefined, 'p256dh')
    const auth = extractPushKey(subscription, payload.keys as Record<string, string> | undefined, 'auth')

    if (!endpoint || !p256dh || !auth) {
      setPushStatusMessage('Unable to read browser push subscription keys.')
      return false
    }

    await withTimeout(
      notificationPreferencesAPI.upsertPushSubscription({
        endpoint,
        expirationTime: payload.expirationTime || null,
        keys: { p256dh, auth },
      }),
      PUSH_OPERATION_TIMEOUT_MS,
      'Timed out while saving push subscription.'
    )

    setPushStatusMessage('Push notifications are enabled for this device.')
    return true
  }

  const disablePushSubscription = async (): Promise<void> => {
    if (!('serviceWorker' in navigator)) {
      setPushStatusMessage('Push notifications are disabled for this device.')
      return
    }

    const registration = await resolvePushServiceWorkerRegistration()
    const existingSubscription = await withTimeout(
      registration.pushManager.getSubscription(),
      PUSH_OPERATION_TIMEOUT_MS,
      'Timed out while reading push subscription.'
    )
    if (!existingSubscription) {
      setPushStatusMessage('Push notifications are disabled for this device.')
      return
    }

    const endpoint = existingSubscription.endpoint
    await withTimeout(
      existingSubscription.unsubscribe(),
      PUSH_OPERATION_TIMEOUT_MS,
      'Timed out while removing browser push subscription.'
    )
    await withTimeout(
      notificationPreferencesAPI.removePushSubscription(endpoint),
      PUSH_OPERATION_TIMEOUT_MS,
      'Timed out while removing server push subscription.'
    )
    setPushStatusMessage('Push notifications are disabled for this device.')
  }

  const onPushToggle = async (enabled: boolean) => {
    const previousPushEnabled = localPreferences.pushEnabled
    setIsUpdatingPush(true)
    setPushStatusMessage(null)

    try {
      if (enabled) {
        const subscribed = await enablePushSubscription()
        if (!subscribed) {
          setLocalPreferences(prev => ({ ...prev, pushEnabled: false }))
          return
        }
      } else {
        await disablePushSubscription()
      }

      setLocalPreferences(prev => ({ ...prev, pushEnabled: enabled }))
      await withTimeout(
        notificationPreferencesAPI.updatePreferences({
          pushEnabled: enabled,
          pushNotifications: enabled,
        }),
        PUSH_OPERATION_TIMEOUT_MS,
        'Timed out while updating notification preferences.'
      )
      queryClient.invalidateQueries('notification-preferences')
    } catch (err: any) {
      console.error('Failed to update push subscription:', err)
      const timeoutError = typeof err?.message === 'string' && err.message.toLowerCase().includes('timed out')
      setPushStatusMessage(
        timeoutError
          ? 'Push setup timed out. Please close and reopen the app, then try again.'
          : 'Unable to update push notification subscription.'
      )
      setLocalPreferences(prev => ({ ...prev, pushEnabled: previousPushEnabled }))
    } finally {
      setIsUpdatingPush(false)
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

  const filteredNotifications = filter === 'sent'
    ? (sentNotificationsData?.notifications || [])
    : filter === 'deleted'
      ? deletedNotifications
      : notifications.filter(n => {
        if (filter === 'unread') return !n.read
        if (filter === 'read') return n.read
        return true
      })

  const canSendNotifications = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  if (notificationsError) {
    return (
      <div className="cgr-page-container">
        <Card className="bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Notifications</h2>
          <p className="text-red-800 dark:text-red-200 mb-4">{String(notificationsError)}</p>
          <Button onClick={() => window.location.reload()} variant="danger">Reload Page</Button>
        </Card>
      </div>
    )
  }

  if (preferencesError) {
    return (
      <div className="cgr-page-container">
        <Card className="bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Preferences</h2>
          <p className="text-red-800 dark:text-red-200 mb-4">{String(preferencesError)}</p>
          <Button onClick={() => window.location.reload()} variant="danger">Reload Page</Button>
        </Card>
      </div>
    )
  }

  if (notificationsLoading || preferencesLoading) {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center text-gray-600 dark:text-gray-400">Loading notifications...</Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container">
      <div className="flex justify-between items-center mb-8">
        <div>
          <PageHeader title="Notifications" />
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {filter === 'sent'
              ? `${sentNotificationsData?.total || 0} sent notifications`
              : filter === 'deleted'
                ? `${deletedNotifications.length} deleted notifications`
                : `${notifications.filter(n => !n.read).length} unread notifications`
            }
          </p>
        </div>
        <div className="flex gap-3">
          {canSendNotifications && (
            <Button onClick={() => setIsSendModalOpen(true)}>
              <PaperAirplaneIcon className="h-5 w-5" />
              Send Notification
            </Button>
          )}
          <Button
            onClick={() => {
              setPushStatusMessage(null)
              setShowPreferences(!showPreferences)
            }}
            variant="secondary"
          >
            <Cog6ToothIcon className="h-5 w-5" />
            Preferences
          </Button>
          {filter !== 'sent' && notifications.some(n => !n.read) && (
            <Button onClick={markAllAsRead} variant="primary">
              <CheckCircleIcon className="h-5 w-5" />
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      {showPreferences && (
        <Card className="mb-6 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Notification Preferences
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={localPreferences.emailEnabled}
                onChange={(e) => setLocalPreferences({ ...localPreferences, emailEnabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-gray-900 dark:text-white">Email Notifications</span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={localPreferences.pushEnabled}
                onChange={(e) => void onPushToggle(e.target.checked)}
                disabled={isUpdatingPush || !pushSupport.supported}
                className="mt-1 h-4 w-4 text-blue-600 rounded disabled:opacity-60"
              />
              <div>
                <span className="text-gray-900 dark:text-white">Push Notifications</span>
                {!pushSupport.supported && (
                  <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                    {pushSupport.reason}
                  </p>
                )}
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={localPreferences.inAppEnabled}
                onChange={(e) => setLocalPreferences({ ...localPreferences, inAppEnabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-gray-900 dark:text-white">In-App Notifications</span>
            </label>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Categories</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={localPreferences.eventUpdates}
                    onChange={(e) => setLocalPreferences({ ...localPreferences, eventUpdates: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-gray-900 dark:text-white">Event Updates</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={localPreferences.scoreUpdates}
                    onChange={(e) => setLocalPreferences({ ...localPreferences, scoreUpdates: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-gray-900 dark:text-white">Score Updates</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={localPreferences.systemAlerts}
                    onChange={(e) => setLocalPreferences({ ...localPreferences, systemAlerts: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-gray-900 dark:text-white">System Alerts</span>
                </label>
              </div>
            </div>
          </div>

          {pushStatusMessage && (
            <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">{pushStatusMessage}</p>
          )}

          <div className="mt-6 flex gap-3">
            <Button onClick={() => void updatePreferences(localPreferences)} disabled={isSavingPreferences || isUpdatingPush}>
              {isSavingPreferences ? 'Saving...' : 'Save Preferences'}
            </Button>
            <Button
              onClick={() => {
                setShowPreferences(false)
                setPushStatusMessage(null)
              }}
              variant="secondary"
              disabled={isSavingPreferences}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

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
        {canSendNotifications && (
          <button
            onClick={() => setFilter('sent')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'sent'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Sent
          </button>
        )}
        <button
          onClick={() => setFilter('deleted')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'deleted'
              ? 'bg-blue-600 dark:bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Deleted
        </button>
      </div>

      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <Card className="rounded-lg p-12 text-center">
            <BellIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No notifications to display</p>
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type)
            return (
              <div
                key={notification.id}
                title={filter !== 'sent' && filter !== 'deleted' && !notification.read ? 'Click to mark as read' : ''}
              >
                <Card
                  onClick={() => filter !== 'sent' && filter !== 'deleted' && !notification.read && markAsRead(notification.id)}
                  className={`rounded-lg p-6 transition-colors ${
                    filter !== 'sent' && filter !== 'deleted' && !notification.read
                      ? 'border-l-4 border-blue-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      <Icon className={`h-6 w-6 mt-1 ${!notification.read ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {notification.title}
                        </h3>
                        {filter === 'sent' && notification.user && (
                          <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                            Sent to: {notification.user.name} ({notification.user.email})
                          </p>
                        )}
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {safeFormatDate(notification.createdAt, 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      {filter === 'deleted' ? (
                        <button
                          onClick={() => restoreNotification(notification.id)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors"
                          title="Restore notification"
                        >
                          <ArrowUturnLeftIcon className="h-5 w-5" />
                        </button>
                      ) : (
                        <>
                          {filter !== 'sent' && !notification.read && (
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
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )
          })
        )}
      </div>

      <SendNotificationModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        onSuccess={refreshNotificationQueries}
      />
    </div>
  )
}

export default NotificationsPage
