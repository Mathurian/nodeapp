import React, { useEffect, useMemo, useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { api, scoreGovernanceAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useMobileWorkflowNavigation } from '../../hooks'
import { MobileWorkflowNav } from '../ui'
import useAuthPermissions from '../../hooks/useAuthPermissions'
import { hasPermissionAction, permissionSetFromList } from '../../utils/pageAccess'

export type StageStatus = 'PENDING' | 'IN_PROGRESS' | 'CERTIFIED' | 'REJECTED'

type WorkspaceMode = 'all' | 'tally-queue' | 'auditor-queue' | 'board-queue'
type DensityMode = 'comfortable' | 'compact'

interface JudgeRow {
  judgeId: string
  judgeName: string
  certified: boolean
  certifiedAt: string | null
}

interface RoleStageProgress {
  signed: number
  required: number
  pending: number
  requireAll: boolean
}

export interface CategoryOverview {
  certificationId?: string | null
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
  tallyProgress?: RoleStageProgress
  auditorProgress?: RoleStageProgress
  scoreProgress: {
    total: number
    submitted?: number
    certified: number
    locked: number
    judges?: number
    contestants?: number
    criteria?: number
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
  onCertifyCategory?: (
    categoryId: string,
    signature: { typedSignature?: string; drawnSignatureData?: string },
    category?: CategoryOverview
  ) => Promise<void>
  canCertifyCategory?: (category: CategoryOverview) => boolean
}

interface CategoryScoreRow {
  id: string
  score: number | null
  isCertified: boolean
  isLocked: boolean
  comment: string | null
  contestant: {
    id: string
    name: string
    contestantNumber?: number | null
  }
  judge: {
    id: string
    name: string
  }
  category?: {
    id?: string
    name?: string
    scoreCap?: number | null
  } | null
  criterion: {
    id: string
    name: string
    maxScore?: number | null
  } | null
}

interface ScoreReviewCounts {
  totalRows: number
  missingScores: number
  uncertifiedRows: number
  unlockedRows: number
  commentedRows: number
}

interface JudgeScoreGroup {
  judgeId: string
  judgeName: string
  rows: CategoryScoreRow[]
  counts: ScoreReviewCounts
}

interface ContestantScoreGroup {
  contestantId: string
  contestantName: string
  contestantNumber?: number | null
  judgeGroups: JudgeScoreGroup[]
  counts: ScoreReviewCounts
  judgesCount: number
  criteriaCount: number
  totalScore: number
  totalPossibleScore: number | null
}

interface CategoryScoreReviewGroup {
  contestantGroups: ContestantScoreGroup[]
  counts: ScoreReviewCounts
  judgesCount: number
  contestantsCount: number
  criteriaCount: number
}

const createEmptyScoreCounts = (): ScoreReviewCounts => ({
  totalRows: 0,
  missingScores: 0,
  uncertifiedRows: 0,
  unlockedRows: 0,
  commentedRows: 0,
})

const tallyScoreCounts = (rows: CategoryScoreRow[]): ScoreReviewCounts => {
  return rows.reduce<ScoreReviewCounts>(
    (counts, row) => {
      counts.totalRows += 1
      if (row.score == null) counts.missingScores += 1
      if (!row.isCertified) counts.uncertifiedRows += 1
      if (!row.isLocked) counts.unlockedRows += 1
      if (row.comment?.trim()) counts.commentedRows += 1
      return counts
    },
    createEmptyScoreCounts()
  )
}

const compareOptionalNumbers = (left?: number | null, right?: number | null): number => {
  const leftHasValue = typeof left === 'number'
  const rightHasValue = typeof right === 'number'
  if (leftHasValue && rightHasValue) return left! - right!
  if (leftHasValue) return -1
  if (rightHasValue) return 1
  return 0
}

const compareRowsByCriterion = (left: CategoryScoreRow, right: CategoryScoreRow): number => {
  const leftHasCriterion = Boolean(left.criterion?.name)
  const rightHasCriterion = Boolean(right.criterion?.name)
  if (leftHasCriterion && rightHasCriterion) {
    return left.criterion!.name.localeCompare(right.criterion!.name)
  }
  if (leftHasCriterion) return -1
  if (rightHasCriterion) return 1
  return 0
}

const buildCategoryScoreReviewGroup = (rows: CategoryScoreRow[]): CategoryScoreReviewGroup => {
  const contestantMap = new Map<string, CategoryScoreRow[]>()

  rows.forEach((row) => {
    const contestantId = row.contestant?.id || 'unknown-contestant'
    const existing = contestantMap.get(contestantId)
    if (existing) existing.push(row)
    else contestantMap.set(contestantId, [row])
  })

  const contestantGroups = Array.from(contestantMap.entries())
    .map(([contestantId, contestantRows]) => {
      const judgeMap = new Map<string, CategoryScoreRow[]>()
      contestantRows.forEach((row) => {
        const judgeId = row.judge?.id || 'unknown-judge'
        const existing = judgeMap.get(judgeId)
        if (existing) existing.push(row)
        else judgeMap.set(judgeId, [row])
      })

      const judgeGroups = Array.from(judgeMap.entries())
        .map(([judgeId, judgeRows]) => ({
          judgeId,
          judgeName: judgeRows[0]?.judge?.name || 'Unknown Judge',
          rows: [...judgeRows].sort(compareRowsByCriterion),
          counts: tallyScoreCounts(judgeRows),
        }))
        .sort((left, right) => left.judgeName.localeCompare(right.judgeName))

      const criteriaIds = new Set(
        contestantRows.map((row) => row.criterion?.id || `overall:${row.category?.id || row.id}`)
      )
      const totalScore = contestantRows.reduce((sum, row) => sum + (row.score ?? 0), 0)
      const possibleScores = contestantRows.map((row) => row.criterion?.maxScore ?? row.category?.scoreCap ?? null)
      const hasUnknownPossible = possibleScores.some((value) => value == null)
      const totalPossibleScore = hasUnknownPossible
        ? null
        : possibleScores.reduce((sum, value) => sum + (value || 0), 0)

      return {
        contestantId,
        contestantName: contestantRows[0]?.contestant?.name || 'Unknown Contestant',
        contestantNumber: contestantRows[0]?.contestant?.contestantNumber ?? null,
        judgeGroups,
        counts: tallyScoreCounts(contestantRows),
        judgesCount: judgeGroups.length,
        criteriaCount: criteriaIds.size,
        totalScore,
        totalPossibleScore,
      }
    })
    .sort((left, right) => {
      const numberComparison = compareOptionalNumbers(left.contestantNumber, right.contestantNumber)
      if (numberComparison !== 0) return numberComparison
      return left.contestantName.localeCompare(right.contestantName)
    })

  const judgeIds = new Set(rows.map((row) => row.judge?.id || 'unknown-judge'))
  const criteriaIds = new Set(rows.map((row) => row.criterion?.id || `overall:${row.category?.id || row.id}`))

  return {
    contestantGroups,
    counts: tallyScoreCounts(rows),
    judgesCount: judgeIds.size,
    contestantsCount: contestantGroups.length,
    criteriaCount: criteriaIds.size,
  }
}

const scoreCountChipClass = (count: number, tone: 'danger' | 'warning' | 'info'): string => {
  if (count <= 0) return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
  if (tone === 'danger') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
  if (tone === 'warning') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
}

const rowStatusChipClass = (active: boolean, tone: 'good' | 'warning'): string => {
  if (active) {
    return tone === 'good'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
  }
  return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
}

const statusClass = (status: StageStatus): string => {
  if (status === 'CERTIFIED') return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
  if (status === 'IN_PROGRESS') return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
  if (status === 'REJECTED') return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
  return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
}

const isJudgeStageComplete = (category: CategoryOverview): boolean => {
  if (category.judgeCertified) return true
  return category.judgeProgress.total > 0 && category.judgeProgress.certified >= category.judgeProgress.total
}

type CertificationActionType = 'TALLY_MASTER' | 'AUDITOR' | 'BOARD'

interface CertificationAction {
  type: CertificationActionType
  label: string
}

const roleCanCertify = (
  role: string | undefined,
  type: CertificationActionType,
  canWriteCertifications: boolean
): boolean => {
  if (!canWriteCertifications) return false
  const normalizedRole = role || ''
  if (type === 'TALLY_MASTER') return ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'TALLY_MASTER'].includes(normalizedRole)
  if (type === 'AUDITOR') return ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'].includes(normalizedRole)
  return ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'].includes(normalizedRole)
}

const resolveDefaultCertificationAction = (
  category: CategoryOverview,
  role: string | undefined,
  canWriteCertifications: boolean
): CertificationAction | null => {
  const judgeReady = isJudgeStageComplete(category)
  if (judgeReady && !category.tallyCertified && roleCanCertify(role, 'TALLY_MASTER', canWriteCertifications)) {
    return { type: 'TALLY_MASTER', label: 'Certify Totals' }
  }
  if (category.tallyCertified && !category.auditorCertified && roleCanCertify(role, 'AUDITOR', canWriteCertifications)) {
    return { type: 'AUDITOR', label: 'Certify Audit' }
  }
  if (category.auditorCertified && !category.boardApproved && roleCanCertify(role, 'BOARD', canWriteCertifications)) {
    return { type: 'BOARD', label: 'Final Approve' }
  }
  return null
}

const getRoleProgressHint = (progress: RoleStageProgress | undefined, certified: boolean): string => {
  if (!progress) return certified ? '1/1 complete' : '0/1 complete'
  if (progress.required > 0) {
    return `${progress.signed}/${progress.required} complete${progress.requireAll ? ' (all required)' : ' (any assigned signer)'}`
  }
  return `${progress.signed} signed${progress.requireAll ? ' (assignment not set)' : ' (any signer mode)'}`
}

const DENSITY_STORAGE_KEY = 'certification-overview-density'

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
  const { data: permissionsPayload } = useAuthPermissions()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [actingCategoryId, setActingCategoryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contests, setContests] = useState<ContestOverview[]>([])
  const [selectedContest, setSelectedContest] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | StageStatus>('ALL')
  const [density, setDensity] = useState<DensityMode>(() => {
    if (typeof window === 'undefined') return 'comfortable'
    const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY)
    return saved === 'compact' ? 'compact' : 'comfortable'
  })
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedScoreCategories, setExpandedScoreCategories] = useState<Set<string>>(new Set())
  const [categoryScores, setCategoryScores] = useState<Record<string, CategoryScoreRow[]>>({})
  const [loadingScoreCategoryId, setLoadingScoreCategoryId] = useState<string | null>(null)
  const [pendingCertification, setPendingCertification] = useState<{
    categoryId: string
    certificationId: string | null
    actionLabel: string
    actionType: CertificationActionType | 'CUSTOM'
  } | null>(null)
  const [pendingUncertifyCategoryId, setPendingUncertifyCategoryId] = useState<string | null>(null)
  const [uncertifyTargetLevel, setUncertifyTargetLevel] = useState<'JUDGE' | 'TALLY_MASTER' | 'AUDITOR' | 'BOARD'>('JUDGE')
  const [uncertifyReason, setUncertifyReason] = useState('')
  const [typedSignature, setTypedSignature] = useState('')
  const [drawnSignatureData, setDrawnSignatureData] = useState<string>('')
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const filtersSectionRef = React.useRef<HTMLDivElement | null>(null)
  const categoriesSectionRef = React.useRef<HTMLDivElement | null>(null)
  const contestantSectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  const { scrollToRef, scrollToTop } = useMobileWorkflowNavigation()
  const permissionSet = permissionSetFromList(permissionsPayload?.permissions || [])
  const canWriteCertifications = hasPermissionAction(permissionSet, 'certifications:write')

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, density)
    }
  }, [density])

  const allCategories = useMemo(() => contests.flatMap((contest) => contest.categories), [contests])

  const modeFiltered = useMemo(() => {
    if (mode === 'tally-queue') return allCategories.filter((cat) => isJudgeStageComplete(cat) && !cat.tallyCertified)
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

  const categoryScoreReviewGroups = useMemo(() => {
    return Object.fromEntries(
      Object.entries(categoryScores).map(([categoryId, rows]) => [categoryId, buildCategoryScoreReviewGroup(rows)])
    ) as Record<string, CategoryScoreReviewGroup>
  }, [categoryScores])

  const scrollToContestantSection = (categoryId: string, contestantId: string) => {
    const target = contestantSectionRefs.current[`${categoryId}:${contestantId}`]
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleJudges = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  const toggleScores = async (categoryId: string) => {
    const isExpanded = expandedScoreCategories.has(categoryId)
    if (isExpanded) {
      setExpandedScoreCategories((prev) => {
        const next = new Set(prev)
        next.delete(categoryId)
        return next
      })
      return
    }

    if (!categoryScores[categoryId]) {
      try {
        setLoadingScoreCategoryId(categoryId)
        const response = await scoreGovernanceAPI.getScoreReview({ categoryId })
        const rows: CategoryScoreRow[] = Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.data)
            ? response.data
            : []
        setCategoryScores((prev) => ({ ...prev, [categoryId]: rows }))
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Failed to load score breakdown')
        return
      } finally {
        setLoadingScoreCategoryId(null)
      }
    }

    setExpandedScoreCategories((prev) => {
      const next = new Set(prev)
      next.add(categoryId)
      return next
    })
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      next.add(categoryId)
      return next
    })
  }

  const canRequestUncertify = canWriteCertifications && ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'TALLY_MASTER', 'JUDGE'].includes(user?.role || '')

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
    if (!allowCertify || !pendingCertification) return

    if (!typedSignature.trim() && !drawnSignatureData.trim()) {
      toast.error('Please provide a typed or drawn signature')
      return
    }

    try {
      const targetCategory = allCategories.find((category) => category.categoryId === pendingCertification.categoryId)
      if (!targetCategory) {
        toast.error('Selected category is no longer available')
        return
      }

      setActingCategoryId(pendingCertification.categoryId)
      if (onCertifyCategory) {
        await onCertifyCategory(
          pendingCertification.categoryId,
          {
            typedSignature: typedSignature.trim() || undefined,
            drawnSignatureData: drawnSignatureData || undefined
          },
          targetCategory
        )
      } else {
        if (!pendingCertification.certificationId) {
          toast.error('Certification record not found for this category')
          return
        }
        const payload = {
          typedSignature: typedSignature.trim() || undefined,
          drawnSignatureData: drawnSignatureData || undefined
        }
        if (pendingCertification.actionType === 'TALLY_MASTER') {
          await api.post(`/certifications/${pendingCertification.certificationId}/certify-tally`, payload)
        } else if (pendingCertification.actionType === 'AUDITOR') {
          await api.post(`/certifications/${pendingCertification.certificationId}/certify-auditor`, payload)
        } else if (pendingCertification.actionType === 'BOARD') {
          await api.post(`/certifications/${pendingCertification.certificationId}/approve-board`, payload)
        } else {
          toast.error('Unsupported certification action')
          return
        }
      }
      toast.success('Certification submitted')
      await loadOverview()
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.response?.data?.message || 'Failed to submit certification'
      toast.error(message)
    } finally {
      setActingCategoryId(null)
      setPendingCertification(null)
      setTypedSignature('')
      setDrawnSignatureData('')
    }
  }

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
      // no-op for unsupported pointer capture contexts
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
    if (canvas) {
      const data = canvas.toDataURL('image/png')
      setDrawnSignatureData(data)
    }
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

        <MobileWorkflowNav
          actions={[
            {
              label: 'Filters',
              onClick: () => scrollToRef(filtersSectionRef),
            },
            {
              label: 'Categories',
              onClick: () => scrollToRef(categoriesSectionRef),
            },
            {
              label: 'Top',
              onClick: () => scrollToTop(),
            },
          ]}
        />

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

        <div ref={filtersSectionRef} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={selectedContest}
            onChange={(e) => {
              setSelectedContest(e.target.value)
              scrollToRef(categoriesSectionRef, { delayMs: 140 })
            }}
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
            onChange={(e) => {
              setSelectedStatus(e.target.value as 'ALL' | StageStatus)
              scrollToRef(categoriesSectionRef, { delayMs: 140 })
            }}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CERTIFIED">Certified</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <div className="flex items-center justify-between md:justify-start gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Density</span>
            <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                type="button"
                onClick={() => setDensity('comfortable')}
                className={`px-2.5 py-1 text-xs ${
                  density === 'comfortable'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                }`}
              >
                Comfortable
              </button>
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`px-2.5 py-1 text-xs border-l border-gray-300 dark:border-gray-600 ${
                  density === 'compact'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                }`}
              >
                Compact
              </button>
            </div>
          </div>
        </div>

        <div ref={categoriesSectionRef} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {categories.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">No categories match current filters.</div>
          ) : (
            <>
              <div className="p-3 md:p-4 space-y-3 md:space-y-4">
                {categories.map((cat) => {
                  const expanded = expandedCategories.has(cat.categoryId)
                  const scoresExpanded = expandedScoreCategories.has(cat.categoryId)
                  const judgeStageComplete = isJudgeStageComplete(cat)
                  const compact = density === 'compact'
                  const defaultAction = resolveDefaultCertificationAction(cat, user?.role, canWriteCertifications)
                  const scoreReviewGroup = categoryScoreReviewGroups[cat.categoryId]
                  const showCustomCertify = allowCertify && Boolean(onCertifyCategory) && (!canCertifyCategory || canCertifyCategory(cat))
                  const showDefaultCertify = allowCertify && !onCertifyCategory && Boolean(defaultAction) && Boolean(cat.certificationId)
                  const certifyActionLabel = showCustomCertify ? certifyLabel : (defaultAction?.label || 'Certify')
                  const scoreBreakdown = cat.scoreProgress.judges !== undefined && cat.scoreProgress.contestants !== undefined
                    ? `Expected total = ${cat.scoreProgress.judges} judges × ${cat.scoreProgress.contestants} contestants × ${
                      (cat.scoreProgress.criteria ?? 0) > 0
                        ? `${cat.scoreProgress.criteria} criteria`
                        : '1 (no criteria configured)'
                    }`
                    : 'Expected total = judges × contestants × criteria (or 1 when no criteria is configured)'
                  return (
                    <div
                      key={cat.categoryId}
                      className={`rounded-lg border border-gray-200 dark:border-gray-700 ${
                        compact ? 'p-2.5 md:p-3 space-y-2' : 'p-3 md:p-4 space-y-3'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className={`${compact ? 'text-sm' : 'text-sm md:text-base'} font-semibold text-gray-900 dark:text-white`}>{cat.categoryName}</div>
                          <div className={`${compact ? 'text-xs' : 'text-xs md:text-sm'} text-gray-500 dark:text-gray-400`}>{cat.eventName} / {cat.contestName}</div>
                        </div>
                        <span className={`px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} rounded-full ${statusClass(cat.status)}`}>
                          {cat.status}
                        </span>
                      </div>

                      <div className={`flex gap-1 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                        <span className={`px-2 py-1 rounded ${judgeStageComplete ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>J</span>
                        <span className={`px-2 py-1 rounded ${cat.tallyCertified ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>T</span>
                        <span className={`px-2 py-1 rounded ${cat.auditorCertified ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>A</span>
                        <span className={`px-2 py-1 rounded ${cat.boardApproved ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>B</span>
                      </div>

                      <div className={`grid grid-cols-1 gap-1 ${compact ? 'text-[11px]' : 'text-xs'} text-gray-700 dark:text-gray-300`}>
                        <div>Judges: {cat.judgeProgress.certified}/{cat.judgeProgress.total}</div>
                        <div>Tally Certifiers: {getRoleProgressHint(cat.tallyProgress, cat.tallyCertified)}</div>
                        <div>Auditor Certifiers: {getRoleProgressHint(cat.auditorProgress, cat.auditorCertified)}</div>
                        <div>Scores: {(cat.scoreProgress.submitted ?? cat.scoreProgress.certified)}/{cat.scoreProgress.total} submitted, {cat.scoreProgress.certified} certified, {cat.scoreProgress.locked} locked</div>
                        <div className="text-gray-500 dark:text-gray-400">{scoreBreakdown}</div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleJudges(cat.categoryId)}
                          className={`${compact ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2 py-1'} rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}
                        >
                          {expanded ? 'Hide Judges' : 'Show Judges'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleScores(cat.categoryId)}
                          className={`${compact ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2 py-1'} rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300`}
                          disabled={loadingScoreCategoryId === cat.categoryId}
                        >
                          {loadingScoreCategoryId === cat.categoryId ? 'Loading Scores...' : (scoresExpanded ? 'Hide Scores' : 'View Scores')}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/score-governance?contestId=${encodeURIComponent(cat.contestId)}&categoryId=${encodeURIComponent(cat.categoryId)}`)}
                          className={`${compact ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2 py-1'} rounded bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`}
                        >
                          Governance
                        </button>
                        {(showCustomCertify || showDefaultCertify) && (
                          <button
                            type="button"
                            disabled={actingCategoryId === cat.categoryId}
                            onClick={() => {
                              setPendingCertification({
                                categoryId: cat.categoryId,
                                certificationId: cat.certificationId || null,
                                actionLabel: certifyActionLabel,
                                actionType: showCustomCertify ? 'CUSTOM' : (defaultAction?.type || 'CUSTOM')
                              })
                            }}
                            className={`${compact ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2 py-1'} rounded bg-blue-600 text-white disabled:bg-gray-400`}
                          >
                            {actingCategoryId === cat.categoryId ? 'Submitting...' : certifyActionLabel}
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
                            className={`${compact ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2 py-1'} rounded bg-amber-600 text-white disabled:bg-gray-400`}
                          >
                            Request Un-certify
                          </button>
                        )}
                      </div>

                      {expanded && (
                        <div className={`space-y-2 ${compact ? 'pt-0.5' : 'pt-1'}`}>
                          <div className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-gray-700 dark:text-gray-300`}>Judges</div>
                          {cat.judges.length === 0 ? (
                            <div className={`${compact ? 'text-[11px]' : 'text-xs'} text-gray-500 dark:text-gray-400`}>No active judge assignments found.</div>
                          ) : (
                            cat.judges.map((judge) => (
                              <div key={`mobile-judge-${cat.categoryId}-${judge.judgeId}`} className={`rounded border border-gray-200 dark:border-gray-700 ${compact ? 'p-1.5 text-[11px]' : 'p-2 text-xs'}`}>
                                <div className="font-medium text-gray-900 dark:text-white">{judge.judgeName}</div>
                                <div className="text-gray-600 dark:text-gray-300">Certified: {judge.certified ? 'Yes' : 'No'}</div>
                                <div className="text-gray-500 dark:text-gray-400">{judge.certifiedAt ? new Date(judge.certifiedAt).toLocaleString() : '-'}</div>
                              </div>
                            ))
                          )}

                          {scoresExpanded && (
                            <div className="space-y-2">
                              <div className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-gray-700 dark:text-gray-300`}>Scores</div>
                              {(categoryScores[cat.categoryId] || []).length === 0 ? (
                                <div className={`${compact ? 'text-[11px]' : 'text-xs'} text-gray-500 dark:text-gray-400`}>No submitted scores found.</div>
                              ) : (
                                <div className="space-y-3">
                                  {scoreReviewGroup && (
                                    <>
                                      <div className={`grid grid-cols-2 md:grid-cols-5 gap-2 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                                        <div className="rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/40">
                                          <div className="text-gray-500 dark:text-gray-400">Contestants</div>
                                          <div className="font-semibold text-gray-900 dark:text-white">{scoreReviewGroup.contestantsCount}</div>
                                        </div>
                                        <div className="rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/40">
                                          <div className="text-gray-500 dark:text-gray-400">Judges</div>
                                          <div className="font-semibold text-gray-900 dark:text-white">{scoreReviewGroup.judgesCount}</div>
                                        </div>
                                        <div className="rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/40">
                                          <div className="text-gray-500 dark:text-gray-400">Rows</div>
                                          <div className="font-semibold text-gray-900 dark:text-white">{scoreReviewGroup.counts.totalRows}</div>
                                        </div>
                                        <div className="rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/40">
                                          <div className="text-gray-500 dark:text-gray-400">Criteria</div>
                                          <div className="font-semibold text-gray-900 dark:text-white">{scoreReviewGroup.criteriaCount}</div>
                                        </div>
                                        <div className="rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/40">
                                          <div className="text-gray-500 dark:text-gray-400">Comments</div>
                                          <div className="font-semibold text-gray-900 dark:text-white">{scoreReviewGroup.counts.commentedRows}</div>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap gap-1.5">
                                        <span className={`rounded-full px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} ${scoreCountChipClass(scoreReviewGroup.counts.missingScores, 'danger')}`}>
                                          Missing {scoreReviewGroup.counts.missingScores}
                                        </span>
                                        <span className={`rounded-full px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} ${scoreCountChipClass(scoreReviewGroup.counts.uncertifiedRows, 'warning')}`}>
                                          Uncertified {scoreReviewGroup.counts.uncertifiedRows}
                                        </span>
                                        <span className={`rounded-full px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} ${scoreCountChipClass(scoreReviewGroup.counts.unlockedRows, 'warning')}`}>
                                          Unlocked {scoreReviewGroup.counts.unlockedRows}
                                        </span>
                                      </div>

                                      {scoreReviewGroup.contestantGroups.length > 1 && (
                                        <MobileWorkflowNav
                                          title="Jump to contestant"
                                          className="mt-1"
                                          actions={scoreReviewGroup.contestantGroups.map((contestant) => ({
                                            label: contestant.contestantNumber
                                              ? `#${contestant.contestantNumber}`
                                              : contestant.contestantName,
                                            onClick: () => scrollToContestantSection(cat.categoryId, contestant.contestantId),
                                          }))}
                                        />
                                      )}

                                      <div className="space-y-2">
                                        {scoreReviewGroup.contestantGroups.map((contestant) => (
                                          <div
                                            key={`${cat.categoryId}-${contestant.contestantId}`}
                                            ref={(node) => {
                                              contestantSectionRefs.current[`${cat.categoryId}:${contestant.contestantId}`] = node
                                            }}
                                            className={`rounded border border-gray-200 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-900/30 ${
                                              compact ? 'p-2 space-y-1.5' : 'p-3 space-y-2'
                                            }`}
                                          >
                                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                              <div>
                                                <div className={`font-semibold text-gray-900 dark:text-white ${compact ? 'text-xs' : 'text-sm'}`}>
                                                  {contestant.contestantName}
                                                  {contestant.contestantNumber ? ` (#${contestant.contestantNumber})` : ''}
                                                </div>
                                                <div className={`${compact ? 'text-[11px]' : 'text-xs'} text-gray-500 dark:text-gray-400`}>
                                                  {contestant.judgesCount} judges • {contestant.criteriaCount} criteria • {contestant.counts.totalRows} rows
                                                </div>
                                              </div>
                                              <div className={`${compact ? 'text-[11px]' : 'text-xs'} font-medium text-gray-700 dark:text-gray-200`}>
                                                Total:{' '}
                                                {contestant.totalPossibleScore != null
                                                  ? `${contestant.totalScore} / ${contestant.totalPossibleScore}`
                                                  : contestant.totalScore}
                                              </div>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5">
                                              <span className={`rounded-full px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} ${scoreCountChipClass(contestant.counts.missingScores, 'danger')}`}>
                                                Missing {contestant.counts.missingScores}
                                              </span>
                                              <span className={`rounded-full px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} ${scoreCountChipClass(contestant.counts.uncertifiedRows, 'warning')}`}>
                                                Uncertified {contestant.counts.uncertifiedRows}
                                              </span>
                                              <span className={`rounded-full px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} ${scoreCountChipClass(contestant.counts.unlockedRows, 'warning')}`}>
                                                Unlocked {contestant.counts.unlockedRows}
                                              </span>
                                              <span className={`rounded-full px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} ${scoreCountChipClass(contestant.counts.commentedRows, 'info')}`}>
                                                Comments {contestant.counts.commentedRows}
                                              </span>
                                            </div>

                                            <div className="space-y-2">
                                              {contestant.judgeGroups.map((judgeGroup) => (
                                                <div
                                                  key={`${cat.categoryId}-${contestant.contestantId}-${judgeGroup.judgeId}`}
                                                  className={`rounded border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 ${
                                                    compact ? 'p-1.5 space-y-1.5' : 'p-2 space-y-2'
                                                  }`}
                                                >
                                                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                                    <div className={`font-medium text-gray-900 dark:text-white ${compact ? 'text-[11px]' : 'text-xs'}`}>
                                                      {judgeGroup.judgeName}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                      <span className={`rounded-full px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} ${scoreCountChipClass(judgeGroup.counts.missingScores, 'danger')}`}>
                                                        Missing {judgeGroup.counts.missingScores}
                                                      </span>
                                                      <span className={`rounded-full px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} ${scoreCountChipClass(judgeGroup.counts.uncertifiedRows, 'warning')}`}>
                                                        Uncertified {judgeGroup.counts.uncertifiedRows}
                                                      </span>
                                                      <span className={`rounded-full px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} ${scoreCountChipClass(judgeGroup.counts.unlockedRows, 'warning')}`}>
                                                        Unlocked {judgeGroup.counts.unlockedRows}
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <div className="space-y-1">
                                                    {judgeGroup.rows.map((row) => {
                                                      const possible = row.criterion?.maxScore ?? row.category?.scoreCap ?? null
                                                      return (
                                                        <div
                                                          key={`mobile-score-${row.id}`}
                                                          className={`rounded border border-gray-200 dark:border-gray-700 ${
                                                            compact ? 'p-1.5 text-[11px] space-y-1' : 'p-2 text-xs space-y-1.5'
                                                          }`}
                                                        >
                                                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                              {row.criterion?.name || 'Overall'}
                                                            </div>
                                                            <div className="text-gray-700 dark:text-gray-200">
                                                              {row.score == null
                                                                ? 'No score entered'
                                                                : possible != null
                                                                  ? `${row.score} / ${possible}`
                                                                  : String(row.score)}
                                                            </div>
                                                          </div>
                                                          <div className="flex flex-wrap gap-1.5">
                                                            <span className={`rounded-full px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} ${rowStatusChipClass(row.score != null, 'good')}`}>
                                                              {row.score != null ? 'Scored' : 'Missing'}
                                                            </span>
                                                            <span className={`rounded-full px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} ${rowStatusChipClass(row.isCertified, 'good')}`}>
                                                              {row.isCertified ? 'Certified' : 'Not Certified'}
                                                            </span>
                                                            <span className={`rounded-full px-2 py-1 ${compact ? 'text-[11px]' : 'text-xs'} ${rowStatusChipClass(row.isLocked, 'good')}`}>
                                                              {row.isLocked ? 'Locked' : 'Unlocked'}
                                                            </span>
                                                          </div>
                                                          <div className="text-gray-500 dark:text-gray-400">
                                                            Comment: {row.comment?.trim() || '-'}
                                                          </div>
                                                        </div>
                                                      )
                                                    })}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

            </>
          )}
        </div>

        {categories.length > 0 && (
          <MobileWorkflowNav
            title="Navigate workspace"
            actions={[
              {
                label: 'Filters',
                onClick: () => scrollToRef(filtersSectionRef),
              },
              {
                label: 'Top',
                onClick: () => scrollToTop(),
              },
            ]}
          />
        )}

        {pendingCertification && (
          <div className="cgr-modal-overlay-soft">
            <div className="w-full max-w-xl rounded-lg bg-white dark:bg-gray-800 p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{pendingCertification.actionLabel} Signature</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Provide either a typed signature, drawn signature, or both.
              </p>

              <div className="mt-4">
                <label htmlFor="components-certifications-certificationoverviewworkspace-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Typed Signature</label>
                <input id="components-certifications-certificationoverviewworkspace-1"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="components-certifications-certificationoverviewworkspace-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Drawn Signature</label>
                <canvas id="components-certifications-certificationoverviewworkspace-2"
                  ref={canvasRef}
                  width={560}
                  height={150}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white touch-none"
                  style={{ touchAction: 'none' }}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  onPointerCancel={stopDrawing}
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
                    setPendingCertification(null)
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
          <div className="cgr-modal-overlay-soft">
            <div className="w-full max-w-xl rounded-lg bg-white dark:bg-gray-800 p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Request Un-certification</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                This creates a governance request for approval. It does not un-certify immediately.
              </p>

              <div className="mt-4">
                <label htmlFor="components-certifications-certificationoverviewworkspace-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Certification Stage</label>
                <select id="components-certifications-certificationoverviewworkspace-3"
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
                <label htmlFor="components-certifications-certificationoverviewworkspace-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason</label>
                <textarea id="components-certifications-certificationoverviewworkspace-4"
                  value={uncertifyReason}
                  onChange={(e) => setUncertifyReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Explain why un-certification is being requested"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="components-certifications-certificationoverviewworkspace-5" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Typed Signature</label>
                <input id="components-certifications-certificationoverviewworkspace-5"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="components-certifications-certificationoverviewworkspace-6" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Drawn Signature</label>
                <canvas id="components-certifications-certificationoverviewworkspace-6"
                  ref={canvasRef}
                  width={560}
                  height={150}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white touch-none"
                  style={{ touchAction: 'none' }}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  onPointerCancel={stopDrawing}
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
