import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { useLocation } from 'react-router-dom'
import { assignmentsAPI, categoriesAPI, contestsAPI, scoreGovernanceAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Button, Card, PageHeader, ResponsiveTable } from '../components/ui'

type GovernanceAction = 'THROW_OUT' | 'UNCERTIFY' | 'ADJUST'
type GovernanceScope = 'CATEGORY_JUDGE' | 'CONTEST_JUDGE' | 'SCORE' | 'CONTESTANT_CATEGORY' | 'CATEGORY_LEVEL' | 'CONTEST_LEVEL'
type CertificationLevel = 'JUDGE' | 'TALLY_MASTER' | 'AUDITOR' | 'BOARD'

const ScoreGovernancePage: React.FC = () => {
  const { user } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()

  const [contestId, setContestId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [contestantId, setContestantId] = useState('')

  const [actionType, setActionType] = useState<GovernanceAction>('THROW_OUT')
  const [scopeType, setScopeType] = useState<GovernanceScope>('CONTEST_JUDGE')
  const [targetCertificationLevel, setTargetCertificationLevel] = useState<CertificationLevel>('JUDGE')
  const [judgeId, setJudgeId] = useState('')
  const [scoreId, setScoreId] = useState('')
  const [reason, setReason] = useState('')
  const [adjustmentDelta, setAdjustmentDelta] = useState<string>('0')
  const [typedSignature, setTypedSignature] = useState('')
  const [drawnSignatureData, setDrawnSignatureData] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  const [requiredAdditionalApprovals, setRequiredAdditionalApprovals] = useState(2)
  const [approverRoles, setApproverRoles] = useState<string[]>(['AUDITOR', 'BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'])
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [actionFilter, setActionFilter] = useState<'ALL' | GovernanceAction>('ALL')
  const [showCompleted, setShowCompleted] = useState(true)

  const canConfigure = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'].includes(user?.role || '')
  const canApprove = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'TALLY_MASTER'].includes(user?.role || '')
  const isJudge = user?.role === 'JUDGE'

  const formatScoreWithPossible = (row: any): string => {
    if (row?.score == null) return '-'
    const possible = row?.criterion?.maxScore ?? row?.category?.scoreCap ?? null
    return possible != null ? `${row.score} / ${possible}` : String(row.score)
  }

  const { data: contests = [] } = useQuery('governance-contests', async () => {
    const response = await contestsAPI.getAll()
    const rows = response.data?.data || response.data || []
    return Array.isArray(rows) ? rows : []
  })

  const { data: categories = [] } = useQuery(['governance-categories', contestId], async () => {
    const response = contestId ? await categoriesAPI.getByContest(contestId) : await categoriesAPI.getAll()
    const rows = response.data?.data || response.data || []
    return Array.isArray(rows) ? rows : []
  })

  const { data: reviewRows = [] } = useQuery(['governance-review', contestId, categoryId, contestantId], async () => {
    const response = await scoreGovernanceAPI.getScoreReview({
      contestId: contestId || undefined,
      categoryId: categoryId || undefined,
      contestantId: contestantId || undefined
    })
    const rows = response.data?.data || response.data || []
    return Array.isArray(rows) ? rows : []
  })

  const { data: judgeUsers = [] } = useQuery('governance-judge-users', async () => {
    const response = await assignmentsAPI.getJudges()
    const payload = response.data?.data || response.data
    const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : [])
    return rows
  })

  const { data: requests = [] } = useQuery(['governance-requests', contestId, categoryId, contestantId], async () => {
    const response = await scoreGovernanceAPI.getRequests({
      contestId: contestId || undefined,
      categoryId: categoryId || undefined,
      contestantId: contestantId || undefined
    })
    const rows = response.data?.data || response.data || []
    return Array.isArray(rows) ? rows : []
  })

  useQuery(
    'governance-settings',
    async () => {
      const response = await scoreGovernanceAPI.getSettings()
      const data = response.data?.data || response.data
      if (data) {
        setRequiredAdditionalApprovals(Number(data.requiredAdditionalApprovals || 2))
        if (Array.isArray(data.approverRoles)) setApproverRoles(data.approverRoles)
      }
      return data
    },
    { enabled: canConfigure }
  )

  useEffect(() => {
    if (isJudge) {
      setActionType('UNCERTIFY')
      setScopeType('CONTESTANT_CATEGORY')
    }
  }, [isJudge])

  useEffect(() => {
    if (isJudge) return
    if (actionType === 'THROW_OUT' && !['CATEGORY_JUDGE', 'CONTEST_JUDGE'].includes(scopeType)) {
      setScopeType('CONTEST_JUDGE')
    }
    if (actionType === 'UNCERTIFY' && !['SCORE', 'CONTESTANT_CATEGORY', 'CATEGORY_LEVEL'].includes(scopeType)) {
      setScopeType('CONTESTANT_CATEGORY')
    }
    if (actionType === 'ADJUST' && !['CATEGORY_LEVEL', 'CONTEST_LEVEL'].includes(scopeType)) {
      setScopeType('CATEGORY_LEVEL')
    }
  }, [actionType, isJudge, scopeType])

  useEffect(() => {
    if (!reason.trim()) {
      if (actionType === 'THROW_OUT') {
        setReason('Requesting throw-out due to scoring irregularity.')
      } else if (actionType === 'ADJUST') {
        setReason('Requesting score adjustment after review calibration.')
      } else {
        setReason('Requesting un-certification for review.')
      }
    }
  }, [actionType, reason])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const queryAction = (params.get('action') || '').toUpperCase()
    const queryScope = (params.get('scope') || '').toUpperCase()
    const queryContestId = params.get('contestId') || ''
    const queryCategoryId = params.get('categoryId') || ''
    const queryContestantId = params.get('contestantId') || ''
    const queryScoreId = params.get('scoreId') || ''

    if (queryAction === 'THROW_OUT' || queryAction === 'UNCERTIFY' || queryAction === 'ADJUST') {
      setActionType(queryAction)
    }
    if (queryScope && ['CATEGORY_JUDGE', 'CONTEST_JUDGE', 'SCORE', 'CONTESTANT_CATEGORY', 'CATEGORY_LEVEL', 'CONTEST_LEVEL'].includes(queryScope)) {
      setScopeType(queryScope as GovernanceScope)
    }
    if (queryContestId) setContestId(queryContestId)
    if (queryCategoryId) setCategoryId(queryCategoryId)
    if (queryContestantId) setContestantId(queryContestantId)
    if (queryScoreId) setScoreId(queryScoreId)
  }, [location.search])

  const contestants = useMemo(() => {
    const map = new Map<string, { id: string; name: string; contestantNumber?: number | null }>()
    reviewRows.forEach((row: any) => {
      if (row.contestant?.id) map.set(row.contestant.id, row.contestant)
    })
    return Array.from(map.values())
  }, [reviewRows])

  const requestStats = useMemo(() => {
    const total = requests.length
    const pending = requests.filter((r: any) => r.status === 'PENDING').length
    const approved = requests.filter((r: any) => r.status === 'APPROVED').length
    const rejected = requests.filter((r: any) => r.status === 'REJECTED').length
    return { total, pending, approved, rejected }
  }, [requests])

  const approverIdsForRequest = (request: any): string[] => (request.approvals || []).map((a: any) => a.approvedById).filter(Boolean)
  const normalizeRoleLabel = (role?: string | null, boardRole?: string | null): string => {
    if (!role) return 'Unknown Role'
    if (role === 'BOARD' && boardRole) return `BOARD (${boardRole})`
    return role
  }
  const requestorLabel = (request: any): string => {
    const requestorName = request.requestedBy?.name || request.requestedBy?.email || request.requestedById || 'Unknown Requestor'
    const requestorRole = normalizeRoleLabel(request.requestedBy?.role || request.requesterRole, request.requestedBy?.boardRole || request.requesterBoardRoleSnapshot)
    return `${requestorName} - ${requestorRole}`
  }
  const additionalApproverRows = (request: any): any[] => {
    const requesterId = request.requestedBy?.id || request.requestedById || null
    return (request.approvals || []).filter((approval: any) => {
      if (!requesterId || !approval.approvedById) return true
      return approval.approvedById !== requesterId
    })
  }

  const canCurrentUserApprove = (request: any) => {
    if (!canApprove || request.status !== 'PENDING' || !user) return false
    if (request.requestedById === user.id) return false
    const approverIds = new Set(approverIdsForRequest(request))
    return !approverIds.has(user.id)
  }

  const pendingForMyAction = useMemo(() => {
    return requests.filter((request: any) => canCurrentUserApprove(request))
  }, [requests, canApprove, user])

  const filteredRequests = useMemo(() => {
    return requests.filter((request: any) => {
      if (statusFilter !== 'ALL' && request.status !== statusFilter) return false
      if (actionFilter !== 'ALL' && request.actionType !== actionFilter) return false
      if (!showCompleted && request.status !== 'PENDING') return false
      return true
    })
  }, [requests, statusFilter, actionFilter, showCompleted])

  const judges = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email?: string }>()
    reviewRows.forEach((row: any) => {
      if (row.judge?.id) map.set(row.judge.id, row.judge)
    })
    judgeUsers.forEach((judge: any) => {
      if (judge.id) {
        map.set(judge.id, {
          id: judge.id,
          name: judge.name || judge.email || 'Judge',
          email: judge.email || undefined
        })
      }
    })
    return Array.from(map.values())
  }, [reviewRows, judgeUsers])

  useEffect(() => {
    if (!typedSignature.trim() && user) {
      setTypedSignature(user.name || user.email || '')
    }
  }, [typedSignature, user])

  useEffect(() => {
    if ((scopeType === 'CATEGORY_JUDGE' || scopeType === 'CONTEST_JUDGE') && !judgeId && judges.length > 0) {
      setJudgeId(judges[0].id)
    }
  }, [scopeType, judgeId, judges])

  const createMutation = useMutation((payload: any) => scoreGovernanceAPI.createRequest(payload), {
    onSuccess: async () => {
      toast.success('Governance request submitted')
      setReason('')
      setScoreId('')
      setJudgeId('')
      await queryClient.invalidateQueries('governance-requests')
      await queryClient.invalidateQueries('governance-review')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Failed to submit request')
    }
  })

  const approveMutation = useMutation(({ id, signature }: { id: string; signature: any }) => scoreGovernanceAPI.approveRequest(id, signature), {
    onSuccess: async () => {
      toast.success('Certification recorded')
      await queryClient.invalidateQueries('governance-requests')
      await queryClient.invalidateQueries('governance-review')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Approval failed')
    }
  })

  const rejectMutation = useMutation(({ id, reason }: { id: string; reason: string }) => scoreGovernanceAPI.rejectRequest(id, reason), {
    onSuccess: async () => {
      toast.success('Request rejected')
      await queryClient.invalidateQueries('governance-requests')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Reject failed')
    }
  })

  const saveSettingsMutation = useMutation(
    'governance-settings-save',
    async () => scoreGovernanceAPI.updateSettings({ requiredAdditionalApprovals, approverRoles }),
    {
      onSuccess: () => {
        toast.success('Settings updated')
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Failed to update settings')
      }
    }
  )

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // no-op
    }
    setIsDrawing(true)
  }

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1f2937'
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = (event?: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (canvas) setDrawnSignatureData(canvas.toDataURL('image/png'))
    if (event) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // no-op
      }
    }
    setIsDrawing(false)
  }

  const clearDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setDrawnSignatureData('')
  }

  const submitRequest = () => {
    if (!reason.trim()) {
      toast.error('Reason is required')
      return
    }

    if (!typedSignature.trim() && !drawnSignatureData.trim()) {
      toast.error('Typed or drawn signature is required')
      return
    }

    if (actionType === 'ADJUST') {
      const delta = Number(adjustmentDelta)
      if (!Number.isFinite(delta) || delta === 0) {
        toast.error('Adjustment amount must be a non-zero number')
        return
      }
    }

    createMutation.mutate({
      actionType,
      scopeType,
      targetCertificationLevel: scopeType === 'CATEGORY_LEVEL' ? targetCertificationLevel : undefined,
      contestId: contestId || undefined,
      categoryId: categoryId || undefined,
      contestantId: contestantId || undefined,
      judgeId: judgeId || undefined,
      scoreId: scoreId || undefined,
      adjustmentDelta: actionType === 'ADJUST' ? Number(adjustmentDelta) : undefined,
      reason,
      typedSignature: typedSignature.trim() || undefined,
      drawnSignatureData: drawnSignatureData || undefined
    })
  }

  const allApproverRoles = ['TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN']

  return (
    <div className="cgr-page-container space-y-6">
      <PageHeader
        title="Score Review & Governance"
        subtitle="Queue-first governance workspace for throw-outs, un-certifications, and score adjustments."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-lg p-4">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Total Requests</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{requestStats.total}</p>
        </Card>
        <Card className="rounded-lg p-4 border-yellow-200 dark:border-yellow-700">
          <p className="text-xs uppercase text-yellow-700 dark:text-yellow-300">Pending</p>
          <p className="text-2xl font-semibold text-yellow-700 dark:text-yellow-300">{requestStats.pending}</p>
        </Card>
        <Card className="rounded-lg p-4 border-green-200 dark:border-green-700">
          <p className="text-xs uppercase text-green-700 dark:text-green-300">Approved</p>
          <p className="text-2xl font-semibold text-green-700 dark:text-green-300">{requestStats.approved}</p>
        </Card>
        <Card className="rounded-lg p-4 border-red-200 dark:border-red-700">
          <p className="text-xs uppercase text-red-700 dark:text-red-300">Rejected</p>
          <p className="text-2xl font-semibold text-red-700 dark:text-red-300">{requestStats.rejected}</p>
        </Card>
      </div>

      <Card className="rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-900 text-sm text-blue-700 dark:text-blue-300">
            Pending My Approval: <span className="font-semibold">{pendingForMyAction.length}</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED')}
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as 'ALL' | GovernanceAction)}
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="ALL">All Actions</option>
            <option value="THROW_OUT">Throw Out</option>
            <option value="UNCERTIFY">Un-certify</option>
            <option value="ADJUST">Adjust</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
            Show Completed
          </label>
        </div>
      </Card>

        <Card className="rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={contestId} onChange={(e) => setContestId(e.target.value)} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            <option value="">All Contests</option>
            {contests.map((contest: any) => <option key={contest.id} value={contest.id}>{contest.name}</option>)}
          </select>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            <option value="">All Categories</option>
            {categories.map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select value={contestantId} onChange={(e) => setContestantId(e.target.value)} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            <option value="">All Contestants</option>
            {contestants.map((contestant) => <option key={contestant.id} value={contestant.id}>#{contestant.contestantNumber ?? 'N/A'} {contestant.name}</option>)}
          </select>
        </div>
        </Card>

        {canConfigure && (
          <Card className="rounded-lg p-4 space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">Governance Safeguards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Required Additional Approvals</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={requiredAdditionalApprovals}
                  onChange={(e) => setRequiredAdditionalApprovals(Number(e.target.value) || 2)}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Approver Roles</label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {allApproverRoles.map((role) => (
                    <label key={role} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={approverRoles.includes(role)}
                        onChange={(e) => {
                          setApproverRoles((prev) => e.target.checked ? [...new Set([...prev, role])] : prev.filter((r) => r !== role))
                        }}
                      />
                      {role}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <Button onClick={() => saveSettingsMutation.mutate()}>Save Safeguards</Button>
          </Card>
        )}

        <Card className="rounded-lg p-4 space-y-3" data-testid="create-governance-request">
          <h2 className="font-semibold text-gray-900 dark:text-white">Create Governance Request</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select data-testid="governance-action-type" value={actionType} onChange={(e) => setActionType(e.target.value as GovernanceAction)} disabled={isJudge} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60">
              {isJudge ? (
                <option value="UNCERTIFY">Un-certify</option>
              ) : (
                <>
                  <option value="THROW_OUT">Throw Out Scores</option>
                  <option value="UNCERTIFY">Un-certify</option>
                  <option value="ADJUST">Adjust Scores</option>
                </>
              )}
            </select>
            <select data-testid="governance-scope-type" value={scopeType} onChange={(e) => setScopeType(e.target.value as GovernanceScope)} disabled={isJudge} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60">
              {isJudge ? (
                <option value="CONTESTANT_CATEGORY">Contestant + Category</option>
              ) : actionType === 'THROW_OUT' ? (
                <>
                  <option value="CATEGORY_JUDGE">Judge + Category</option>
                  <option value="CONTEST_JUDGE">Judge + Contest</option>
                </>
              ) : actionType === 'ADJUST' ? (
                <>
                  <option value="CATEGORY_LEVEL">Category Level</option>
                  <option value="CONTEST_LEVEL">Contest Level</option>
                </>
              ) : (
                <>
                  <option value="SCORE">Single Score</option>
                  <option value="CONTESTANT_CATEGORY">Contestant + Category</option>
                  <option value="CATEGORY_LEVEL">Category Certification Level</option>
                </>
              )}
            </select>
            {scopeType === 'CATEGORY_LEVEL' ? (
              <select value={targetCertificationLevel} onChange={(e) => setTargetCertificationLevel(e.target.value as CertificationLevel)} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="JUDGE">Judge</option>
                <option value="TALLY_MASTER">Tally Master</option>
                <option value="AUDITOR">Auditor</option>
                <option value="BOARD">Board</option>
              </select>
            ) : <div />}
          </div>

          {(scopeType === 'CATEGORY_JUDGE' || scopeType === 'CONTEST_JUDGE') && (
            <select data-testid="governance-judge-select" value={judgeId} onChange={(e) => setJudgeId(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">Select Judge</option>
              {judges.map((judge) => <option key={judge.id} value={judge.id}>{judge.name}</option>)}
            </select>
          )}

          {scopeType === 'SCORE' && (
            <input
              value={scoreId}
              onChange={(e) => setScoreId(e.target.value)}
              placeholder="Score ID"
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          )}

          {actionType === 'ADJUST' && (
            <input
              type="number"
              step="0.01"
              value={adjustmentDelta}
              onChange={(e) => setAdjustmentDelta(e.target.value)}
              placeholder="Adjustment amount (e.g. 1 or -0.5)"
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          )}

          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason" className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />

          <input value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} placeholder="Typed signature" className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          <div>
            <canvas
              ref={canvasRef}
              width={560}
              height={130}
              className="w-full border border-gray-300 dark:border-gray-600 rounded bg-white touch-none"
              style={{ touchAction: 'none' }}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              onPointerCancel={stopDrawing}
            />
            <Button type="button" onClick={clearDrawing} variant="secondary" size="sm" className="mt-2">Clear Drawn Signature</Button>
          </div>

          <Button onClick={submitRequest} data-testid="create-governance-request-button">Create Request</Button>
        </Card>

        <Card className="rounded-lg p-0 overflow-x-auto">
          <ResponsiveTable caption="Governance score review rows" minWidth="1100px">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Contest/Category</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Contestant</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Judge</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Criterion</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Score / Possible</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Cert/Lock</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reviewRows.map((row: any) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{row.category?.contest?.name} / {row.category?.name}</td>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">#{row.contestant?.contestantNumber ?? 'N/A'} {row.contestant?.name}</td>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{row.judge?.name}</td>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{row.criterion?.name || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{formatScoreWithPossible(row)}</td>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{row.isCertified ? 'Certified' : 'Open'} / {row.isLocked ? 'Locked' : 'Unlocked'}</td>
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{row.comment || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        </Card>

        <Card className="rounded-lg p-0 overflow-x-auto">
          <ResponsiveTable caption="Governance requests" minWidth="1200px">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Target</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Action/Scope</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Flow Actors</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Reason</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Execution</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRequests.map((request: any) => {
                  const additionalApprovals = additionalApproverRows(request).length
                  const approvalsNeeded = Math.max(0, Number(request.requiredAdditionalApprovals || 0) - additionalApprovals)
                  const canAct = canCurrentUserApprove(request)
                  return (
                    <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                        <div className="space-y-1">
                          <div>{request.contest?.name || '-'}</div>
                          <div>{request.category?.name || '-'}</div>
                          <div>
                            {request.contestant ? `#${request.contestant.contestantNumber ?? 'N/A'} ${request.contestant.name}` : '-'}
                          </div>
                          <div>{request.judge?.name ? `Judge: ${request.judge.name}` : ''}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{request.actionType} / {request.scopeType}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                        <div className="space-y-2">
                          <div>
                            <div className="text-[11px] uppercase text-gray-500 dark:text-gray-400">Requestor</div>
                            <div>{requestorLabel(request)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase text-gray-500 dark:text-gray-400">Approver(s)</div>
                            {additionalApproverRows(request).length > 0 ? (
                              <div className="space-y-1">
                                {additionalApproverRows(request).map((approval: any) => (
                                  <div key={approval.id}>
                                    {(approval.approvedByName || approval.approvedByEmail || approval.approvedById || 'Unknown Approver')}
                                    {' - '}
                                    {normalizeRoleLabel(approval.approverRole, approval.effectiveBoardRoleSnapshot)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500 dark:text-gray-400">Pending</div>
                            )}
                          </div>
                          <div className="text-xs">
                            {additionalApprovals}/{request.requiredAdditionalApprovals} additional approvals
                            {request.status === 'PENDING' && approvalsNeeded > 0 && (
                              <div className="text-yellow-700 dark:text-yellow-300 mt-1">{approvalsNeeded} more needed</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{request.reason}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          request.status === 'APPROVED'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : request.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{request.executionSummary || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                        {canAct ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const typed = window.prompt('Enter typed signature to certify this request', user?.name || user?.email || '') || ''
                                if (!typed.trim()) return
                                approveMutation.mutate({ id: request.id, signature: { typedSignature: typed.trim() } })
                              }}
                              className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = window.prompt('Rejection reason') || ''
                                if (reason.trim()) rejectMutation.mutate({ id: request.id, reason })
                              }}
                              className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        ) : request.status === 'PENDING' ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Waiting / already actioned
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ResponsiveTable>
        </Card>
    </div>
  )
}

export default ScoreGovernancePage
