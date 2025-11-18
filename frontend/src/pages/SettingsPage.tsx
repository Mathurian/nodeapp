import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { adminAPI } from '../services/api'
import {
  Cog6ToothIcon,
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon,
  BellIcon,
  GlobeAltIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline'

interface Settings {
  siteName: string
  siteDescription: string
  contactEmail: string
  allowRegistration: boolean
  requireEmailVerification: boolean
  enableNotifications: boolean
  maintenanceMode: boolean
  defaultLanguage: string
  defaultTimezone: string
  maxUploadSize: number
  sessionTimeout: number
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Settings>({
    siteName: '',
    siteDescription: '',
    contactEmail: '',
    allowRegistration: true,
    requireEmailVerification: false,
    enableNotifications: true,
    maintenanceMode: false,
    defaultLanguage: 'en',
    defaultTimezone: 'UTC',
    maxUploadSize: 10,
    sessionTimeout: 24,
  })

  const isAdmin = user?.role === 'ADMIN'

  // Fetch settings
  const { data: settings, isLoading } = useQuery<Settings>(
    'settings',
    async () => {
      const response = await adminAPI.getSettings()
      return response.data
    },
    {
      enabled: isAdmin,
      onSuccess: (data) => {
        setFormData(data)
      },
    }
  )

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    async (data: Settings) => {
      const response = await adminAPI.updateSettings(data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('settings')
        setIsEditing(false)
        alert('Settings updated successfully!')
      },
      onError: (error: any) => {
        alert(`Error updating settings: ${error.message}`)
      },
    }
  )

  const handleCancel = () => {
    if (settings) {
      setFormData(settings)
    }
    setIsEditing(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateSettingsMutation.mutate(formData)
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500">
            You must be an administrator to access settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Cog6ToothIcon className="h-8 w-8 mr-3 text-blue-600" />
              System Settings
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Configure application-wide settings and preferences
            </p>
          </div>
          {!isEditing && settings && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit Settings
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* General Settings */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex items-center mb-6">
                <GlobeAltIcon className="h-6 w-6 mr-2 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">General</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Site Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.siteName}
                      onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{settings?.siteName || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Site Description
                  </label>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={formData.siteDescription}
                      onChange={(e) => setFormData({ ...formData, siteDescription: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{settings?.siteDescription || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{settings?.contactEmail || 'Not set'}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Language
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.defaultLanguage}
                        onChange={(e) => setFormData({ ...formData, defaultLanguage: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{settings?.defaultLanguage || 'en'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Timezone
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.defaultTimezone}
                        onChange={(e) => setFormData({ ...formData, defaultTimezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{settings?.defaultTimezone || 'UTC'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex items-center mb-6">
                <ShieldCheckIcon className="h-6 w-6 mr-2 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Security</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Allow Registration</p>
                    <p className="text-sm text-gray-500">Allow new users to register accounts</p>
                  </div>
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={formData.allowRegistration}
                      onChange={(e) => setFormData({ ...formData, allowRegistration: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  ) : (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      settings?.allowRegistration ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {settings?.allowRegistration ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Require Email Verification</p>
                    <p className="text-sm text-gray-500">Users must verify email before accessing the system</p>
                  </div>
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={formData.requireEmailVerification}
                      onChange={(e) => setFormData({ ...formData, requireEmailVerification: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  ) : (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      settings?.requireEmailVerification ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {settings?.requireEmailVerification ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Maintenance Mode</p>
                    <p className="text-sm text-gray-500">Restrict access to administrators only</p>
                  </div>
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={formData.maintenanceMode}
                      onChange={(e) => setFormData({ ...formData, maintenanceMode: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  ) : (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      settings?.maintenanceMode ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {settings?.maintenanceMode ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (hours)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={formData.sessionTimeout}
                      onChange={(e) => setFormData({ ...formData, sessionTimeout: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{settings?.sessionTimeout || 24} hours</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex items-center mb-6">
                <BellIcon className="h-6 w-6 mr-2 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Enable Notifications</p>
                    <p className="text-sm text-gray-500">Send email notifications to users</p>
                  </div>
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={formData.enableNotifications}
                      onChange={(e) => setFormData({ ...formData, enableNotifications: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  ) : (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      settings?.enableNotifications ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {settings?.enableNotifications ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Settings */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex items-center mb-6">
                <PaintBrushIcon className="h-6 w-6 mr-2 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">File Uploads</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Upload Size (MB)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.maxUploadSize}
                      onChange={(e) => setFormData({ ...formData, maxUploadSize: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{settings?.maxUploadSize || 10} MB</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                >
                  <XMarkIcon className="h-5 w-5 mr-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSettingsMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center"
                >
                  {updateSettingsMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-5 w-5 mr-2" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
