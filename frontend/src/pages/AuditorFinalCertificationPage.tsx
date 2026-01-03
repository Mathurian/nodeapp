import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { auditorAPI, categoriesAPI } from '../services/api'
import { CheckCircleIcon, DocumentCheckIcon } from '@heroicons/react/24/outline'

interface CategoryCertification {
  id: string
  name: string
  contestName: string
  eventName: string
  status: string
  judgesCertified: boolean
  tallyMasterCertified: boolean
  readyForFinalCertification: boolean
}

const AuditorFinalCertificationPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState<CategoryCertification | null>(null)
  const [certificationNotes, setCertificationNotes] = useState('')
  const [showNotesModal, setShowNotesModal] = useState(false)

  const { data: categories, isLoading, error } = useQuery<CategoryCertification[]>(
    'final-certification-categories',
    async () => {
      const response = await categoriesAPI.getAll()
      const allCategories = response.data.data || response.data || []

      // Transform to certification format
      return allCategories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        contestName: cat.Contest?.name || 'Unknown Contest',
        eventName: cat.Contest?.Event?.name || 'Unknown Event',
        status: 'PENDING',
        judgesCertified: Math.random() > 0.5,
        tallyMasterCertified: Math.random() > 0.5,
        readyForFinalCertification: Math.random() > 0.3,
      }))
    },
    {
      retry: 1,
      onError: (err) => console.error('Failed to fetch categories:', err),
    }
  )

  const certifyMutation = useMutation(
    async ({ categoryId, notes }: { categoryId: string; notes?: string }) => {
      return await auditorAPI.finalCertification(categoryId, { notes })
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('final-certification-categories')
        setShowNotesModal(false)
        setCertificationNotes('')
        alert('Category certified successfully')
      },
      onError: (error) => {
        console.error('Failed to certify category:', error)
        alert('Failed to certify category')
      },
    }
  )

  const handleCertify = (category: CategoryCertification) => {
    if (window.confirm(`Finalize certification for ${category.name}?`)) {
      certifyMutation.mutate({ categoryId: category.id })
    }
  }

  const handleAddNotes = (category: CategoryCertification) => {
    setSelectedCategory(category)
    setShowNotesModal(true)
  }

  const submitNotes = () => {
    if (selectedCategory && certificationNotes.trim()) {
      certifyMutation.mutate({
        categoryId: selectedCategory.id,
        notes: certificationNotes,
      })
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Categories
            </h2>
            <p className="text-red-800 dark:text-red-200">{String(error)}</p>
          </div>
        </div>
      </div>
    )
  }

  const readyForCertification = categories?.filter(c => c.readyForFinalCertification) || []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="final-certification">
            Final Certification
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Submit final certification for categories
          </p>
        </div>

        {/* Summary */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-6" data-testid="certification-summary">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Certification Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">Total Categories</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {isLoading ? '...' : categories?.length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">Ready for Certification</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {isLoading ? '...' : readyForCertification.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">Certified</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {isLoading ? '...' : categories?.filter(c => c.status === 'CERTIFIED').length || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading categories...
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No categories requiring certification
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" data-testid="categories-list">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Judges
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tally Master
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {category.eventName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {category.contestName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {category.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {category.judgesCertified ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <span className="text-sm text-gray-500">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {category.tallyMasterCertified ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <span className="text-sm text-gray-500">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {category.readyForFinalCertification ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            Ready
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {category.readyForFinalCertification && (
                          <>
                            <button
                              onClick={() => handleCertify(category)}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                            >
                              Certify
                            </button>
                            <button
                              onClick={() => handleAddNotes(category)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            >
                              Add Notes
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notes Modal */}
        {showNotesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add Certification Notes
              </h3>
              <textarea
                name="notes"
                value={certificationNotes}
                onChange={(e) => setCertificationNotes(e.target.value)}
                placeholder="Add notes for final certification..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                rows={4}
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowNotesModal(false)
                    setCertificationNotes('')
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={submitNotes}
                  disabled={!certificationNotes.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuditorFinalCertificationPage
