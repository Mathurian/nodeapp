import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'react-query'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import {
  ArrowPathIcon,
  BeakerIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { Button, Card, PageHeader, ResponsiveTable } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import useAuthPermissions from '../hooks/useAuthPermissions'
import {
  assignmentsAPI,
  categoriesAPI,
  scoreDelegationsAPI,
  scoreFilesAPI,
  scoringAPI,
} from '../services/api'
import { hasPermissionAction, permissionSetFromList } from '../utils/pageAccess'

type QualityDecision = 'accepted_for_review' | 'manual_entry_required'
type RecommendedAction = 'review_extracted_scores' | 'retry_upload_or_manual_entry'
type RejectionReason = 'missing_mark' | 'multi_mark' | 'low_confidence'

interface ContestantOption {
  id: string
  name: string
  contestantNumber?: number | null
  email?: string | null
}

interface ScoringCategory {
  id: string
  name: string
  totalsCertified?: boolean
  boardApproved?: boolean
  contest?: {
    id: string
    name: string
    isLocked?: boolean
    event?: {
      id: string
      name: string
      isLocked?: boolean
    } | null
  } | null
  contestants?: ContestantOption[]
}

interface CategoryDetail extends ScoringCategory {
  categoryContestants?: Array<{ contestant?: ContestantOption | null; contestantId?: string | null }>
}

interface JudgeAssignment {
  id: string
  judgeId?: string | null
  judge?: {
    id: string
    name: string
    email?: string | null
    isHeadJudge?: boolean
  } | null
}

interface CategoryContestantRow {
  contestantId?: string | null
  contestant?: ContestantOption | null
}

interface DelegatedJudgeOption {
  judgeId: string
  judgeName: string
  judgeEmail?: string | null
}

interface JudgeOption {
  id: string
  name: string
  email?: string | null
  source: 'assignment' | 'self' | 'delegation'
}

interface CaptureQualityGate {
  decision: QualityDecision
  reasons: string[]
  blockingReasons: string[]
  retryable: boolean
  attemptLimit: number
  recommendedAction: RecommendedAction
  manualEntryOwner: 'attempting_user'
}

interface AnchorQuality {
  detected: boolean
  minCornerDarkRatio: number
  cornerDarkRatios: {
    tl: number
    tr: number
    bl: number
    br: number
  }
  versionStripConfidence: number
  versionBits: number[]
  fiducials?: {
    detected: boolean
    confidence: number
    perspectiveCorrected: boolean
    failureReasons: string[]
  } | null
}

interface MarkQuality {
  acceptedRowCount: number
  rejectedRowCount: number
  missingMarkRowCount: number
  multiMarkRowCount: number
  lowConfidenceRowCount: number
}

interface ReviewBurdenMetrics {
  rowCount: number
  detectedScoreRowCount: number
  ambiguousRowCount: number
  lowConfidenceRowCount: number
  missingScoreRowCount: number
  mismatchWarningCount: number
  rowsRequiringReviewCount: number
  estimatedManualCorrectionRows: number
  estimatedManualCorrectionRatio: number
}

interface UatRow {
  rowIndex: number
  criterionId: string
  criterionName: string
  expectedScore: number | null
  detectedScore: number | null
  exactMatch: boolean | null
  ambiguous: boolean
  confidence: number
  rejected: boolean
  rejectionReason: RejectionReason | null
  falseHighConfidenceMark: boolean
  cellInkScores: number[]
}

interface ScoresheetUatResult {
  templateKey: string
  sheetVersion: 'v3' | null
  templateVersion: string | null
  upload: {
    fileName: string
    originalFileType: string
    normalizedFileType: string
    fileSize: number
    converted: boolean
    conversionStrategy: 'none' | 'heic_to_jpeg' | 'heif_to_jpeg'
  }
  context: {
    eventName: string
    contestName: string
    categoryName: string
    judgeName: string
    contestantName: string
    evaluationOnly: true
    certifiedOrLocked: boolean
    certificationState: {
      categoryTotalsCertified: boolean
      categoryBoardApproved: boolean
      contestLocked: boolean
      eventLocked: boolean
    }
  }
  comparison: {
    groundTruthAvailable: boolean
    exactRowCount: number
    rowCount: number
    exactRowMatchRate: number | null
    expectedTotal: number | null
    computedTotal: number
    totalDelta: number | null
    ambiguousRowCount: number
    rejectedRowCount: number
    falseHighConfidenceMarkCount: number
  }
  routingRecommendation: {
    decision: QualityDecision
    retryable: boolean
    recommendedAction: RecommendedAction
    manualEntryOwner: 'attempting_user'
    attemptLimit: number
    attemptLedgerApplied: false
    evaluationOnly: true
  }
  extraction: {
    preprocessingMode: 'standard' | 'scan_bw'
    thresholdStrategy: 'none' | 'otsu' | 'fixed_150' | 'fixed_170' | 'fixed_190'
    normalizedImage: { width: number; height: number }
    qualityGate: CaptureQualityGate
    reviewBurdenMetrics: ReviewBurdenMetrics
    anchorQuality: AnchorQuality | null
    markQuality: MarkQuality | null
    rejectedRows: Array<{
      rowIndex: number
      criterionName: string
      reason: RejectionReason
    }>
    ignoredRegions: Array<{ name: string; purpose: string }>
    mismatchWarnings: string[]
    overallConfidence: number
  }
  rows: UatRow[]
}

const inputClass = 'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-500'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-200'

const unwrapData = <T,>(response: any): T => response?.data?.data ?? response?.data

const unwrapArray = <T,>(response: any): T[] => {
  const payload = unwrapData<unknown>(response)
  return Array.isArray(payload) ? payload as T[] : []
}

const sortByName = <T extends { name: string; id: string }>(items: T[]): T[] =>
  [...items].sort((left, right) => {
    const byName = left.name.localeCompare(right.name, undefined, { sensitivity: 'base', numeric: true })
    return byName || left.id.localeCompare(right.id)
  })

const formatScore = (value: number | null | undefined): string =>
  value === null || value === undefined ? 'N/A' : String(value)

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A'
  return `${Math.round(Number(value) * 100)}%`
}

