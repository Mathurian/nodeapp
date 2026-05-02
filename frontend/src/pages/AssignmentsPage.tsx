import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api, assignmentsAPI, tenantsAPI } from '../services/api'
import { useOptimisticMutation } from '../hooks'
import { getOptimisticRowClass } from '../components/ui'
import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import { Button, Card, PageHeader, ResponsiveTable } from '../components/ui'
import { compareCategories, compareContestants, compareContests, compareEvents, compareText, compareUsersByName, stableSort } from '../utils/listOrdering'

interface Judge {
  id: string
  name: string
  isHeadJudge: boolean
}

interface Category {
  id: string
  name: string
  contestId?: string
}

interface Contest {
  id: string
  name: string
  eventId?: string
}

interface Event {
  id: string
  name: string
}

interface Contestant {
  id: string
  name: string
  contestantNumber: number | null
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Tenant {
  id: string
  name: string
}

interface JudgeAssignment {
  id: string
  judgeId?: string
  categoryId?: string
  contestId?: string
  eventId?: string
  judge: Judge
  category?: Category
  contest?: { id: string; name: string }
  event?: { id: string; name: string }
  createdAt: string
  _optimistic?: boolean
  _deleting?: boolean
}

interface ContestantAssignment {
  id: string
  contestantId?: string
  categoryId?: string
  contestant: Contestant
  category?: Category
  contest?: { id: string; name: string }
  event?: { id: string; name: string }
  createdAt: string
  _optimistic?: boolean
  _deleting?: boolean
}

interface TallyMasterAssignment {
  id: string
  userId?: string
  eventId?: string
  contestId?: string
  categoryId?: string
  user: User
  event?: Event
  contest?: Contest
  category?: Category
  createdAt: string
  _optimistic?: boolean
  _deleting?: boolean
}

interface AuditorAssignment {
  id: string
  userId?: string
  eventId?: string
  contestId?: string
  categoryId?: string
  user: User
  event?: Event
  contest?: Contest
  category?: Category
  createdAt: string
  _optimistic?: boolean
  _deleting?: boolean
}

interface AssignmentFormData {
  personIds: string[]
  assignmentLevel: 'event' | 'contest' | 'category'
  eventId: string
  contestId: string
  categoryId: string
}

interface JudgeContestLimitPolicy {
  tenantId: string
  eventId?: string
  effectiveLimit: number
  source: 'event' | 'tenant' | 'global' | 'default'
  tenantDefaultLimit: number
  eventOverrideLimit: number | null
}

type TabType = 'judges' | 'contestants' | 'tally-masters' | 'auditors'

const getAssignmentLevel = (a: { eventId?: string; contestId?: string; categoryId?: string; _derivedLevel?: string }): string => {
  if (a._derivedLevel) return a._derivedLevel
  if (a.categoryId) return 'Category'
  if (a.contestId) return 'Contest'
  if (a.eventId) return 'Event'
  return 'Category'
}

const AssignmentsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const location = useLocation()

