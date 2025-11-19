import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { settingsAPI } from '../services/api'
import {
  Cog6ToothIcon,
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon,
  BellIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  KeyIcon,
  ServerIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'

interface GeneralSettings {
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

interface EmailSettings {
  email_enabled: string
  email_smtp_host: string
  email_smtp_port: string
  email_smtp_secure: string
  email_smtp_user: string
  email_smtp_pass: string
  email_from_address: string
  email_from_name: string
}

interface ThemeSettings {
  theme_primaryColor: string
  theme_secondaryColor: string
  theme_logoPath: string
  theme_faviconPath: string
  app_name: string
  app_subtitle: string
}

interface SecuritySettings {
  security_maxLoginAttempts: string
  security_lockoutDuration: string
  security_sessionTimeout: string
  security_requireStrongPasswords: string
  security_enableTwoFactor: string
}

interface ContestantVisibilitySettings {
  canViewWinners: boolean
  canViewOverallResults: boolean
}

interface PasswordPolicy {
  password_policy_minLength: string
  password_policy_requireUppercase: string
  password_policy_requireLowercase: string
  password_policy_requireNumbers: string
  password_policy_requireSpecialChars: string
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  const [activeSection, setActiveSection] = useState<string>('general')
  const [expandedSections, setExpandedSections] = useState<string[]>(['general'])
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Form state for different setting categories
  const [generalFormData, setGeneralFormData] = useState<GeneralSettings>({
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

  const [emailFormData, setEmailFormData] = useState<EmailSettings>({
    email_enabled: 'true',
    email_smtp_host: '',
    email_smtp_port: '587',
    email_smtp_secure: 'true',
    email_smtp_user: '',
    email_smtp_pass: '',
    email_from_address: '',
    email_from_name: 'Event Manager',
  })

  const [themeFormData, setThemeFormData] = useState<ThemeSettings>({
    theme_primaryColor: '#3b82f6',
    theme_secondaryColor: '#8b5cf6',
    theme_logoPath: '',
    theme_faviconPath: '',
    app_name: 'Event Manager',
    app_subtitle: '',
  })

  const [securityFormData, setSecurityFormData] = useState<SecuritySettings>({
    security_maxLoginAttempts: '5',
    security_lockoutDuration: '15',
    security_sessionTimeout: '24',
    security_requireStrongPasswords: 'true',
    security_enableTwoFactor: 'false',
  })

  const [contestantVisibilityFormData, setContestantVisibilityFormData] = useState<ContestantVisibilitySettings>({
    canViewWinners: true,
    canViewOverallResults: true,
  })

  const [passwordPolicyFormData, setPasswordPolicyFormData] = useState<PasswordPolicy>({
    password_policy_minLength: '8',
    password_policy_requireUppercase: 'true',
    password_policy_requireLowercase: 'true',
    password_policy_requireNumbers: 'true',
    password_policy_requireSpecialChars: 'true',
  })

  const isAdmin = user?.role === 'ADMIN'

  // Fetch all settings
  const { data: generalSettings, isLoading: generalLoading } = useQuery<GeneralSettings>(
    'general-settings',
    async () => {
      const response = await settingsAPI.getSettings()
      const unwrapped = response.data.data || response.data
      return unwrapped
    },
    {
      enabled: isAdmin,
      onSuccess: (data) => {
        setGeneralFormData(data)
      },
    }
  )

  const { data: emailSettings, isLoading: emailLoading } = useQuery<any>(
    'email-settings',
    async () => {
      const response = await settingsAPI.getEmailSettings()
      const unwrapped = response.data.data || response.data
      return unwrapped
    },
    {
      enabled: isAdmin,
      onSuccess: (data) => {
        if (data) {
          setEmailFormData({
            email_enabled: data.email_enabled || 'true',
            email_smtp_host: data.email_smtp_host || '',
            email_smtp_port: data.email_smtp_port || '587',
            email_smtp_secure: data.email_smtp_secure || 'true',
            email_smtp_user: data.email_smtp_user || '',
            email_smtp_pass: data.email_smtp_pass || '',
            email_from_address: data.email_from_address || '',
            email_from_name: data.email_from_name || 'Event Manager',
          })
        }
      },
    }
  )

  const { data: themeSettings, isLoading: themeLoading } = useQuery<any>(
    'theme-settings-full',
    async () => {
      const response = await settingsAPI.getThemeSettings()
      const unwrapped = response.data.data || response.data
      return unwrapped
    },
    {
      enabled: isAdmin,
      onSuccess: (data) => {
        if (data) {
          setThemeFormData({
            theme_primaryColor: data.theme_primaryColor || data.primaryColor || '#3b82f6',
            theme_secondaryColor: data.theme_secondaryColor || data.secondaryColor || '#8b5cf6',
            theme_logoPath: data.theme_logoPath || data.logoPath || '',
            theme_faviconPath: data.theme_faviconPath || data.faviconPath || '',
            app_name: data.app_name || data.appName || 'Event Manager',
            app_subtitle: data.app_subtitle || data.appSubtitle || '',
          })
        }
      },
    }
  )

  const { data: securitySettings, isLoading: securityLoading } = useQuery<any>(
    'security-settings',
    async () => {
      const response = await settingsAPI.getSecuritySettings()
      const unwrapped = response.data.data || response.data
      return unwrapped
    },
    {
      enabled: isAdmin,
      onSuccess: (data) => {
        if (data) {
          setSecurityFormData({
            security_maxLoginAttempts: data.security_maxLoginAttempts || '5',
            security_lockoutDuration: data.security_lockoutDuration || '15',
            security_sessionTimeout: data.security_sessionTimeout || '24',
            security_requireStrongPasswords: data.security_requireStrongPasswords || 'true',
            security_enableTwoFactor: data.security_enableTwoFactor || 'false',
          })
        }
      },
    }
  )

  const { data: contestantVisibility, isLoading: contestantVisibilityLoading } = useQuery<any>(
    'contestant-visibility-settings',
    async () => {
      const response = await settingsAPI.getContestantVisibilitySettings()
      const unwrapped = response.data.data || response.data
      return unwrapped
    },
    {
      enabled: isAdmin,
      onSuccess: (data) => {
        if (data) {
          setContestantVisibilityFormData({
            canViewWinners: data.canViewWinners !== false,
            canViewOverallResults: data.canViewOverallResults !== false,
          })
        }
      },
    }
  )

  const { data: passwordPolicy, isLoading: passwordPolicyLoading } = useQuery<any>(
    'password-policy',
    async () => {
      const response = await settingsAPI.getPasswordPolicy()
      const unwrapped = response.data.data || response.data
      return unwrapped
    },
    {
      enabled: isAdmin,
      onSuccess: (data) => {
        if (data) {
          setPasswordPolicyFormData({
            password_policy_minLength: data.password_policy_minLength || data.minLength || '8',
            password_policy_requireUppercase: data.password_policy_requireUppercase || String(data.requireUppercase) || 'true',
            password_policy_requireLowercase: data.password_policy_requireLowercase || String(data.requireLowercase) || 'true',
            password_policy_requireNumbers: data.password_policy_requireNumbers || String(data.requireNumbers) || 'true',
            password_policy_requireSpecialChars: data.password_policy_requireSpecialChars || String(data.requireSpecialChars) || 'true',
          })
        }
      },
    }
  )

  // Update mutations
  const updateGeneralMutation = useMutation(
    async (data: GeneralSettings) => {
      const response = await settingsAPI.updateSettings(data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('general-settings')
        setMessage({ type: 'success', text: 'General settings updated successfully!' })
        setTimeout(() => setMessage(null), 5000)
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: `Error: ${error.message}` })
        setTimeout(() => setMessage(null), 5000)
      },
    }
  )

  const updateEmailMutation = useMutation(
    async (data: EmailSettings) => {
      const response = await settingsAPI.updateEmailSettings(data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('email-settings')
        setMessage({ type: 'success', text: 'Email settings updated successfully!' })
        setTimeout(() => setMessage(null), 5000)
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: `Error: ${error.message}` })
        setTimeout(() => setMessage(null), 5000)
      },
    }
  )

  const updateThemeMutation = useMutation(
    async (data: ThemeSettings) => {
      const response = await settingsAPI.updateThemeSettings(data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('theme-settings-full')
        queryClient.invalidateQueries('theme-settings')
        setMessage({ type: 'success', text: 'Theme settings updated successfully!' })
        setTimeout(() => setMessage(null), 5000)
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: `Error: ${error.message}` })
        setTimeout(() => setMessage(null), 5000)
      },
    }
  )

  const updateSecurityMutation = useMutation(
    async (data: SecuritySettings) => {
      const response = await settingsAPI.updateSecuritySettings(data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('security-settings')
        setMessage({ type: 'success', text: 'Security settings updated successfully!' })
        setTimeout(() => setMessage(null), 5000)
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: `Error: ${error.message}` })
        setTimeout(() => setMessage(null), 5000)
      },
    }
  )

  const updateContestantVisibilityMutation = useMutation(
    async (data: ContestantVisibilitySettings) => {
      const response = await settingsAPI.updateContestantVisibilitySettings(data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contestant-visibility-settings')
        setMessage({ type: 'success', text: 'Contestant visibility settings updated successfully!' })
        setTimeout(() => setMessage(null), 5000)
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: `Error: ${error.message}` })
        setTimeout(() => setMessage(null), 5000)
      },
    }
  )

  const updatePasswordPolicyMutation = useMutation(
    async (data: PasswordPolicy) => {
      const response = await settingsAPI.updatePasswordPolicy(data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('password-policy')
        setMessage({ type: 'success', text: 'Password policy updated successfully!' })
        setTimeout(() => setMessage(null), 5000)
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: `Error: ${error.message}` })
        setTimeout(() => setMessage(null), 5000)
      },
    }
  )

  const uploadLogoMutation = useMutation(
    async (file: File) => {
      const response = await settingsAPI.uploadThemeLogo(file)
      return response.data
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('theme-settings-full')
        setThemeFormData(prev => ({ ...prev, theme_logoPath: data.data?.logoPath || data.logoPath }))
        setMessage({ type: 'success', text: 'Logo uploaded successfully!' })
        setTimeout(() => setMessage(null), 5000)
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: `Error uploading logo: ${error.message}` })
        setTimeout(() => setMessage(null), 5000)
      },
    }
  )

  const uploadFaviconMutation = useMutation(
    async (file: File) => {
      const response = await settingsAPI.uploadThemeFavicon(file)
      return response.data
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('theme-settings-full')
        setThemeFormData(prev => ({ ...prev, theme_faviconPath: data.data?.faviconPath || data.faviconPath }))
        setMessage({ type: 'success', text: 'Favicon uploaded successfully!' })
        setTimeout(() => setMessage(null), 5000)
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: `Error uploading favicon: ${error.message}` })
        setTimeout(() => setMessage(null), 5000)
      },
    }
  )

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadLogoMutation.mutate(file)
    }
  }

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFaviconMutation.mutate(file)
    }
  }

  const toggleSection = (section: string) => {
    if (expandedSections.includes(section)) {
      setExpandedSections(expandedSections.filter(s => s !== section))
    } else {
      setExpandedSections([...expandedSections, section])
    }
  }

  const handleSaveSection = (section: string) => {
    switch (section) {
      case 'general':
        updateGeneralMutation.mutate(generalFormData)
        break
      case 'email':
        updateEmailMutation.mutate(emailFormData)
        break
      case 'theme':
        updateThemeMutation.mutate(themeFormData)
        break
      case 'security':
        updateSecurityMutation.mutate(securityFormData)
        break
      case 'contestant-visibility':
        updateContestantVisibilityMutation.mutate(contestantVisibilityFormData)
        break
      case 'password-policy':
        updatePasswordPolicyMutation.mutate(passwordPolicyFormData)
        break
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-red-500 dark:text-red-400" />
          <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You must be an administrator to access settings.
          </p>
        </div>
      </div>
    )
  }

  const isLoading = generalLoading || emailLoading || themeLoading || securityLoading || contestantVisibilityLoading || passwordPolicyLoading

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Cog6ToothIcon className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
            System Settings
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Configure application-wide settings and preferences
          </p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckIcon className="h-5 w-5 mr-2" />
              ) : (
                <XMarkIcon className="h-5 w-5 mr-2" />
              )}
              {message.text}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading settings...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* General Settings */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('general')}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <GlobeAltIcon className="h-6 w-6 mr-3 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">General Settings</h2>
                </div>
                {expandedSections.includes('general') ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>

              {expandedSections.includes('general') && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Site Name
                      </label>
                      <input
                        type="text"
                        value={generalFormData.siteName}
                        onChange={(e) => setGeneralFormData({ ...generalFormData, siteName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Site Description
                      </label>
                      <textarea
                        rows={3}
                        value={generalFormData.siteDescription}
                        onChange={(e) => setGeneralFormData({ ...generalFormData, siteDescription: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={generalFormData.contactEmail}
                        onChange={(e) => setGeneralFormData({ ...generalFormData, contactEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Default Language
                        </label>
                        <select
                          value={generalFormData.defaultLanguage}
                          onChange={(e) => setGeneralFormData({ ...generalFormData, defaultLanguage: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Default Timezone
                        </label>
                        <select
                          value={generalFormData.defaultTimezone}
                          onChange={(e) => setGeneralFormData({ ...generalFormData, defaultTimezone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Allow Registration</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Allow new users to register accounts</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={generalFormData.allowRegistration}
                        onChange={(e) => setGeneralFormData({ ...generalFormData, allowRegistration: e.target.checked })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Require Email Verification</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Users must verify email before accessing the system</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={generalFormData.requireEmailVerification}
                        onChange={(e) => setGeneralFormData({ ...generalFormData, requireEmailVerification: e.target.checked })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Maintenance Mode</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Restrict access to administrators only</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={generalFormData.maintenanceMode}
                        onChange={(e) => setGeneralFormData({ ...generalFormData, maintenanceMode: e.target.checked })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => handleSaveSection('general')}
                      disabled={updateGeneralMutation.isLoading}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
                    >
                      {updateGeneralMutation.isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-5 w-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Settings */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('theme')}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <PaintBrushIcon className="h-6 w-6 mr-3 text-purple-600 dark:text-purple-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Theme & Branding</h2>
                </div>
                {expandedSections.includes('theme') ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>

              {expandedSections.includes('theme') && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Application Name
                      </label>
                      <input
                        type="text"
                        value={themeFormData.app_name}
                        onChange={(e) => setThemeFormData({ ...themeFormData, app_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Application Subtitle
                      </label>
                      <input
                        type="text"
                        value={themeFormData.app_subtitle}
                        onChange={(e) => setThemeFormData({ ...themeFormData, app_subtitle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Primary Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={themeFormData.theme_primaryColor}
                            onChange={(e) => setThemeFormData({ ...themeFormData, theme_primaryColor: e.target.value })}
                            className="h-10 w-16 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={themeFormData.theme_primaryColor}
                            onChange={(e) => setThemeFormData({ ...themeFormData, theme_primaryColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Secondary Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={themeFormData.theme_secondaryColor}
                            onChange={(e) => setThemeFormData({ ...themeFormData, theme_secondaryColor: e.target.value })}
                            className="h-10 w-16 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={themeFormData.theme_secondaryColor}
                            onChange={(e) => setThemeFormData({ ...themeFormData, theme_secondaryColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Application Logo
                      </label>
                      <div className="flex items-center gap-4">
                        {themeFormData.theme_logoPath && (
                          <img
                            src={themeFormData.theme_logoPath}
                            alt="Logo"
                            className="h-16 w-16 object-contain border border-gray-300 dark:border-gray-600 rounded"
                          />
                        )}
                        <div className="flex-1">
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <button
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploadLogoMutation.isLoading}
                            className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
                          >
                            {uploadLogoMutation.isLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <PhotoIcon className="h-5 w-5 mr-2" />
                                Upload Logo
                              </>
                            )}
                          </button>
                          {themeFormData.theme_logoPath && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Current: {themeFormData.theme_logoPath}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Favicon
                      </label>
                      <div className="flex items-center gap-4">
                        {themeFormData.theme_faviconPath && (
                          <img
                            src={themeFormData.theme_faviconPath}
                            alt="Favicon"
                            className="h-8 w-8 object-contain border border-gray-300 dark:border-gray-600 rounded"
                          />
                        )}
                        <div className="flex-1">
                          <input
                            ref={faviconInputRef}
                            type="file"
                            accept="image/*,.ico"
                            onChange={handleFaviconUpload}
                            className="hidden"
                          />
                          <button
                            onClick={() => faviconInputRef.current?.click()}
                            disabled={uploadFaviconMutation.isLoading}
                            className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
                          >
                            {uploadFaviconMutation.isLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <PhotoIcon className="h-5 w-5 mr-2" />
                                Upload Favicon
                              </>
                            )}
                          </button>
                          {themeFormData.theme_faviconPath && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Current: {themeFormData.theme_faviconPath}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => handleSaveSection('theme')}
                      disabled={updateThemeMutation.isLoading}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
                    >
                      {updateThemeMutation.isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-5 w-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Email/SMTP Settings */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('email')}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <EnvelopeIcon className="h-6 w-6 mr-3 text-green-600 dark:text-green-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Email / SMTP Settings</h2>
                </div>
                {expandedSections.includes('email') ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>

              {expandedSections.includes('email') && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Email</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Enable email notifications system-wide</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailFormData.email_enabled === 'true'}
                        onChange={(e) => setEmailFormData({ ...emailFormData, email_enabled: e.target.checked ? 'true' : 'false' })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          SMTP Host
                        </label>
                        <input
                          type="text"
                          value={emailFormData.email_smtp_host}
                          onChange={(e) => setEmailFormData({ ...emailFormData, email_smtp_host: e.target.value })}
                          placeholder="smtp.gmail.com"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          SMTP Port
                        </label>
                        <input
                          type="number"
                          value={emailFormData.email_smtp_port}
                          onChange={(e) => setEmailFormData({ ...emailFormData, email_smtp_port: e.target.value })}
                          placeholder="587"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        SMTP Username
                      </label>
                      <input
                        type="text"
                        value={emailFormData.email_smtp_user}
                        onChange={(e) => setEmailFormData({ ...emailFormData, email_smtp_user: e.target.value })}
                        placeholder="your-email@gmail.com"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        SMTP Password
                      </label>
                      <input
                        type="password"
                        value={emailFormData.email_smtp_pass}
                        onChange={(e) => setEmailFormData({ ...emailFormData, email_smtp_pass: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          From Email Address
                        </label>
                        <input
                          type="email"
                          value={emailFormData.email_from_address}
                          onChange={(e) => setEmailFormData({ ...emailFormData, email_from_address: e.target.value })}
                          placeholder="noreply@example.com"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          From Name
                        </label>
                        <input
                          type="text"
                          value={emailFormData.email_from_name}
                          onChange={(e) => setEmailFormData({ ...emailFormData, email_from_name: e.target.value })}
                          placeholder="Event Manager"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Use Secure Connection (TLS)</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Enable TLS/SSL for SMTP connection</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailFormData.email_smtp_secure === 'true'}
                        onChange={(e) => setEmailFormData({ ...emailFormData, email_smtp_secure: e.target.checked ? 'true' : 'false' })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => handleSaveSection('email')}
                      disabled={updateEmailMutation.isLoading}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
                    >
                      {updateEmailMutation.isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-5 w-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Security Settings */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('security')}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <ShieldCheckIcon className="h-6 w-6 mr-3 text-red-600 dark:text-red-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security Settings</h2>
                </div>
                {expandedSections.includes('security') ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>

              {expandedSections.includes('security') && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Login Attempts
                      </label>
                      <input
                        type="number"
                        value={securityFormData.security_maxLoginAttempts}
                        onChange={(e) => setSecurityFormData({ ...securityFormData, security_maxLoginAttempts: e.target.value })}
                        min="1"
                        max="20"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Number of failed login attempts before account lockout</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Lockout Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={securityFormData.security_lockoutDuration}
                        onChange={(e) => setSecurityFormData({ ...securityFormData, security_lockoutDuration: e.target.value })}
                        min="1"
                        max="1440"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Duration of account lockout after max login attempts</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Session Timeout (hours)
                      </label>
                      <input
                        type="number"
                        value={securityFormData.security_sessionTimeout}
                        onChange={(e) => setSecurityFormData({ ...securityFormData, security_sessionTimeout: e.target.value })}
                        min="1"
                        max="168"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Duration before inactive sessions expire</p>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Require Strong Passwords</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Enforce password complexity requirements</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={securityFormData.security_requireStrongPasswords === 'true'}
                        onChange={(e) => setSecurityFormData({ ...securityFormData, security_requireStrongPasswords: e.target.checked ? 'true' : 'false' })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Two-Factor Authentication</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Require 2FA for user accounts</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={securityFormData.security_enableTwoFactor === 'true'}
                        onChange={(e) => setSecurityFormData({ ...securityFormData, security_enableTwoFactor: e.target.checked ? 'true' : 'false' })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => handleSaveSection('security')}
                      disabled={updateSecurityMutation.isLoading}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
                    >
                      {updateSecurityMutation.isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-5 w-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Contestant Visibility Settings */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('contestant-visibility')}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <EyeIcon className="h-6 w-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Contestant Visibility</h2>
                </div>
                {expandedSections.includes('contestant-visibility') ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>

              {expandedSections.includes('contestant-visibility') && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Can View Winners</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Allow contestants to view contest winners</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={contestantVisibilityFormData.canViewWinners}
                        onChange={(e) => setContestantVisibilityFormData({ ...contestantVisibilityFormData, canViewWinners: e.target.checked })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Can View Overall Results</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Allow contestants to view overall contest results</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={contestantVisibilityFormData.canViewOverallResults}
                        onChange={(e) => setContestantVisibilityFormData({ ...contestantVisibilityFormData, canViewOverallResults: e.target.checked })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => handleSaveSection('contestant-visibility')}
                      disabled={updateContestantVisibilityMutation.isLoading}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
                    >
                      {updateContestantVisibilityMutation.isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-5 w-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Password Policy */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('password-policy')}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <KeyIcon className="h-6 w-6 mr-3 text-yellow-600 dark:text-yellow-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Password Policy</h2>
                </div>
                {expandedSections.includes('password-policy') ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>

              {expandedSections.includes('password-policy') && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Length
                      </label>
                      <input
                        type="number"
                        value={passwordPolicyFormData.password_policy_minLength}
                        onChange={(e) => setPasswordPolicyFormData({ ...passwordPolicyFormData, password_policy_minLength: e.target.value })}
                        min="6"
                        max="32"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Minimum number of characters required</p>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Require Uppercase Letters</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Password must contain at least one uppercase letter</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={passwordPolicyFormData.password_policy_requireUppercase === 'true'}
                        onChange={(e) => setPasswordPolicyFormData({ ...passwordPolicyFormData, password_policy_requireUppercase: e.target.checked ? 'true' : 'false' })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Require Lowercase Letters</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Password must contain at least one lowercase letter</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={passwordPolicyFormData.password_policy_requireLowercase === 'true'}
                        onChange={(e) => setPasswordPolicyFormData({ ...passwordPolicyFormData, password_policy_requireLowercase: e.target.checked ? 'true' : 'false' })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Require Numbers</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Password must contain at least one number</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={passwordPolicyFormData.password_policy_requireNumbers === 'true'}
                        onChange={(e) => setPasswordPolicyFormData({ ...passwordPolicyFormData, password_policy_requireNumbers: e.target.checked ? 'true' : 'false' })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Require Special Characters</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Password must contain at least one special character</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={passwordPolicyFormData.password_policy_requireSpecialChars === 'true'}
                        onChange={(e) => setPasswordPolicyFormData({ ...passwordPolicyFormData, password_policy_requireSpecialChars: e.target.checked ? 'true' : 'false' })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => handleSaveSection('password-policy')}
                      disabled={updatePasswordPolicyMutation.isLoading}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
                    >
                      {updatePasswordPolicyMutation.isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-5 w-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
