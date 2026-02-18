import React, { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { scoringAPI } from '../services/api'
import { useOptimisticMutation } from '../hooks'
import { getOptimisticRowClass } from '../components/ui'
import { Button, Card, PageHeader, ResponsiveTable } from '../components/ui'
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
  contest?: { id: string; name: string }
  contestants?: Array<{
    id: string
    name: string
    contestantNumber: number | null
  }>
}

const DeductionsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<string>('ALL')
  const [showApproveModal, setShowApproveModal] = useState<Deduction | null>(null)
  const [showRejectModal, setShowRejectModal] = useState<Deduction | null>(null)
  const [signature, setSignature] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedContestId, setSelectedContestId] = useState('')
  const [selectedContestantId, setSelectedContestantId] = useState('')
  const [requestAmount, setRequestAmount] = useState('')
  const [requestReason, setRequestReason] = useState('')
  const [requestScope, setRequestScope] = useState<'CATEGORY' | 'GENERAL'>('CATEGORY')

  // Fetch deductions using react-query
  const { data: deductions = [], isLoading, error } = useQuery<Deduction[]>(
    'deductions',
    async () => {
      const response = await scoringAPI.getDeductions()
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

  const createRequestMutation = useOptimisticMutation<
    unknown,
    { categoryId?: string; contestId?: string; contestantId: string; amount: number; reason: string; scope?: 'GENERAL' | 'CATEGORY' }
  >({
    mutationFn: async (data) => scoringAPI.requestDeduction(data),
    queryKey: ['deductions'],
    updateFn: (oldData, vars) => {
      const deds = oldData as Deduction[] | undefined
      if (!deds) return deds as any
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
            name: (
              scoringCategories
                .find((c) => c.id === vars.categoryId || c.contestId === vars.contestId)
                ?.contestants?.find((contestant) => contestant.id === vars.contestantId)?.name
            ) || 'Contestant',
            contestantNumber: (
              scoringCategories
                .find((c) => c.id === vars.categoryId || c.contestId === vars.contestId)
                ?.contestants?.find((contestant) => contestant.id === vars.contestantId)?.contestantNumber ?? null
            ),
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
      setSelectedCategoryId('')
      setSelectedContestId('')
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
    queryKey: ['deductions'],
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
    queryKey: ['deductions'],
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

  const canApprove = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'AUDITOR', 'BOARD'].includes(user?.role || '')
  const canInitiate = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'TALLY_MASTER', 'AUDITOR', 'BOARD', 'JUDGE'].includes(user?.role || '')
  const selectedCategory = scoringCategories.find((c) => c.id === selectedCategoryId)
  const contestOptions = Array.from(
    new Map(
      scoringCategories
        .filter((c) => c.contestId)
        .map((c) => [c.contestId!, { id: c.contestId!, name: c.contest?.name || `Contest ${c.contestId}` }])
    ).values()
  )
  const availableContestants = requestScope === 'GENERAL'
    ? scoringCategories.find((c) => c.contestId === selectedContestId)?.contestants || []
    : selectedCategory?.contestants || []

  const submitRequest = () => {
    const amount = Number(requestAmount)
    if ((!selectedCategoryId && requestScope === 'CATEGORY') || (!selectedContestId && requestScope === 'GENERAL') || !selectedContestantId || !amount || amount <= 0 || !requestReason.trim()) {
      toast.error('Scope, target, contestant, amount, and reason are required')
      return
    }
    createRequestMutation.mutate({
      categoryId: requestScope === 'CATEGORY' ? selectedCategoryId : undefined,
      contestId: requestScope === 'GENERAL' ? selectedContestId : undefined,
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

        {error && (
          <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{String(error)}</p>
          </Card>
        )}

        {canInitiate && (
          <Card className="mb-6 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Request Deduction</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <select
                value={requestScope}
                onChange={(e) => {
                  setRequestScope(e.target.value as 'CATEGORY' | 'GENERAL')
                  setSelectedContestId('')
                  setSelectedCategoryId('')
                  setSelectedContestantId('')
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="CATEGORY">Category deduction</option>
                <option value="GENERAL">General (contest-level)</option>
              </select>
              {requestScope === 'GENERAL' ? (
                <select
                  value={selectedContestId}
                  onChange={(e) => {
                    setSelectedContestId(e.target.value)
                    setSelectedContestantId('')
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="">Select contest</option>
                  {contestOptions.map((contest) => (
                    <option key={contest.id} value={contest.id}>{contest.name}</option>
                  ))}
                </select>
              ) : (
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value)
                  setSelectedContestantId('')
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">Select category</option>
                {scoringCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              )}
              <select
                value={selectedContestantId}
                onChange={(e) => setSelectedContestantId(e.target.value)}
                disabled={requestScope === 'GENERAL' ? !selectedContestId : !selectedCategoryId}
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
                No deductions {filter !== 'ALL' && filter.toLowerCase()}
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
                    {canApprove && (
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
                        {canApprove && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {deduction.status === 'PENDING' && !deduction._optimistic && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setShowApproveModal(deduction)}
                                  disabled={approveMutation.isLoading || rejectMutation.isLoading}
                                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors disabled:opacity-50"
                                  title="Approve"
                                >
                                  <CheckCircleIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => setShowRejectModal(deduction)}
                                  disabled={approveMutation.isLoading || rejectMutation.isLoading}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors disabled:opacity-50"
                                  title="Reject"
                                >
                                  <XCircleIcon className="h-5 w-5" />
                                </button>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Signature
                </label>
                <input
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl mx-4 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Reject Deduction
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason for Rejection
                </label>
                <textarea
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
