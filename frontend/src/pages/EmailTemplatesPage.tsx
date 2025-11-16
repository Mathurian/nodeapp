import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { emailAPI } from '../services/api'
import {
  EnvelopeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
  category: 'NOTIFICATION' | 'WELCOME' | 'REMINDER' | 'REPORT' | 'CUSTOM'
  createdAt: string
  updatedAt: string
}

const EmailTemplatesPage: React.FC = () => {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showPreview, setShowPreview] = useState<EmailTemplate | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    subject: string
    body: string
    category: 'NOTIFICATION' | 'WELCOME' | 'REMINDER' | 'REPORT' | 'CUSTOM'
  }>({
    name: '',
    subject: '',
    body: '',
    category: 'CUSTOM',
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await emailAPI.getTemplates()
      setTemplates(response.data)
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

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      body: '',
      category: 'CUSTOM',
    })
  }

  const openEditModal = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category,
    })
    setShowModal(true)
  }

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

  if (user?.role !== 'ADMIN' && user?.role !== 'ORGANIZER') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to manage email templates.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading templates...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Email Templates
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create and manage reusable email templates
            </p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setEditingTemplate(null)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Create Template
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.length === 0 ? (
            <div className="col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <EnvelopeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No email templates yet. Create your first template.
              </p>
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {template.name}
                    </h3>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {template.category}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {template.subject}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Body:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {template.body}
                  </p>
                </div>

                {template.variables && template.variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((variable) => (
                        <span
                          key={variable}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview(template)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <EyeIcon className="h-4 w-4 inline mr-1" />
                    Preview
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <PencilIcon className="h-4 w-4 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="CUSTOM">Custom</option>
                    <option value="NOTIFICATION">Notification</option>
                    <option value="WELCOME">Welcome</option>
                    <option value="REMINDER">Reminder</option>
                    <option value="REPORT">Report</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Body
                  </label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Available Variables (click to insert):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableVariables.map((variable) => (
                      <button
                        key={variable}
                        onClick={() => insertVariable(variable)}
                        type="button"
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTemplate ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingTemplate(null)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Preview: {showPreview.name}
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject:
                  </p>
                  <p className="text-gray-900 dark:text-white">{showPreview.subject}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Body:
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg whitespace-pre-wrap text-gray-900 dark:text-white">
                    {showPreview.body}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(null)}
                className="mt-6 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmailTemplatesPage
