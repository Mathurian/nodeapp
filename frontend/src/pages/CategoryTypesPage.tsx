import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  Square3Stack3DIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

interface CategoryType {
  id: string
  name: string
  description: string
  scoringMethod: 'AVERAGE' | 'SUM' | 'WEIGHTED'
  maxScore: number
  minScore: number
  criteria: Array<{
    id: string
    name: string
    weight?: number
  }>
  createdAt: string
}

const CategoryTypesPage: React.FC = () => {
  const { user } = useAuth()
  const [types, setTypes] = useState<CategoryType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingType, setEditingType] = useState<CategoryType | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    description: string
    scoringMethod: 'AVERAGE' | 'SUM' | 'WEIGHTED'
    maxScore: number
    minScore: number
  }>({
    name: '',
    description: '',
    scoringMethod: 'AVERAGE',
    maxScore: 100,
    minScore: 0,
  })

  useEffect(() => {
    fetchTypes()
  }, [])

  const fetchTypes = async () => {
    try {
      setLoading(true)
      const response = await api.get('/category-type')
      setTypes(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load category types')
    } finally {
      setLoading(false)
    }
  }

  const createType = async () => {
    try {
      await api.post('/category-type', formData)
      setShowModal(false)
      resetForm()
      await fetchTypes()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create category type')
    }
  }

  const updateType = async () => {
    if (!editingType) return
    try {
      await api.put(`/category-type/${editingType.id}`, formData)
      setEditingType(null)
      resetForm()
      await fetchTypes()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update category type')
    }
  }

  const deleteType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category type?')) return
    try {
      await api.delete(`/category-type/${id}`)
      await fetchTypes()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete category type')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      scoringMethod: 'AVERAGE',
      maxScore: 100,
      minScore: 0,
    })
  }

  const openEditModal = (type: CategoryType) => {
    setEditingType(type)
    setFormData({
      name: type.name,
      description: type.description,
      scoringMethod: type.scoringMethod,
      maxScore: type.maxScore,
      minScore: type.minScore,
    })
    setShowModal(true)
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'ORGANIZER') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to manage category types.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading category types...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Category Types
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Define reusable category type templates with scoring methods
            </p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setEditingType(null)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Create Type
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {types.length === 0 ? (
            <div className="col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <Square3Stack3DIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No category types defined. Create your first type to standardize scoring.
              </p>
            </div>
          ) : (
            types.map((type) => (
              <div key={type.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {type.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {type.description}
                    </p>
                  </div>
                  <Square3Stack3DIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Scoring Method:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {type.scoringMethod}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Score Range:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {type.minScore} - {type.maxScore}
                    </span>
                  </div>
                  {type.criteria && type.criteria.length > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Criteria: {type.criteria.length}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(type)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <PencilIcon className="h-4 w-4 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteType(type.id)}
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingType ? 'Edit Category Type' : 'Create Category Type'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
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
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Scoring Method
                  </label>
                  <select
                    value={formData.scoringMethod}
                    onChange={(e) => setFormData({ ...formData, scoringMethod: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="AVERAGE">Average</option>
                    <option value="SUM">Sum</option>
                    <option value="WEIGHTED">Weighted</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Minimum Score
                    </label>
                    <input
                      type="number"
                      value={formData.minScore}
                      onChange={(e) => setFormData({ ...formData, minScore: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Maximum Score
                    </label>
                    <input
                      type="number"
                      value={formData.maxScore}
                      onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={editingType ? updateType : createType}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingType ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingType(null)
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
      </div>
    </div>
  )
}

export default CategoryTypesPage