const formatRatio = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A'
  return Number(value).toFixed(3)
}

const formatReason = (reason: string): string =>
  reason
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const getErrorMessage = (error: unknown): string => {
  const err = error as { response?: { data?: any }; message?: string }
  return String(
    err.response?.data?.error ||
      err.response?.data?.message ||
      err.response?.data?.data?.message ||
      err.message ||
      'The scoresheet could not be evaluated.',
  )
}

const classifyFailure = (message: string): { title: string; detail: string } => {
  if (/unsupported.*format|unsupported file/i.test(message)) {
    return {
      title: 'Unsupported format',
      detail: 'Use JPEG, PNG, HEIC, or HEIF for this parse-only UAT upload.',
    }
  }

  if (/convert.*heic|convert.*heif|heic\/heif|conversion/i.test(message)) {
    return {
      title: 'Conversion failure',
      detail: 'Convert the capture to JPEG or PNG and run the evaluation again.',
    }
  }

  if (/anchor|fiducial|version strip/i.test(message)) {
    return {
      title: 'Missing anchors',
      detail: 'The page anchors were not readable. Retake the photo with all four page corners and anchors visible.',
    }
  }

  if (/missing_mark|multi_mark|low_confidence|rejected/i.test(message)) {
    return {
      title: 'Rejected marks',
      detail: 'One or more rows could not be read cleanly. Review the marked rows and capture the page again.',
    }
  }

  if (/ground truth|stored score|expected score/i.test(message)) {
    return {
      title: 'Missing ground truth',
      detail: 'Stored judge scores were not found for the selected context, so accuracy cannot be compared.',
    }
  }

  return {
    title: 'Evaluation failed',
    detail: message,
  }
}

const DecisionBadge: React.FC<{ decision: QualityDecision }> = ({ decision }) => {
  const accepted = decision === 'accepted_for_review'
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        accepted
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
          : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
      )}
    >
      {accepted ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
      {accepted ? 'Accepted for review' : 'Manual entry required'}
    </span>
  )
}

const Metric: React.FC<{ label: string; value: React.ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad' }> = ({
  label,
  value,
  tone = 'default',
}) => (
  <div
    className={clsx(
      'rounded-lg border p-4',
      tone === 'good' && 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30',
      tone === 'warn' && 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
      tone === 'bad' && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
      tone === 'default' && 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/60',
    )}
  >
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
    <div className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{value}</div>
  </div>
)