  const [activeTab, setActiveTab] = useState<TabType>('judges')
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterContestId, setFilterContestId] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [editingAssignment, setEditingAssignment] = useState<JudgeAssignment | ContestantAssignment | TallyMasterAssignment | AuditorAssignment | null>(null)
  const [editEventId, setEditEventId] = useState('')
  const [editContestId, setEditContestId] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')

  const [formData, setFormData] = useState<AssignmentFormData>({
    personIds: [],
    assignmentLevel: 'contest',
    eventId: '',
    contestId: '',
    categoryId: '',
  })
  const [policyEventId, setPolicyEventId] = useState('')
  const [tenantPolicyInput, setTenantPolicyInput] = useState('1')
  const [eventPolicyInput, setEventPolicyInput] = useState('')

  const canManageAssignments = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const policyTenantId = isSuperAdmin ? selectedTenantId : undefined
  const isPolicyContextReady = !isSuperAdmin || !!policyTenantId

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const eventId = params.get('eventId') || ''
    const contestId = params.get('contestId') || ''
    const categoryId = params.get('categoryId') || ''
    const tab = params.get('tab') as TabType | null

    if (tab && ['judges', 'contestants', 'tally-masters', 'auditors'].includes(tab)) {
      setActiveTab(tab)
    }

    if (contestId) {
      setFilterContestId(contestId)
    }
    if (categoryId) {
      setFilterCategoryId(categoryId)
    }
    if (eventId) {
      setPolicyEventId(eventId)
    }

    if (eventId || contestId || categoryId) {
      setFormData((prev) => ({
        ...prev,
        eventId,
        contestId,
        categoryId,
        assignmentLevel: categoryId ? 'category' : contestId ? 'contest' : 'event',
      }))
    }
  }, [location.search])

  const parsePolicyLimit = (value: string): number | null => {
    const normalized = value.trim()
    if (!normalized) return null
    if (!/^\d+$/.test(normalized)) return Number.NaN
    return Number.parseInt(normalized, 10)
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: tenants = [] } = useQuery<Tenant[]>(
    'tenants-list',
    async () => {
      const response = await tenantsAPI.getAll()
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { enabled: isSuperAdmin }
  )

  const { data: judgeAssignments = [], isLoading: isLoadingJudges } = useQuery<JudgeAssignment[]>(
    'judge-assignments',
    async () => {
      const response = await api.get('/assignments', { params: { type: 'judge' } })
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    }
  )

  const { data: contestantAssignments = [], isLoading: isLoadingContestants } = useQuery<ContestantAssignment[]>(
    'contestant-assignments',
    async () => {
      const response = await api.get('/assignments/contestants/assignments')
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    }
  )

  const { data: tallyMasterAssignments = [], isLoading: isLoadingTallyMasters } = useQuery<TallyMasterAssignment[]>(
    'tally-master-assignments',
    async () => {
      const response = await api.get('/assignments/tally-masters')
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { enabled: activeTab === 'tally-masters' }
  )

  const { data: auditorAssignments = [], isLoading: isLoadingAuditors } = useQuery<AuditorAssignment[]>(
    'auditor-assignments',
    async () => {
      const response = await api.get('/assignments/auditors')
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { enabled: activeTab === 'auditors' }
  )

  const { data: judges = [] } = useQuery<Judge[]>(
    ['judges-list', selectedTenantId],
    async () => {
      const params = selectedTenantId ? { tenantId: selectedTenantId } : {}
      const response = await api.get('/assignments/judges', { params })
      // /assignments/judges returns a paginated response: { data: [...], pagination: {...} }
      // wrapped in sendSuccess: { success: true, data: { data: [...], pagination: {...} } }
      const outer = response.data?.data
      const unwrapped = Array.isArray(outer) ? outer : (outer?.data ?? [])
      return Array.isArray(unwrapped) ? unwrapped : []
    }
  )

  const { data: contestants = [] } = useQuery<Contestant[]>(
    ['contestants-list', selectedTenantId],
    async () => {
      const params = selectedTenantId ? { tenantId: selectedTenantId } : {}
      const response = await api.get('/assignments/contestants', { params })
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    }
  )

  const { data: tallyMasters = [] } = useQuery<User[]>(
    ['tally-masters-list', selectedTenantId],
    async () => {
      const params = selectedTenantId ? { tenantId: selectedTenantId } : {}
      const response = await api.get('/users/role/TALLY_MASTER', { params })
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { enabled: activeTab === 'tally-masters' }
  )

  const { data: auditors = [] } = useQuery<User[]>(
    ['auditors-list', selectedTenantId],
    async () => {
      const params = selectedTenantId ? { tenantId: selectedTenantId } : {}
      const response = await api.get('/users/role/AUDITOR', { params })
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { enabled: activeTab === 'auditors' }
  )

  const { data: events = [], isLoading: isLoadingEvents } = useQuery<Event[]>(
    ['events-list', selectedTenantId],
    async () => {
      const params = selectedTenantId ? { tenantId: selectedTenantId } : undefined
      const response = await api.get('/events', { params })
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    }
  )

  const { data: tenantJudgeContestLimitPolicy, isLoading: isLoadingTenantJudgeContestLimitPolicy } = useQuery<JudgeContestLimitPolicy>(
    ['judge-contest-limit-policy', 'tenant', policyTenantId || 'current'],
    async () => {
      const response = await assignmentsAPI.getJudgeContestLimitPolicy(
        policyTenantId ? { tenantId: policyTenantId } : undefined
      )
      return response.data?.data || response.data
    },
    {
      enabled: activeTab === 'judges' && isPolicyContextReady
    }
  )

  const { data: eventJudgeContestLimitPolicy, isLoading: isLoadingEventJudgeContestLimitPolicy } = useQuery<JudgeContestLimitPolicy>(
    ['judge-contest-limit-policy', 'event', policyTenantId || 'current', policyEventId],
    async () => {
      const response = await assignmentsAPI.getJudgeContestLimitPolicy({
        eventId: policyEventId,
        ...(policyTenantId ? { tenantId: policyTenantId } : {})
      })
      return response.data?.data || response.data
    },
    {
      enabled: activeTab === 'judges' && isPolicyContextReady && !!policyEventId
    }
  )

  const { data: contests = [] } = useQuery<Contest[]>(
    ['contests-list', formData.eventId],
    async () => {
      if (!formData.eventId) return []
      const response = await api.get(`/contests/event/${formData.eventId}`)
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { enabled: !!formData.eventId && (formData.assignmentLevel === 'contest' || formData.assignmentLevel === 'category') }
  )

  const { data: categories = [] } = useQuery<Category[]>(
    ['categories-list', formData.contestId],
    async () => {
      if (!formData.contestId) return []
      const response = await api.get(`/categories/contest/${formData.contestId}`)
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { enabled: !!formData.contestId && formData.assignmentLevel === 'category' }
  )

  const { data: editContests = [] } = useQuery<Contest[]>(
    ['edit-contests-list', editEventId],
    async () => {
      if (!editEventId) return []
      const response = await api.get(`/contests/event/${editEventId}`)
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { enabled: !!editEventId && !!editingAssignment }
  )

  const { data: editCategories = [] } = useQuery<Category[]>(
    ['edit-categories-list', editContestId],
    async () => {
      if (!editContestId) return []
      const response = await api.get(`/categories/contest/${editContestId}`)
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { enabled: !!editContestId && !!editingAssignment }
  )

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const updateJudgeContestLimitPolicyMutation = useMutation(
    async (payload: { limit: number | null; eventId?: string }) => {
      const response = await assignmentsAPI.updateJudgeContestLimitPolicy(
        payload,
        policyTenantId ? { tenantId: policyTenantId } : undefined
      )
      return response.data?.data || response.data
    },
    {
      onSuccess: (_data, payload) => {
        queryClient.invalidateQueries(['judge-contest-limit-policy', 'tenant', policyTenantId || 'current'])
        if (payload.eventId) {
          queryClient.invalidateQueries(['judge-contest-limit-policy', 'event', policyTenantId || 'current', payload.eventId])
        } else {
          queryClient.invalidateQueries(['judge-contest-limit-policy', 'event', policyTenantId || 'current'])
        }
        toast.success(payload.eventId ? 'Per-event judge assignment limit updated' : 'Tenant default judge assignment limit updated')
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to update assignment policy'}`)
      }
    }
  )

  // Judge assignment — supports category-level and contest-level
  const assignJudgeMutation = useMutation(
    async (data: { judgeIds: string[]; categoryId?: string; contestId?: string }) => {
      await Promise.all(
        data.judgeIds.map(judgeId => {
          const body: Record<string, string> = { judgeId }
          if (data.categoryId) body.categoryId = data.categoryId
          if (data.contestId) body.contestId = data.contestId
          return api.post('/assignments/judge', body)
        })
      )
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('judge-assignments')
        resetForm()
        toast.success('Judge(s) assigned successfully!')
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to assign judge'}`)
      },
    }
  )

  // Contestant assignment — category-level only
  const assignContestantMutation = useMutation(
    async (data: { contestantIds: string[]; categoryId: string }) => {
      await Promise.all(
        data.contestantIds.map(contestantId =>
          api.post('/assignments/contestants', { contestantId, categoryId: data.categoryId })
        )
      )
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contestant-assignments')
        resetForm()
        toast.success('Contestant(s) assigned successfully!')
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to assign contestant'}`)
      },
    }
  )

  // Tally master assignment — supports event/contest/category levels
  const assignTallyMasterMutation = useMutation(
    async (data: { userIds: string[]; eventId?: string; contestId?: string; categoryId?: string }) => {
      await Promise.all(
        data.userIds.map(userId => {
          const body: Record<string, string> = { userId }
          if (data.eventId) body.eventId = data.eventId
          if (data.contestId) body.contestId = data.contestId
          if (data.categoryId) body.categoryId = data.categoryId
          return api.post('/assignments/tally-masters', body)
        })
      )
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tally-master-assignments')
        resetForm()
        toast.success('Tally Master(s) assigned successfully!')
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to assign tally master'}`)
      },
    }
  )

  // Auditor assignment — supports event/contest/category levels
  const assignAuditorMutation = useMutation(
    async (data: { userIds: string[]; eventId?: string; contestId?: string; categoryId?: string }) => {
      await Promise.all(
        data.userIds.map(userId => {
          const body: Record<string, string> = { userId }
          if (data.eventId) body.eventId = data.eventId
          if (data.contestId) body.contestId = data.contestId
          if (data.categoryId) body.categoryId = data.categoryId
          return api.post('/assignments/auditors', body)
        })
      )
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('auditor-assignments')
        resetForm()
        toast.success('Auditor(s) assigned successfully!')
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to assign auditor'}`)
      },
    }
  )

  // Remove judge (single, optimistic)
  const removeJudgeAssignmentMutation = useOptimisticMutation<unknown, string>({
    mutationFn: async (assignmentId: string) => {
      const response = await api.put(`/assignments/remove/${assignmentId}`)
      return response.data
    },
    queryKey: ['judge-assignments'],
    updateFn: (oldData, assignmentId) => {
      const assignments = oldData as JudgeAssignment[] | undefined
      if (!assignments) return []
      return assignments.map(a => a.id === assignmentId ? { ...a, _optimistic: true, _deleting: true } : a)
    },
    onSuccess: () => toast.success('Judge assignment removed!'),
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to remove assignment'}`)
    },
    invalidateOnSettled: true,
  })

  // Remove contestant (single, optimistic) — use nested IDs as fallback
  const removeContestantAssignmentMutation = useOptimisticMutation<
    unknown,
    { assignment: ContestantAssignment }
  >({
    mutationFn: async ({ assignment }) => {
      const categoryId = assignment.categoryId || assignment.category?.id
      const contestantId = assignment.contestantId || assignment.contestant?.id
      const response = await api.delete(`/assignments/category/${categoryId}/contestant/${contestantId}`)
      return response.data
    },
    queryKey: ['contestant-assignments'],
    updateFn: (oldData, { assignment }) => {
      const assignments = oldData as ContestantAssignment[] | undefined
      if (!assignments) return []
      return assignments.map(a => a.id === assignment.id ? { ...a, _optimistic: true, _deleting: true } : a)
    },
    onSuccess: () => toast.success('Contestant assignment removed!'),
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to remove assignment'}`)
    },
    invalidateOnSettled: true,
  })

  // Remove tally master (single)
  const removeTallyMasterMutation = useMutation(
    async (id: string) => {
      await api.delete(`/assignments/tally-masters/${id}`)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tally-master-assignments')
        toast.success('Tally master assignment removed!')
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to remove assignment'}`)
      },
    }
  )

  // Remove auditor (single)
  const removeAuditorMutation = useMutation(
    async (id: string) => {
      await api.delete(`/assignments/auditors/${id}`)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('auditor-assignments')
        toast.success('Auditor assignment removed!')
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to remove assignment'}`)
      },
    }
  )

  // Bulk remove
  const bulkRemoveMutation = useMutation(
    async () => {
      const selectedRows = currentAssignments.filter((a: any) => selectedIds.has(a.id))
      const toIds = (a: any): string[] => (Array.isArray(a._groupedIds) ? a._groupedIds : [a.id])

      if (activeTab === 'judges') {
        const ids = Array.from(new Set(selectedRows.flatMap(toIds)))
        await Promise.all(ids.map(id => api.put(`/assignments/remove/${id}`)))
      } else if (activeTab === 'contestants') {
        const selectedIdsExpanded = new Set(selectedRows.flatMap(toIds))
        const selected = contestantAssignments.filter(a => selectedIdsExpanded.has(a.id))
        await Promise.all(
          selected.map(a => {
            const categoryId = a.categoryId || a.category?.id
            const contestantId = a.contestantId || a.contestant?.id
            return api.delete(`/assignments/category/${categoryId}/contestant/${contestantId}`)
          })
        )
      } else if (activeTab === 'tally-masters') {
        const ids = Array.from(new Set(selectedRows.flatMap(toIds)))
        await Promise.all(ids.map(id => api.delete(`/assignments/tally-masters/${id}`)))
      } else if (activeTab === 'auditors') {
        const ids = Array.from(new Set(selectedRows.flatMap(toIds)))
        await Promise.all(ids.map(id => api.delete(`/assignments/auditors/${id}`)))
      }
    },
    {
      onSuccess: () => {
        const count = selectedIds.size
        queryClient.invalidateQueries(`${activeTab.replace('-', '-')}assignments`)
        if (activeTab === 'judges') queryClient.invalidateQueries('judge-assignments')
        else if (activeTab === 'contestants') queryClient.invalidateQueries('contestant-assignments')
        else if (activeTab === 'tally-masters') queryClient.invalidateQueries('tally-master-assignments')
        else if (activeTab === 'auditors') queryClient.invalidateQueries('auditor-assignments')
        setSelectedIds(new Set())
        toast.success(`Removed ${count} assignment(s)`)
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to remove assignments'}`)
      },
    }
  )

  // Edit save — remove old + create new
  const editSaveMutation = useMutation(
    async () => {
      if (!editingAssignment) return
      if (activeTab === 'judges') {
        const a = editingAssignment as JudgeAssignment
        await api.put(`/assignments/remove/${a.id}`)
        const body: Record<string, string> = { judgeId: a.judgeId || a.judge.id }
        if (editCategoryId) body.categoryId = editCategoryId
        else if (editContestId) body.contestId = editContestId
        await api.post('/assignments/judge', body)
      } else if (activeTab === 'contestants') {
        const a = editingAssignment as ContestantAssignment
        const oldCategoryId = a.categoryId || a.category?.id
        const contestantId = a.contestantId || a.contestant?.id
        await api.delete(`/assignments/category/${oldCategoryId}/contestant/${contestantId}`)
        await api.post('/assignments/contestants', { contestantId, categoryId: editCategoryId })
      } else if (activeTab === 'tally-masters') {
        const a = editingAssignment as TallyMasterAssignment
        await api.delete(`/assignments/tally-masters/${a.id}`)
        const body: Record<string, string> = { userId: a.userId || a.user.id }
        if (editEventId) body.eventId = editEventId
        if (editContestId) body.contestId = editContestId
        if (editCategoryId) body.categoryId = editCategoryId
        await api.post('/assignments/tally-masters', body)
      } else if (activeTab === 'auditors') {
        const a = editingAssignment as AuditorAssignment
        await api.delete(`/assignments/auditors/${a.id}`)
        const body: Record<string, string> = { userId: a.userId || a.user.id }
        if (editEventId) body.eventId = editEventId
        if (editContestId) body.contestId = editContestId
        if (editCategoryId) body.categoryId = editCategoryId
        await api.post('/assignments/auditors', body)
      }
    },
    {
      onSuccess: () => {
        if (activeTab === 'judges') queryClient.invalidateQueries('judge-assignments')
        else if (activeTab === 'contestants') queryClient.invalidateQueries('contestant-assignments')
        else if (activeTab === 'tally-masters') queryClient.invalidateQueries('tally-master-assignments')
        else if (activeTab === 'auditors') queryClient.invalidateQueries('auditor-assignments')
        closeEditModal()
        toast.success('Assignment updated!')
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to update assignment'}`)
      },
    }
  )

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { personIds, assignmentLevel, eventId, contestId, categoryId } = formData

    if (personIds.length === 0) {
      toast.error(`Please select at least one ${getTabLabel(activeTab).toLowerCase()}`)
      return
    }

    if (activeTab === 'judges') {
      if (assignmentLevel === 'category' && !categoryId) { toast.error('Please select a category'); return }
      if (assignmentLevel === 'contest' && !contestId) { toast.error('Please select a contest'); return }
      assignJudgeMutation.mutate({
        judgeIds: personIds,
        categoryId: assignmentLevel === 'category' ? categoryId : undefined,
        contestId: assignmentLevel === 'contest' ? contestId : undefined,
      })
    } else if (activeTab === 'contestants') {
      if (assignmentLevel === 'contest') {
        if (!contestId) { toast.error('Please select a contest'); return }
        try {
          const catRes = await api.get(`/categories/contest/${contestId}`)
          const cats: any[] = catRes.data?.data || catRes.data || []
          if (cats.length === 0) { toast.error('No categories found in this contest'); return }
          await Promise.all(
            personIds.flatMap(contestantId =>
              cats.map((cat: any) => api.post('/assignments/contestants', { contestantId, categoryId: cat.id }))
            )
          )
          queryClient.invalidateQueries('contestant-assignments')
          resetForm()
          toast.success(`Contestant(s) assigned to all ${cats.length} categories!`)
        } catch (error: any) {
          toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to assign'}`)
        }
      } else {
        if (!categoryId) { toast.error('Please select a category'); return }
        assignContestantMutation.mutate({ contestantIds: personIds, categoryId })
      }
    } else if (activeTab === 'tally-masters') {
      if (!eventId) { toast.error('Please select an event'); return }
      assignTallyMasterMutation.mutate({
        userIds: personIds,
        eventId,
        contestId: (assignmentLevel === 'contest' || assignmentLevel === 'category') ? contestId : undefined,
        categoryId: assignmentLevel === 'category' ? categoryId : undefined,
      })
    } else if (activeTab === 'auditors') {
      if (!eventId) { toast.error('Please select an event'); return }
      assignAuditorMutation.mutate({
        userIds: personIds,
        eventId,
        contestId: (assignmentLevel === 'contest' || assignmentLevel === 'category') ? contestId : undefined,
        categoryId: assignmentLevel === 'category' ? categoryId : undefined,
      })
    }
  }

  const handleSaveTenantPolicy = () => {
    const parsed = parsePolicyLimit(tenantPolicyInput)
    if (parsed === null || Number.isNaN(parsed)) {
      toast.error('Tenant default limit must be a non-negative integer (0 = unlimited)')
      return
    }
    updateJudgeContestLimitPolicyMutation.mutate({ limit: parsed })
  }

  const handleResetTenantPolicy = () => {
    updateJudgeContestLimitPolicyMutation.mutate({ limit: null })
  }

  const handleSaveEventPolicy = () => {
    if (!policyEventId) {
      toast.error('Select an event before saving an override')
      return
    }
    const parsed = parsePolicyLimit(eventPolicyInput)
    if (parsed === null || Number.isNaN(parsed)) {
      toast.error('Event override limit must be a non-negative integer (0 = unlimited)')
      return
    }
    updateJudgeContestLimitPolicyMutation.mutate({ eventId: policyEventId, limit: parsed })
  }

  const handleClearEventPolicy = () => {
    if (!policyEventId) {
      toast.error('Select an event before clearing an override')
      return
    }
    updateJudgeContestLimitPolicyMutation.mutate({ eventId: policyEventId, limit: null })
  }

  const handleRemoveSingle = async (assignment: any) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return
    const ids: string[] = Array.isArray(assignment._groupedIds) ? assignment._groupedIds : [assignment.id]
    const effectiveSingleId = ids[0]

    if (ids.length === 1) {
      if (activeTab === 'judges') {
        removeJudgeAssignmentMutation.mutate(effectiveSingleId)
      } else if (activeTab === 'contestants') {
        const sourceAssignment = contestantAssignments.find(a => a.id === effectiveSingleId) || assignment
        removeContestantAssignmentMutation.mutate({ assignment: sourceAssignment })
      } else if (activeTab === 'tally-masters') {
        removeTallyMasterMutation.mutate(effectiveSingleId)
      } else if (activeTab === 'auditors') {
        removeAuditorMutation.mutate(effectiveSingleId)
      }
      return
    }

    try {
      if (activeTab === 'judges') {
        await Promise.all(ids.map(id => api.put(`/assignments/remove/${id}`)))
        queryClient.invalidateQueries('judge-assignments')
      } else if (activeTab === 'contestants') {
        const selected = contestantAssignments.filter(a => ids.includes(a.id))
        await Promise.all(selected.map(a => {
          const categoryId = a.categoryId || a.category?.id
          const contestantId = a.contestantId || a.contestant?.id
          return api.delete(`/assignments/category/${categoryId}/contestant/${contestantId}`)
        }))
        queryClient.invalidateQueries('contestant-assignments')
      } else if (activeTab === 'tally-masters') {
        await Promise.all(ids.map(id => api.delete(`/assignments/tally-masters/${id}`)))
        queryClient.invalidateQueries('tally-master-assignments')
      } else if (activeTab === 'auditors') {
        await Promise.all(ids.map(id => api.delete(`/assignments/auditors/${id}`)))
        queryClient.invalidateQueries('auditor-assignments')
      }
      toast.success('Assignments removed!')
    } catch (error: any) {
      toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to remove assignment'}`)
    }
  }

  const handleBulkRemove = () => {
    if (selectedIds.size === 0) return
    if (confirm(`Are you sure you want to remove ${selectedIds.size} assignment(s)?`)) {
      bulkRemoveMutation.mutate()
    }
  }

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = (assignments: Array<{ id: string }>) => {
    const visibleIds = assignments.map(a => a.id)
    const allSelected = visibleIds.every(id => selectedIds.has(id))
    setSelectedIds(allSelected ? new Set() : new Set(visibleIds))
  }

  const handleEditAssignment = (assignment: any) => {
    setEditingAssignment(assignment)
    setEditEventId(assignment.event?.id || assignment.eventId || '')
    setEditContestId(assignment.contest?.id || assignment.contestId || '')
    setEditCategoryId(assignment.category?.id || assignment.categoryId || '')
  }

  const closeEditModal = () => {
    setEditingAssignment(null)
    setEditEventId('')
    setEditContestId('')
    setEditCategoryId('')
  }

  const resetForm = () => {
    const defaultLevel = (activeTab === 'tally-masters' || activeTab === 'auditors') ? 'event' : 'contest'
    setFormData({ personIds: [], assignmentLevel: defaultLevel, eventId: '', contestId: '', categoryId: '' })
    setIsFormOpen(false)
  }

  const togglePersonId = (id: string) => {
    setFormData(prev => ({
      ...prev,
      personIds: prev.personIds.includes(id)
        ? prev.personIds.filter(p => p !== id)
        : [...prev.personIds, id],
    }))
  }

  const selectAllPeople = () => {
    const people = getPeople()
    const allIds = people.map((p: any) => p.id)
    const allSelected = allIds.every(id => formData.personIds.includes(id))
    setFormData(prev => ({ ...prev, personIds: allSelected ? [] : allIds }))
  }

  useEffect(() => {
    resetForm()
    setSelectedIds(new Set())
    setFilterContestId('')
    setFilterCategoryId('')
  }, [activeTab])

  useEffect(() => {
    setPolicyEventId('')
    setEventPolicyInput('')
  }, [selectedTenantId])

  useEffect(() => {
    if (!tenantJudgeContestLimitPolicy) return
    setTenantPolicyInput(String(tenantJudgeContestLimitPolicy.tenantDefaultLimit))
  }, [tenantJudgeContestLimitPolicy?.tenantDefaultLimit, policyTenantId])

  useEffect(() => {
    if (!policyEventId) {
      setEventPolicyInput('')
      return
    }
    if (!eventJudgeContestLimitPolicy || eventJudgeContestLimitPolicy.eventOverrideLimit === null) {
      setEventPolicyInput('')
      return
    }
    setEventPolicyInput(String(eventJudgeContestLimitPolicy.eventOverrideLimit))
  }, [policyEventId, eventJudgeContestLimitPolicy?.eventOverrideLimit])

  // ─── Derived data ──────────────────────────────────────────────────────────

  const getRawAssignmentsForTab = (): any[] => {
    switch (activeTab) {
      case 'judges': return judgeAssignments
      case 'contestants': return contestantAssignments
      case 'tally-masters': return tallyMasterAssignments
      case 'auditors': return auditorAssignments
      default: return []
    }
  }

  const matchesSearch = (a: any): boolean => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    const person =
      activeTab === 'judges' ? a.judge?.name :
      activeTab === 'contestants' ? a.contestant?.name :
      a.user?.name
    return (
      String(person || '').toLowerCase().includes(q) ||
      String(a.category?.name || '').toLowerCase().includes(q) ||
      String(a.contest?.name || '').toLowerCase().includes(q) ||
      String(a.event?.name || '').toLowerCase().includes(q)
    )
  }

  const matchesScope = (a: any): boolean => {
    const contestId = a.contest?.id || a.contestId
    const categoryId = a.category?.id || a.categoryId
    if (filterContestId && contestId !== filterContestId) return false
    if (filterCategoryId && categoryId !== filterCategoryId) return false
    return true
  }

  const collapseByContest = (rows: any[]): any[] => {
    const grouped = new Map<string, any>()

    for (const row of rows) {
      const contestId = row.contest?.id || row.contestId
      if (!contestId) {
        grouped.set(row.id, row)
        continue
      }

      const personId =
        (activeTab === 'judges' && (row.judgeId || row.judge?.id)) ||
        (activeTab === 'contestants' && (row.contestantId || row.contestant?.id)) ||
        row.userId ||
        row.user?.id

      const key = `${personId || 'unknown'}_${contestId}`
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, {
          ...row,
          id: `group_${activeTab}_${key}`,
          _derivedLevel: 'Contest',
          _groupedIds: [row.id],
          categoryId: undefined,
          category: undefined,
        })
      } else {
        existing._groupedIds.push(row.id)
      }
    }

    return Array.from(grouped.values())
  }

  const getCurrentAssignments = (): any[] => {
    const filtered = getRawAssignmentsForTab().filter(matchesSearch).filter(matchesScope)
    if (filterContestId && !filterCategoryId) {
      return stableSort(collapseByContest(filtered), compareAssignmentRows)
    }
    return stableSort(filtered, compareAssignmentRows)
  }

  const getIsLoading = () => {
    switch (activeTab) {
      case 'judges': return isLoadingJudges
      case 'contestants': return isLoadingContestants
      case 'tally-masters': return isLoadingTallyMasters
      case 'auditors': return isLoadingAuditors
      default: return false
    }
  }

  const getTabLabel = (tab: TabType): string => {
    const labels = { judges: 'Judge', contestants: 'Contestant', 'tally-masters': 'Tally Master', auditors: 'Auditor' }
    return labels[tab]
  }

  const getPeople = () => {
    switch (activeTab) {
      case 'judges': return stableSort(judges, compareUsersByName)
      case 'contestants': return stableSort(contestants, compareContestants)
      case 'tally-masters': return stableSort(tallyMasters, compareUsersByName)
      case 'auditors': return stableSort(auditors, compareUsersByName)
      default: return []
    }
  }

  const compareAssignmentRows = (left: any, right: any): number => {
    const leftPerson =
      activeTab === 'judges' ? left.judge :
      activeTab === 'contestants' ? left.contestant :
      left.user
    const rightPerson =
      activeTab === 'judges' ? right.judge :
      activeTab === 'contestants' ? right.contestant :
      right.user

    const byPerson = activeTab === 'contestants'
      ? compareContestants(leftPerson || {}, rightPerson || {})
      : compareUsersByName(leftPerson || {}, rightPerson || {})
    if (byPerson !== 0) return byPerson

    const byEvent = compareText(left.event?.name || '', right.event?.name || '')
    if (byEvent !== 0) return byEvent

    const byContest = compareText(left.contest?.name || '', right.contest?.name || '')
    if (byContest !== 0) return byContest

    const byCategory = compareText(left.category?.name || '', right.category?.name || '')
    if (byCategory !== 0) return byCategory

    return compareText(left.id || '', right.id || '')
  }

  // Which assignment levels the current tab supports
  const getAvailableLevels = (): Array<{ value: string; label: string }> => {
    if (activeTab === 'judges' || activeTab === 'contestants') return [
      { value: 'contest', label: 'Contest Level' },
      { value: 'category', label: 'Category Level' },
    ]
    // tally-masters and auditors support all three
    return [
      { value: 'event', label: 'Event Level' },
      { value: 'contest', label: 'Contest Level' },
      { value: 'category', label: 'Category Level' },
    ]
  }

  const isAnyMutationLoading = assignJudgeMutation.isLoading || assignContestantMutation.isLoading ||
    assignTallyMasterMutation.isLoading || assignAuditorMutation.isLoading

  const judgeContestLevelCountsByJudgeEvent = useMemo(() => {
    const map = new Map<string, { count: number; judgeName: string; eventName: string; contestNames: Set<string> }>()

    for (const assignment of judgeAssignments) {
      const isContestLevel = !!(assignment.contest?.id || assignment.contestId) && !(assignment.category?.id || assignment.categoryId)
      if (!isContestLevel) continue

      const judgeId = assignment.judge?.id || assignment.judgeId
      const eventId = assignment.event?.id || assignment.eventId
      if (!judgeId || !eventId) continue

      const key = `${judgeId}::${eventId}`
      const existing = map.get(key)
      const contestName = assignment.contest?.name || 'Unnamed contest'

      if (!existing) {
        map.set(key, {
          count: 1,
          judgeName: assignment.judge?.name || 'Unnamed judge',
          eventName: assignment.event?.name || 'Unnamed event',
          contestNames: new Set([contestName]),
        })
      } else {
        existing.count += 1
        existing.contestNames.add(contestName)
      }
    }

    return map
  }, [judgeAssignments])

  const judgeContestLevelWarnings = useMemo(() => (
    Array.from(judgeContestLevelCountsByJudgeEvent.entries())
      .filter(([, value]) => value.count > 1)
      .map(([key, value]) => ({
        key,
        judgeName: value.judgeName,
        eventName: value.eventName,
        count: value.count,
        contests: stableSort(Array.from(value.contestNames), compareText),
      }))
      .sort((a, b) => compareText(a.judgeName, b.judgeName) || compareText(a.eventName, b.eventName))
  ), [judgeContestLevelCountsByJudgeEvent])

  if (!canManageAssignments) {
    return (
      <div className="cgr-page-container">
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-200">
            You don't have permission to manage assignments. Contact your administrator.
          </p>
        </Card>
      </div>
    )
  }

  const isLoading = getIsLoading()
  const currentAssignments = getCurrentAssignments()
  const people = getPeople()
  const rawAssignments = getRawAssignmentsForTab()
  const sortedTenants = stableSort(tenants, (a, b) => {
    const byName = compareText(a.name, b.name)
    if (byName !== 0) return byName
    return compareText(a.id, b.id)
  })
  const sortedEvents = stableSort(events, (a, b) => compareEvents(a as any, b as any, 'desc'))
  const sortedContests = stableSort(contests, compareContests)
  const sortedCategories = stableSort(categories, compareCategories)
  const sortedEditContests = stableSort(editContests, compareContests)
  const sortedEditCategories = stableSort(editCategories, compareCategories)
  const contestOptions = stableSort(Array.from(
    new Map(
      rawAssignments
        .map((a: any) => ({ id: a.contest?.id || a.contestId, name: a.contest?.name }))
        .filter((c: any) => c.id && c.name)
        .map((c: any) => [c.id, c])
    ).values()
  ), compareContests)
  const categoryOptions = stableSort(Array.from(
    new Map(
      rawAssignments
        .filter((a: any) => !filterContestId || (a.contest?.id || a.contestId) === filterContestId)
        .map((a: any) => ({ id: a.category?.id || a.categoryId, name: a.category?.name }))
        .filter((c: any) => c.id && c.name)
        .map((c: any) => [c.id, c])
      ).values()
  ), compareCategories)

  return (
    <div className="cgr-page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Assignments Management"
          subtitle="Manage judge, contestant, tally master, and auditor assignments"
          icon={UserGroupIcon}
        />
        <Button onClick={() => setIsFormOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          New Assignment
        </Button>
      </div>

      {/* Tabs */}
      <Card className="rounded-lg p-0 border-0 shadow-none">
      <div className="border-b border-gray-200 dark:border-gray-700 px-4">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {(['judges', 'contestants', 'tally-masters', 'auditors'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              {getTabLabel(tab)}s ({
                tab === 'judges' ? judgeAssignments.length :
                tab === 'contestants' ? contestantAssignments.length :
                tab === 'tally-masters' ? tallyMasterAssignments.length :
                auditorAssignments.length
              })
            </button>
          ))}
        </nav>
      </div>
      </Card>

      {activeTab === 'judges' && (
        <Card className="rounded-lg p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Judge Contest Assignment Guardrail</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Limit how many contest-level assignments a judge can hold in one event (0 = unlimited).
            </p>
          </div>

          {isSuperAdmin && (
            <div>
              <label htmlFor="pages-assignmentspage-1" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Tenant</label>
              <select id="pages-assignmentspage-1"
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full md:w-80 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select tenant...</option>
                {sortedTenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          {!isPolicyContextReady ? (
            <div className="rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-200">
              Select a tenant to configure guardrails.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Tenant Default</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Effective now: {isLoadingTenantJudgeContestLimitPolicy ? 'Loading...' : `${tenantJudgeContestLimitPolicy?.effectiveLimit ?? 1}`}
                    {' '}({tenantJudgeContestLimitPolicy?.source ?? 'default'})
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={tenantPolicyInput}
                    onChange={(e) => setTenantPolicyInput(e.target.value)}
                    className="w-full sm:w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveTenantPolicy}
                    disabled={updateJudgeContestLimitPolicyMutation.isLoading}
                  >
                    Save Default
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleResetTenantPolicy}
                    disabled={updateJudgeContestLimitPolicyMutation.isLoading}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Per-Event Override</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current event setting: {isLoadingEventJudgeContestLimitPolicy ? 'Loading...' : (
                      policyEventId
                        ? `${eventJudgeContestLimitPolicy?.eventOverrideLimit ?? 'Inherited'}`
                        : 'Select event'
                    )}
                  </p>
                </div>

                <select
                  value={policyEventId}
                  onChange={(e) => setPolicyEventId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select event...</option>
                  {sortedEvents.map(event => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={eventPolicyInput}
                    onChange={(e) => setEventPolicyInput(e.target.value)}
                    disabled={!policyEventId}
                    className="w-full sm:w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                    placeholder="(inherit)"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveEventPolicy}
                    disabled={!policyEventId || updateJudgeContestLimitPolicyMutation.isLoading}
                  >
                    Save Override
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleClearEventPolicy}
                    disabled={!policyEventId || updateJudgeContestLimitPolicyMutation.isLoading}
                  >
                    Clear Override
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'judges' && judgeContestLevelWarnings.length > 0 && (
        <Card className="rounded-lg p-4 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">Visibility Warning</div>
          <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
            These judges currently have more than one contest-level assignment in the same event:
          </p>
          <div className="mt-3 space-y-2">
            {judgeContestLevelWarnings.map((warning) => (
              <div key={warning.key} className="text-xs text-amber-900 dark:text-amber-100">
                <span className="font-semibold">{warning.judgeName}</span>
                <span> in </span>
                <span className="font-semibold">{warning.eventName}</span>
                <span>: {warning.count} contest assignments ({warning.contests.join(', ')})</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search + Filters + Bulk actions */}
      <Card className="rounded-lg p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${getTabLabel(activeTab).toLowerCase()}s...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterContestId}
          onChange={(e) => {
            setFilterContestId(e.target.value)
            setFilterCategoryId('')
            setSelectedIds(new Set())
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[180px]"
        >
          <option value="">All contests</option>
          {contestOptions.map((contest: any) => (
            <option key={contest.id} value={contest.id}>{contest.name}</option>
          ))}
        </select>
        <select
          value={filterCategoryId}
          onChange={(e) => {
            setFilterCategoryId(e.target.value)
            setSelectedIds(new Set())
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[180px]"
        >
          <option value="">All categories</option>
          {categoryOptions.map((category: any) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        {selectedIds.size > 0 && (
          <Button
            onClick={handleBulkRemove}
            disabled={bulkRemoveMutation.isLoading}
            variant="danger"
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            Remove {selectedIds.size} selected
          </Button>
        )}
      </div>
      </Card>

      {/* Table */}
      {isLoading ? (
        <Card className="rounded-lg p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading assignments...</p>
        </Card>
      ) : currentAssignments.length === 0 ? (
        <Card className="rounded-lg p-12 text-center">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No assignments found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Try adjusting your search' : 'Get started by creating a new assignment'}
          </p>
        </Card>
      ) : (
        <Card className="rounded-lg overflow-hidden p-0">
          <ResponsiveTable caption="Role assignments" minWidth="900px">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      checked={currentAssignments.length > 0 && currentAssignments.every(a => selectedIds.has(a.id))}
                      onChange={() => handleSelectAll(currentAssignments)}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {getTabLabel(activeTab)}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assigned</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currentAssignments.map((assignment: any) => {
                  const optimisticClass = getOptimisticRowClass(assignment)
                  const isSelected = selectedIds.has(assignment.id)
                  const personName =
                    activeTab === 'judges' ? assignment.judge?.name :
                    activeTab === 'contestants' ? assignment.contestant?.name :
                    assignment.user?.name
                  const personSub =
                    activeTab === 'judges' && assignment.judge?.isHeadJudge ? 'Head Judge' :
                    activeTab === 'contestants' && assignment.contestant?.contestantNumber
                      ? `#${assignment.contestant.contestantNumber}` : null
                  const judgeIdForRow = activeTab === 'judges' ? (assignment.judge?.id || assignment.judgeId) : undefined
                  const eventIdForRow = assignment.event?.id || assignment.eventId
                  const contestLevelCountInEvent =
                    activeTab === 'judges' && judgeIdForRow && eventIdForRow
                      ? (judgeContestLevelCountsByJudgeEvent.get(`${judgeIdForRow}::${eventIdForRow}`)?.count || 0)
                      : 0
                  const hasContestLevelWarning = activeTab === 'judges' && contestLevelCountInEvent > 1
                  const isGroupedContestRow = Array.isArray(assignment._groupedIds)

                  return (
                    <tr
                      key={assignment.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 ${optimisticClass} ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                          checked={isSelected}
                          onChange={() => handleSelectRow(assignment.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{personName}</div>
                        {personSub && <div className="text-xs text-indigo-600 dark:text-indigo-400">{personSub}</div>}
                        {hasContestLevelWarning && (
                          <div className="text-xs text-amber-600 dark:text-amber-300">
                            {contestLevelCountInEvent} contest-level assignments in this event
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {getAssignmentLevel(assignment)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {assignment.category?.name ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {assignment.contest?.name ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {assignment.event?.name ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(assignment.assignedAt || assignment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {assignment._deleting ? (
                          <span className="text-xs text-gray-500">Removing...</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {!isGroupedContestRow && (
                              <button
                                onClick={() => handleEditAssignment(assignment)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                                title="Edit assignment"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveSingle(assignment)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50"
                              title={isGroupedContestRow ? 'Remove all assignments for this person in this contest' : 'Remove assignment'}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ResponsiveTable>
        </Card>
      )}

      {/* New Assignment Modal */}
      {isFormOpen && (
        <div className="cgr-modal-overlay">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  New {getTabLabel(activeTab)} Assignment
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tenant Selector (SUPER_ADMIN only) */}
                {isSuperAdmin && (
                  <div>
                    <label htmlFor="pages-assignmentspage-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Filter by Tenant
                    </label>
                    <select id="pages-assignmentspage-2"
                      value={selectedTenantId}
                      onChange={(e) => {
                        setSelectedTenantId(e.target.value)
                        setFormData(prev => ({ ...prev, personIds: [] }))
                      }}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">All tenants</option>
                      {sortedTenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Person Multi-Select */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="pages-assignmentspage-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getTabLabel(activeTab)}(s) *{' '}
                      <span className="text-xs font-normal text-gray-500">({formData.personIds.length} selected)</span>
                    </label>
                    {people.length > 0 && (
                      <button type="button" onClick={selectAllPeople} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                        {people.every((p: any) => formData.personIds.includes(p.id)) ? 'Deselect all' : 'Select all'}
                      </button>
                    )}
                  </div>
                  {people.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                      No {getTabLabel(activeTab).toLowerCase()}s available — create users with the {getTabLabel(activeTab)} role first
                    </p>
                  ) : (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                      {people.map((person: any) => (
                        <label htmlFor="pages-assignmentspage-3" key={person.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                            checked={formData.personIds.includes(person.id)}
                            onChange={() => togglePersonId(person.id)}
                          />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {person.name}
                            {activeTab === 'judges' && person.isHeadJudge ? ' (Head Judge)' : ''}
                            {activeTab === 'contestants' && person.contestantNumber ? ` (#${person.contestantNumber})` : ''}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assignment Level */}
                <div>
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assignment Level *
                  </span>
                  <select id="pages-assignmentspage-3"
                    value={formData.assignmentLevel}
                    onChange={(e) => setFormData({ ...formData, assignmentLevel: e.target.value as any, contestId: '', categoryId: '' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {getAvailableLevels().map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>

                {/* Event Selection */}
                <div>
                  <label htmlFor="pages-assignmentspage-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event *</label>
                  <select id="pages-assignmentspage-4"
                    value={formData.eventId}
                    onChange={(e) => setFormData({ ...formData, eventId: e.target.value, contestId: '', categoryId: '' })}
                    required
                    disabled={isLoadingEvents}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">{isLoadingEvents ? 'Loading...' : events.length === 0 ? 'No events available' : 'Select an event...'}</option>
                    {sortedEvents.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
                  </select>
                </div>

                {/* Contest Selection */}
                {(formData.assignmentLevel === 'contest' || formData.assignmentLevel === 'category') && formData.eventId && (
                  <div>
                    <label htmlFor="pages-assignmentspage-5" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contest *</label>
                    <select id="pages-assignmentspage-5"
                      value={formData.contestId}
                      onChange={(e) => setFormData({ ...formData, contestId: e.target.value, categoryId: '' })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">{contests.length === 0 ? 'No contests in this event' : 'Select a contest...'}</option>
                      {sortedContests.map(contest => <option key={contest.id} value={contest.id}>{contest.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Category Selection */}
                {formData.assignmentLevel === 'category' && formData.contestId && (
                  <div>
                    <label htmlFor="pages-assignmentspage-6" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                    <select id="pages-assignmentspage-6"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">{categories.length === 0 ? 'No categories in this contest' : 'Select a category...'}</option>
                      {sortedCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAnyMutationLoading || formData.personIds.length === 0}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAnyMutationLoading
                      ? 'Assigning...'
                      : `Assign ${formData.personIds.length > 1 ? `${formData.personIds.length} people` : getTabLabel(activeTab)}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <div className="cgr-modal-overlay">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Assignment</h2>
                <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{getTabLabel(activeTab)}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {activeTab === 'judges' ? (editingAssignment as JudgeAssignment).judge?.name :
                   activeTab === 'contestants' ? (editingAssignment as ContestantAssignment).contestant?.name :
                   (editingAssignment as TallyMasterAssignment).user?.name}
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {activeTab === 'judges' || activeTab === 'contestants'
                    ? 'Select a new category to reassign to:'
                    : 'Select the new assignment scope:'}
                </p>

                <div>
                  <label htmlFor="pages-assignmentspage-7" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event</label>
                  <select id="pages-assignmentspage-7"
                    value={editEventId}
                    onChange={(e) => { setEditEventId(e.target.value); setEditContestId(''); setEditCategoryId('') }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">{events.length === 0 ? 'No events' : 'Select an event...'}</option>
                    {sortedEvents.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
                  </select>
                </div>

                {editEventId && (
                  <div>
                    <label htmlFor="pages-assignmentspage-8" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contest {(activeTab === 'tally-masters' || activeTab === 'auditors') ? '(or leave blank for event-level)' : '*'}
                    </label>
                    <select id="pages-assignmentspage-8"
                      value={editContestId}
                      onChange={(e) => { setEditContestId(e.target.value); setEditCategoryId('') }}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">{editContests.length === 0 ? 'No contests in this event' : (activeTab === 'tally-masters' || activeTab === 'auditors') ? '— Event level —' : 'Select a contest...'}</option>
                      {sortedEditContests.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                {editContestId && (
                  <div>
                    <label htmlFor="pages-assignmentspage-9" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category {(activeTab === 'tally-masters' || activeTab === 'auditors') ? '(or leave blank for contest-level)' : '*'}
                    </label>
                    <select id="pages-assignmentspage-9"
                      value={editCategoryId}
                      onChange={(e) => setEditCategoryId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">{editCategories.length === 0 ? 'No categories' : (activeTab === 'tally-masters' || activeTab === 'auditors') ? '— Contest level —' : 'Select a category...'}</option>
                      {sortedEditCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={closeEditModal} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => editSaveMutation.mutate()}
                    disabled={
                      editSaveMutation.isLoading ||
                      !editEventId ||
                      ((activeTab === 'judges' || activeTab === 'contestants') && !editCategoryId)
                    }
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {editSaveMutation.isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssignmentsPage
