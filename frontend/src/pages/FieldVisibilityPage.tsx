import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface FieldVisibility {
  field: string
  label: string
  visible: boolean
  required: boolean
  description?: string
}

const FieldVisibilityPage: React.FC = () => {
  const { user } = useAuth()
  const [fields, setFields] = useState<FieldVisibility[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalFields, setOriginalFields] = useState<FieldVisibility[]>([])

  useEffect(() => {
    fetchFieldVisibility()
  }, [])

  const fetchFieldVisibility = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/user-field-visibility')
      const fieldDataObj = response.data.data || response.data

      // Convert object to array with labels
      const fieldLabels: Record<string, string> = {
        name: 'Name',
        email: 'Email',
        role: 'Role',
        phone: 'Phone',
        address: 'Address',
        bio: 'Bio',
        preferredName: 'Preferred Name',
        pronouns: 'Pronouns',
        gender: 'Gender',
        judgeNumber: 'Judge Number',
        judgeLevel: 'Judge Level',
        isHeadJudge: 'Head Judge',
        contestantNumber: 'Contestant Number',
        age: 'Age',
        school: 'School',
        grade: 'Grade',
        parentGuardian: 'Parent/Guardian',
        parentPhone: 'Parent Phone',
      }

      const fieldArray = Object.keys(fieldDataObj).map(fieldName => ({
        field: fieldName,
        label: fieldLabels[fieldName] || fieldName,
        visible: fieldDataObj[fieldName].visible,
        required: fieldDataObj[fieldName].required,
      }))

      setFields(fieldArray)
      setOriginalFields(JSON.parse(JSON.stringify(fieldArray)))
      setHasChanges(false)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to load field visibility settings'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const toggleFieldVisibility = (fieldName: string) => {
    const fieldsArray = Array.isArray(fields) ? fields : []
    setFields(fieldsArray.map(f =>
      f.field === fieldName ? { ...f, visible: !f.visible } : f
    ))
    setHasChanges(true)
  }

  const toggleFieldRequired = (fieldName: string) => {
    const fieldsArray = Array.isArray(fields) ? fields : []
    setFields(fieldsArray.map(f =>
      f.field === fieldName ? { ...f, required: !f.required } : f
    ))
    setHasChanges(true)
  }

  const saveChanges = async () => {
    try {
      setSaving(true)
      setError(null)

      // Update each changed field - with defensive array checks
      const fieldsArray = Array.isArray(fields) ? fields : []
      const originalFieldsArray = Array.isArray(originalFields) ? originalFields : []

      const changedFields = fieldsArray.filter((field, index) =>
        originalFieldsArray[index] && (
          field.visible !== originalFieldsArray[index].visible ||
          field.required !== originalFieldsArray[index].required
        )
      )

      for (const field of changedFields) {
        await api.put(`/user-field-visibility/${field.field}`, {
          visible: field.visible,
          required: field.required
        })
      }

      toast.success(`Successfully updated ${changedFields.length} field${changedFields.length !== 1 ? 's' : ''}`)
      setOriginalFields(JSON.parse(JSON.stringify(fields)))
      setHasChanges(false)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to save changes'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset all field visibility settings to defaults? This will discard any unsaved changes.')) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      await api.post('/user-field-visibility/reset')
      toast.success('Field visibility settings reset to defaults')
      await fetchFieldVisibility()
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to reset settings'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const discardChanges = () => {
    setFields(JSON.parse(JSON.stringify(originalFields)))
    setHasChanges(false)
    toast.success('Changes discarded')
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Only administrators can manage field visibility settings.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading field visibility settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User Field Visibility
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Control which user profile fields are visible to different roles
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Actions Bar */}
        {hasChanges && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  You have unsaved changes
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={discardChanges}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>Save Changes</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                User Profile Fields
              </h2>
              <button
                onClick={resetToDefaults}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Reset to Defaults
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {fields.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                No field visibility settings found
              </div>
            ) : (
              fields.map((field) => (
                <div
                  key={field.field}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          field.visible
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          {field.visible ? (
                            <EyeIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {field.label}
                            {field.required && (
                              <span className="ml-2 text-xs font-normal text-red-600 dark:text-red-400">
                                (Required)
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {field.field}
                          </p>
                          {field.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {field.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex items-center gap-6">
                      {/* Visible Toggle */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Visible</span>
                        <button
                          onClick={() => toggleFieldVisibility(field.field)}
                          disabled={saving}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            field.visible
                              ? 'bg-green-600'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                          role="switch"
                          aria-checked={field.visible}
                          aria-label={`Toggle ${field.label} visibility`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              field.visible ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Required Toggle */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Required</span>
                        <button
                          onClick={() => toggleFieldRequired(field.field)}
                          disabled={saving}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            field.required
                              ? 'bg-red-600'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                          role="switch"
                          aria-checked={field.required}
                          aria-label={`Toggle ${field.label} required`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              field.required ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> These settings control which user profile fields are visible and required in the user management interface.
          </p>
          <ul className="mt-2 text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1">
            <li><strong>Visible:</strong> Hidden fields will not be displayed when viewing or editing user profiles, but the data is still stored in the database.</li>
            <li><strong>Required:</strong> Required fields must be filled in when creating or editing user profiles.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default FieldVisibilityPage
