import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  Square3Stack3DIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'

interface CustomField {
  id: string
  name: string
  label: string
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'CHECKBOX' | 'TEXTAREA'
  entityType: 'EVENT' | 'CONTEST' | 'CATEGORY' | 'USER' | 'CONTESTANT'
  required: boolean
  options?: string[]
  defaultValue?: string
  validation?: string
  order: number
  createdAt: string
}

const CustomFieldsPage: React.FC = () => {
  const { user } = useAuth()
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    label: string
    type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'CHECKBOX' | 'TEXTAREA'
    entityType: 'EVENT' | 'CONTEST' | 'CATEGORY' | 'USER' | 'CONTESTANT'
    required: boolean
    options: string[]
    defaultValue: string
  }>({
    name: '',
    label: '',
    type: 'TEXT',
    entityType: 'EVENT',
    required: false,
    options: [],
    defaultValue: '',
  })

  useEffect(() => {
    fetchFields()
  }, [])

  const fetchFields = async () => {
    try {
      setLoading(true)
      const response = await api.get('/custom-fields')
      // Unwrap the response wrapper if needed
      const unwrapped = response.data.data || response.data
      const fieldsArray = Array.isArray(unwrapped) ? unwrapped : []
      setFields(fieldsArray)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load custom fields')
    } finally {
      setLoading(false)
    }
  }

  const createField = async () => {
    try {
      await api.post('/custom-fields', formData)
      setShowModal(false)
      resetForm()
      await fetchFields()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create field')
    }
  }

  const updateField = async () => {
    if (!editingField) return
    try {
      await api.put(`/custom-fields/${editingField.id}`, formData)
      setEditingField(null)
      resetForm()
      await fetchFields()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update field')
    }
  }

  const deleteField = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return
    try {
      await api.delete(`/custom-fields/${id}`)
      await fetchFields()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete field')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      label: '',
      type: 'TEXT',
      entityType: 'EVENT',
      required: false,
      options: [],
      defaultValue: '',
    })
  }

  const openEditModal = (field: CustomField) => {
    setEditingField(field)
    setFormData({
      name: field.name,
      label: field.label,
      type: field.type,
      entityType: field.entityType,
      required: field.required,
      options: field.options || [],
      defaultValue: field.defaultValue || '',
    })
    setShowModal(true)
  }

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, ''],
    })
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({ ...formData, options: newOptions })
  }

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    })
  }

  const getFieldsByEntity = (entityType: string) => {
    const fieldsArray = Array.isArray(fields) ? fields : []
    return fieldsArray.filter(f => f.entityType === entityType).sort((a, b) => a.order - b.order)
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ORGANIZER') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            You don't have permission to manage custom fields.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Loading custom fields...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
              Custom Fields
            </h1>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mt-2">
              Define custom fields for events, contests, categories, and users
            </p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setEditingField(null)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Create Field
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Fields by Entity Type */}
        <div className="space-y-8">
          {['EVENT', 'CONTEST', 'CATEGORY', 'USER', 'CONTESTANT'].map((entityType) => {
            const entityFields = getFieldsByEntity(entityType)
            return (
              <div key={entityType} className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white flex items-center gap-2">
                    <Squares2X2Icon className="h-6 w-6" />
                    {entityType} Fields ({entityFields.length})
                  </h2>
                </div>
                <div className="p-6">
                  {entityFields.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 py-8">
                      No custom fields defined for {entityType.toLowerCase()}s
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {entityFields.map((field) => (
                        <div
                          key={field.id}
                          className="border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">
                                {field.label}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                                {field.name}
                              </p>
                            </div>
                            {field.required && (
                              <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                                Required
                              </span>
                            )}
                          </div>

                          <div className="mb-3">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              {field.type}
                            </span>
                          </div>

                          {field.options && field.options.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">
                                Options:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {field.options.map((option, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 rounded"
                                  >
                                    {option}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(field)}
                              className="flex-1 px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded text-sm hover:bg-blue-700 dark:hover:bg-blue-600"
                            >
                              <PencilIcon className="h-4 w-4 inline mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => deleteField(field.id)}
                              className="px-3 py-1 bg-red-600 dark:bg-red-500 text-white rounded text-sm hover:bg-red-700 dark:hover:bg-red-600"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl mx-4 max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-4">
                {editingField ? 'Edit Field' : 'Create Field'}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      Field Name (Internal)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="field_name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      Label (Display)
                    </label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="Field Label"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      Field Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                    >
                      <option value="TEXT">Text</option>
                      <option value="NUMBER">Number</option>
                      <option value="DATE">Date</option>
                      <option value="SELECT">Select (Dropdown)</option>
                      <option value="CHECKBOX">Checkbox</option>
                      <option value="TEXTAREA">Text Area</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      Entity Type
                    </label>
                    <select
                      value={formData.entityType}
                      onChange={(e) => setFormData({ ...formData, entityType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                    >
                      <option value="EVENT">Event</option>
                      <option value="CONTEST">Contest</option>
                      <option value="CATEGORY">Category</option>
                      <option value="USER">User</option>
                      <option value="CONTESTANT">Contestant</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.required}
                      onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
                      Required field
                    </span>
                  </label>
                </div>

                {formData.type === 'SELECT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      Options
                    </label>
                    <div className="space-y-2">
                      {formData.options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                          />
                          <button
                            onClick={() => removeOption(index)}
                            className="px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={addOption}
                        className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 hover:border-blue-500 hover:text-blue-500"
                      >
                        Add Option
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Default Value (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.defaultValue}
                    onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={editingField ? updateField : createField}
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  {editingField ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingField(null)
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
      </div>
    </div>
  )
}

export default CustomFieldsPage
