import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { emailAPI } from '../services/api'
import {
  DEFAULT_EMAIL_STYLE,
  EMAIL_STYLE_PRESETS,
  getEmailContrastStatus,
} from '../utils/emailHtml'
import {
  EnvelopeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import { Button, Card, PageHeader } from '../components/ui'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
  type: 'NOTIFICATION' | 'WELCOME' | 'REMINDER' | 'REPORT' | 'CUSTOM'
  headerHtml?: string | null
  footerHtml?: string | null
  logoUrl?: string | null
  backgroundColor?: string | null
  primaryColor?: string | null
  textColor?: string | null
  fontFamily?: string | null
  fontSize?: string | null
  borderRadius?: string | null
  padding?: string | null
  createdAt: string
  updatedAt: string
}

interface TemplatePreview {
  subject: string
  html?: string
}

const EmailTemplatesPage: React.FC = () => {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showPreview, setShowPreview] = useState<EmailTemplate | null>(null)
  const [previewContent, setPreviewContent] = useState<TemplatePreview | null>(null)
  const [showSendModal, setShowSendModal] = useState<EmailTemplate | null>(null)
  const [sendRecipients, setSendRecipients] = useState('')
  const [sendRoles, setSendRoles] = useState<string[]>([])
  const [sendVariables, setSendVariables] = useState('{}')
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [stylePreset, setStylePreset] = useState<string>('default')
  const [formData, setFormData] = useState<{
    name: string
    subject: string
    body: string
    type: 'NOTIFICATION' | 'WELCOME' | 'REMINDER' | 'REPORT' | 'CUSTOM'
    headerHtml: string
    footerHtml: string
    logoUrl: string
    backgroundColor: string
    primaryColor: string
    textColor: string
    fontFamily: string
    fontSize: string
    borderRadius: string
    padding: string
  }>({
    name: '',
    subject: '',
    body: '',
    type: 'CUSTOM',
    headerHtml: '',
    footerHtml: '',
    logoUrl: '',
    backgroundColor: DEFAULT_EMAIL_STYLE.backgroundColor,
    primaryColor: DEFAULT_EMAIL_STYLE.primaryColor,
    textColor: DEFAULT_EMAIL_STYLE.textColor,
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    borderRadius: '4px',
    padding: '20px',
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await emailAPI.getTemplates()
      const payload = response.data?.data
      const templateList = Array.isArray(payload) ? payload : (payload?.templates || payload?.data || [])
      const mapped = Array.isArray(templateList)
        ? templateList.map((template: any) => ({
            ...template,
            type: template.type || template.category || 'CUSTOM',
            variables: Array.isArray(template.variables)
              ? template.variables
              : typeof template.variables === 'string'
                ? (() => {
                    try {
                      return JSON.parse(template.variables || '[]')
                    } catch {
                      return []
                    }
                  })()
                : [],
            headerHtml: template.headerHtml || '',
            footerHtml: template.footerHtml || '',
            logoUrl: template.logoUrl || '',
            backgroundColor: template.backgroundColor || DEFAULT_EMAIL_STYLE.backgroundColor,
            primaryColor: template.primaryColor || DEFAULT_EMAIL_STYLE.primaryColor,
            textColor: template.textColor || DEFAULT_EMAIL_STYLE.textColor,
            fontFamily: template.fontFamily || 'Arial, sans-serif',
            fontSize: template.fontSize || '14px',
            borderRadius: template.borderRadius || '4px',
            padding: template.padding || '20px',
          }))
        : []
      setTemplates(mapped)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async () => {
    try {
      await emailAPI.createTemplate(formData)
      setShowModal(false)
      resetForm()
      await fetchTemplates()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create template')
    }
  }

  const updateTemplate = async () => {
    if (!editingTemplate) return
    try {
      await emailAPI.updateTemplate(editingTemplate.id, formData)
      setEditingTemplate(null)
      resetForm()
      await fetchTemplates()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update template')
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    try {
      await emailAPI.deleteTemplate(id)
      await fetchTemplates()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete template')
    }
  }

  const openPreview = async (template: EmailTemplate) => {
    setShowPreview(template)
    setPreviewContent({ subject: template.subject, html: template.body })
    try {
      const response = await emailAPI.previewTemplate(template.id, {})
      const payload = response.data?.data || response.data
      setPreviewContent({
        subject: payload?.subject || template.subject,
        html: payload?.html || template.body,
      })
    } catch {
      setPreviewContent({ subject: template.subject, html: template.body })
    }
  }

  const submitSendTemplate = async () => {
    if (!showSendModal) return

    const recipients = sendRecipients
      .split(/[,\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean)

    let parsedVariables: Record<string, string> = {}
    if (sendVariables.trim()) {
      try {
        parsedVariables = JSON.parse(sendVariables)
      } catch {
        setError('Variables must be valid JSON object')
        return
      }
    }

    try {
      const response = await emailAPI.sendTemplate(showSendModal.id, {
        recipients,
        roles: sendRoles,
        variables: parsedVariables,
      })
      const payload = response.data?.data || response.data
      setError(null)
      const sent = Number(payload?.sent ?? 0)
      const failed = Number(payload?.failed ?? 0)
      const skipped = Number(payload?.skipped ?? 0)
      const summary = `Template send completed. Sent: ${sent}, Failed: ${failed}, Skipped: ${skipped}`
      alert(skipped > 0 ? `${summary}\nSMTP is disabled for this environment, so skipped emails were not delivered.` : summary)
      setShowSendModal(null)
      setSendRecipients('')
      setSendRoles([])
      setSendVariables('{}')
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to send template email')
    }
  }

  const resetForm = () => {
    setStylePreset('default')
    setFormData({
      name: '',
      subject: '',
      body: '',
      type: 'CUSTOM',
      headerHtml: '',
      footerHtml: '',
      logoUrl: '',
      backgroundColor: DEFAULT_EMAIL_STYLE.backgroundColor,
      primaryColor: DEFAULT_EMAIL_STYLE.primaryColor,
      textColor: DEFAULT_EMAIL_STYLE.textColor,
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      borderRadius: '4px',
      padding: '20px',
    })
  }

  const openEditModal = (template: EmailTemplate) => {
    setStylePreset('custom')
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      type: template.type,
      headerHtml: template.headerHtml || '',
      footerHtml: template.footerHtml || '',
      logoUrl: template.logoUrl || '',
      backgroundColor: template.backgroundColor || DEFAULT_EMAIL_STYLE.backgroundColor,
      primaryColor: template.primaryColor || DEFAULT_EMAIL_STYLE.primaryColor,
      textColor: template.textColor || DEFAULT_EMAIL_STYLE.textColor,
      fontFamily: template.fontFamily || 'Arial, sans-serif',
      fontSize: template.fontSize || '14px',
      borderRadius: template.borderRadius || '4px',
      padding: template.padding || '20px',
    })
    setShowModal(true)
  }

  const applyStylePreset = (presetId: string) => {
    setStylePreset(presetId)
    const preset = EMAIL_STYLE_PRESETS.find((item) => item.id === presetId)
    if (!preset) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      primaryColor: preset.style.primaryColor,
      backgroundColor: preset.style.backgroundColor,
      textColor: preset.style.textColor,
    }))
  }

  const styleContrast = getEmailContrastStatus({
    headerTitle: formData.name || DEFAULT_EMAIL_STYLE.headerTitle,
    primaryColor: formData.primaryColor,
    backgroundColor: formData.backgroundColor,
    textColor: formData.textColor,
    footerText: formData.footerHtml || DEFAULT_EMAIL_STYLE.footerText,
  })

  const availableVariables = [
    '{{name}}',
    '{{email}}',
    '{{event_name}}',
    '{{event_date}}',
    '{{contest_name}}',
    '{{category_name}}',
    '{{score}}',
    '{{rank}}',
  ]

  const insertVariable = (variable: string) => {
    setFormData({
      ...formData,
      body: formData.body + ' ' + variable,
    })
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ORGANIZER' && user?.role !== 'BOARD') {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            You don't have permission to manage email templates.
          </p>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center text-gray-600 dark:text-gray-400">Loading templates...</Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container">
        <div className="flex justify-between items-center mb-8">
          <PageHeader
            title="Email Templates"
            subtitle="Create and manage reusable email templates"
            icon={EnvelopeIcon}
          />
          <Button
            onClick={() => {
              resetForm()
              setEditingTemplate(null)
              setShowModal(true)
            }}
          >
            <PlusIcon className="h-5 w-5" />
            Create Template
          </Button>
        </div>

        {error && (
          <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.length === 0 ? (
            <Card className="col-span-3 rounded-lg p-12 text-center">
              <EnvelopeIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                No email templates yet. Create your first template.
              </p>
            </Card>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white mb-1">
                      {template.name}
                    </h3>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {template.type}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Subject:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 truncate">
                    {template.subject}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Body:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 line-clamp-3">
                    {template.body}
                  </p>
                </div>

                {template.variables && template.variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((variable) => (
                        <span
                          key={variable}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 rounded"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => openPreview(template)}
                    className="flex-1 px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm"
                  >
                    <EyeIcon className="h-4 w-4 inline mr-1" />
                    Preview
                  </button>
                  <button
                    onClick={() => setShowSendModal(template)}
                    className="flex-1 px-3 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors text-sm"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
                  >
                    <PencilIcon className="h-4 w-4 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl mx-4 max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-4">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  >
                    <option value="CUSTOM">Custom</option>
                    <option value="NOTIFICATION">Notification</option>
                    <option value="WELCOME">Welcome</option>
                    <option value="REMINDER">Reminder</option>
                    <option value="REPORT">Report</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Body
                  </label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white font-mono text-sm"
                  />
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Look &amp; Feel</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[180px] flex-1">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Style preset</label>
                      <select
                        value={stylePreset}
                        onChange={(e) => applyStylePreset(e.target.value)}
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
                      onClick={() => applyStylePreset('default')}
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
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Primary Color</label>
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => {
                          setStylePreset('custom')
                          setFormData({ ...formData, primaryColor: e.target.value })
                        }}
                        className="h-10 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Background Color</label>
                      <input
                        type="color"
                        value={formData.backgroundColor}
                        onChange={(e) => {
                          setStylePreset('custom')
                          setFormData({ ...formData, backgroundColor: e.target.value })
                        }}
                        className="h-10 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Text Color</label>
                      <input
                        type="color"
                        value={formData.textColor}
                        onChange={(e) => {
                          setStylePreset('custom')
                          setFormData({ ...formData, textColor: e.target.value })
                        }}
                        className="h-10 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Logo URL</label>
                      <input
                        type="url"
                        value={formData.logoUrl}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Font Family</label>
                      <input
                        type="text"
                        value={formData.fontFamily}
                        onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                        placeholder="Arial, sans-serif"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Font Size</label>
                      <input
                        type="text"
                        value={formData.fontSize}
                        onChange={(e) => setFormData({ ...formData, fontSize: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                        placeholder="14px"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Border Radius</label>
                      <input
                        type="text"
                        value={formData.borderRadius}
                        onChange={(e) => setFormData({ ...formData, borderRadius: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                        placeholder="4px"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Padding</label>
                      <input
                        type="text"
                        value={formData.padding}
                        onChange={(e) => setFormData({ ...formData, padding: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                        placeholder="20px"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Header HTML (optional)</label>
                    <textarea
                      value={formData.headerHtml}
                      onChange={(e) => setFormData({ ...formData, headerHtml: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white font-mono"
                      placeholder="<h1>Event Manager Updates</h1>"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Footer HTML (optional)</label>
                    <textarea
                      value={formData.footerHtml}
                      onChange={(e) => setFormData({ ...formData, footerHtml: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white font-mono"
                      placeholder="<p>Questions? Reply to this email.</p>"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    Available Variables (click to insert):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableVariables.map((variable) => (
                      <button
                        key={variable}
                        onClick={() => insertVariable(variable)}
                        type="button"
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={editingTemplate ? updateTemplate : createTemplate}
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  {editingTemplate ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingTemplate(null)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-4">
                Preview: {showPreview.name}
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Subject:
                  </p>
                  <p className="text-gray-900 dark:text-white dark:text-white">{previewContent?.subject || showPreview.subject}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Body:
                  </p>
                  <iframe
                    title="Email template preview"
                    className="w-full h-80 border border-gray-200 dark:border-gray-700 rounded-lg bg-white"
                    sandbox="allow-same-origin"
                    srcDoc={previewContent?.html || showPreview.body}
                  />
                </div>
              </div>
              <button
                onClick={() => setShowPreview(null)}
                className="mt-6 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Send Modal */}
        {showSendModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Send Template: {showSendModal.name}
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recipients (comma or newline separated)
                </label>
                <textarea
                  rows={3}
                  value={sendRecipients}
                  onChange={(e) => setSendRecipients(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="user1@example.com, user2@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Add Recipients by Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE', 'EMCEE', 'CONTESTANT'].map((role) => (
                    <label key={role} className="text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={sendRoles.includes(role)}
                        onChange={(e) => {
                          setSendRoles((prev) => e.target.checked ? [...prev, role] : prev.filter((r) => r !== role))
                        }}
                      />
                      {role.replace('_', ' ')}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template Variables (JSON)
                </label>
                <textarea
                  rows={4}
                  value={sendVariables}
                  onChange={(e) => setSendVariables(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={submitSendTemplate}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Send Template
                </button>
                <button
                  onClick={() => setShowSendModal(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

export default EmailTemplatesPage
