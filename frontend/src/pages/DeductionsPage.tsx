import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import useAuthPermissions from '../hooks/useAuthPermissions'
import { scoringAPI } from '../services/api'
import { useOptimisticMutation } from '../hooks'
import { getOptimisticRowClass } from '../components/ui'
import { Button, Card, PageHeader, ResponsiveTable } from '../components/ui'
import { hasPermissionAction, permissionSetFromList } from '../utils/pageAccess'
import {
  MinusCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { safeFormatDate } from '../utils/dateUtils'

interface Deduction {
  id: string
  categoryId: string
  category: {
    id: string
    name: string
  }
  contestantId: string
  contestant: {
    id: string
    contestantNumber: number | null
    name: string
  }
  points: number
  amount?: number
  reason: string
  requestedBy: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvals?: Array<{
    id: string
    approvedById: string
    role: string
    approvedAt: string
  }>
  approvalState?: {
    hasInitiatorCertification: boolean
    additionalApprovals: number
    requiredAdditionalApprovals: number
    approvalsTotal: number
    readyForApproval: boolean
  }
  approvedBy?: string
  rejectionReason?: string
  createdAt: string
  _optimistic?: boolean
}

interface ScoringCategory {
  id: string
  name: string
  contestId?: string
  contest?: {
    id: string
    name: string
    event?: {
      id: string
      name: string
    }
  }
  contestants?: Array<{
    id: string
    name: string
    contestantNumber: number | null
  }>
}

interface ScoringEvent {
  id: string
  name: string
}

interface ContestOption {
  id: string
  name: string
  eventId?: string
}

const DeductionsPage: React.FC = () => {
  const { user } = useAuth()
  const { data: permissionsPayload } = useAuthPermissions({ enabled: Boolean(user) })
  const [filter, setFilter] = useState<string>('ALL')
  const [showApproveModal, setShowApproveModal] = useState<Deduction | null>(null)
  const [showRejectModal, setShowRejectModal] = useState<Deduction | null>(null)
  const [signature, setSignature] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedRequestContestId, setSelectedRequestContestId] = useState('')
  const [selectedRequestCategoryId, setSelectedRequestCategoryId] = useState('')
  const [selectedContestantId, setSelectedContestantId] = useState('')
  const [selectedFilterContestId, setSelectedFilterContestId] = useState('')
  const [selectedFilterCategoryId, setSelectedFilterCategoryId] = useState('')
  const [requestAmount, setRequestAmount] = useState('')
  const [requestReason, setRequestReason] = useState('')
  const [requestScope, setRequestScope] = useState<'CATEGORY' | 'GENERAL'>('CATEGORY')
  const deductionsQueryKey = ['deductions', selectedEventId, selectedFilterContestId, selectedFilterCategoryId]

  // Fetch deductions using react-query
  const { data: deductions = [], isLoading, error } = useQuery<Deduction[]>(
    deductionsQueryKey,
    async () => {
      const response = await scoringAPI.getDeductions({
        eventId: selectedEventId || undefined,
        contestId: selectedFilterContestId || undefined,
        categoryId: selectedFilterCategoryId || undefined,
      })
      const unwrapped = response.data?.data || response.data
      const rows = Array.isArray(unwrapped?.data)
        ? unwrapped.data
        : Array.isArray(unwrapped)
          ? unwrapped
          : []
      return rows.map((row: any) => ({
        ...row,
        points: row.points ?? row.amount ?? 0,
      }))
    },
    {
      retry: 1,
      onError: (err) => console.error('Failed to fetch deductions:', err),
    }
  )

  const { data: scoringCategories = [] } = useQuery<ScoringCategory[]>(
    ['deduction-categories', user?.id],
    async () => {
      const response = await scoringAPI.getCategories()
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { retry: 1 }
  )

  const availableEvents = useMemo<ScoringEvent[]>(() => {
    const map = new Map<string, ScoringEvent>()
    scoringCategories.forEach((category) => {
      const event = category.contest?.event
      if (event?.id) {
        map.set(event.id, {
          id: event.id,
          name: event.name || 'Event',
        })
      }
    })
    return Array.from(map.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [scoringCategories])

  const scopedCategories = useMemo(() => {
    return scoringCategories.filter((category) => {
      const categoryEventId = category.contest?.event?.id || ''
      if (selectedEventId && categoryEventId !== selectedEventId) return false
      return true
    })
  }, [scoringCategories, selectedEventId])

  const contestOptions = useMemo<ContestOption[]>(() => {
    return Array.from(
      new Map(
        scopedCategories
          .filter((category) => category.contestId)
          .map((category) => [
            category.contestId!,
            {
              id: category.contestId!,
              name: category.contest?.name || `Contest ${category.contestId}`,
              eventId: category.contest?.event?.id,
            },
          ])
      ).values()
    ).sort((left, right) => left.name.localeCompare(right.name))
  }, [scopedCategories])

  const requestCategoryOptions = useMemo(
    () =>
      scopedCategories.filter((category) => category.contestId === selectedRequestContestId),
    [scopedCategories, selectedRequestContestId]
  )

  const filterCategoryOptions = useMemo(
    () =>
      scopedCategories.filter((category) => category.contestId === selectedFilterContestId),
    [scopedCategories, selectedFilterContestId]
  )

  const selectedCategory = requestCategoryOptions.find(
    (category) => category.id === selectedRequestCategoryId
  )

  const availableContestants = useMemo(() => {
    const map = new Map<string, { id: string; name: string; contestantNumber: number | null }>()

    if (requestScope === 'GENERAL') {
      scopedCategories
        .filter((category) => category.contestId === selectedRequestContestId)
        .forEach((category) => {
          category.contestants?.forEach((contestant) => {
            if (contestant.id) {
              map.set(contestant.id, contestant)
            }
          })
        })
    } else if (selectedCategory?.contestants) {
      selectedCategory.contestants.forEach((contestant) => {
        if (contestant.id) {
          map.set(contestant.id, contestant)
        }
      })
    }

    return Array.from(map.values()).sort((left, right) => {
      const leftNumber = left.contestantNumber ?? Number.MAX_SAFE_INTEGER
      const rightNumber = right.contestantNumber ?? Number.MAX_SAFE_INTEGER
      if (leftNumber !== rightNumber) return leftNumber - rightNumber
      return left.name.localeCompare(right.name)
    })
  }, [requestScope, scopedCategories, selectedRequestContestId, selectedCategory])

  const findContestantById = (contestantId: string) => {
    return scopedCategories
      .flatMap((category) => category.contestants || [])
      .find((contestant) => contestant.id === contestantId)
  }

  useEffect(() => {
    if (availableEvents.length === 1 && !selectedEventId) {
      setSelectedEventId(availableEvents[0].id)
      return
    }

    if (selectedEventId && !availableEvents.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(availableEvents.length === 1 ? availableEvents[0].id : '')
      setSelectedRequestContestId('')
      setSelectedRequestCategoryId('')
      setSelectedContestantId('')
      setSelectedFilterContestId('')
      setSelectedFilterCategoryId('')
    }
  }, [availableEvents, selectedEventId])

  useEffect(() => {
    if (
      selectedRequestCategoryId &&
      !requestCategoryOptions.some((category) => category.id === selectedRequestCategoryId)
    ) {
      setSelectedRequestCategoryId('')
      setSelectedContestantId('')
    }
  }, [requestCategoryOptions, selectedRequestCategoryId])

  useEffect(() => {
    if (
      selectedRequestContestId &&
      !contestOptions.some((contest) => contest.id === selectedRequestContestId)
    ) {
      setSelectedRequestContestId('')
      setSelectedRequestCategoryId('')
      setSelectedContestantId('')
    }
  }, [contestOptions, selectedRequestContestId])

  useEffect(() => {
    if (
      selectedFilterContestId &&
      !contestOptions.some((contest) => contest.id === selectedFilterContestId)
    ) {
      setSelectedFilterContestId('')
      setSelectedFilterCategoryId('')
    }
  }, [contestOptions, selectedFilterContestId])

  useEffect(() => {
    if (
      selectedFilterCategoryId &&
      !filterCategoryOptions.some((category) => category.id === selectedFilterCategoryId)
    ) {
      setSelectedFilterCategoryId('')
    }
  }, [filterCategoryOptions, selectedFilterCategoryId])

  useEffect(() => {
    if (selectedContestantId && !availableContestants.some((contestant) => contestant.id === selectedContestantId)) {
      setSelectedContestantId('')
    }
  }, [availableContestants, selectedContestantId])

  const createRequestMutation = useOptimisticMutation<
    unknown,
    { categoryId?: string; contestId?: string; contestantId: string; amount: number; reason: string; scope?: 'GENERAL' | 'CATEGORY' }
  >({
    mutationFn: async (data) => scoringAPI.requestDeduction(data),
    queryKey: deductionsQueryKey,
    updateFn: (oldData, vars) => {
      const deds = oldData as Deduction[] | undefined
      if (!deds) return deds as any
      if (selectedFilterContestId && vars.contestId !== selectedFilterContestId) {
        return deds
      }
      if (selectedFilterCategoryId && vars.categoryId !== selectedFilterCategoryId) {
        return deds
      }
      return [
        {
          id: `optimistic-${Date.now()}`,
          categoryId: vars.categoryId || 'general',
          category: {
            id: vars.categoryId || 'general',
            name: vars.scope === 'GENERAL'
              ? `General (${contestOptions.find((c) => c.id === vars.contestId)?.name || 'Contest'})`
              : (scoringCategories.find((c) => c.id === vars.categoryId)?.name || 'Category'),
          },
          contestantId: vars.contestantId,
          contestant: {
            id: vars.contestantId,
            name: findContestantById(vars.contestantId)?.name || 'Contestant',
            contestantNumber: findContestantById(vars.contestantId)?.contestantNumber ?? null,
          },
          points: vars.amount,
          reason: vars.reason,
          requestedBy: user?.id || '',
          status: 'PENDING' as const,
          createdAt: new Date().toISOString(),
          _optimistic: true,
        },
        ...deds,
      ]
    },
    onSuccess: () => {
      toast.success('Deduction request submitted')
      setSelectedRequestCategoryId('')
      setSelectedRequestContestId('')
      setSelectedContestantId('')
      setRequestAmount('')
      setRequestReason('')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to submit deduction request')
    },
    invalidateOnSettled: true,
  })

  // Approve mutation with optimistic updates
  const approveMutation = useOptimisticMutation<
    unknown,
    { id: string; signature: string }
  >({
    mutationFn: async ({ id, signature }) => {
      return await scoringAPI.approveDeduction(id, signature)
    },
    queryKey: deductionsQueryKey,
    updateFn: (oldData, { id }) => {
      const deds = oldData as Deduction[] | undefined
      if (!deds) return []
      return deds.map((d) =>
        d.id === id
          ? { ...d, status: 'APPROVED' as const, _optimistic: true }
          : d
      )
    },
    onSuccess: () => {
      setShowApproveModal(null)
      setSignature('')
      toast.success('Deduction approved successfully')
    },
    onError: (error) => {
      console.error('Failed to approve deduction:', error)
      toast.error('Failed to approve deduction')
    },
    invalidateOnSettled: true,
  })

  // Reject mutation with optimistic updates
  const rejectMutation = useOptimisticMutation<
    unknown,
    { id: string; reason: string }
  >({
    mutationFn: async ({ id, reason }) => {
      return await scoringAPI.rejectDeduction(id, reason)
    },
    queryKey: deductionsQueryKey,
    updateFn: (oldData, { id }) => {
      const deds = oldData as Deduction[] | undefined
      if (!deds) return []
      return deds.map((d) =>
        d.id === id
          ? { ...d, status: 'REJECTED' as const, _optimistic: true }
          : d
      )
    },
    onSuccess: () => {
      setShowRejectModal(null)
      setRejectionReason('')
      toast.success('Deduction rejected')
    },
    onError: (error) => {
      console.error('Failed to reject deduction:', error)
      toast.error('Failed to reject deduction')
    },
    invalidateOnSettled: true,
  })

  const handleApprove = (id: string) => {
    if (!signature.trim()) {
      toast.error('Signature is required')
      return
    }
    approveMutation.mutate({ id, signature })
  }

  const handleReject = (id: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required')
      return
    }
    rejectMutation.mutate({ id, reason: rejectionReason })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'REJECTED':
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'REJECTED':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
    }
  }

  const filteredDeductions = deductions.filter(d => filter === 'ALL' || d.status === filter)
  const permissionSet = useMemo(
    () => permissionSetFromList(permissionsPayload?.permissions || []),
    [permissionsPayload?.permissions]
  )
  const canApprove = hasPermissionAction(permissionSet, 'deductions:approve')
  const canReject = hasPermissionAction(permissionSet, 'deductions:reject')
  const canInitiate = hasPermissionAction(permissionSet, 'deductions:create')
  const isScopedWorkflowRole = ['BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE'].includes(user?.role || '')

  const submitRequest = () => {
    const amount = Number(requestAmount)
    if (
      !selectedRequestContestId ||
      (requestScope === 'CATEGORY' && !selectedRequestCategoryId) ||
      !selectedContestantId ||
      !amount ||
      amount <= 0 ||
      !requestReason.trim()
    ) {
      toast.error('Scope, target, contestant, amount, and reason are required')
      return
    }
    createRequestMutation.mutate({
      categoryId: requestScope === 'CATEGORY' ? selectedRequestCategoryId : undefined,
      contestId: selectedRequestContestId,
      contestantId: selectedContestantId,
      amount,
      reason: requestReason.trim(),
      scope: requestScope,
    })
  }

  if (isLoading) {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center text-gray-600 dark:text-gray-400">Loading deductions...</Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container">
        <PageHeader
          title="Score Deductions"
          subtitle="Manage and approve score deduction requests"
        />

        {availableEvents.length > 1 && (
          <Card className="mb-6 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scope</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Narrow deductions, contests, categories, and contestants by event.
                </p>
              </div>
              <div className="md:col-span-2">
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value)
                    setSelectedRequestContestId('')
                    setSelectedRequestCategoryId('')
                    setSelectedContestantId('')
                    setSelectedFilterContestId('')
                    setSelectedFilterCategoryId('')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="">All events</option>
                  {availableEvents.map((event) => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        )}

        {error && (
          <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{String(error)}</p>
          </Card>
        )}

        {canInitiate && (
          <Card className="mb-6 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Request Deduction</h2>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <select
                value={requestScope}
                onChange={(e) => {
                  setRequestScope(e.target.value as 'CATEGORY' | 'GENERAL')
                  setSelectedRequestContestId('')
                  setSelectedRequestCategoryId('')
                  setSelectedContestantId('')
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="CATEGORY">Category deduction</option>
                <option value="GENERAL">General (contest-level)</option>
              </select>
              <select
                value={selectedRequestContestId}
                onChange={(e) => {
                  setSelectedRequestContestId(e.target.value)
                  setSelectedRequestCategoryId('')
                  setSelectedContestantId('')
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">Select contest</option>
                {contestOptions.map((contest) => (
                  <option key={contest.id} value={contest.id}>{contest.name}</option>
                ))}
              </select>
              {requestScope === 'GENERAL' ? (
                <div className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
                  General deduction applies to the selected contest.
                </div>
              ) : (
                <select
                  value={selectedRequestCategoryId}
                  onChange={(e) => {
                    setSelectedRequestCategoryId(e.target.value)
                    setSelectedContestantId('')
                  }}
                  disabled={!selectedRequestContestId}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="">
                    {selectedRequestContestId ? 'Select category' : 'Select contest first'}
                  </option>
                  {requestCategoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              )}
              <select
                value={selectedContestantId}
                onChange={(e) => setSelectedContestantId(e.target.value)}
                disabled={
                  requestScope === 'GENERAL'
                    ? !selectedRequestContestId
                    : !selectedRequestContestId || !selectedRequestCategoryId
                }
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">Select contestant</option>
                {availableContestants?.map((contestant) => (
                  <option key={contestant.id} value={contestant.id}>
                    #{contestant.contestantNumber ?? 'N/A'} - {contestant.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                placeholder="Points"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
              <Button
                onClick={submitRequest}
                disabled={createRequestMutation.isLoading}
              >
                {createRequestMutation.isLoading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
            <textarea
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              rows={2}
              placeholder="Reason for deduction"
              className="mt-3 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </Card>
        )}

        <Card className="mb-6 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">History Filters</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Narrow deduction history by contest before choosing a category.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              value={selectedFilterContestId}
              onChange={(e) => {
                setSelectedFilterContestId(e.target.value)
                setSelectedFilterCategoryId('')
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">All contests</option>
              {contestOptions.map((contest) => (
                <option key={contest.id} value={contest.id}>{contest.name}</option>
              ))}
            </select>
            <select
              value={selectedFilterCategoryId}
              onChange={(e) => setSelectedFilterCategoryId(e.target.value)}
              disabled={!selectedFilterContestId}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">
                {selectedFilterContestId ? 'All categories' : 'Select contest first'}
              </option>
              {filterCategoryOptions.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'ALL'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All ({deductions.length})
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'PENDING'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Pending ({deductions.filter(d => d.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'APPROVED'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Approved ({deductions.filter(d => d.status === 'APPROVED').length})
          </button>
          <button
            onClick={() => setFilter('REJECTED')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'REJECTED'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Rejected ({deductions.filter(d => d.status === 'REJECTED').length})
          </button>
        </div>

        {/* Deductions List */}
        <Card className="rounded-lg overflow-hidden p-0">
          {filteredDeductions.length === 0 ? (
            <div className="p-12 text-center">
              <MinusCircleIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {deductions.length === 0 && isScopedWorkflowRole
                  ? 'No deductions are available in your current scope. This usually means you do not have active event, contest, or category assignments.'
                  : `No deductions ${filter !== 'ALL' ? filter.toLowerCase() : ''}`.trim()}
              </p>
            </div>
          ) : (
            <ResponsiveTable>
            <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Contestant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Requested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Certifications
                    </th>
                    {(canApprove || canReject) && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDeductions.map((deduction) => {
                    const optimisticClass = getOptimisticRowClass(deduction)
                    return (
                      <tr
                        key={deduction.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 ${optimisticClass}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(deduction.status)}
                            <span className={`px-2 py-1 inline-flex items-center text-xs font-semibold rounded-full ${getStatusColor(deduction.status)}`}>
                              {deduction.status}
                              {deduction._optimistic && (
                                <span className="ml-1 h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {deduction.category.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          #{deduction.contestant.contestantNumber ?? 'N/A'} - {deduction.contestant.name}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                          -{deduction.points}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {deduction.reason}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {safeFormatDate(deduction.createdAt, 'MMM d, h:mm a')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {deduction.approvalState
                            ? `${deduction.approvalState.additionalApprovals}/${deduction.approvalState.requiredAdditionalApprovals} additional`
                            : '0/2 additional'}
                        </td>
                        {(canApprove || canReject) && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {deduction.status === 'PENDING' && !deduction._optimistic && (
                              <div className="flex gap-2">
                                {canApprove && (
                                  <button
                                    onClick={() => setShowApproveModal(deduction)}
                                    disabled={approveMutation.isLoading || rejectMutation.isLoading}
                                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors disabled:opacity-50"
                                    title="Approve"
                                  >
                                    <CheckCircleIcon className="h-5 w-5" />
                                  </button>
                                )}
                                {canReject && (
                                  <button
                                    onClick={() => setShowRejectModal(deduction)}
                                    disabled={approveMutation.isLoading || rejectMutation.isLoading}
                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors disabled:opacity-50"
                                    title="Reject"
                                  >
                                    <XCircleIcon className="h-5 w-5" />
                                  </button>
                                )}
                              </div>
                            )}
                            {deduction._optimistic && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Processing...
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
          </ResponsiveTable>
          )}
        </Card>

        {/* Approve Modal */}
        {showApproveModal && (
          <div className="cgr-modal-overlay">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl mx-4 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Certify Deduction
              </h3>
              <div className="mb-4">
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Deduct <strong>{showApproveModal.points}</strong> point(s) from contestant #{showApproveModal.contestant.contestantNumber}?
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Reason: {showApproveModal.reason}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Progress: {showApproveModal.approvalState?.additionalApprovals ?? 0}/2 additional certifications
                </p>
              </div>
              <div className="mb-4">
                <label htmlFor="pages-deductionspage-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Signature
                </label>
                <input id="pages-deductionspage-1"
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(showApproveModal.id)}
                  disabled={!signature || approveMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {approveMutation.isLoading ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Approving...
                    </>
                  ) : (
                    'Certify'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowApproveModal(null)
                    setSignature('')
                  }}
                  disabled={approveMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="cgr-modal-overlay">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl mx-4 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Reject Deduction
              </h3>
              <div className="mb-4">
                <label htmlFor="pages-deductionspage-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason for Rejection
                </label>
                <textarea id="pages-deductionspage-2"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleReject(showRejectModal.id)}
                  disabled={!rejectionReason || rejectMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {rejectMutation.isLoading ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Rejecting...
                    </>
                  ) : (
                    'Reject'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(null)
                    setRejectionReason('')
                  }}
                  disabled={rejectMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
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

export default DeductionsPage
