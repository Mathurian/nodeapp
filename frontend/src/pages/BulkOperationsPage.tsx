import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usersAPI, emailAPI } from '../services/api'
import {
  DEFAULT_EMAIL_STYLE,
  EMAIL_STYLE_PRESETS,
  buildBrandedEmailHtml,
  getEmailContrastStatus,
  normalizeEmailStyle,
  type EmailStyleConfig,
} from '../utils/emailHtml'
import {
  UserPlusIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline'
import { Card, PageHeader } from '../components/ui'

interface EmailTemplateOption {
  id: string
  name: string
  subject: string
  body: string
}

const BULK_EMAIL_ROLE_OPTIONS = [
  'ADMIN',
  'AUDITOR',
  'BOARD',
  'CONTESTANT',
  'EMCEE',
  'JUDGE',
  'ORGANIZER',
  'TALLY_MASTER',
]

const BulkOperationsPage: React.FC = () => {
  const { user } = useAuth()
  const location = useLocation()
  const isSendEmailRoute = useMemo(() => location.pathname.endsWith('/send-email'), [location.pathname])
  const desiredTab = useMemo<'import' | 'email'>(() => {
    const tabParam = new URLSearchParams(location.search).get('tab')?.toLowerCase()
    if (tabParam === 'email' || isSendEmailRoute) {
      return 'email'
    }
    return 'import'
  }, [isSendEmailRoute, location.search])
  const [activeTab, setActiveTab] = useState<'import' | 'email'>(desiredTab)
  const [file, setFile] = useState<File | null>(null)
  const [recipientMode, setRecipientMode] = useState<'roles' | 'manual'>('roles')
  const [emailData, setEmailData] = useState({
    roles: [] as string[],
    recipientsText: '',
    subject: '',
    content: '',
  })
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateOption[]>([])
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState('')
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [useStyledEmail, setUseStyledEmail] = useState(false)
  const [emailStylePreset, setEmailStylePreset] = useState<string>('default')
  const [emailStyle, setEmailStyle] = useState<EmailStyleConfig>({ ...DEFAULT_EMAIL_STYLE })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const styleContrast = useMemo(() => getEmailContrastStatus(emailStyle), [emailStyle])

  useEffect(() => {
    setActiveTab(desiredTab)
  }, [desiredTab])

  useEffect(() => {
    if (isSendEmailRoute) {
      setActiveTab('email')
    }
  }, [isSendEmailRoute])

  useEffect(() => {
    if (activeTab !== 'email') {
      return
    }

    const loadTemplates = async () => {
      try {
        setLoadingTemplates(true)
        const response = await emailAPI.getTemplates()
        const payload = response.data?.data || response.data || []
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.templates)
            ? payload.templates
            : []
        const normalizedTemplates: EmailTemplateOption[] = rows
          .filter((row: any) => row?.id)
          .map((row: any) => ({
            id: String(row.id),
            name: String(row.name || 'Untitled template'),
            subject: String(row.subject || ''),
            body: String(row.body || row.textBody || row.htmlBody || ''),
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setEmailTemplates(normalizedTemplates)
      } catch {
        setEmailTemplates([])
      } finally {
        setLoadingTemplates(false)
      }
    }

    void loadTemplates()
  }, [activeTab])

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await usersAPI.importCSV(file)
      const payload = response.data?.data || {}
      const failed = Number(payload.failed ?? 0)
      const errors = Array.isArray(payload.errors) ? payload.errors : []

      setSuccess(response.data?.message || 'Bulk upload completed')
      setFile(null)

      if (failed > 0 && errors.length > 0) {
        setError(errors.slice(0, 3).join(' | '))
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import users')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkEmail = async () => {
    if (!emailData.subject || !emailData.content) {
      setError('Subject and content are required')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const normalizedStyle = normalizeEmailStyle(emailStyle)
      const html = useStyledEmail
        ? buildBrandedEmailHtml({
            subject: emailData.subject,
            title: emailData.subject,
            message: emailData.content,
            preheader: emailData.subject,
            style: normalizedStyle,
          })
        : undefined

      if (recipientMode === 'roles') {
        if (emailData.roles.length === 0) {
          setError('Select at least one role')
          return
        }
        const response = await emailAPI.sendByRole({
          roles: emailData.roles,
          subject: emailData.subject,
          body: emailData.content,
          html,
        })
        const payload = response.data?.data || {}
        const sent = Number(payload.sent ?? 0)
        const failed = Number(payload.failed ?? 0)
        const skipped = Number(payload.skipped ?? 0)
        const responseMessage = response.data?.message || 'Email processed'
        setSuccess(`${responseMessage} (Sent: ${sent}, Skipped: ${skipped}, Failed: ${failed})`)
      } else {
        const recipients = emailData.recipientsText
          .split(/[\n,;]+/)
          .map((item) => item.trim())
          .filter(Boolean)
        const uniqueRecipients = Array.from(new Set(recipients))

        if (uniqueRecipients.length === 0) {
          setError('Enter at least one email address')
          return
        }

        const response = await emailAPI.sendMultiple({
          recipients: uniqueRecipients,
          subject: emailData.subject,
          body: emailData.content,
          html,
        })
        const payload = response.data?.data || {}
        const sent = Number(payload.sent ?? 0)
        const failed = Number(payload.failed ?? 0)
        const skipped = Number(payload.skipped ?? 0)
        const responseMessage = response.data?.message || 'Email processed'
        setSuccess(`${responseMessage} (Sent: ${sent}, Skipped: ${skipped}, Failed: ${failed})`)
      }

      setEmailData({ roles: [], recipientsText: '', subject: '', content: '' })
      setSelectedEmailTemplateId('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  const applyEmailStylePreset = (presetId: string) => {
    setEmailStylePreset(presetId)
    const preset = EMAIL_STYLE_PRESETS.find((item) => item.id === presetId)
    if (preset) {
      setEmailStyle({ ...preset.style })
    }
  }

  const updateEmailStyle = (patch: Partial<EmailStyleConfig>) => {
    setEmailStyle((prev) => ({ ...prev, ...patch }))
    setEmailStylePreset('custom')
  }

  const toggleRole = (role: string) => {
    setEmailData({
      ...emailData,
      roles: emailData.roles.includes(role)
        ? emailData.roles.filter(r => r !== role)
        : [...emailData.roles, role],
    })
  }

  const applyEmailTemplate = (templateId: string) => {
    setSelectedEmailTemplateId(templateId)
    if (!templateId) {
      return
    }

    const selected = emailTemplates.find((template) => template.id === templateId)
    if (!selected) {
      return
    }

    setEmailData((prev) => ({
      ...prev,
      subject: selected.subject,
      content: selected.body,
    }))
  }

  const downloadTemplate = async () => {
    try {
      const response = await usersAPI.getCSVTemplate('UNIVERSAL')
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'users_import_template.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download template')
    }
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ORGANIZER' && user?.role !== 'BOARD') {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            You don't have permission to perform bulk operations.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container">
        <PageHeader
          title={isSendEmailRoute ? 'Send Email' : 'Bulk Operations'}
          subtitle={isSendEmailRoute ? 'Send email by role or direct recipient addresses' : 'Import users, send bulk emails, and perform batch operations'}
        />

        {error && (
          <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </Card>
        )}

        {success && (
          <Card className="mb-6 p-4 bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </Card>
        )}

        {!isSendEmailRoute && (
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'import'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <UserPlusIcon className="h-5 w-5 inline mr-2" />
              User Import
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'email'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <EnvelopeIcon className="h-5 w-5 inline mr-2" />
              Bulk Email
            </button>
          </div>
        )}

        {/* User Import Tab */}
        {activeTab === 'import' && (
          <Card className="rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
              Import Users from CSV
            </h2>
            <div className="space-y-4">
              <div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                  Download CSV Template
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-gray-900 dark:text-white dark:text-white"
                />
              </div>

              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                <CloudArrowUpIcon className="h-5 w-5" />
                {loading ? 'Importing...' : 'Import Users'}
              </button>

              <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> The template supports mixed roles in a single file. The CSV must include the header row and `role` column.
                  Comment lines that start with `#` are allowed.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Bulk Email Tab */}
        {activeTab === 'email' && (
          <Card className="rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
              Send Email
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Email Template
                </label>
                <select
                  value={selectedEmailTemplateId}
                  onChange={(e) => applyEmailTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                >
                  <option value="">{loadingTemplates ? 'Loading templates...' : 'Custom email (no template)'}</option>
                  {emailTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Recipient Mode
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipientMode('roles')}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      recipientMode === 'roles'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    By Role
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode('manual')}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      recipientMode === 'manual'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    Manual Addresses
                  </button>
                </div>
              </div>

              {recipientMode === 'roles' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    Select Recipient Roles
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {BULK_EMAIL_ROLE_OPTIONS.map((role) => (
                      <label key={role} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={emailData.roles.includes(role)}
                          onChange={() => toggleRole(role)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Email Addresses
                  </label>
                  <textarea
                    value={emailData.recipientsText}
                    onChange={(e) => setEmailData({ ...emailData, recipientsText: e.target.value })}
                    rows={4}
                    placeholder="name1@example.com, name2@example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Separate addresses using commas, semicolons, or new lines.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Email Content
                </label>
                <textarea
                  value={emailData.content}
                  onChange={(e) => setEmailData({ ...emailData, content: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                />
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={useStyledEmail}
                    onChange={(e) => setUseStyledEmail(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  Apply custom email styling
                </label>

                {useStyledEmail && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[180px] flex-1">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Style preset</label>
                        <select
                          value={emailStylePreset}
                          onChange={(e) => applyEmailStylePreset(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                        >
                          {EMAIL_STYLE_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>{preset.label}</option>
                          ))}
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyEmailStylePreset('default')}
                        className="px-3 py-2 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        Reset style
                      </button>
                    </div>
                    {!styleContrast.passes && (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Text contrast is low on light backgrounds ({styleContrast.ratio.toFixed(2)}:1). Recommended text color: {styleContrast.recommendedTextColor}.
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Header title</label>
                      <input
                        type="text"
                        value={emailStyle.headerTitle}
                        onChange={(e) => updateEmailStyle({ headerTitle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Footer text</label>
                      <input
                        type="text"
                        value={emailStyle.footerText}
                        onChange={(e) => updateEmailStyle({ footerText: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Primary color</label>
                      <input
                        type="color"
                        value={emailStyle.primaryColor}
                        onChange={(e) => updateEmailStyle({ primaryColor: e.target.value })}
                        className="h-10 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Background color</label>
                      <input
                        type="color"
                        value={emailStyle.backgroundColor}
                        onChange={(e) => updateEmailStyle({ backgroundColor: e.target.value })}
                        className="h-10 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Text color</label>
                      <input
                        type="color"
                        value={emailStyle.textColor}
                        onChange={(e) => updateEmailStyle({ textColor: e.target.value })}
                        className="h-10 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleBulkEmail}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                <EnvelopeIcon className="h-5 w-5" />
                {loading ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </Card>
        )}
    </div>
  )
}

export default BulkOperationsPage
