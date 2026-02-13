import React, { useEffect, useMemo, useState } from 'react'
import { ArrowPathIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { api, scoreGovernanceAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

export type StageStatus = 'PENDING' | 'IN_PROGRESS' | 'CERTIFIED' | 'REJECTED'

type WorkspaceMode = 'all' | 'tally-queue' | 'auditor-queue' | 'board-queue'

interface JudgeRow {
  judgeId: string
  judgeName: string
  certified: boolean
  certifiedAt: string | null
}

interface CategoryOverview {
  categoryId: string
  categoryName: string
  contestId: string
  contestName: string
  eventId: string
  eventName: string
  status: StageStatus
  currentStep: number
  totalSteps: number
  judgeCertified: boolean
  tallyCertified: boolean
  auditorCertified: boolean
  boardApproved: boolean
  judgeProgress: {
    certified: number
    total: number
  }
  scoreProgress: {
    total: number
    certified: number
    locked: number
  }
  judges: JudgeRow[]
}

interface ContestOverview {
  contestId: string
  contestName: string
  eventId: string
  eventName: string
  categories: CategoryOverview[]
}

interface CertificationsOverviewResponse {
  contests: ContestOverview[]
}

interface CertificationOverviewWorkspaceProps {
  title: string
  subtitle: string
  mode?: WorkspaceMode
  allowCertify?: boolean
  certifyLabel?: string
  onCertifyCategory?: (categoryId: string, signature: { typedSignature?: string; drawnSignatureData?: string }) => Promise<void>
  canCertifyCategory?: (category: CategoryOverview) => boolean
}

const statusClass = (status: StageStatus): string => {
  if (status === 'CERTIFIED') return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
  if (status === 'IN_PROGRESS') return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
  if (status === 'REJECTED') return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
  return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
}

const CertificationOverviewWorkspace: React.FC<CertificationOverviewWorkspaceProps> = ({
  title,
  subtitle,
  mode = 'all',
  allowCertify = false,
  certifyLabel = 'Certify',
  onCertifyCategory,
  canCertifyCategory
}) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [actingCategoryId, setActingCategoryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contests, setContests] = useState<ContestOverview[]>([])
  const [selectedContest, setSelectedContest] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | StageStatus>('ALL')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null)
  const [pendingUncertifyCategoryId, setPendingUncertifyCategoryId] = useState<string | null>(null)
  const [uncertifyTargetLevel, setUncertifyTargetLevel] = useState<'JUDGE' | 'TALLY_MASTER' | 'AUDITOR' | 'BOARD'>('JUDGE')
  const [uncertifyReason, setUncertifyReason] = useState('')
  const [typedSignature, setTypedSignature] = useState('')
  const [drawnSignatureData, setDrawnSignatureData] = useState<string>('')
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  const loadOverview = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/certifications/overview')
      const unwrapped: CertificationsOverviewResponse = response.data?.data || response.data || { contests: [] }
      setContests(Array.isArray(unwrapped?.contests) ? unwrapped.contests : [])
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load certification overview')
      setContests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [])

  const allCategories = useMemo(() => contests.flatMap((contest) => contest.categories), [contests])

  const modeFiltered = useMemo(() => {
    if (mode === 'tally-queue') return allCategories.filter((cat) => cat.judgeCertified && !cat.tallyCertified)
    if (mode === 'auditor-queue') return allCategories.filter((cat) => cat.tallyCertified && !cat.auditorCertified)
    if (mode === 'board-queue') return allCategories.filter((cat) => cat.auditorCertified && !cat.boardApproved)
    return allCategories
  }, [allCategories, mode])

  const categories = useMemo(() => {
    let filtered = modeFiltered
    if (selectedContest !== 'ALL') filtered = filtered.filter((cat) => cat.contestId === selectedContest)
    if (selectedStatus !== 'ALL') filtered = filtered.filter((cat) => cat.status === selectedStatus)
    return filtered
  }, [modeFiltered, selectedContest, selectedStatus])

  const totals = useMemo(() => {
    return {
      total: modeFiltered.length,
      pending: modeFiltered.filter((c) => c.status === 'PENDING').length,
      inProgress: modeFiltered.filter((c) => c.status === 'IN_PROGRESS').length,
      certified: modeFiltered.filter((c) => c.status === 'CERTIFIED').length,
      rejected: modeFiltered.filter((c) => c.status === 'REJECTED').length
    }
  }, [modeFiltered])

  const toggleJudges = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  const canRequestUncertify = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'TALLY_MASTER', 'JUDGE'].includes(user?.role || '')

  const suggestUncertifyLevel = (category: CategoryOverview): 'JUDGE' | 'TALLY_MASTER' | 'AUDITOR' | 'BOARD' => {
    if (category.boardApproved) return 'BOARD'
    if (category.auditorCertified) return 'AUDITOR'
    if (category.tallyCertified) return 'TALLY_MASTER'
    return 'JUDGE'
  }

  const submitUncertifyRequest = async () => {
    if (!pendingUncertifyCategoryId) return
    if (!uncertifyReason.trim()) {
      toast.error('Reason is required')
      return
    }
    if (!typedSignature.trim() && !drawnSignatureData.trim()) {
      toast.error('Please provide a typed or drawn signature')
      return
    }

    try {
      setActingCategoryId(pendingUncertifyCategoryId)
      await scoreGovernanceAPI.createRequest({
        actionType: 'UNCERTIFY',
        scopeType: 'CATEGORY_LEVEL',
        categoryId: pendingUncertifyCategoryId,
        targetCertificationLevel: uncertifyTargetLevel,
        reason: uncertifyReason.trim(),
        typedSignature: typedSignature.trim() || undefined,
        drawnSignatureData: drawnSignatureData || undefined
      })
      toast.success('Un-certify request submitted')
      await loadOverview()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to submit un-certify request')
    } finally {
      setActingCategoryId(null)
      setPendingUncertifyCategoryId(null)
      setUncertifyReason('')
      setTypedSignature('')
      setDrawnSignatureData('')
    }
  }

  const handleCertify = async () => {
    if (!allowCertify || !onCertifyCategory || !pendingCategoryId) return

    if (!typedSignature.trim() && !drawnSignatureData.trim()) {
      toast.error('Please provide a typed or drawn signature')
      return
    }

    try {
      setActingCategoryId(pendingCategoryId)
      await onCertifyCategory(pendingCategoryId, {
        typedSignature: typedSignature.trim() || undefined,
        drawnSignatureData: drawnSignatureData || undefined
      })
      toast.success('Certification submitted')
      await loadOverview()
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.response?.data?.message || 'Failed to submit certification'
      toast.error(message)
    } finally {
      setActingCategoryId(null)
      setPendingCategoryId(null)
      setTypedSignature('')
      setDrawnSignatureData('')
    }
  }

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
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

  const stopDrawing = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const data = canvas.toDataURL('image/png')
      setDrawnSignatureData(data)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading certification workspace...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
          </div>
          <button
            onClick={loadOverview}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900 dark:border-red-700 text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">{totals.total}</p>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">{totals.pending}</p>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">{totals.inProgress}</p>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Certified</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">{totals.certified}</p>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Rejected</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">{totals.rejected}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={selectedContest}
            onChange={(e) => setSelectedContest(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="ALL">All Contests</option>
            {contests.map((contest) => (
              <option key={contest.contestId} value={contest.contestId}>
                {contest.eventName} / {contest.contestName}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as 'ALL' | StageStatus)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CERTIFIED">Certified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {categories.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">No categories match current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Event / Contest / Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Stages</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Judges</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Scores</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {categories.map((cat) => {
                    const expanded = expandedCategories.has(cat.categoryId)
                    return (
                      <React.Fragment key={cat.categoryId}>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{cat.categoryName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{cat.eventName} / {cat.contestName}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${statusClass(cat.status)}`}>
                              {cat.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 text-xs">
                              <span className={`px-2 py-1 rounded ${cat.judgeCertified ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>J</span>
                              <span className={`px-2 py-1 rounded ${cat.tallyCertified ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>T</span>
                              <span className={`px-2 py-1 rounded ${cat.auditorCertified ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>A</span>
                              <span className={`px-2 py-1 rounded ${cat.boardApproved ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>B</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{cat.judgeProgress.certified}/{cat.judgeProgress.total}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{cat.scoreProgress.certified}/{cat.scoreProgress.total} certified, {cat.scoreProgress.locked} locked</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleJudges(cat.categoryId)}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                              >
                                {expanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                                Judges
                              </button>
                              {allowCertify && onCertifyCategory && (!canCertifyCategory || canCertifyCategory(cat)) && (
                                <button
                                  type="button"
                                  disabled={actingCategoryId === cat.categoryId}
                                  onClick={() => setPendingCategoryId(cat.categoryId)}
                                  className="px-2.5 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
                                >
                                  {actingCategoryId === cat.categoryId ? 'Submitting...' : certifyLabel}
                                </button>
                              )}
                              {canRequestUncertify && (cat.judgeCertified || cat.tallyCertified || cat.auditorCertified || cat.boardApproved) && (
                                <button
                                  type="button"
                                  disabled={actingCategoryId === cat.categoryId}
                                  onClick={() => {
                                    setPendingUncertifyCategoryId(cat.categoryId)
                                    setUncertifyTargetLevel(suggestUncertifyLevel(cat))
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-medium rounded bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400"
                                >
                                  Request Un-certify
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={6} className="px-4 py-3 bg-gray-50 dark:bg-gray-900/40">
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[520px]">
                                  <thead>
                                    <tr>
                                      <th className="text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300 py-2">Judge</th>
                                      <th className="text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300 py-2">Certified</th>
                                      <th className="text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300 py-2">Certified At</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cat.judges.length === 0 ? (
                                      <tr>
                                        <td colSpan={3} className="py-2 text-sm text-gray-500 dark:text-gray-400">No active judge assignments found.</td>
                                      </tr>
                                    ) : (
                                      cat.judges.map((judge) => (
                                        <tr key={`${cat.categoryId}-${judge.judgeId}`} className="border-t border-gray-200 dark:border-gray-700">
                                          <td className="py-2 text-sm text-gray-900 dark:text-white">{judge.judgeName}</td>
                                          <td className="py-2 text-sm">
                                            <span className={`px-2 py-1 text-xs rounded-full ${judge.certified ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'}`}>
                                              {judge.certified ? 'Yes' : 'No'}
                                            </span>
                                          </td>
                                          <td className="py-2 text-sm text-gray-600 dark:text-gray-400">{judge.certifiedAt ? new Date(judge.certifiedAt).toLocaleString() : '-'}</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pendingCategoryId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-xl rounded-lg bg-white dark:bg-gray-800 p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Certification Signature</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Provide either a typed signature, drawn signature, or both.
              </p>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Typed Signature</label>
                <input
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Drawn Signature</label>
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={150}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                <button
                  type="button"
                  onClick={clearDrawing}
                  className="mt-2 text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  Clear Drawn Signature
                </button>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingCategoryId(null)
                    setTypedSignature('')
                    setDrawnSignatureData('')
                  }}
                  className="px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCertify}
                  className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Submit Certification
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingUncertifyCategoryId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-xl rounded-lg bg-white dark:bg-gray-800 p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Request Un-certification</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                This creates a governance request for approval. It does not un-certify immediately.
              </p>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Certification Stage</label>
                <select
                  value={uncertifyTargetLevel}
                  onChange={(e) => setUncertifyTargetLevel(e.target.value as 'JUDGE' | 'TALLY_MASTER' | 'AUDITOR' | 'BOARD')}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="JUDGE">Judge</option>
                  <option value="TALLY_MASTER">Tally Master</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="BOARD">Board</option>
                </select>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason</label>
                <textarea
                  value={uncertifyReason}
                  onChange={(e) => setUncertifyReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Explain why un-certification is being requested"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Typed Signature</label>
                <input
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Drawn Signature</label>
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={150}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                <button
                  type="button"
                  onClick={clearDrawing}
                  className="mt-2 text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  Clear Drawn Signature
                </button>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingUncertifyCategoryId(null)
                    setUncertifyReason('')
                    setTypedSignature('')
                    setDrawnSignatureData('')
                  }}
                  className="px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitUncertifyRequest}
                  className="px-3 py-2 text-sm rounded bg-amber-600 text-white hover:bg-amber-700"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CertificationOverviewWorkspace
