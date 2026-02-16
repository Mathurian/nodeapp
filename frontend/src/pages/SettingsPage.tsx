import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { useSystemSettings } from '../contexts/SystemSettingsContext'
import { settingsAPI } from '../services/api'
import api from '../services/api'
import { DEFAULT_APP_BASELINE } from '../config/appBaseline'
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
  BuildingOfficeIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { Card, PageHeader } from '../components/ui'

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
  security_mfaEnabled: string
  security_mfaProviders: string
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

interface DatabaseConnectionInfo {
  configured: string
  source: string
  host: string
  port: string
  database: string
  user: string
  password: string
}

interface SystemHealthAlertSettings {
  enabled: boolean
  webhookUrl: string
  emailRecipients: string[]
  warnDiskPercent: number
  criticalDiskPercent: number
  warnMemoryPercent: number
  criticalMemoryPercent: number
}

interface ScoringWorkflowAlertSettings {
  enabled: boolean
  recipientRoles: string[]
  recipientUserIds: string[]
  recipientEmails: string[]
  notifyOnGovernanceRequestCreated: boolean
  notifyOnGovernanceRequestApproved: boolean
  notifyOnGovernanceRequestRejected: boolean
  notifyOnDeductionRequested: boolean
  notifyOnDeductionApproved: boolean
  notifyOnJudgeCertified: boolean
  notifyOnCategoryCertified: boolean
  onlyIfUnviewed: boolean
  escalationMinutes: number
}

interface BackupSettings {
  backup_remote_enabled: string
  backup_remote_type: string
  backup_remote_host: string
  backup_remote_port: string
  backup_remote_user: string
  backup_remote_path: string
  backup_rclone_remote: string
  backup_s3_bucket: string
  backup_s3_region: string
  backup_s3_access_key_id: string
  backup_s3_secret_access_key: string
  backup_retention_days_full_local: string
  backup_retention_days_incremental_local: string
  backup_retention_days_pitr_local: string
  backup_min_backups_to_keep_full: string
  backup_min_backups_to_keep_incremental: string
  backup_min_backups_to_keep_pitr: string
  backup_log_retention_days: string
}