const IssueCallout: React.FC<{ title: string; detail: string; tone?: 'warn' | 'bad' | 'info' }> = ({
  title,
  detail,
  tone = 'warn',
}) => (
  <div
    className={clsx(
      'flex gap-3 rounded-lg border p-4',
      tone === 'bad' && 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200',
      tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
      tone === 'info' && 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200',
    )}
  >
    {tone === 'info' ? (
      <InformationCircleIcon className="mt-0.5 h-5 w-5 flex-none" />
    ) : (
      <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-none" />
    )}
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm">{detail}</p>
    </div>
  </div>
)

const ScoreSheetImportUatPage: React.FC = () => {
  const { user } = useAuth()
  const { data: permissionsPayload } = useAuthPermissions({ enabled: Boolean(user) })
  const permissionSet = useMemo(
    () => permissionSetFromList(permissionsPayload?.permissions || []),
    [permissionsPayload?.permissions],
  )

  const canEvaluateUpload =
    hasPermissionAction(permissionSet, 'score-files:upload') ||
    hasPermissionAction(permissionSet, 'score-files:update') ||
    hasPermissionAction(permissionSet, 'delegated-scores:write')
  const canReadAssignments = hasPermissionAction(permissionSet, 'assignments:read')
  const canUseDelegatedScoring =
    hasPermissionAction(permissionSet, 'delegated-scores:write') &&
    hasPermissionAction(permissionSet, 'score-delegations:read')

  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedContestId, setSelectedContestId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedJudgeId, setSelectedJudgeId] = useState('')
  const [selectedContestantId, setSelectedContestantId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preprocessingMode, setPreprocessingMode] = useState<'standard' | 'scan_bw'>('scan_bw')
  const [thresholdStrategy, setThresholdStrategy] = useState<'none' | 'otsu' | 'fixed_150' | 'fixed_170' | 'fixed_190'>('otsu')
  const [result, setResult] = useState<ScoresheetUatResult | null>(null)
  const [evaluationCount, setEvaluationCount] = useState(0)

  const selfJudgeId = (user as { judgeId?: string } | null)?.judgeId || user?.judge?.id || ''
  const userRole = String(user?.role || '').toUpperCase()
  const isAdminUser = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN'

  const categoriesQuery = useQuery<ScoringCategory[]>(
    ['scoresheet-import-uat-categories'],
    async () => {
      const response = await scoringAPI.getCategories()
      return unwrapArray<ScoringCategory>(response)
    },
    { retry: 1 },
  )

  const categoryDetailQuery = useQuery<CategoryDetail | null>(
    ['scoresheet-import-uat-category-detail', selectedCategoryId],
    async () => {
      if (!selectedCategoryId) return null
      const response = await categoriesAPI.getById(selectedCategoryId)
      return unwrapData<CategoryDetail>(response) || null
    },
    {
      enabled: Boolean(selectedCategoryId),
      retry: false,
    },
  )

  const judgeAssignmentsQuery = useQuery<JudgeAssignment[]>(
    ['scoresheet-import-uat-judge-assignments', selectedCategoryId],
    async () => {
      if (!selectedCategoryId) return []
      const response = await assignmentsAPI.getAll({ categoryId: selectedCategoryId, status: 'ACTIVE' })
      return unwrapArray<JudgeAssignment>(response)
    },
    {
      enabled: Boolean(selectedCategoryId && canReadAssignments),
      retry: 1,
    },
  )

  const contestantAssignmentsQuery = useQuery<CategoryContestantRow[]>(
    ['scoresheet-import-uat-contestant-assignments', selectedCategoryId],
    async () => {
      if (!selectedCategoryId) return []
      const response = await assignmentsAPI.getCategoryContestants(selectedCategoryId)
      return unwrapArray<CategoryContestantRow>(response)
    },
    {
      enabled: Boolean(selectedCategoryId && canReadAssignments),
      retry: 1,
    },
  )

  const delegatedJudgesQuery = useQuery<DelegatedJudgeOption[]>(
    ['scoresheet-import-uat-delegated-judges', selectedCategoryId],
    async () => {
      if (!selectedCategoryId) return []
      const response = await scoreDelegationsAPI.getEligibleJudges(selectedCategoryId)
      return unwrapArray<DelegatedJudgeOption>(response)
    },
    {
      enabled: Boolean(selectedCategoryId && canUseDelegatedScoring),
      retry: 1,
    },
  )

  const eventOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; isLocked?: boolean }>()
    ;(categoriesQuery.data || []).forEach((category) => {
      const event = category.contest?.event
      if (event?.id) {
        byId.set(event.id, {
          id: event.id,
          name: event.name || 'Untitled event',
          isLocked: event.isLocked,
        })
      }
    })
    return sortByName(Array.from(byId.values()))
  }, [categoriesQuery.data])

  const contestOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; eventId: string; isLocked?: boolean }>()
    ;(categoriesQuery.data || []).forEach((category) => {
      const contest = category.contest
      const eventId = contest?.event?.id
      if (contest?.id && eventId && (!selectedEventId || eventId === selectedEventId)) {
        byId.set(contest.id, {
          id: contest.id,
          name: contest.name || 'Untitled contest',
          eventId,
          isLocked: contest.isLocked,
        })
      }
    })
    return sortByName(Array.from(byId.values()))
  }, [categoriesQuery.data, selectedEventId])

  const categoryOptions = useMemo(() => (
    sortByName(
      (categoriesQuery.data || [])
        .filter((category) => !selectedContestId || category.contest?.id === selectedContestId)
        .map((category) => ({
          ...category,
          name: category.name || 'Untitled category',
        })),
    )
  ), [categoriesQuery.data, selectedContestId])

  const selectedEvent = eventOptions.find((event) => event.id === selectedEventId) || null
  const selectedContest = contestOptions.find((contest) => contest.id === selectedContestId) || null
  const selectedCategory = categoryOptions.find((category) => category.id === selectedCategoryId) || null
  const selectedCategoryDetail = categoryDetailQuery.data || null

  const lockState = {
    categoryTotalsCertified: Boolean(selectedCategoryDetail?.totalsCertified ?? selectedCategory?.totalsCertified),
    categoryBoardApproved: Boolean(selectedCategoryDetail?.boardApproved ?? selectedCategory?.boardApproved),
    contestLocked: Boolean(selectedCategoryDetail?.contest?.isLocked ?? selectedContest?.isLocked),
    eventLocked: Boolean(selectedCategoryDetail?.contest?.event?.isLocked ?? selectedEvent?.isLocked),
  }
  const selectedContextLocked = Object.values(lockState).some(Boolean)

  const judgeOptions = useMemo<JudgeOption[]>(() => {
    const byId = new Map<string, JudgeOption>()
    const add = (option: JudgeOption) => {
      if (option.id && !byId.has(option.id)) {
        byId.set(option.id, option)
      }
    }

    if (!isAdminUser && selfJudgeId) {
      add({
        id: selfJudgeId,
        name: user?.judge?.name || user?.name || 'Current judge',
        email: user?.judge?.email || user?.email || null,
        source: 'self',
      })
    }

    if (isAdminUser) {
      ;(judgeAssignmentsQuery.data || []).forEach((assignment) => {
        const judgeId = assignment.judgeId || assignment.judge?.id || ''
        if (!judgeId) return
        add({
          id: judgeId,
          name: assignment.judge?.name || 'Assigned judge',
          email: assignment.judge?.email || null,
          source: 'assignment',
        })
      })
    }

    ;(delegatedJudgesQuery.data || []).forEach((judge) => {
      add({
        id: judge.judgeId,
        name: judge.judgeName,
        email: judge.judgeEmail || null,
        source: 'delegation',
      })
    })

    return sortByName(Array.from(byId.values()))
  }, [
    delegatedJudgesQuery.data,
    isAdminUser,
    judgeAssignmentsQuery.data,
    selfJudgeId,
    user?.email,
    user?.judge?.email,
    user?.judge?.name,
    user?.name,
  ])

  const contestantOptions = useMemo<ContestantOption[]>(() => {
    const byId = new Map<string, ContestantOption>()
    const add = (contestant?: ContestantOption | null, fallbackId?: string | null) => {
      const id = contestant?.id || fallbackId || ''
      if (!id || byId.has(id)) return
      byId.set(id, {
        id,
        name: contestant?.name || 'Assigned contestant',
        contestantNumber: contestant?.contestantNumber ?? null,
        email: contestant?.email || null,
      })
    }

    ;(selectedCategory?.contestants || []).forEach((contestant) => add(contestant))
    ;(selectedCategoryDetail?.categoryContestants || []).forEach((row) => add(row.contestant, row.contestantId))
    ;(contestantAssignmentsQuery.data || []).forEach((row) => add(row.contestant, row.contestantId))

    return [...byId.values()].sort((left, right) => {
      const leftNumber = left.contestantNumber
      const rightNumber = right.contestantNumber
      if (leftNumber !== null && leftNumber !== undefined && rightNumber !== null && rightNumber !== undefined && leftNumber !== rightNumber) {
        return leftNumber - rightNumber
      }
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base', numeric: true }) || left.id.localeCompare(right.id)
    })
  }, [contestantAssignmentsQuery.data, selectedCategory?.contestants, selectedCategoryDetail?.categoryContestants])

  useEffect(() => {
    if (selectedJudgeId && !judgeOptions.some((judge) => judge.id === selectedJudgeId)) {
      setSelectedJudgeId('')
    }
  }, [judgeOptions, selectedJudgeId])

  useEffect(() => {
    if (selectedContestantId && !contestantOptions.some((contestant) => contestant.id === selectedContestantId)) {
      setSelectedContestantId('')
    }
  }, [contestantOptions, selectedContestantId])

  const evaluateMutation = useMutation<ScoresheetUatResult, unknown, void>(
    async () => {
      if (!selectedFile) throw new Error('Choose a phone capture before evaluating.')
      if (!selectedEventId || !selectedContestId || !selectedCategoryId || !selectedJudgeId || !selectedContestantId) {
        throw new Error('Select event, contest, category, judge, and contestant first.')
      }

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('eventId', selectedEventId)
      formData.append('contestId', selectedContestId)
      formData.append('categoryId', selectedCategoryId)
      formData.append('contestantId', selectedContestantId)
      formData.append('representedJudgeId', selectedJudgeId)
      formData.append('templateKey', 'education_omr_v3')
      formData.append('preprocessingMode', preprocessingMode)
      formData.append('thresholdStrategy', thresholdStrategy)

      const response = await scoreFilesAPI.evaluateScoresheetImportUat(formData, { timeout: 60000 })
      return unwrapData<ScoresheetUatResult>(response)
    },
    {
      onSuccess: (payload) => {
        setResult(payload)
        setEvaluationCount((count) => count + 1)
        toast.success('Evaluation complete')
      },
      onError: () => {
        setResult(null)
        toast.error('Evaluation failed')
      },
    },
  )

  const resetResultForContextChange = () => {
    setResult(null)
    evaluateMutation.reset()
  }

  const runEvaluation = () => {
    void evaluateMutation.mutate()
  }

  const formReady = Boolean(
    selectedEventId &&
      selectedContestId &&
      selectedCategoryId &&
      selectedJudgeId &&
      selectedContestantId &&
      selectedFile &&
      canEvaluateUpload,
  )

  const uploadErrorMessage = evaluateMutation.isError ? getErrorMessage(evaluateMutation.error) : ''
  const uploadFailure = uploadErrorMessage ? classifyFailure(uploadErrorMessage) : null

  const qualityIssues = useMemo(() => {
    if (!result) return [] as Array<{ title: string; detail: string; tone?: 'warn' | 'bad' | 'info' }>
    const issues: Array<{ title: string; detail: string; tone?: 'warn' | 'bad' | 'info' }> = []
    const blockingReasons = result.extraction.qualityGate.blockingReasons.join(' ')
    const allReasons = [...result.extraction.qualityGate.blockingReasons, ...result.extraction.qualityGate.reasons]

    if (!result.comparison.groundTruthAvailable) {
      issues.push({
        title: 'Missing ground truth',
        detail: 'Stored judge scores were not available for every row in this selected context.',
        tone: 'warn',
      })
    }

    if (/anchor|fiducial|version strip/i.test(blockingReasons)) {
      issues.push({
        title: 'Missing anchors',
        detail: 'The machine-readable anchors were below the quality threshold.',
        tone: 'bad',
      })
    }

    if ((result.extraction.markQuality?.rejectedRowCount || 0) > 0) {
      issues.push({
        title: 'Rejected marks',
        detail: `${result.extraction.markQuality?.rejectedRowCount || 0} row(s) were rejected because marks were missing, duplicated, or low-confidence.`,
        tone: 'bad',
      })
    }

    if (result.comparison.falseHighConfidenceMarkCount > 0) {
      issues.push({
        title: 'False high-confidence marks',
        detail: `${result.comparison.falseHighConfidenceMarkCount} confident mark(s) disagreed with stored scores.`,
        tone: 'bad',
      })
    }

    allReasons
      .filter((reason) => reason && !/anchor|fiducial|version strip|mark/i.test(reason))
      .slice(0, 3)
      .forEach((reason) => {
        issues.push({
          title: 'Quality gate signal',
          detail: reason,
          tone: result.routingRecommendation.decision === 'manual_entry_required' ? 'warn' : 'info',
        })
      })

    return issues
  }, [result])

  return (
    <div className="cgr-page-container space-y-6" data-testid="scoresheet-import-uat-page">
      <PageHeader
        title="Scoresheet Import UAT"
        subtitle="Parse-only v3 phone capture evaluation against stored judge scores."
        icon={BeakerIcon}
      />

      <IssueCallout
        tone="info"
        title="Evaluation-only"
        detail="This workflow reads the uploaded image and stored scores, then returns comparison data without writing score records."
      />

      {!canEvaluateUpload && (
        <IssueCallout
          tone="warn"
          title="Upload evaluation is not available"
          detail="Your current permission set can view this page but cannot run the parse-only upload evaluation."
        />
      )}

      <Card className="p-6">
        <div className="grid gap-4 lg:grid-cols-5">
          <div>
            <label htmlFor="scoresheet-uat-event" className={labelClass}>Event</label>
            <select
              id="scoresheet-uat-event"
              value={selectedEventId}
              className={clsx(inputClass, 'mt-1')}
              disabled={categoriesQuery.isLoading}
              onChange={(event) => {
                setSelectedEventId(event.target.value)
                setSelectedContestId('')
                setSelectedCategoryId('')
                setSelectedJudgeId('')
                setSelectedContestantId('')
                resetResultForContextChange()
              }}
            >
              <option value="">Select event</option>
              {eventOptions.map((event) => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="scoresheet-uat-contest" className={labelClass}>Contest</label>
            <select
              id="scoresheet-uat-contest"
              value={selectedContestId}
              className={clsx(inputClass, 'mt-1')}
              disabled={!selectedEventId}
              onChange={(event) => {
                setSelectedContestId(event.target.value)
                setSelectedCategoryId('')
                setSelectedJudgeId('')
                setSelectedContestantId('')
                resetResultForContextChange()
              }}
            >
              <option value="">Select contest</option>
              {contestOptions.map((contest) => (
                <option key={contest.id} value={contest.id}>{contest.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="scoresheet-uat-category" className={labelClass}>Category</label>
            <select
              id="scoresheet-uat-category"
              value={selectedCategoryId}
              className={clsx(inputClass, 'mt-1')}
              disabled={!selectedContestId}
              onChange={(event) => {
                setSelectedCategoryId(event.target.value)
                setSelectedJudgeId('')
                setSelectedContestantId('')
                resetResultForContextChange()
              }}
            >
              <option value="">Select category</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="scoresheet-uat-judge" className={labelClass}>Judge</label>
            <select
              id="scoresheet-uat-judge"
              value={selectedJudgeId}
              className={clsx(inputClass, 'mt-1')}
              disabled={!selectedCategoryId || judgeOptions.length === 0}
              onChange={(event) => {
                setSelectedJudgeId(event.target.value)
                resetResultForContextChange()
              }}
            >
              <option value="">Select judge</option>
              {judgeOptions.map((judge) => (
                <option key={judge.id} value={judge.id}>
                  {judge.name}{judge.email ? ` (${judge.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="scoresheet-uat-contestant" className={labelClass}>Contestant</label>
            <select
              id="scoresheet-uat-contestant"
              value={selectedContestantId}
              className={clsx(inputClass, 'mt-1')}
              disabled={!selectedCategoryId || contestantOptions.length === 0}
              onChange={(event) => {
                setSelectedContestantId(event.target.value)
                resetResultForContextChange()
              }}
            >
              <option value="">Select contestant</option>
              {contestantOptions.map((contestant) => (
                <option key={contestant.id} value={contestant.id}>
                  {contestant.contestantNumber ? `#${contestant.contestantNumber} ` : ''}{contestant.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_180px_180px_auto]">
          <div>
            <label htmlFor="scoresheet-uat-file" className={labelClass}>Phone capture</label>
            <input
              id="scoresheet-uat-file"
              type="file"
              accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
              className={clsx(inputClass, 'mt-1')}
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] || null)
                resetResultForContextChange()
              }}
            />
          </div>
          <div>
            <label htmlFor="scoresheet-uat-preprocessing" className={labelClass}>Preprocessing</label>
            <select
              id="scoresheet-uat-preprocessing"
              value={preprocessingMode}
              className={clsx(inputClass, 'mt-1')}
              onChange={(event) => {
                setPreprocessingMode(event.target.value as 'standard' | 'scan_bw')
                resetResultForContextChange()
              }}
            >
              <option value="scan_bw">Scan B/W</option>
              <option value="standard">Standard</option>
            </select>
          </div>
          <div>
            <label htmlFor="scoresheet-uat-threshold" className={labelClass}>Threshold</label>
            <select
              id="scoresheet-uat-threshold"
              value={thresholdStrategy}
              className={clsx(inputClass, 'mt-1')}
              onChange={(event) => {
                setThresholdStrategy(event.target.value as typeof thresholdStrategy)
                resetResultForContextChange()
              }}
            >
              <option value="otsu">Otsu</option>
              <option value="none">None</option>
              <option value="fixed_150">Fixed 150</option>
              <option value="fixed_170">Fixed 170</option>
              <option value="fixed_190">Fixed 190</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={runEvaluation}
              disabled={!formReady}
              loading={evaluateMutation.isLoading}
              className="w-full gap-2 lg:w-auto"
            >
              <CloudArrowUpIcon className="h-4 w-4" />
              Evaluate upload
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          <span>Template: education_omr_v3</span>
          <span>Session evaluations: {evaluationCount}</span>
          {selectedContextLocked && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              Certified or locked context
            </span>
          )}
        </div>
      </Card>

      {categoriesQuery.isError && (
        <IssueCallout
          tone="bad"
          title="Context failed to load"
          detail="Scoring categories could not be loaded for this account."
        />
      )}

      {uploadFailure && (
        <IssueCallout tone="bad" title={uploadFailure.title} detail={uploadFailure.detail} />
      )}

      {result && (
        <div className="space-y-6" data-testid="scoresheet-import-uat-result">
          <Card className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Evaluation result</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {result.context.eventName} / {result.context.contestName} / {result.context.categoryName}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {result.context.judgeName} for {result.context.contestantName}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <DecisionBadge decision={result.routingRecommendation.decision} />
                {result.context.certifiedOrLocked && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    Certified or locked
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Exact rows"
                value={`${result.comparison.exactRowCount}/${result.comparison.rowCount}`}
                tone={result.comparison.exactRowCount === result.comparison.rowCount ? 'good' : 'warn'}
              />
              <Metric label="Expected total" value={formatScore(result.comparison.expectedTotal)} />
              <Metric label="Computed total" value={formatScore(result.comparison.computedTotal)} />
              <Metric
                label="Total delta"
                value={formatScore(result.comparison.totalDelta)}
                tone={result.comparison.totalDelta === 0 ? 'good' : result.comparison.totalDelta === null ? 'warn' : 'bad'}
              />
              <Metric
                label="Ambiguous rows"
                value={result.comparison.ambiguousRowCount}
                tone={result.comparison.ambiguousRowCount === 0 ? 'good' : 'warn'}
              />
              <Metric
                label="Rejected rows"
                value={result.comparison.rejectedRowCount}
                tone={result.comparison.rejectedRowCount === 0 ? 'good' : 'bad'}
              />
              <Metric
                label="False high confidence"
                value={result.comparison.falseHighConfidenceMarkCount}
                tone={result.comparison.falseHighConfidenceMarkCount === 0 ? 'good' : 'bad'}
              />
              <Metric label="Match rate" value={formatPercent(result.comparison.exactRowMatchRate)} />
            </div>
          </Card>

          {qualityIssues.length > 0 && (
            <div className="grid gap-3 lg:grid-cols-2">
              {qualityIssues.map((issue, index) => (
                <IssueCallout
                  key={`${issue.title}-${index}`}
                  title={issue.title}
                  detail={issue.detail}
                  tone={issue.tone}
                />
              ))}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Routing</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Decision</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{formatReason(result.routingRecommendation.decision)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Retryable</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{result.routingRecommendation.retryable ? 'Yes' : 'No'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Attempt limit</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{result.routingRecommendation.attemptLimit}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Attempt ledger</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">Not applied</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Anchor quality</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Detected</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{result.extraction.anchorQuality?.detected ? 'Yes' : 'No'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Fiducials</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{result.extraction.anchorQuality?.fiducials?.detected ? 'Yes' : 'No'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Fiducial confidence</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{formatPercent(result.extraction.anchorQuality?.fiducials?.confidence)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Version confidence</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{formatPercent(result.extraction.anchorQuality?.versionStripConfidence)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Min corner ratio</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{formatRatio(result.extraction.anchorQuality?.minCornerDarkRatio)}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mark quality</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Accepted</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{result.extraction.markQuality?.acceptedRowCount ?? 'N/A'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Missing</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{result.extraction.markQuality?.missingMarkRowCount ?? 'N/A'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Multi-mark</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{result.extraction.markQuality?.multiMarkRowCount ?? 'N/A'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Low confidence</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{result.extraction.markQuality?.lowConfidenceRowCount ?? 'N/A'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Overall confidence</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{formatPercent(result.extraction.overallConfidence)}</dd>
                </div>
              </dl>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rows</h2>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Preprocessing: {result.extraction.preprocessingMode}</span>
                <span>Threshold: {result.extraction.thresholdStrategy}</span>
                <span>Image: {result.extraction.normalizedImage.width}x{result.extraction.normalizedImage.height}</span>
              </div>
            </div>
            <div className="mt-4">
              <ResponsiveTable caption="Scoresheet import UAT row comparison" minWidth="980px" enableCardView={false}>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Row</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Criterion</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Stored</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Extracted</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Match</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Confidence</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Flags</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cell ink</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-800">
                    {result.rows.map((row) => {
                      const flags = [
                        row.ambiguous ? 'Ambiguous' : null,
                        row.rejected && row.rejectionReason ? formatReason(row.rejectionReason) : null,
                        row.falseHighConfidenceMark ? 'False high confidence' : null,
                        row.exactMatch === false ? 'Mismatch' : null,
                        row.exactMatch === null ? 'No stored score' : null,
                      ].filter(Boolean)

                      return (
                        <tr key={row.criterionId}>
                          <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{row.rowIndex + 1}</td>
                          <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.criterionName}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{formatScore(row.expectedScore)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{formatScore(row.detectedScore)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-sm">
                            <span
                              className={clsx(
                                'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                                row.exactMatch === true && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
                                row.exactMatch === false && 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
                                row.exactMatch === null && 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
                              )}
                            >
                              {row.exactMatch === true ? 'Exact' : row.exactMatch === false ? 'Mismatch' : 'Unknown'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{formatPercent(row.confidence)}</td>
                          <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{flags.length > 0 ? flags.join(', ') : 'None'}</td>
                          <td className="px-3 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{row.cellInkScores.map((score) => score.toFixed(2)).join(', ')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </ResponsiveTable>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload details</h2>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">File</p>
                <p className="mt-1 break-all text-gray-900 dark:text-white">{result.upload.fileName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Normalized type</p>
                <p className="mt-1 text-gray-900 dark:text-white">{result.upload.normalizedFileType}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Converted</p>
                <p className="mt-1 text-gray-900 dark:text-white">{result.upload.converted ? formatReason(result.upload.conversionStrategy) : 'No'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Template version</p>
                <p className="mt-1 text-gray-900 dark:text-white">{result.templateVersion || result.templateKey}</p>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={runEvaluation} disabled={!formReady} loading={evaluateMutation.isLoading} className="gap-2">
              <ArrowPathIcon className="h-4 w-4" />
              Re-run evaluation
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScoreSheetImportUatPage
