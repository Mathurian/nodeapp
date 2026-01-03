import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  DocumentDuplicateIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline'

interface EventTemplate {
  id: string
  name: string
  description: string
  templateData: {
    eventSettings: Record<string, any>
    contests: Array<{
      name: string
      settings: Record<string, any>
      categories: Array<{
        name: string
        settings: Record<string, any>
      }>
    }>
  }
  createdAt: string
  usageCount: number
}

const EventTemplatesPage: React.FC = () => {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<EventTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EventTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await api.get('/event-template')
      setTemplates(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const createEventFromTemplate = async (templateId: string) => {
    if (!confirm('Create a new event from this template?')) return
    try {
      const response = await api.post(`/event-template/${templateId}/create-event`)
      alert(`Event created successfully! ID: ${response.data.eventId}`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create event from template')
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    try {
      await api.delete(`/event-template/${id}`)
      await fetchTemplates()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete template')
    }
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ORGANIZER') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            You don't have permission to manage event templates.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Loading templates...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
              Event Templates
            </h1>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mt-2">
              Create reusable event templates for quick setup
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
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
            <div className="col-span-3 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <DocumentDuplicateIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                No event templates yet. Create your first template to streamline event creation.
              </p>
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white mb-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                      {template.description}
                    </p>
                  </div>
                  <DocumentDuplicateIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 space-y-1">
                    <p>Contests: {template.templateData.contests?.length || 0}</p>
                    <p>
                      Categories: {template.templateData.contests?.reduce((sum, c) => sum + (c.categories?.length || 0), 0) || 0}
                    </p>
                    <p>Used: {template.usageCount} times</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => createEventFromTemplate(template.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm"
                  >
                    <RocketLaunchIcon className="h-4 w-4" />
                    Use Template
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default EventTemplatesPage
