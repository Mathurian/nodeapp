import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { api, categoriesAPI, contestsAPI } from '../services/api'
import {
  ListBulletIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
  TrophyIcon,
  DocumentDuplicateIcon,
  BookmarkSquareIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { Button, Card, ConfirmModal, PageHeader } from '../components/ui'
import Breadcrumb, { BreadcrumbItem } from '../components/Breadcrumb'
import ScopedRoleAssignmentsPanel from '../components/ScopedRoleAssignmentsPanel'
import { isInteractiveElement } from '../utils/interactive'

interface Contest {
  id: string
  name: string
  eventId: string
  tenantId?: string
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
  tenantId?: string
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

interface CriterionDraft {
  id?: string
  name: string
  maxScore: string
}

interface CategoryTemplateOption {
  id: string
  name: string
  description?: string | null
  templateCriteria?: Array<{
    id: string
    name: string
    maxScore: number
  }>
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

const toOptionalNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

const toOptionalString = (value: string): string | undefined => {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const CategoriesPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { contestId, slug } = useParams<{ contestId?: string; slug?: string }>()

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { contestId: contestId || '', name: '', description: '', scoreCap: '', timeLimit: '', contestantMin: '', contestantMax: '' },
  })
  const { register, handleSubmit: rhfHandleSubmit, reset, formState: { errors } } = form

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContestFilter, setSelectedContestFilter] = useState<string>(contestId || '')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [criterionDrafts, setCriterionDrafts] = useState<CriterionDraft[]>([])
  const [existingCriteria, setExistingCriteria] = useState<CriterionDraft[]>([])
  const [criteriaLoading, setCriteriaLoading] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [postCloneNotice, setPostCloneNotice] = useState<string | null>(null)
  const [cloneSource, setCloneSource] = useState<Category | null>(null)
  const [cloneTargetContestId, setCloneTargetContestId] = useState('')
  const [cloneName, setCloneName] = useState('')
  const [cloneIncludeCriteria, setCloneIncludeCriteria] = useState(true)
  const [templateSource, setTemplateSource] = useState<Category | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [importMode, setImportMode] = useState<'category' | 'template'>('category')
  const [importSourceCategoryId, setImportSourceCategoryId] = useState('')
  const [importTemplateId, setImportTemplateId] = useState('')
  const [showImportCriteriaModal, setShowImportCriteriaModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; category: Category | null }>({
    isOpen: false,
    category: null,
  })
  const [creationMode, setCreationMode] = useState<'blank' | 'template'>('blank')
  const [selectedCategoryTemplateId, setSelectedCategoryTemplateId] = useState('')

  // Check permissions
  const canManageCategories = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  useEffect(() => {
    setSelectedContestFilter(contestId || '')
  }, [contestId])

  // Debug logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('CategoriesPage - User role:', user?.role, 'Can manage:', canManageCategories)
    }
  }, [user?.role, canManageCategories])

  const fetchTemplates = async (): Promise<CategoryTemplateOption[]> => {
    const response = await api.get('/templates')
    const payload = response.data?.data || response.data
    return Array.isArray(payload) ? payload : []
  }

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

  const currentEditingContest = editingCategory
    ? contests?.find((contest) => contest.id === editingCategory.contestId)
    : null

  const cloneTargetContests = useMemo(() => {
    if (!Array.isArray(contests) || contests.length === 0) {
      return [] as Contest[]
    }
    if (!cloneSource) {
      return contests
    }

    const sourceTenantId =
      cloneSource.tenantId ||
      contests.find((contest) => contest.id === cloneSource.contestId)?.tenantId

    if (!sourceTenantId) {
      return contests.filter((contest) => contest.id === cloneSource.contestId)
    }

    return contests.filter((contest) => contest.tenantId === sourceTenantId)
  }, [cloneSource, contests])

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
      items.push({ label: parentContest.name, href: `${basePath}/events/${parentContest.eventId}/contests?contestId=${parentContest.id}` })
      items.push({ label: 'Categories' })
    } else if (contestId) {
      items.push({ label: 'Contests', href: `${basePath}/contests` })
      items.push({ label: 'Categories' })
    }

    return items
  }

  // Fetch categories
  const { data: categories = [], isLoading, error: categoriesError } = useQuery<Category[]>(
    ['categories', contestId || 'all'],
    async () => {
      const response = contestId
        ? await categoriesAPI.getByContest(contestId)
        : await categoriesAPI.getAll()
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      refetchInterval: 30000,
      retry: 1,
      onError: (err) => console.error('Fetch categories failed:', err),
    }
  )

  const { data: categoryTemplates = [] } = useQuery<CategoryTemplateOption[]>(
    ['category-templates'],
    async () => {
      const response = await fetchTemplates()
      return response
    }
  )

  // Create category mutation
  const createMutation = useMutation(
    async (data: CategoryFormData) => {
      const payload = {
        name: data.name,
        description: toOptionalString(data.description),
        contestId: data.contestId,
        scoreCap: toOptionalNumber(data.scoreCap),
        timeLimit: toOptionalNumber(data.timeLimit),
        contestantMin: toOptionalNumber(data.contestantMin),
        contestantMax: toOptionalNumber(data.contestantMax),
      }
      const response = await categoriesAPI.create(payload)
      return response.data
    }
  )

  const createFromTemplateMutation = useMutation(
    async (data: CategoryFormData) => {
      if (!selectedCategoryTemplateId) {
        throw new Error('Template ID is required')
      }
      const payload = {
        contestId: data.contestId,
        name: toOptionalString(data.name),
        description: toOptionalString(data.description),
        scoreCap: toOptionalNumber(data.scoreCap),
        timeLimit: toOptionalNumber(data.timeLimit),
        contestantMin: toOptionalNumber(data.contestantMin),
        contestantMax: toOptionalNumber(data.contestantMax),
      }
      const response = await categoriesAPI.createFromTemplate(selectedCategoryTemplateId, payload)
      return response.data?.data || response.data
    }
  )

  // Update category mutation
  const updateMutation = useMutation(
    async ({ id, data }: { id: string; data: CategoryFormData }) => {
      const payload = {
        name: data.name,
        description: toOptionalString(data.description),
        scoreCap: toOptionalNumber(data.scoreCap),
        timeLimit: toOptionalNumber(data.timeLimit),
        contestantMin: toOptionalNumber(data.contestantMin),
        contestantMax: toOptionalNumber(data.contestantMax),
      }
      const response = await categoriesAPI.update(id, payload)
      return response.data
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

  const cloneMutation = useMutation(
    async (payload: { id: string; targetContestId: string; name?: string; includeCriteria: boolean }) => {
      const response = await categoriesAPI.clone(payload.id, {
        targetContestId: payload.targetContestId,
        name: toOptionalString(payload.name || ''),
        includeCriteria: payload.includeCriteria,
      })
      return response.data?.data || response.data
    }
  )

  const createTemplateMutation = useMutation(
    async (payload: { categoryId: string; name: string; description?: string }) => {
      const response = await categoriesAPI.createTemplateFromCategory(payload.categoryId, {
        name: payload.name,
        description: toOptionalString(payload.description || ''),
      })
      return response.data?.data || response.data
    }
  )

  const importCriteriaMutation = useMutation(
    async (payload: { categoryId: string; sourceCategoryId?: string; templateId?: string }) => {
      const response = await categoriesAPI.importCriteria(payload.categoryId, payload)
      return response.data?.data || response.data
    }
  )

  const refreshCriteria = async (categoryId: string) => {
    const response = await categoriesAPI.getCriteria(categoryId)
    const unwrapped = response.data?.data || response.data
    const criteriaList = Array.isArray(unwrapped) ? unwrapped : []
    const mapped = criteriaList.map((criterion: any) => ({
      id: criterion.id,
      name: criterion.name || '',
      maxScore: criterion.maxScore?.toString() || '',
    }))
    setExistingCriteria(mapped)
    setCriterionDrafts(mapped.length > 0 ? mapped : [{ name: '', maxScore: '' }])
  }

  const resetForm = () => {
    reset({
      contestId: contestId || '',
      name: '',
      description: '',
      scoreCap: '',
      timeLimit: '',
      contestantMin: '',
      contestantMax: '',
    })
    setEditingCategory(null)
    setCriterionDrafts([])
    setExistingCriteria([])
    setCriteriaLoading(false)
    setFormSubmitting(false)
    setPostCloneNotice(null)
    setCreationMode('blank')
    setSelectedCategoryTemplateId('')
    setIsFormOpen(false)
  }

  const openCreateForm = () => {
    resetForm()
    setCriterionDrafts([{ name: '', maxScore: '' }])
    setIsFormOpen(true)
  }

  const handleEdit = async (category: Category) => {
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
    setCriteriaLoading(true)

    try {
      await refreshCriteria(category.id)
    } catch (error) {
      toast.error('Failed to load category criteria')
      setExistingCriteria([])
      setCriterionDrafts([{ name: '', maxScore: '' }])
    } finally {
      setCriteriaLoading(false)
    }
  }

  const handleDelete = (category: Category) => {
    setConfirmDelete({ isOpen: true, category })
  }

  const openCloneModal = (category: Category) => {
    setCloneSource(category)
    setCloneTargetContestId(category.contestId)
    setCloneName(`${category.name} (Copy)`)
    setCloneIncludeCriteria(true)
  }

  const closeCloneModal = () => {
    setCloneSource(null)
    setCloneTargetContestId('')
    setCloneName('')
    setCloneIncludeCriteria(true)
  }

  const openTemplateModal = (category: Category) => {
    setTemplateSource(category)
    setTemplateName(`${category.name} Template`)
    setTemplateDescription(category.description || '')
  }

  const closeTemplateModal = () => {
    setTemplateSource(null)
    setTemplateName('')
    setTemplateDescription('')
  }

  const openImportCriteriaModal = () => {
    setImportMode('category')
    setImportSourceCategoryId('')
    setImportTemplateId('')
    setShowImportCriteriaModal(true)
  }

  const closeImportCriteriaModal = () => {
    setShowImportCriteriaModal(false)
    setImportSourceCategoryId('')
    setImportTemplateId('')
  }

  const executeDelete = () => {
    if (confirmDelete.category) {
      deleteMutation.mutate(confirmDelete.category.id)
    }
    setConfirmDelete({ isOpen: false, category: null })
  }

  const addCriterionRow = () => {
    setCriterionDrafts((prev) => [...prev, { name: '', maxScore: '' }])
  }

  const updateCriterionRow = (index: number, field: 'name' | 'maxScore', value: string) => {
    setCriterionDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const removeCriterionRow = (index: number) => {
    setCriterionDrafts((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  const onSubmit = async (data: CategoryFormValues) => {
    setFormSubmitting(true)
    try {
      const cleanCriteria = criterionDrafts
        .map((criterion) => ({
          ...criterion,
          name: criterion.name.trim(),
          maxScore: criterion.maxScore.trim(),
        }))
        .filter((criterion) => criterion.name !== '' && criterion.maxScore !== '')

      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, data })

        const existingById = new Map(existingCriteria.filter((criterion) => criterion.id).map((criterion) => [criterion.id as string, criterion]))
        const keepIds = new Set(cleanCriteria.filter((criterion) => criterion.id).map((criterion) => criterion.id as string))
        const toDelete = existingCriteria.filter((criterion) => criterion.id && !keepIds.has(criterion.id))

        await Promise.all(toDelete.map((criterion) => categoriesAPI.deleteCriterion(criterion.id as string)))

        for (const criterion of cleanCriteria) {
          const maxScore = parseInt(criterion.maxScore, 10)
          if (Number.isNaN(maxScore)) continue

          if (criterion.id) {
            const original = existingById.get(criterion.id)
            if (!original || original.name !== criterion.name || original.maxScore !== criterion.maxScore) {
              await categoriesAPI.updateCriterion(criterion.id, { name: criterion.name, maxScore })
            }
          } else {
            await categoriesAPI.createCriterion(editingCategory.id, { name: criterion.name, maxScore })
          }
        }

        toast.success('Category updated successfully!')
        queryClient.invalidateQueries('categories')
        resetForm()
      } else if (creationMode === 'template') {
        if (!selectedCategoryTemplateId) {
          toast.error('Select a category template')
          return
        }

        const created = await createFromTemplateMutation.mutateAsync(data)
        queryClient.invalidateQueries('categories')
        resetForm()
        setPostCloneNotice('Category created from template. Review criteria and assignments before use.')
        await handleEdit(created as Category)
        toast.success('Category created from template successfully!')
      } else {
        const created = await createMutation.mutateAsync(data)
        const createdCategoryId = created?.data?.id || created?.id

        if (createdCategoryId) {
          for (const criterion of cleanCriteria) {
            const maxScore = parseInt(criterion.maxScore, 10)
            if (Number.isNaN(maxScore)) continue
            await categoriesAPI.createCriterion(createdCategoryId, { name: criterion.name, maxScore })
          }
        }

        toast.success('Category created successfully!')
        queryClient.invalidateQueries('categories')
        resetForm()
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save category'
      toast.error(`Error saving category: ${errorMessage}`)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleCloneCategory = async () => {
    if (!cloneSource || !cloneTargetContestId) {
      toast.error('Please select a target contest')
      return
    }

    if (!cloneTargetContests.some((contest) => contest.id === cloneTargetContestId)) {
      toast.error('Select a target contest from the same tenant as the source category')
      return
    }

    try {
      const cloned = await cloneMutation.mutateAsync({
        id: cloneSource.id,
        targetContestId: cloneTargetContestId,
        name: cloneName,
        includeCriteria: cloneIncludeCriteria,
      })
      queryClient.invalidateQueries('categories')
      queryClient.invalidateQueries('contests')
      closeCloneModal()
      setPostCloneNotice('Clone created. Review category details, criteria, and assignments before use.')
      await handleEdit(cloned as Category)
      toast.success('Category cloned successfully!')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to clone category'
      toast.error(errorMessage)
    }
  }

  const handleCreateTemplate = async () => {
    if (!templateSource || !templateName.trim()) {
      toast.error('Template name is required')
      return
    }

    try {
      await createTemplateMutation.mutateAsync({
        categoryId: templateSource.id,
        name: templateName.trim(),
        description: templateDescription,
      })
      closeTemplateModal()
      toast.success('Template created from category')
      queryClient.invalidateQueries('category-templates')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create template'
      toast.error(errorMessage)
    }
  }

  const handleImportCriteria = async () => {
    if (!editingCategory) return

    try {
      if (importMode === 'category' && !importSourceCategoryId) {
        toast.error('Select a source category')
        return
      }
      if (importMode === 'template' && !importTemplateId) {
        toast.error('Select a template')
        return
      }

      await importCriteriaMutation.mutateAsync({
        categoryId: editingCategory.id,
        sourceCategoryId: importMode === 'category' ? importSourceCategoryId : undefined,
        templateId: importMode === 'template' ? importTemplateId : undefined,
      })

      await refreshCriteria(editingCategory.id)
      closeImportCriteriaModal()
      toast.success('Criteria imported successfully')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to import criteria'
      toast.error(errorMessage)
    }
  }

  // Filter categories
  const activeContestFilter = contestId || selectedContestFilter
  const filteredCategories = Array.isArray(categories) ? categories.filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.contest?.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesContest = activeContestFilter ? category.contestId === activeContestFilter : true

    return matchesSearch && matchesContest
  }) : []

  const selectedCategoryTemplate = useMemo(
    () => categoryTemplates.find((template) => template.id === selectedCategoryTemplateId) || null,
    [categoryTemplates, selectedCategoryTemplateId]
  )

  // Error handling
  if (contestsError || categoriesError) {
    const error = contestsError || categoriesError
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="cgr-page-container">
          <Card className="bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
            <p className="text-red-800 dark:text-red-200 mb-4">{String(error)}</p>
            <Button variant="danger" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="cgr-page-container">
        {/* Breadcrumb - only show when accessed via contest context */}
        {contestId && (
          <Breadcrumb items={buildBreadcrumbItems()} />
        )}

        {/* Header */}
        <PageHeader
          title={parentContest ? `${parentContest.name} - Categories` : 'Categories'}
          subtitle="Manage competition categories and judging criteria"
          icon={ListBulletIcon}
          actions={canManageCategories ? (
            <Button onClick={openCreateForm}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Category
            </Button>
          ) : undefined}
        />

        {/* Search and Filter Bar */}
        <Card className="p-4 mb-6 rounded-lg">
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

            {!contestId && (
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
            )}
          </div>
        </Card>

        {/* Categories List */}
        {isLoading ? (
          <Card className="p-12 text-center rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Loading categories...</p>
          </Card>
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <Card
                key={category.id}
                hover={canManageCategories}
                className="rounded-lg"
                onClick={(event) => {
                  if (!canManageCategories || isInteractiveElement(event.target, event.currentTarget)) return
                  handleEdit(category)
                }}
                onMouseUp={(event) => {
                  if (!canManageCategories || isInteractiveElement(event.target, event.currentTarget)) return
                  handleEdit(category)
                }}
                onKeyDown={(event) => {
                  if (!canManageCategories) return
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  handleEdit(category)
                }}
                role={canManageCategories ? 'button' : undefined}
                tabIndex={canManageCategories ? 0 : undefined}
                aria-label={canManageCategories ? `Edit category ${category.name}` : undefined}
              >
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
                  <div className="cgr-card-actions">
                    <button
                      onClick={() => handleEdit(category)}
                      className="w-full sm:flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center text-sm"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => openCloneModal(category)}
                      className="w-full sm:flex-1 px-3 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center justify-center text-sm"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                      Clone
                    </button>
                    <button
                      onClick={() => openTemplateModal(category)}
                      className="w-full sm:flex-1 px-3 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-md hover:bg-emerald-700 dark:hover:bg-emerald-600 flex items-center justify-center text-sm"
                    >
                      <BookmarkSquareIcon className="h-4 w-4 mr-1" />
                      Save Template
                    </button>
                    <button
                      onClick={() => navigate(`/assignments?contestId=${category.contestId}&categoryId=${category.id}`)}
                      className="w-full sm:flex-1 px-3 py-2 bg-slate-700 dark:bg-slate-600 text-white rounded-md hover:bg-slate-800 dark:hover:bg-slate-500 flex items-center justify-center text-sm"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                      Assign
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="w-full sm:flex-1 px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 flex items-center justify-center text-sm"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center rounded-lg">
            <ListBulletIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              {searchQuery || selectedContestFilter
                ? 'No categories found matching your filters'
                : 'No categories yet. Create your first category to get started.'}
            </p>
          </Card>
        )}

        {/* Create/Edit Form Modal */}
        {isFormOpen && (
          <div className="cgr-modal-overlay" role="dialog" aria-modal="true">
            <div className="flex min-h-full w-full items-center justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl p-4 sm:p-6 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto">
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
                {!editingCategory && (
                  <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCreationMode('blank')}
                        className={`flex-1 px-3 py-2 rounded-md ${creationMode === 'blank' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`}
                      >
                        Blank Category
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreationMode('template')}
                        className={`flex-1 px-3 py-2 rounded-md ${creationMode === 'template' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`}
                      >
                        From Template
                      </button>
                    </div>

                    {creationMode === 'template' && (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="pages-categoriespage-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Category Template <span className="text-red-500">*</span>
                          </label>
                          <select id="pages-categoriespage-1"
                            value={selectedCategoryTemplateId}
                            onChange={(e) => {
                              const templateId = e.target.value
                              const template = categoryTemplates.find((item) => item.id === templateId) || null
                              setSelectedCategoryTemplateId(templateId)
                              if (template) {
                                reset({
                                  contestId: form.getValues('contestId'),
                                  name: template.name || '',
                                  description: template.description || '',
                                  scoreCap: form.getValues('scoreCap'),
                                  timeLimit: form.getValues('timeLimit'),
                                  contestantMin: form.getValues('contestantMin'),
                                  contestantMax: form.getValues('contestantMax'),
                                })
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select a category template...</option>
                            {categoryTemplates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedCategoryTemplate && (
                          <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 p-3 space-y-2">
                            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                              Template criteria preview
                            </p>
                            {selectedCategoryTemplate.templateCriteria && selectedCategoryTemplate.templateCriteria.length > 0 ? (
                              <ul className="space-y-1 text-sm text-emerald-800 dark:text-emerald-200">
                                {selectedCategoryTemplate.templateCriteria.map((criterion) => (
                                  <li key={criterion.id}>
                                    {criterion.name} - {criterion.maxScore}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-emerald-700 dark:text-emerald-200">
                                This template does not currently contain criteria.
                              </p>
                            )}
                            <p className="text-xs text-emerald-700 dark:text-emerald-200">
                              The category will be created with these criteria. Review and edit the created category after deployment if needed.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {postCloneNotice && editingCategory && (
                  <div className="rounded-md border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-800 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Cloned Category Ready</p>
                        <p className="text-sm text-indigo-700 dark:text-indigo-200">{postCloneNotice}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/assignments?contestId=${editingCategory.contestId}&categoryId=${editingCategory.id}`)}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 whitespace-nowrap"
                      >
                        Open Assignments
                      </button>
                    </div>
                  </div>
                )}

                {/* Contest Selection */}
                <div>
                  <label htmlFor="pages-categoriespage-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contest <span className="text-red-500">*</span>
                  </label>
                  <select id="pages-categoriespage-2"
                    {...register('contestId')}
                    disabled={Boolean(editingCategory) || Boolean(contestId)}
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
                  <label htmlFor="pages-categoriespage-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input id="pages-categoriespage-3"
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
                  <label htmlFor="pages-categoriespage-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea id="pages-categoriespage-4"
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter category description"
                  />
                </div>

                {/* Scoring and Limits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pages-categoriespage-5" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Score Cap
                    </label>
                    <input id="pages-categoriespage-5"
                      type="number"
                      min="0"
                      {...register('scoreCap')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Max score"
                    />
                  </div>
                  <div>
                    <label htmlFor="pages-categoriespage-6" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time Limit (minutes)
                    </label>
                    <input id="pages-categoriespage-6"
                      type="number"
                      min="0"
                      {...register('timeLimit')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Minutes"
                    />
                  </div>
                </div>

                {/* Contestant Limits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pages-categoriespage-7" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Min Contestants
                    </label>
                    <input id="pages-categoriespage-7"
                      type="number"
                      min="0"
                      {...register('contestantMin')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Minimum"
                    />
                  </div>
                  <div>
                    <label htmlFor="pages-categoriespage-8" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Contestants
                    </label>
                    <input id="pages-categoriespage-8"
                      type="number"
                      min="0"
                      {...register('contestantMax')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Maximum"
                    />
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="pages-categoriespage-9" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Criteria
                    </label>
                    <div className="flex gap-2">
                      {editingCategory && (
                        <button
                          type="button"
                          onClick={openImportCriteriaModal}
                          className="px-2 py-1 text-sm bg-emerald-600 dark:bg-emerald-500 text-white rounded-md hover:bg-emerald-700 dark:hover:bg-emerald-600"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 inline mr-1" />
                          Import
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={addCriterionRow}
                        disabled={!editingCategory && creationMode === 'template'}
                        className="px-2 py-1 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                      >
                        Add Criterion
                      </button>
                    </div>
                  </div>
                  {criteriaLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading criteria...</p>
                  ) : !editingCategory && creationMode === 'template' ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Criteria will be copied from the selected template when the category is created.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {criterionDrafts.map((criterion, index) => (
                        <div key={`${criterion.id || 'new'}-${index}`} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <input
                            type="text"
                            value={criterion.name}
                            onChange={(e) => updateCriterionRow(index, 'name', e.target.value)}
                            placeholder="Criterion name"
                            className="sm:col-span-7 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="number"
                            min="1"
                            value={criterion.maxScore}
                            onChange={(e) => updateCriterionRow(index, 'maxScore', e.target.value)}
                            placeholder="Max score"
                            className="sm:col-span-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeCriterionRow(index)}
                            className="sm:col-span-2 px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600"
                            disabled={criterionDrafts.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {editingCategory && (
                  <ScopedRoleAssignmentsPanel
                    eventId={currentEditingContest?.eventId}
                    contestId={editingCategory.contestId}
                    categoryId={editingCategory.id}
                    title="Scoped Role Assignments"
                    compact
                  />
                )}

                  {/* Form Actions */}
                <div className="cgr-form-actions">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="w-full sm:flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting || createFromTemplateMutation.isLoading}
                      className="w-full sm:flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center justify-center"
                    >
                      {formSubmitting || createFromTemplateMutation.isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-5 w-5 mr-2" />
                          {editingCategory ? 'Update Category' : creationMode === 'template' ? 'Create Category from Template' : 'Create Category'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {cloneSource && (
          <div className="cgr-modal-overlay" role="dialog" aria-modal="true">
            <div className="flex min-h-full items-center justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Clone Category</h3>
                  <button onClick={closeCloneModal} className="text-gray-500 hover:text-gray-700">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create a new editable copy of <span className="font-medium">{cloneSource.name}</span>. Source assignments, scores, and certifications will not be copied.
                </p>
                <div>
                  <label htmlFor="pages-categoriespage-9" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Contest</label>
                  <select id="pages-categoriespage-9"
                    value={cloneTargetContestId}
                    onChange={(e) => setCloneTargetContestId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select contest...</option>
                    {cloneTargetContests.map((contest) => (
                      <option key={contest.id} value={contest.id}>
                        {contest.name}
                      </option>
                    ))}
                  </select>
                  {cloneSource && cloneTargetContests.length > 0 && cloneTargetContests.length !== (contests?.length || 0) && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Only contests from the same tenant as the source category are available.
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="pages-categoriespage-10" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Clone Name</label>
                  <input id="pages-categoriespage-10"
                    type="text"
                    value={cloneName}
                    onChange={(e) => setCloneName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <label htmlFor="pages-categoriespage-11" className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={cloneIncludeCriteria}
                    onChange={(e) => setCloneIncludeCriteria(e.target.checked)}
                  />
                  Copy criteria into the clone
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloneCategory}
                    disabled={cloneMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-70"
                  >
                    {cloneMutation.isLoading ? 'Cloning...' : 'Create Clone'}
                  </button>
                  <button type="button" onClick={closeCloneModal} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {templateSource && (
          <div className="cgr-modal-overlay" role="dialog" aria-modal="true">
            <div className="flex min-h-full items-center justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Save Category as Template</h3>
                  <button onClick={closeTemplateModal} className="text-gray-500 hover:text-gray-700">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Save <span className="font-medium">{templateSource.name}</span> and its criteria as a reusable template.
                </p>
                <div>
                  <label htmlFor="pages-categoriespage-11" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Template Name</label>
                  <input id="pages-categoriespage-11"
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="pages-categoriespage-12" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea id="pages-categoriespage-12"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCreateTemplate}
                    disabled={createTemplateMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-70"
                  >
                    {createTemplateMutation.isLoading ? 'Saving...' : 'Save Template'}
                  </button>
                  <button type="button" onClick={closeTemplateModal} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showImportCriteriaModal && editingCategory && (
          <div className="cgr-modal-overlay" role="dialog" aria-modal="true">
            <div className="flex min-h-full items-center justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import Criteria</h3>
                  <button onClick={closeImportCriteriaModal} className="text-gray-500 hover:text-gray-700">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('category')}
                    className={`flex-1 px-3 py-2 rounded-md ${importMode === 'category' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`}
                  >
                    From Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('template')}
                    className={`flex-1 px-3 py-2 rounded-md ${importMode === 'template' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`}
                  >
                    From Template
                  </button>
                </div>

                {importMode === 'category' ? (
                  <div>
                    <label htmlFor="pages-categoriespage-13" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source Category</label>
                    <select id="pages-categoriespage-13"
                      value={importSourceCategoryId}
                      onChange={(e) => setImportSourceCategoryId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select category...</option>
                      {categories
                        .filter((category) => category.id !== editingCategory.id)
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="pages-categoriespage-14" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Template</label>
                    <select id="pages-categoriespage-14"
                      value={importTemplateId}
                      onChange={(e) => setImportTemplateId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select template...</option>
                      {categoryTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleImportCriteria}
                    disabled={importCriteriaMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-70"
                  >
                    {importCriteriaMutation.isLoading ? 'Importing...' : 'Append Criteria'}
                  </button>
                  <button type="button" onClick={closeImportCriteriaModal} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md">
                    Cancel
                  </button>
                </div>
              </div>
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