interface AlertCandidateUser {
  id: string
  name: string
  email: string
  role: string
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth()
  const { refreshSettings } = useSystemSettings()
  const queryClient = useQueryClient()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  const [activeSection, setActiveSection] = useState<string>('general')
  const [expandedSections, setExpandedSections] = useState<string[]>(['general'])
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Tenant-aware settings state (SUPER_ADMIN only)
  const [editingGlobal, setEditingGlobal] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  // Fetch tenants list for SUPER_ADMIN
  const { data: tenants = [] } = useQuery<Array<{ id: string; name: string; slug: string }>>(
    'tenants-list',
    async () => {
      const response = await api.get('/tenants')
      const data = response.data
      const tenantsArray = data.tenants || data.data || data
      return Array.isArray(tenantsArray) ? tenantsArray : []
    },
    {
      enabled: isSuperAdmin,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  )

  // Helper to get query param for tenant-aware API calls
  const getSettingsParam = () => {
    if (!isSuperAdmin) return ''
    if (editingGlobal) return '?global=true'
    if (selectedTenantId) return `?tenantId=${selectedTenantId}`
    return ''
  }

  // Legacy alias for backward compatibility
  const getGlobalParam = getSettingsParam

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
    email_from_name: DEFAULT_APP_BASELINE.appName,
  })

  const [themeFormData, setThemeFormData] = useState<ThemeSettings>({
    theme_primaryColor: '#3b82f6',
    theme_secondaryColor: '#8b5cf6',
    theme_logoPath: '',
    theme_faviconPath: '',
    app_name: DEFAULT_APP_BASELINE.appName,
    app_subtitle: '',
  })

  const [securityFormData, setSecurityFormData] = useState<SecuritySettings>({
    security_maxLoginAttempts: '5',
    security_lockoutDuration: '15',
    security_sessionTimeout: '24',
    security_requireStrongPasswords: 'true',
    security_enableTwoFactor: 'false',
    security_mfaEnabled: 'false',
    security_mfaProviders: 'TOTP',
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

  const [databaseConnectionInfo, setDatabaseConnectionInfo] = useState<DatabaseConnectionInfo>({
    configured: 'false',
    source: 'environment',
    host: '',
    port: '5432',
    database: '',
    user: '',
    password: '',
  })

  const [systemHealthAlertFormData, setSystemHealthAlertFormData] = useState<SystemHealthAlertSettings>({
    enabled: true,
    webhookUrl: '',
    emailRecipients: [],
    warnDiskPercent: 80,
    criticalDiskPercent: 90,
    warnMemoryPercent: 85,
    criticalMemoryPercent: 92,
  })

  const [scoringWorkflowAlertFormData, setScoringWorkflowAlertFormData] = useState<ScoringWorkflowAlertSettings>({
    enabled: true,
    recipientRoles: ['AUDITOR', 'BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'],
    recipientUserIds: [],
    recipientEmails: [],
    notifyOnGovernanceRequestCreated: true,
    notifyOnGovernanceRequestApproved: true,
    notifyOnGovernanceRequestRejected: true,
    notifyOnDeductionRequested: true,
    notifyOnDeductionApproved: true,
    notifyOnJudgeCertified: true,
    notifyOnCategoryCertified: true,
    onlyIfUnviewed: false,
    escalationMinutes: 60,
  })

  const [scoringAlertEmailInput, setScoringAlertEmailInput] = useState('')
  const [backupFormData, setBackupFormData] = useState<BackupSettings>({
    backup_remote_enabled: 'false',
    backup_remote_type: 'rsync',
    backup_remote_host: '',
    backup_remote_port: '22',
    backup_remote_user: '',
    backup_remote_path: '',
    backup_rclone_remote: '',
    backup_s3_bucket: '',
    backup_s3_region: 'us-east-1',
    backup_s3_access_key_id: '',
    backup_s3_secret_access_key: '',
    backup_retention_days_full_local: '30',
    backup_retention_days_incremental_local: '14',
    backup_retention_days_pitr_local: '14',
    backup_min_backups_to_keep_full: '7',
    backup_min_backups_to_keep_incremental: '28',
    backup_min_backups_to_keep_pitr: '4',
    backup_log_retention_days: '14',
  })

  const [scoringType, setScoringType] = useState<'STRAIGHT' | 'OLYMPIC'>('STRAIGHT')

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'ORGANIZER' || user?.role === 'BOARD'

  // Refetch settings when global/tenant mode or selected tenant changes
  useEffect(() => {
    if (isSuperAdmin) {
      queryClient.invalidateQueries(['general-settings'])
      queryClient.invalidateQueries(['email-settings'])
      queryClient.invalidateQueries(['theme-settings-full'])
      queryClient.invalidateQueries(['security-settings'])
      queryClient.invalidateQueries(['contestant-visibility-settings'])
      queryClient.invalidateQueries(['password-policy'])
      queryClient.invalidateQueries(['backup-settings'])
      queryClient.invalidateQueries(['system-health-alert-settings'])
      queryClient.invalidateQueries(['scoring-workflow-alert-settings'])
      queryClient.invalidateQueries(['scoring-workflow-alert-candidates'])
    }
  }, [editingGlobal, selectedTenantId, isSuperAdmin, queryClient])

  // Fetch all settings
  const { data: generalSettings, isLoading: generalLoading } = useQuery<GeneralSettings>(
    ['general-settings', editingGlobal, selectedTenantId],
    async () => {
      const response = await api.get(`/settings/general${getGlobalParam()}`)
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
    ['email-settings', editingGlobal, selectedTenantId],
    async () => {
      const response = await api.get(`/settings/email${getGlobalParam()}`)
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
            email_from_name: data.email_from_name || DEFAULT_APP_BASELINE.appName,
          })
        }
      },
    }
  )

  const { data: themeSettings, isLoading: themeLoading } = useQuery<any>(
    ['theme-settings-full', editingGlobal, selectedTenantId],
    async () => {
      const response = await api.get(`/settings/theme${getGlobalParam()}`)
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
            app_name: data.app_name || data.appName || DEFAULT_APP_BASELINE.appName,
            app_subtitle: data.app_subtitle || data.appSubtitle || '',
          })
        }
      },
    }
  )

  const { data: securitySettings, isLoading: securityLoading } = useQuery<any>(
    ['security-settings', editingGlobal, selectedTenantId],
    async () => {
      const response = await api.get(`/settings/security${getGlobalParam()}`)
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
            security_enableTwoFactor: data.security_enableTwoFactor || data.security_mfaEnabled || 'false',
            security_mfaEnabled: data.security_mfaEnabled || data.security_enableTwoFactor || 'false',
            security_mfaProviders: data.security_mfaProviders || 'TOTP',
          })
        }
      },
    }
  )

  const { data: contestantVisibility, isLoading: contestantVisibilityLoading } = useQuery<any>(
    ['contestant-visibility-settings', editingGlobal, selectedTenantId],
    async () => {
      const response = await api.get(`/settings/contestant-visibility${getGlobalParam()}`)
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
    ['password-policy', editingGlobal, selectedTenantId],
    async () => {
      const response = await api.get(`/settings/password-policy${getGlobalParam()}`)
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

  const { isLoading: backupSettingsLoading } = useQuery<any>(
    ['backup-settings', editingGlobal, selectedTenantId],
    async () => {
      const response = await api.get(`/settings/backup${getGlobalParam()}`)
      return response.data.data || response.data
    },
    {
      enabled: isSuperAdmin,
      onSuccess: (data) => {
        if (!data) return
        setBackupFormData({
          backup_remote_enabled: data.backup_remote_enabled || 'false',
          backup_remote_type: data.backup_remote_type || 'rsync',
          backup_remote_host: data.backup_remote_host || '',
          backup_remote_port: data.backup_remote_port || '22',
          backup_remote_user: data.backup_remote_user || '',
          backup_remote_path: data.backup_remote_path || '',
          backup_rclone_remote: data.backup_rclone_remote || '',
          backup_s3_bucket: data.backup_s3_bucket || '',
          backup_s3_region: data.backup_s3_region || 'us-east-1',
          backup_s3_access_key_id: data.backup_s3_access_key_id || '',
          backup_s3_secret_access_key: data.backup_s3_secret_access_key || '',
          backup_retention_days_full_local: data.backup_retention_days_full_local || '30',
          backup_retention_days_incremental_local: data.backup_retention_days_incremental_local || '14',
          backup_retention_days_pitr_local: data.backup_retention_days_pitr_local || '14',
          backup_min_backups_to_keep_full: data.backup_min_backups_to_keep_full || '7',
          backup_min_backups_to_keep_incremental: data.backup_min_backups_to_keep_incremental || '28',
          backup_min_backups_to_keep_pitr: data.backup_min_backups_to_keep_pitr || '4',
          backup_log_retention_days: data.backup_log_retention_days || '14',
        })
      },
    }
  )

  const { data: databaseInfo, isLoading: databaseInfoLoading } = useQuery<any>(
    'database-connection-info',
    async () => {
      const response = await settingsAPI.getDatabaseConnectionInfo()
      const unwrapped = response.data.data || response.data
      return unwrapped
    },
    {
      enabled: isAdmin,
      onSuccess: (data) => {
        if (data) {
          setDatabaseConnectionInfo({
            configured: data.configured || 'false',
            source: data.source || 'environment',
            host: data.host || '',
            port: data.port || '5432',
            database: data.database || '',
            user: data.user || '',
            password: data.password || '',
          })
        }
      },
    }
  )

  const { data: systemHealthAlertSettings, isLoading: systemHealthAlertLoading } = useQuery<SystemHealthAlertSettings>(
    ['system-health-alert-settings', editingGlobal, selectedTenantId],
    async () => {
      const response = await api.get(`/settings/alerts/system-health${getGlobalParam()}`)
      return response.data.data || response.data
    },
    {
      enabled: isSuperAdmin,
      onSuccess: (data) => {
        if (data) {
          setSystemHealthAlertFormData({
            enabled: data.enabled !== false,
            webhookUrl: data.webhookUrl || '',
            emailRecipients: Array.isArray(data.emailRecipients) ? data.emailRecipients : [],
            warnDiskPercent: Number(data.warnDiskPercent || 80),
            criticalDiskPercent: Number(data.criticalDiskPercent || 90),
            warnMemoryPercent: Number(data.warnMemoryPercent || 85),
            criticalMemoryPercent: Number(data.criticalMemoryPercent || 92),
          })
        }
      }
    }
  )

  const { data: scoringWorkflowAlertSettings, isLoading: scoringWorkflowAlertLoading } = useQuery<ScoringWorkflowAlertSettings>(
    ['scoring-workflow-alert-settings', editingGlobal, selectedTenantId],
    async () => {
      const response = await api.get(`/settings/alerts/scoring-workflow${getGlobalParam()}`)
      return response.data.data || response.data
    },
    {
      enabled: isAdmin,
      onSuccess: (data) => {
        if (data) {
          setScoringWorkflowAlertFormData({
            enabled: data.enabled !== false,
            recipientRoles: Array.isArray(data.recipientRoles) ? data.recipientRoles : [],
            recipientUserIds: Array.isArray(data.recipientUserIds) ? data.recipientUserIds : [],
            recipientEmails: Array.isArray(data.recipientEmails) ? data.recipientEmails : [],
            notifyOnGovernanceRequestCreated: data.notifyOnGovernanceRequestCreated !== false,
            notifyOnGovernanceRequestApproved: data.notifyOnGovernanceRequestApproved !== false,
            notifyOnGovernanceRequestRejected: data.notifyOnGovernanceRequestRejected !== false,
            notifyOnDeductionRequested: data.notifyOnDeductionRequested !== false,
            notifyOnDeductionApproved: data.notifyOnDeductionApproved !== false,
            notifyOnJudgeCertified: data.notifyOnJudgeCertified !== false,
            notifyOnCategoryCertified: data.notifyOnCategoryCertified !== false,
            onlyIfUnviewed: data.onlyIfUnviewed === true,
            escalationMinutes: Number(data.escalationMinutes || 60),
          })
        }
      }
    }
  )

  const { data: scoringWorkflowAlertCandidates = [], isLoading: scoringWorkflowAlertCandidatesLoading } = useQuery<AlertCandidateUser[]>(
    ['scoring-workflow-alert-candidates', editingGlobal, selectedTenantId],
    async () => {
      const response = await api.get(`/settings/alerts/scoring-workflow/candidates${getGlobalParam()}`)
      return response.data.data || []
    },
    {
      enabled: isAdmin && (!isSuperAdmin || !editingGlobal || !!selectedTenantId),
    }
  )

  // Fetch current tenant's scoring type
  const { data: tenantScoringType, isLoading: scoringTypeLoading } = useQuery<any>(
    ['tenant-scoring-type', selectedTenantId],
    async () => {
      const response = await api.get('/tenants/current')
      return response.data
    },
    {
      enabled: isAdmin,
      onSuccess: (data) => {
        if (data && data.scoringType) {
          setScoringType(data.scoringType)
        }
      },
    }
  )

  // Update mutations
  const updateGeneralMutation = useMutation(
    async (data: GeneralSettings) => {
      const response = await api.put(`/settings${getGlobalParam()}`, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['general-settings', editingGlobal, selectedTenantId])
        setMessage({ type: 'success', text: `General settings updated successfully!${editingGlobal ? ' (Global)' : ''}` })
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
      const response = await api.put(`/settings/email${getGlobalParam()}`, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['email-settings', editingGlobal, selectedTenantId])
        setMessage({ type: 'success', text: `Email settings updated successfully!${editingGlobal ? ' (Global)' : ''}` })
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
      const response = await api.put(`/settings/theme${getGlobalParam()}`, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['theme-settings-full', editingGlobal, selectedTenantId])
        queryClient.invalidateQueries('theme-settings')
        void refreshSettings()
        window.dispatchEvent(new Event('event-manager:theme-settings-updated'))
        setMessage({ type: 'success', text: `Theme settings updated successfully!${editingGlobal ? ' (Global)' : ''}` })
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
      const response = await api.put(`/settings/security${getGlobalParam()}`, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['security-settings', editingGlobal, selectedTenantId])
        setMessage({ type: 'success', text: `Security settings updated successfully!${editingGlobal ? ' (Global)' : ''}` })
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
      const response = await api.put(`/settings/contestant-visibility${getGlobalParam()}`, data, { timeout: 30000 })
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['contestant-visibility-settings', editingGlobal, selectedTenantId])
        setMessage({ type: 'success', text: `Contestant visibility settings updated successfully!${editingGlobal ? ' (Global)' : ''}` })
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
      const response = await api.put(`/settings/password-policy${getGlobalParam()}`, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['password-policy', editingGlobal, selectedTenantId])
        setMessage({ type: 'success', text: `Password policy updated successfully!${editingGlobal ? ' (Global)' : ''}` })
        setTimeout(() => setMessage(null), 5000)
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: `Error: ${error.message}` })
        setTimeout(() => setMessage(null), 5000)
      },
    }
  )

  const updateBackupMutation = useMutation(
    async (data: BackupSettings) => {
      const response = await api.put(`/settings/backup${getGlobalParam()}`, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['backup-settings', editingGlobal, selectedTenantId])
        setMessage({ type: 'success', text: `Backup settings updated successfully!${editingGlobal ? ' (Global)' : ''}` })
        setTimeout(() => setMessage(null), 5000)
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: `Error: ${error?.response?.data?.error || error.message}` })
        setTimeout(() => setMessage(null), 5000)
      },
    }
  )

  const updateScoringTypeMutation = useMutation(
    async (newScoringType: 'STRAIGHT' | 'OLYMPIC') => {
      const response = await api.put('/tenants/current', { scoringType: newScoringType })
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tenant-scoring-type', selectedTenantId])
        setMessage({ type: 'success', text: 'Scoring type updated successfully!' })
        setTimeout(() => setMessage(null), 5000)
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: `Error: ${error.message}` })
        setTimeout(() => setMessage(null), 5000)
      },
    }
  )

  const updateSystemHealthAlertMutation = useMutation(
    async (data: SystemHealthAlertSettings) => {
      const response = await api.put(`/settings/alerts/system-health${getGlobalParam()}`, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['system-health-alert-settings', editingGlobal, selectedTenantId])
        setMessage({ type: 'success', text: `System health alert settings updated successfully!${editingGlobal ? ' (Global)' : ''}` })
        setTimeout(() => setMessage(null), 5000)
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: `Error: ${error?.response?.data?.error || error.message}` })
        setTimeout(() => setMessage(null), 5000)
      },
    }
  )

  const updateScoringWorkflowAlertMutation = useMutation(
    async (data: ScoringWorkflowAlertSettings) => {
      const response = await api.put(`/settings/alerts/scoring-workflow${getGlobalParam()}`, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['scoring-workflow-alert-settings', editingGlobal, selectedTenantId])
        setMessage({ type: 'success', text: `Scoring workflow alert settings updated successfully!${editingGlobal ? ' (Global)' : ''}` })
        setTimeout(() => setMessage(null), 5000)
      },
      onError: (error: any) => {
        setMessage({ type: 'error', text: `Error: ${error?.response?.data?.error || error.message}` })
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
        void refreshSettings()
        window.dispatchEvent(new Event('event-manager:theme-settings-updated'))
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
        void refreshSettings()
        window.dispatchEvent(new Event('event-manager:theme-settings-updated'))
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

  const mfaProviderSet = new Set(
    (securityFormData.security_mfaProviders || 'TOTP')
      .split(',')
      .map((provider) => provider.trim().toUpperCase())
      .filter(Boolean)
  )

  const toggleMfaProvider = (provider: 'TOTP' | 'SMS' | 'EMAIL', checked: boolean) => {
    const next = new Set(mfaProviderSet)
    if (checked) {
      next.add(provider)
    } else {
      next.delete(provider)
    }

    // Keep at least one provider selected.
    if (next.size === 0) {
      next.add('TOTP')
    }

    setSecurityFormData({
      ...securityFormData,
      security_mfaProviders: Array.from(next).join(','),
    })
  }

  const backupRemoteEnabled = backupFormData.backup_remote_enabled === 'true'
  const backupSectionReadOnly = isSuperAdmin && !editingGlobal

  const toggleScoringAlertRole = (role: string, checked: boolean) => {
    const next = new Set(scoringWorkflowAlertFormData.recipientRoles || [])
    if (checked) {
      next.add(role)
    } else {
      next.delete(role)
    }
    setScoringWorkflowAlertFormData({
      ...scoringWorkflowAlertFormData,
      recipientRoles: Array.from(next),
    })
  }

  const toggleScoringAlertUser = (userId: string, checked: boolean) => {
    const next = new Set(scoringWorkflowAlertFormData.recipientUserIds || [])
    if (checked) {
      next.add(userId)
    } else {
      next.delete(userId)
    }
    setScoringWorkflowAlertFormData({
      ...scoringWorkflowAlertFormData,
      recipientUserIds: Array.from(next),
    })
  }

  const addScoringAlertEmail = () => {
    const email = scoringAlertEmailInput.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    const next = new Set(scoringWorkflowAlertFormData.recipientEmails || [])
    next.add(email)
    setScoringWorkflowAlertFormData({
      ...scoringWorkflowAlertFormData,
      recipientEmails: Array.from(next),
    })
    setScoringAlertEmailInput('')
  }

  const removeScoringAlertEmail = (email: string) => {
    setScoringWorkflowAlertFormData({
      ...scoringWorkflowAlertFormData,
      recipientEmails: (scoringWorkflowAlertFormData.recipientEmails || []).filter((item) => item !== email),
    })
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
      case 'backup':
        updateBackupMutation.mutate(backupFormData)
        break
      case 'scoring':
        updateScoringTypeMutation.mutate(scoringType)
        break
      case 'system-health-alerts':
        updateSystemHealthAlertMutation.mutate(systemHealthAlertFormData)
        break
      case 'scoring-workflow-alerts':
        updateScoringWorkflowAlertMutation.mutate(scoringWorkflowAlertFormData)
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

  const isLoading =
    generalLoading ||
    emailLoading ||
    themeLoading ||
    securityLoading ||
    contestantVisibilityLoading ||
    passwordPolicyLoading ||
    (isSuperAdmin && backupSettingsLoading) ||
    databaseInfoLoading ||
    (isSuperAdmin && systemHealthAlertLoading) ||
    scoringWorkflowAlertLoading ||
    scoringTypeLoading ||
    scoringWorkflowAlertCandidatesLoading

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="cgr-page-container">
        <PageHeader
          title="System Settings"
          subtitle="Configure application-wide settings and preferences"
          icon={Cog6ToothIcon}
        />

        {/* SUPER_ADMIN Tenant/Global Settings Selector */}
        {isSuperAdmin && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
                {editingGlobal ? (
                  <GlobeAltIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                ) : (
                  <BuildingOfficeIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                )}
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Settings Scope:</span>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    {editingGlobal
                      ? 'Editing platform-wide defaults (inherited by all tenants)'
                      : selectedTenantId
                        ? `Editing settings for: ${tenants.find(t => t.id === selectedTenantId)?.name || 'Selected Tenant'}`
                        : 'Editing your tenant settings'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
                {/* Global Settings Toggle */}
                <button
                  onClick={() => {
                    setEditingGlobal(!editingGlobal)
                    if (!editingGlobal) setSelectedTenantId(null) // Clear tenant selection when switching to global
                  }}
                  className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                    editingGlobal
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-500 hover:bg-gray-600'
                  }`}
                >
                  {editingGlobal ? 'Global (Active)' : 'Global'}
                </button>

                {/* Tenant Selector Dropdown */}
                <select
                  value={selectedTenantId || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setSelectedTenantId(value || null)
                    if (value) setEditingGlobal(false) // Disable global when selecting a tenant
                  }}
                  disabled={editingGlobal}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors border-2 ${
                    !editingGlobal && selectedTenantId
                      ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  } ${editingGlobal ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="">My Tenant (Default)</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.slug})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Info text */}
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {editingGlobal
                ? 'Changes to global settings will be inherited by all tenants that have not customized these settings.'
                : selectedTenantId
                  ? 'Changes will only affect the selected tenant. These settings override the global defaults.'
                  : 'Changes will only affect your current tenant. Select a different tenant from the dropdown to edit their settings.'}
            </p>
          </Card>
        )}

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
          <Card className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading settings...</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* General Settings */}
            <div className="cgr-surface overflow-hidden rounded-lg">
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

                    <div className="py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Registration Model</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Registration is invite-only. Users are onboarded via organizer/admin invitations and complete setup from emailed links.
                      </p>
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

            {/* Scoring Settings */}
            <div className="cgr-surface overflow-hidden rounded-lg">
              <button
                onClick={() => toggleSection('scoring')}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <TrophyIcon className="h-6 w-6 mr-3 text-yellow-600 dark:text-yellow-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Scoring Settings</h2>
                </div>
                {expandedSections.includes('scoring') ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>

              {expandedSections.includes('scoring') && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Default Scoring Type
                      </label>
                      <select
                        value={scoringType}
                        onChange={(e) => setScoringType(e.target.value as 'STRAIGHT' | 'OLYMPIC')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="STRAIGHT">Straight Scoring (Average all scores)</option>
                        <option value="OLYMPIC">Olympic Scoring (Drop high & low, requires 3+ judges)</option>
                      </select>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <strong>Straight Scoring:</strong> Calculates the average of all judge scores.
                      </p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <strong>Olympic Scoring:</strong> Drops the highest and lowest scores, then averages the remaining scores. Requires a minimum of 3 judges per contest.
                      </p>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 font-medium">
                        This tenant-level setting can be overridden at the event or contest level.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => handleSaveSection('scoring')}
                      disabled={updateScoringTypeMutation.isLoading}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
                    >
                      {updateScoringTypeMutation.isLoading ? (
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

            {/* Backup & Off-site Replication (SUPER_ADMIN) */}
            {isSuperAdmin && (
              <div className="cgr-surface overflow-hidden rounded-lg">
                <button
                  onClick={() => toggleSection('backup')}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center">
                    <ServerIcon className="h-6 w-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Backup & Off-site Replication</h2>
                  </div>
                  {expandedSections.includes('backup') ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>

                {expandedSections.includes('backup') && (
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    {backupSectionReadOnly && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                        Switch scope to <strong>Global</strong> to edit runtime backup config used by host backup scripts.
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Retention (days)</label>
                        <input
                          disabled={backupSectionReadOnly}
                          type="number"
                          min={1}
                          value={backupFormData.backup_retention_days_full_local}
                          onChange={(e) => setBackupFormData({ ...backupFormData, backup_retention_days_full_local: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Incremental Retention (days)</label>
                        <input
                          disabled={backupSectionReadOnly}
                          type="number"
                          min={1}
                          value={backupFormData.backup_retention_days_incremental_local}
                          onChange={(e) => setBackupFormData({ ...backupFormData, backup_retention_days_incremental_local: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PITR Retention (days)</label>
                        <input
                          disabled={backupSectionReadOnly}
                          type="number"
                          min={1}
                          value={backupFormData.backup_retention_days_pitr_local}
                          onChange={(e) => setBackupFormData({ ...backupFormData, backup_retention_days_pitr_local: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Keep Full</label>
                        <input
                          disabled={backupSectionReadOnly}
                          type="number"
                          min={1}
                          value={backupFormData.backup_min_backups_to_keep_full}
                          onChange={(e) => setBackupFormData({ ...backupFormData, backup_min_backups_to_keep_full: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Keep Incremental</label>
                        <input
                          disabled={backupSectionReadOnly}
                          type="number"
                          min={1}
                          value={backupFormData.backup_min_backups_to_keep_incremental}
                          onChange={(e) => setBackupFormData({ ...backupFormData, backup_min_backups_to_keep_incremental: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Keep PITR</label>
                        <input
                          disabled={backupSectionReadOnly}
                          type="number"
                          min={1}
                          value={backupFormData.backup_min_backups_to_keep_pitr}
                          onChange={(e) => setBackupFormData({ ...backupFormData, backup_min_backups_to_keep_pitr: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Backup Log Retention (days)</label>
                        <input
                          disabled={backupSectionReadOnly}
                          type="number"
                          min={1}
                          value={backupFormData.backup_log_retention_days}
                          onChange={(e) => setBackupFormData({ ...backupFormData, backup_log_retention_days: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Off-site Replication</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Replicate completed backups to remote storage.</p>
                      </div>
                      <input
                        disabled={backupSectionReadOnly}
                        type="checkbox"
                        checked={backupRemoteEnabled}
                        onChange={(e) => setBackupFormData({ ...backupFormData, backup_remote_enabled: e.target.checked ? 'true' : 'false' })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Remote Type</label>
                        <select
                          disabled={backupSectionReadOnly || !backupRemoteEnabled}
                          value={backupFormData.backup_remote_type}
                          onChange={(e) => setBackupFormData({ ...backupFormData, backup_remote_type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="rsync">rsync (SSH)</option>
                          <option value="sftp">SFTP/SCP (SSH)</option>
                          <option value="s3">S3 Compatible Object Storage</option>
                          <option value="rclone">rclone Target</option>
                        </select>
                      </div>
                    </div>

                    {(backupFormData.backup_remote_type === 'rsync' || backupFormData.backup_remote_type === 'sftp') && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Remote Host</label>
                          <input
                            disabled={backupSectionReadOnly || !backupRemoteEnabled}
                            type="text"
                            value={backupFormData.backup_remote_host}
                            onChange={(e) => setBackupFormData({ ...backupFormData, backup_remote_host: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Port</label>
                          <input
                            disabled={backupSectionReadOnly || !backupRemoteEnabled}
                            type="number"
                            min={1}
                            max={65535}
                            value={backupFormData.backup_remote_port}
                            onChange={(e) => setBackupFormData({ ...backupFormData, backup_remote_port: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Remote User</label>
                          <input
                            disabled={backupSectionReadOnly || !backupRemoteEnabled}
                            type="text"
                            value={backupFormData.backup_remote_user}
                            onChange={(e) => setBackupFormData({ ...backupFormData, backup_remote_user: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Remote Path</label>
                          <input
                            disabled={backupSectionReadOnly || !backupRemoteEnabled}
                            type="text"
                            value={backupFormData.backup_remote_path}
                            onChange={(e) => setBackupFormData({ ...backupFormData, backup_remote_path: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    {backupFormData.backup_remote_type === 's3' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">S3 Bucket</label>
                          <input
                            disabled={backupSectionReadOnly || !backupRemoteEnabled}
                            type="text"
                            value={backupFormData.backup_s3_bucket}
                            onChange={(e) => setBackupFormData({ ...backupFormData, backup_s3_bucket: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">S3 Region</label>
                          <input
                            disabled={backupSectionReadOnly || !backupRemoteEnabled}
                            type="text"
                            value={backupFormData.backup_s3_region}
                            onChange={(e) => setBackupFormData({ ...backupFormData, backup_s3_region: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AWS Access Key ID</label>
                          <input
                            disabled={backupSectionReadOnly || !backupRemoteEnabled}
                            type="text"
                            value={backupFormData.backup_s3_access_key_id}
                            onChange={(e) => setBackupFormData({ ...backupFormData, backup_s3_access_key_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AWS Secret Access Key</label>
                          <input
                            disabled={backupSectionReadOnly || !backupRemoteEnabled}
                            type="password"
                            value={backupFormData.backup_s3_secret_access_key}
                            onChange={(e) => setBackupFormData({ ...backupFormData, backup_s3_secret_access_key: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    {backupFormData.backup_remote_type === 'rclone' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">rclone Remote Target</label>
                        <input
                          disabled={backupSectionReadOnly || !backupRemoteEnabled}
                          type="text"
                          value={backupFormData.backup_rclone_remote}
                          onChange={(e) => setBackupFormData({ ...backupFormData, backup_rclone_remote: e.target.value })}
                          placeholder="remote:bucket/path"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    )}

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Saving writes both DB settings and runtime backup config file used by host scripts.
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => handleSaveSection('backup')}
                        disabled={updateBackupMutation.isLoading || backupSectionReadOnly}
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
                      >
                        {updateBackupMutation.isLoading ? (
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
            )}

            {/* System Health Alerts (SUPER_ADMIN) */}
            {isSuperAdmin && (
              <div className="cgr-surface overflow-hidden rounded-lg">
                <button
                  onClick={() => toggleSection('system-health-alerts')}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center">
                    <BellIcon className="h-6 w-6 mr-3 text-amber-600 dark:text-amber-400" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">System Health Alerts</h2>
                  </div>
                  {expandedSections.includes('system-health-alerts') ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>

                {expandedSections.includes('system-health-alerts') && (
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Enable System Health Alerts</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Triggers webhook/email alerts for disk, memory, and service health.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={systemHealthAlertFormData.enabled}
                        onChange={(e) => setSystemHealthAlertFormData({ ...systemHealthAlertFormData, enabled: e.target.checked })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Webhook URL</label>
                      <input
                        type="url"
                        value={systemHealthAlertFormData.webhookUrl}
                        onChange={(e) => setSystemHealthAlertFormData({ ...systemHealthAlertFormData, webhookUrl: e.target.value })}
                        placeholder="https://example.com/webhook"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Recipients (comma-separated)</label>
                      <input
                        type="text"
                        value={systemHealthAlertFormData.emailRecipients.join(', ')}
                        onChange={(e) =>
                          setSystemHealthAlertFormData({
                            ...systemHealthAlertFormData,
                            emailRecipients: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
                          })
                        }
                        placeholder="ops@example.com, security@example.com"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Warn Disk %</label>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={systemHealthAlertFormData.warnDiskPercent}
                          onChange={(e) => setSystemHealthAlertFormData({ ...systemHealthAlertFormData, warnDiskPercent: Number(e.target.value) || 80 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Critical Disk %</label>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={systemHealthAlertFormData.criticalDiskPercent}
                          onChange={(e) => setSystemHealthAlertFormData({ ...systemHealthAlertFormData, criticalDiskPercent: Number(e.target.value) || 90 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Warn Memory %</label>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={systemHealthAlertFormData.warnMemoryPercent}
                          onChange={(e) => setSystemHealthAlertFormData({ ...systemHealthAlertFormData, warnMemoryPercent: Number(e.target.value) || 85 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Critical Memory %</label>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={systemHealthAlertFormData.criticalMemoryPercent}
                          onChange={(e) => setSystemHealthAlertFormData({ ...systemHealthAlertFormData, criticalMemoryPercent: Number(e.target.value) || 92 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => handleSaveSection('system-health-alerts')}
                        disabled={updateSystemHealthAlertMutation.isLoading}
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
                      >
                        {updateSystemHealthAlertMutation.isLoading ? (
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
            )}

            {/* Scoring Workflow Alerts */}
            <div className="cgr-surface overflow-hidden rounded-lg">
              <button
                onClick={() => toggleSection('scoring-workflow-alerts')}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <BellIcon className="h-6 w-6 mr-3 text-cyan-600 dark:text-cyan-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Scoring Workflow Alerts</h2>
                </div>
                {expandedSections.includes('scoring-workflow-alerts') ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>

              {expandedSections.includes('scoring-workflow-alerts') && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Scoring Alerts</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Route governance, deduction, and certification events to approvers and designated recipients.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={scoringWorkflowAlertFormData.enabled}
                      onChange={(e) => setScoringWorkflowAlertFormData({ ...scoringWorkflowAlertFormData, enabled: e.target.checked })}
                      className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Notify Roles</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {['TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN', 'JUDGE', 'EMCEE'].map((role) => (
                        <label key={role} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={scoringWorkflowAlertFormData.recipientRoles.includes(role)}
                            onChange={(e) => toggleScoringAlertRole(role, e.target.checked)}
                            className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                          <span className="text-sm text-gray-900 dark:text-white">{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Notify Specific Users</p>
                    <div className="max-h-44 overflow-auto border border-gray-200 dark:border-gray-700 rounded-md p-3 space-y-2">
                      {scoringWorkflowAlertCandidates.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No candidate users available in current scope.</p>
                      )}
                      {scoringWorkflowAlertCandidates.map((candidate) => (
                        <label key={candidate.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={scoringWorkflowAlertFormData.recipientUserIds.includes(candidate.id)}
                            onChange={(e) => toggleScoringAlertUser(candidate.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {candidate.name} ({candidate.email}) - {candidate.role}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Emails</label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={scoringAlertEmailInput}
                        onChange={(e) => setScoringAlertEmailInput(e.target.value)}
                        placeholder="alerts@example.com"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={addScoringAlertEmail}
                        className="px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {scoringWorkflowAlertFormData.recipientEmails.map((email) => (
                        <button
                          key={email}
                          type="button"
                          onClick={() => removeScoringAlertEmail(email)}
                          className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                        >
                          {email} x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      ['notifyOnGovernanceRequestCreated', 'Governance Request Created'],
                      ['notifyOnGovernanceRequestApproved', 'Governance Request Approved'],
                      ['notifyOnGovernanceRequestRejected', 'Governance Request Rejected'],
                      ['notifyOnDeductionRequested', 'Deduction Requested'],
                      ['notifyOnDeductionApproved', 'Deduction Approved'],
                      ['notifyOnJudgeCertified', 'Judge Certified'],
                      ['notifyOnCategoryCertified', 'Category Certified'],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2">
                        <span className="text-sm text-gray-900 dark:text-white">{label}</span>
                        <input
                          type="checkbox"
                          checked={(scoringWorkflowAlertFormData as any)[key] === true}
                          onChange={(e) =>
                            setScoringWorkflowAlertFormData({
                              ...scoringWorkflowAlertFormData,
                              [key]: e.target.checked,
                            } as ScoringWorkflowAlertSettings)
                          }
                          className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Only If Unviewed</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Saved for phased rollout.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={scoringWorkflowAlertFormData.onlyIfUnviewed}
                        onChange={(e) => setScoringWorkflowAlertFormData({ ...scoringWorkflowAlertFormData, onlyIfUnviewed: e.target.checked })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Escalation Minutes</label>
                      <input
                        type="number"
                        min={5}
                        max={10080}
                        value={scoringWorkflowAlertFormData.escalationMinutes}
                        onChange={(e) => setScoringWorkflowAlertFormData({ ...scoringWorkflowAlertFormData, escalationMinutes: Number(e.target.value) || 60 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => handleSaveSection('scoring-workflow-alerts')}
                      disabled={updateScoringWorkflowAlertMutation.isLoading}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
                    >
                      {updateScoringWorkflowAlertMutation.isLoading ? (
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
            <div className="cgr-surface overflow-hidden rounded-lg">
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
            <div className="cgr-surface overflow-hidden rounded-lg">
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
                          placeholder={DEFAULT_APP_BASELINE.appName}
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
            <div className="cgr-surface overflow-hidden rounded-lg">
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
                        checked={(securityFormData.security_mfaEnabled || securityFormData.security_enableTwoFactor) === 'true'}
                        onChange={(e) => setSecurityFormData({
                          ...securityFormData,
                          security_enableTwoFactor: e.target.checked ? 'true' : 'false',
                          security_mfaEnabled: e.target.checked ? 'true' : 'false',
                        })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        MFA Providers Allowed for This Tenant
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        TOTP is currently required for enforced MFA sign-in.
                      </p>
                      <div className="space-y-2">
                        {(['TOTP', 'SMS', 'EMAIL'] as const).map((provider) => (
                          <label key={provider} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={mfaProviderSet.has(provider)}
                              onChange={(e) => toggleMfaProvider(provider, e.target.checked)}
                              className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                            />
                            <span className="text-sm text-gray-900 dark:text-white">{provider}</span>
                          </label>
                        ))}
                      </div>
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
            <div className="cgr-surface overflow-hidden rounded-lg">
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
            <div className="cgr-surface overflow-hidden rounded-lg">
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

            {/* Database Settings */}
            <div className="cgr-surface overflow-hidden rounded-lg">
              <button
                onClick={() => toggleSection('database')}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <ServerIcon className="h-6 w-6 mr-3 text-cyan-600 dark:text-cyan-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Database Connection</h2>
                </div>
                {expandedSections.includes('database') ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>

              {expandedSections.includes('database') && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Read-Only Information:</strong> Database connection settings are configured via environment variables for security. These settings cannot be modified through the UI.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Connection Status
                        </label>
                        <div className={`px-3 py-2 border rounded-md ${
                          databaseConnectionInfo.configured === 'true'
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                        }`}>
                          {databaseConnectionInfo.configured === 'true' ? 'Connected' : 'Not Configured'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Configuration Source
                        </label>
                        <input
                          type="text"
                          value={databaseConnectionInfo.source}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Host
                        </label>
                        <input
                          type="text"
                          value={databaseConnectionInfo.host}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Port
                        </label>
                        <input
                          type="text"
                          value={databaseConnectionInfo.port}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Database Name
                      </label>
                      <input
                        type="text"
                        value={databaseConnectionInfo.database}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Database User
                      </label>
                      <input
                        type="text"
                        value={databaseConnectionInfo.user}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Password
                      </label>
                      <input
                        type="text"
                        value={databaseConnectionInfo.password}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                      />
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>To modify database settings:</strong> Update the environment variables (DATABASE_URL or individual DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD) in your .env file and restart the application.
                      </p>
                    </div>
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
