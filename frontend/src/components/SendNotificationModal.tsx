import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { Modal } from './Modal'
import { notificationsAPI, usersAPI } from '../services/api'
import { PaperAirplaneIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

interface SendNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'

interface SendNotificationFormData {
  title: string
  message: string
  type: NotificationType
  link: string
}

interface BroadcastFormData extends SendNotificationFormData {
  roles: string[]
}

interface SendFormData extends SendNotificationFormData {
  userIds: string[]
}

const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'ORGANIZER', label: 'Organizer' },
  { value: 'BOARD', label: 'Board' },
  { value: 'JUDGE', label: 'Judge' },
  { value: 'CONTESTANT', label: 'Contestant' },
  { value: 'EMCEE', label: 'Emcee' },
  { value: 'TALLY_MASTER', label: 'Tally Master' },
  { value: 'AUDITOR', label: 'Auditor' },
]

const NOTIFICATION_TYPES: { value: NotificationType; label: string }[] = [
  { value: 'INFO', label: 'Info' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
]

export const SendNotificationModal: React.FC<SendNotificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [activeTab, setActiveTab] = useState<'users' | 'broadcast'>('users')
  const [selectedTenantId, setSelectedTenantId] = useState<string>('current')

  // Form state for "Send to Users"
  const [sendFormData, setSendFormData] = useState<SendFormData>({
    userIds: [],
    title: '',
    message: '',
    type: 'INFO',
    link: '',
  })

  // Form state for "Broadcast by Role"
  const [broadcastFormData, setBroadcastFormData] = useState<BroadcastFormData>({
    roles: [],
    title: '',
    message: '',
    type: 'INFO',
    link: '',
  })

  // Fetch tenants for SUPER_ADMIN - only active tenants
  const { data: tenantsResponse } = useQuery<{ tenants: Array<{ id: string; name: string; slug: string }> }>(
    'tenants-for-notifications',
    async () => {
      const response = await axios.get('/api/tenants?isActive=true')
      return response.data
    },
    {
      enabled: isOpen && isSuperAdmin,
    }
  )

  const tenants = tenantsResponse?.tenants || []

  // Fetch users for the dropdown - filtered by tenant for SUPER_ADMIN
  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery<{ data: User[] }>(
    ['users-for-notifications', selectedTenantId],
    async () => {
      let url = '/api/users?includeInactive=false'
      if (isSuperAdmin) {
        if (selectedTenantId === 'current') {
          // For "current" selection, filter by the user's actual tenant
          url += `&tenantId=${user?.tenantId}`
        } else if (selectedTenantId !== 'all') {
          // For specific tenant selection, filter by that tenant
          url += `&tenantId=${selectedTenantId}`
        }
      }
      const response = await axios.get(url)
      return response.data
    },
    {
      enabled: isOpen && activeTab === 'users',
    }
  )

  const users = usersResponse?.data || []

  // Send to specific users mutation
  const sendMutation = useMutation(
    async (data: SendFormData) => {
      const payload: any = {
        userIds: data.userIds,
        title: data.title,
        message: data.message,
        type: data.type,
        ...(data.link && { link: data.link }),
      }
      // Add targetTenantId for SUPER_ADMIN
      if (isSuperAdmin && selectedTenantId !== 'current') {
        payload.targetTenantId = selectedTenantId === 'all' ? null : selectedTenantId
      }
      const response = await notificationsAPI.sendNotification(payload)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notifications')
        toast.success('Notification sent successfully!')
        resetForm()
        onClose()
        onSuccess?.()
      },
      onError: (error: any) => {
        console.error('Send notification error:', error)
        console.error('Response data:', error.response?.data)
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to send notification'
        toast.error(`Error: ${errorMessage}`)
      },
    }
  )

  // Broadcast by role mutation
  const broadcastMutation = useMutation(
    async (data: BroadcastFormData) => {
      const payload: any = {
        roles: data.roles,
        title: data.title,
        message: data.message,
        type: data.type,
        ...(data.link && { link: data.link }),
      }
      // Add targetTenantId for SUPER_ADMIN
      if (isSuperAdmin && selectedTenantId !== 'current') {
        payload.targetTenantId = selectedTenantId === 'all' ? null : selectedTenantId
      }
      const response = await notificationsAPI.broadcastByRole(payload)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notifications')
        toast.success('Notification broadcast successfully!')
        resetForm()
        onClose()
        onSuccess?.()
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.error || error.message || 'Failed to broadcast notification'
        toast.error(`Error: ${errorMessage}`)
      },
    }
  )

  const resetForm = () => {
    setSendFormData({
      userIds: [],
      title: '',
      message: '',
      type: 'INFO',
      link: '',
    })
    setBroadcastFormData({
      roles: [],
      title: '',
      message: '',
      type: 'INFO',
      link: '',
    })
  }

  const handleSendSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!sendFormData.title.trim()) {
      toast.error('Title is required')
      return
    }

    if (!sendFormData.message.trim()) {
      toast.error('Message is required')
      return
    }

    if (sendFormData.userIds.length === 0) {
      toast.error('Please select at least one user')
      return
    }

    sendMutation.mutate(sendFormData)
  }

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!broadcastFormData.title.trim()) {
      toast.error('Title is required')
      return
    }

    if (!broadcastFormData.message.trim()) {
      toast.error('Message is required')
      return
    }

    if (broadcastFormData.roles.length === 0) {
      toast.error('Please select at least one role')
      return
    }

    broadcastMutation.mutate(broadcastFormData)
  }

  const handleUserToggle = (userId: string) => {
    setSendFormData(prev => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter(id => id !== userId)
        : [...prev.userIds, userId],
    }))
  }

  const handleRoleToggle = (role: string) => {
    setBroadcastFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }))
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const isLoading = sendMutation.isLoading || broadcastMutation.isLoading

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Send Notification"
      size="lg"
      closeOnOverlayClick={!isLoading}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Send to Users
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'broadcast'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Broadcast by Role
          </button>
        </div>

        {/* Send to Users Tab */}
        {activeTab === 'users' && (
          <form onSubmit={handleSendSubmit} className="space-y-4">
            {/* Tenant Selection (SUPER_ADMIN only) */}
            {isSuperAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Tenant
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled={isLoading}
                >
                  <option value="current">Current Tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.slug})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select which tenant's users to send notifications to
                </p>
              </div>
            )}

            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Users <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-48 overflow-y-auto bg-white dark:bg-gray-800">
                {isLoadingUsers ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    Loading users...
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No users found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={sendFormData.userIds.includes(user.id)}
                          onChange={() => handleUserToggle(user.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email} • {user.role}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {sendFormData.userIds.length} user(s) selected
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sendFormData.title}
                onChange={(e) => setSendFormData({ ...sendFormData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Notification title"
                disabled={isLoading}
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={sendFormData.message}
                onChange={(e) => setSendFormData({ ...sendFormData, message: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                placeholder="Enter your message"
                disabled={isLoading}
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={sendFormData.type}
                onChange={(e) => setSendFormData({ ...sendFormData, type: e.target.value as NotificationType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled={isLoading}
              >
                {NOTIFICATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Link (Optional)
              </label>
              <input
                type="text"
                value={sendFormData.link}
                onChange={(e) => setSendFormData({ ...sendFormData, link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="/events/123"
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
                {isLoading ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </form>
        )}

        {/* Broadcast by Role Tab */}
        {activeTab === 'broadcast' && (
          <form onSubmit={handleBroadcastSubmit} className="space-y-4">
            {/* Tenant Selection (SUPER_ADMIN only) */}
            {isSuperAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Tenant
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled={isLoading}
                >
                  <option value="current">Current Tenant</option>
                  <option value="all">All Tenants</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.slug})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select "All Tenants" to broadcast to this role across all tenants
                </p>
              </div>
            )}

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Roles <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800">
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => (
                    <label
                      key={role.value}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={broadcastFormData.roles.includes(role.value)}
                        onChange={() => handleRoleToggle(role.value)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {role.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {broadcastFormData.roles.length} role(s) selected
              </p>
            </div>

            {/* Warning */}
            {broadcastFormData.roles.length > 0 && (
              <div className="flex gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Broadcasting to Multiple Users
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    This notification will be sent to all users with the selected role(s). Please ensure your message is appropriate for a wide audience.
                  </p>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={broadcastFormData.title}
                onChange={(e) => setBroadcastFormData({ ...broadcastFormData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Notification title"
                disabled={isLoading}
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={broadcastFormData.message}
                onChange={(e) => setBroadcastFormData({ ...broadcastFormData, message: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                placeholder="Enter your message"
                disabled={isLoading}
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={broadcastFormData.type}
                onChange={(e) => setBroadcastFormData({ ...broadcastFormData, type: e.target.value as NotificationType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled={isLoading}
              >
                {NOTIFICATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Link (Optional)
              </label>
              <input
                type="text"
                value={broadcastFormData.link}
                onChange={(e) => setBroadcastFormData({ ...broadcastFormData, link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="/events/123"
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
                {isLoading ? 'Broadcasting...' : 'Broadcast Notification'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
