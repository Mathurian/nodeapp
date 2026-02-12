import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { categoriesAPI, contestsAPI } from '../services/api'
import {
  ListBulletIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
  ArchiveBoxIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { ConfirmModal } from '../components/ui'
import Breadcrumb, { BreadcrumbItem } from '../components/Breadcrumb'

interface Contest {
  id: string
  name: string
  eventId: string
  event?: {
    id: string
    name: string
  }
}

interface Category {
  id: string
  name: string
  description: string | null
  contestId: string
  scoreCap: number | null
  timeLimit: number | null
  contestantMin: number | null
  contestantMax: number | null
  totalsCertified: boolean
  createdAt: string
  updatedAt: string
  contest?: {
    id: string
    name: string
    event?: {
      id: string
      name: string
    }
  }
  _count?: {
    contestants: number
    scores: number
  }
}

interface CategoryFormData {
  name: string
  description: string
  contestId: string
  scoreCap: string
  timeLimit: string
  contestantMin: string
  contestantMax: string
}

const categoryFormSchema = z.object({
  contestId: z.string().min(1, 'Please select a contest'),
  name: z.string().min(1, 'Category name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string(),
  scoreCap: z.string(),
  timeLimit: z.string(),
  contestantMin: z.string(),
  contestantMax: z.string(),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

const CategoriesPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { contestId, slug } = useParams<{ contestId?: string; slug?: string }>()

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { contestId: '', name: '', description: '', scoreCap: '', timeLimit: '', contestantMin: '', contestantMax: '' },
  })
  const { register, handleSubmit: rhfHandleSubmit, reset, formState: { errors } } = form

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContestFilter, setSelectedContestFilter] = useState<string>('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; category: Category | null }>({
    isOpen: false,
    category: null,
  })

  // Check permissions
  const canManageCategories = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  // Debug logging
  useEffect(() => {
    console.log('CategoriesPage - User role:', user?.role, 'Can manage:', canManageCategories)
  }, [user?.role, canManageCategories])

  // Fetch contests for dropdowns
  const { data: contests, error: contestsError } = useQuery<Contest[]>(
    'contests',
    async () => {
      const response = await contestsAPI.getAll()
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      retry: 1,
      onError: (err) => console.error('Fetch contests failed:', err),
    }
  )

  // Get parent contest for breadcrumb when accessed via /contests/:contestId/categories
  const parentContest = contestId ? contests?.find(c => c.id === contestId) : null

  // Build breadcrumb items
  const buildBreadcrumbItems = (): BreadcrumbItem[] => {
    const basePath = slug ? `/${slug}` : ''
    const items: BreadcrumbItem[] = []

    if (parentContest) {
      items.push({ label: 'Events', href: `${basePath}/events` })
      if (parentContest.event) {
        items.push({ label: parentContest.event.name, href: `${basePath}/events/${parentContest.eventId}/contests` })
      }
      items.push({ label: parentContest.name })
      items.push({ label: 'Categories' })
    } else if (contestId) {
      items.push({ label: 'Contests', href: `${basePath}/contests` })
      items.push({ label: 'Categories' })
    }

    return items
  }

  // Fetch categories
  const { data: categories = [], isLoading, error: categoriesError } = useQuery<Category[]>(
    'categories',
    async () => {
      const response = await categoriesAPI.getAll()
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      refetchInterval: 30000,
      retry: 1,
      onError: (err) => console.error('Fetch categories failed:', err),
    }
  )

  // Create category mutation
  const createMutation = useMutation(
    async (data: CategoryFormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        contestId: data.contestId,
        scoreCap: data.scoreCap ? parseInt(data.scoreCap) : null,
        timeLimit: data.timeLimit ? parseInt(data.timeLimit) : null,
        contestantMin: data.contestantMin ? parseInt(data.contestantMin) : null,
        contestantMax: data.contestantMax ? parseInt(data.contestantMax) : null,
      }
      const response = await categoriesAPI.create(payload)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('categories')
        resetForm()
        toast.success('Category created successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create category'
        toast.error(`Error creating category: ${errorMessage}`)
      },
    }
  )

  // Update category mutation
  const updateMutation = useMutation(
    async ({ id, data }: { id: string; data: CategoryFormData }) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        contestId: data.contestId,
        scoreCap: data.scoreCap ? parseInt(data.scoreCap) : null,
        timeLimit: data.timeLimit ? parseInt(data.timeLimit) : null,
        contestantMin: data.contestantMin ? parseInt(data.contestantMin) : null,
        contestantMax: data.contestantMax ? parseInt(data.contestantMax) : null,
      }
      const response = await categoriesAPI.update(id, payload)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('categories')
        resetForm()
        toast.success('Category updated successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update category'
        toast.error(`Error updating category: ${errorMessage}`)
      },
    }
  )

  // Delete category mutation
  const deleteMutation = useMutation(
    async (id: string) => {
      const response = await categoriesAPI.delete(id)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('categories')
        toast.success('Category deleted successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete category'
        toast.error(`Error deleting category: ${errorMessage}`)
      },
    }
  )

  const resetForm = () => {
    reset({ contestId: '', name: '', description: '', scoreCap: '', timeLimit: '', contestantMin: '', contestantMax: '' })
    setEditingCategory(null)
    setIsFormOpen(false)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    reset({
      name: category.name,
      description: category.description || '',
      contestId: category.contestId,
      scoreCap: category.scoreCap?.toString() || '',
      timeLimit: category.timeLimit?.toString() || '',
      contestantMin: category.contestantMin?.toString() || '',
      contestantMax: category.contestantMax?.toString() || '',
    })
    setIsFormOpen(true)
  }

  const handleDelete = (category: Category) => {
    setConfirmDelete({ isOpen: true, category })
  }

  const executeDelete = () => {
    if (confirmDelete.category) {
      deleteMutation.mutate(confirmDelete.category.id)
    }
    setConfirmDelete({ isOpen: false, category: null })
  }

  const onSubmit = (data: CategoryFormValues) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  // Filter categories
  const filteredCategories = Array.isArray(categories) ? categories.filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.contest?.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesContest = selectedContestFilter ? category.contestId === selectedContestFilter : true

    return matchesSearch && matchesContest
  }) : []

  // Error handling
  if (contestsError || categoriesError) {
    const error = contestsError || categoriesError
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
            <p className="text-red-800 dark:text-red-200 mb-4">{String(error)}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">
              Reload Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb - only show when accessed via contest context */}
        {contestId && (
          <Breadcrumb items={buildBreadcrumbItems()} />
        )}

        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <ListBulletIcon className="h-8 w-8 mr-3 text-blue-600" />
              {parentContest ? `${parentContest.name} - Categories` : 'Categories'}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
              Manage competition categories and judging criteria
            </p>
          </div>
          {canManageCategories && (
            <button
              onClick={() => {
                resetForm()
                setIsFormOpen(true)
              }}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Category
            </button>
          )}
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Contest Filter */}
            <select
              value={selectedContestFilter}
              onChange={(e) => setSelectedContestFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Contests</option>
              {contests?.map((contest) => (
                <option key={contest.id} value={contest.id}>
                  {contest.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Categories List */}
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Loading categories...</p>
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <div key={category.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                {/* Category Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {category.name}
                    </h3>
                    {category.contest && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                        <TrophyIcon className="h-4 w-4 mr-1" />
                        {category.contest.name}
                      </div>
                    )}
                    {category.contest?.event && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {category.contest.event.name}
                      </div>
                    )}
                  </div>
                  {category.totalsCertified && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Certified
                    </span>
                  )}
                </div>

                {/* Description */}
                {category.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-4 line-clamp-2">
                    {category.description}
                  </p>
                )}

                {/* Category Details */}
                <div className="space-y-2 mb-4 text-sm">
                  {category.scoreCap && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400 dark:text-gray-500">
                      <span>Score Cap:</span>
                      <span className="font-medium">{category.scoreCap}</span>
                    </div>
                  )}
                  {category.timeLimit && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400 dark:text-gray-500">
                      <span>Time Limit:</span>
                      <span className="font-medium">{category.timeLimit} min</span>
                    </div>
                  )}
                  {(category.contestantMin || category.contestantMax) && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400 dark:text-gray-500">
                      <span>Contestants:</span>
                      <span className="font-medium">
                        {category.contestantMin || 0} - {category.contestantMax || '∞'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                {category._count && (
                  <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-4">
                    <div>{category._count.contestants} contestants</div>
                    <div>{category._count.scores} scores</div>
                  </div>
                )}

                {/* Actions */}
                {canManageCategories && (
                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleEdit(category)}
                      className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center text-sm"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="flex-1 px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 flex items-center justify-center text-sm"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
            <ListBulletIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              {searchQuery || selectedContestFilter
                ? 'No categories found matching your filters'
                : 'No categories yet. Create your first category to get started.'}
            </p>
          </div>
        )}

        {/* Create/Edit Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500"
                  aria-label="Close dialog"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={rhfHandleSubmit(onSubmit)} className="space-y-4" noValidate>
                {/* Contest Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contest <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('contestId')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.contestId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    aria-invalid={errors.contestId ? 'true' : undefined}
                  >
                    <option value="">Select a contest...</option>
                    {contests?.map((contest) => (
                      <option key={contest.id} value={contest.id}>
                        {contest.name}
                        {contest.event && ` (${contest.event.name})`}
                      </option>
                    ))}
                  </select>
                  {errors.contestId && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.contestId.message}</p>}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Enter category name"
                    aria-invalid={errors.name ? 'true' : undefined}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter category description"
                  />
                </div>

                {/* Scoring and Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Score Cap
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('scoreCap')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Max score"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time Limit (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('timeLimit')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Minutes"
                    />
                  </div>
                </div>

                {/* Contestant Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Min Contestants
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('contestantMin')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Minimum"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Contestants
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('contestantMax')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Maximum"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center justify-center"
                  >
                    {createMutation.isLoading || updateMutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-5 w-5 mr-2" />
                        {editingCategory ? 'Update Category' : 'Create Category'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Category Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmDelete.isOpen}
          onClose={() => setConfirmDelete({ isOpen: false, category: null })}
          onConfirm={executeDelete}
          title="Delete Category"
          message={`Are you sure you want to delete "${confirmDelete.category?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          loading={deleteMutation.isLoading}
        />
      </div>
    </div>
  )
}

export default CategoriesPage
