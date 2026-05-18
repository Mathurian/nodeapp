import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useAuthPermissions from '../hooks/useAuthPermissions'
import { commentaryAPI, scoringAPI, scoreDelegationsAPI, scoreFilesAPI, usersAPI } from '../services/api'
import { useMobileWorkflowNavigation, useOptimisticMutation } from '../hooks'
import { Card, MobileWorkflowNav, OptimisticIndicator, OptimisticStatus, PageHeader } from '../components/ui'
import { createMutationIdempotencyKey, IDEMPOTENCY_HEADER } from '../services/idempotency'
import { executeWithRetry } from '../services/retryExecutor'
import { classifyNetworkError } from '../services/networkErrorClassifier'
import { enqueueMutation } from '../services/offlineMutationQueue'
import { startOfflineSyncOrchestrator } from '../services/offlineSyncOrchestrator'
import {
  createOfflineDraftId,
  deleteOfflineWorkflowDraft,
  getOfflineWorkflowDraft,
  saveOfflineWorkflowDraft,
} from '../services/offlineWorkflowStore'
import { matchOfflineWriteOwnership } from '../config/offlineWriteOwnership.manifest'
import { recordOfflineSyncTelemetryEvent } from '../services/offlineSyncTelemetry'
import { appendDocxPreviewQuery, inferFileNameFromPath, isDocxFile, isOfficeDocumentFile, openBlobDocument, openDocumentUrl } from '../utils/fileViewer'
import {
  TrophyIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilIcon,
  ArrowPathIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { compareCategories, compareContestants, compareContests, stableSort } from '../utils/listOrdering'
import { hasPermissionAction, permissionSetFromList } from '../utils/pageAccess'

type CommentaryMode = 'PER_CRITERION' | 'PER_CATEGORY' | 'HYBRID'
type CommentaryScope = 'CATEGORY' | 'CONTEST' | 'EVENT'

interface Category {
  id: string
  name: string
  description: string | null
  scoreCap: number | null
  commentaryMode?: CommentaryMode
  commentaryScope?: CommentaryScope
  contest: {
    id: string
    name: string
    event: {
      id: string
      name: string
    }
  }
  _count: {
    scores: number
    categoryContestants: number
  }
}

interface Contestant {
  id: string
  userId?: string | null
  name: string
  contestantNumber: number | null
  bio: string | null
  imagePath: string | null
  bioFilePath?: string | null
}

interface Criterion {
  id: string
  name: string
  maxScore: number
  weight: number
  description: string | null
}

interface Score {
  id: string
  contestantId: string
  judgeId: string
  categoryId: string
  criterionId: string | null
  score: number
  deduction: number
  comment: string | null
  isCertified?: boolean
  isLocked?: boolean
  certifiedAt?: Date | null
  isSigned: boolean
  signedAt: Date | null
  createdAt: Date
  updatedAt: Date
  _optimistic?: boolean
}

interface ScoreFormData {
  criterionId: string
  score: number | ''
  comment: string
}

type ScoreWriteReliabilityOutcome = 'persisted' | 'queued'
type CategoryCommentPersistOutcome = ScoreWriteReliabilityOutcome | 'unchanged'
type ReliabilityOptions = {
  notifyOnQueued?: boolean
  summary?: string | null
}

interface ScoreAttachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  filePath: string
  publicUrl?: string
  metadata?: {
    contextType?: 'CRITERION_COMMENT' | 'CONTESTANT' | 'CATEGORY' | 'SCORESHEET_IMPORT'
    criterionId?: string | null
    noteText?: string | null
    intent?: 'COMMENTARY_ATTACHMENT' | 'SCORESHEET_IMPORT'
  } | null
}

interface ScoreSheetImportCriterionDraft {
  rowIndex: number
  criterionId: string
  criterionName: string
  detectedScore: number | null
  detectedColumnLabel: string | null
  confidence: number
  ambiguous: boolean
}

interface ScoreSheetImportDraft {
  id: string
  scoreFileId: string
  status: string
  templateKey: string | null
  processingError: string | null
  computedTotal: number | null
  overallConfidence: number | null
  extraction: {
    criteria: ScoreSheetImportCriterionDraft[]
    mismatchWarnings?: string[]
  } | null
}

interface ScoreSheetImportReviewEntry {
  criterionId: string
  score: number | ''
}

interface PendingCommentaryFile {
  id: string
  file: File
  fileName: string
  criterionId?: string
}

interface ContestOption {
  id: string
  name: string
  eventName: string
}

interface ContestantPrivateDocument {
  id: string
  originalName: string
  uploadedAt: string
  mimeType: string
}

interface ContestantPrivateProfile {
  accommodations: string | null
  privateNotes: string | null
  recommendationNotes: string | null
  privateDocuments: ContestantPrivateDocument[]
}

interface DelegatedJudgeOption {
  judgeId: string
  judgeName: string
  judgeEmail: string | null
  grantIds: string[]
  coverageModes: Array<'SELECTED_JUDGES' | 'ALL_JUDGES_IN_SCOPE'>
}

interface ScoringWorkspaceDraft {
  selectedContestId: string
  selectedContestName?: string | null
  selectedCategoryId: string | null
  selectedCategoryName?: string | null
  selectedContestantId: string | null
  selectedContestantName?: string | null
  selectedContestantNumber?: number | null
  representedJudgeId?: string | null
  scoreFormData: Record<string, ScoreFormData>
  categoryComment: string
  isSignOffChecked: boolean
  hasPendingLocalChanges: boolean
  updatedAt: string
}

const normalizeScoreDraftFormData = (scoreFormData: Record<string, ScoreFormData>) => (
  Object.keys(scoreFormData)
    .sort()
    .reduce<Record<string, ScoreFormData>>((acc, criterionId) => {
      const entry = scoreFormData[criterionId]
      acc[criterionId] = {
        criterionId: entry.criterionId,
        score: entry.score,
        comment: entry.comment,
      }
      return acc
    }, {})
)

const buildScoreFormDataFromExistingScores = (
  criteria: Criterion[],
  scores: Score[],
): Record<string, ScoreFormData> => {
  const initialFormData: Record<string, ScoreFormData> = {}

  criteria.forEach((criterion) => {
    const existingScore = criterion.id === '__category_total__'
      ? scores.find((score) => !score.criterionId)
      : scores.find((score) => score.criterionId === criterion.id)

    initialFormData[criterion.id] = {
      criterionId: criterion.id,
      score: existingScore?.score ?? '',
      comment: existingScore?.comment || '',
    }
  })

  return initialFormData
}

const scoringDraftPayloadSignature = (draft: Partial<ScoringWorkspaceDraft> | null | undefined): string | null => {
  if (!draft) {
    return null
  }

  return JSON.stringify({
    selectedContestId: draft.selectedContestId || '',
    selectedContestName: draft.selectedContestName || '',
    selectedCategoryId: draft.selectedCategoryId || '',
    selectedCategoryName: draft.selectedCategoryName || '',
    selectedContestantId: draft.selectedContestantId || '',
    selectedContestantName: draft.selectedContestantName || '',
    selectedContestantNumber: draft.selectedContestantNumber ?? null,
    representedJudgeId: draft.representedJudgeId || '',
    scoreFormData: normalizeScoreDraftFormData(draft.scoreFormData || {}),
    categoryComment: draft.categoryComment || '',
    isSignOffChecked: Boolean(draft.isSignOffChecked),
    hasPendingLocalChanges: draft.hasPendingLocalChanges !== false,
  })
}

const isOptimisticScoreRecord = (score: Pick<Score, 'id' | '_optimistic'>): boolean => (
  Boolean(score._optimistic) || String(score.id || '').startsWith('optimistic-')
)

const OFFLINE_MUTATION_QUEUE_ENABLED = import.meta.env.VITE_OFFLINE_MUTATION_QUEUE_ENABLED !== 'false'
const SCORING_DRAFT_WORKFLOW = 'scoring-workspace'
const SCORING_DRAFT_SCOPE = 'active'

const getImageUrl = (path?: string | null): string | null => {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const normalized = path.startsWith('/uploads/bios/')
    ? path.replace('/uploads/bios/', '/uploads/users/bios/')
    : path
  const match = normalized.match(/\/uploads\/(?:users\/bios|users|bios)\/([^/?#]+)/i)
  if (match?.[1]) {
    if (normalized.includes('/uploads/users/bios/')) return normalized
    if (normalized.includes('/uploads/users/')) return normalized
    return `/uploads/users/bios/${encodeURIComponent(match[1])}`
  }
  if (normalized.startsWith('/')) return normalized
  return `/${normalized}`
}

const getFileUrl = (path?: string | null): string | null => {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const normalized = path.startsWith('/uploads/bios/')
    ? path.replace('/uploads/bios/', '/uploads/users/bios/')
    : path
  const match = normalized.match(/\/uploads\/(?:users\/bios|bios)\/([^/?#]+)/i)
  if (match?.[1]) {
    if (normalized.includes('/uploads/users/bios/')) return normalized
    return `/uploads/users/bios/${encodeURIComponent(match[1])}`
  }
  if (normalized.startsWith('/')) return normalized
  return `/${normalized}`
}

const getBioApiFileUrl = (path?: string | null): string | null => {
  if (!path) return null
  const normalized = path.startsWith('/uploads/bios/')
    ? path.replace('/uploads/bios/', '/uploads/users/bios/')
    : path
  const match = normalized.match(/\/uploads\/(?:users\/bios|bios)\/([^/?#]+)/i)
  if (!match?.[1]) return null
  return `/api/v1/bios/files/${encodeURIComponent(match[1])}`
}

const openBioFile = async (path?: string | null) => {
  const apiUrl = getBioApiFileUrl(path)
  const fallbackUrl = getFileUrl(path)
  const targetUrl = apiUrl || fallbackUrl
  if (!targetUrl) return
  const fileName = inferFileNameFromPath(path)
  const docxPreviewUrl = appendDocxPreviewQuery(targetUrl)

  if (isDocxFile(fileName)) {
    const opened = openDocumentUrl(docxPreviewUrl, {
      preferSameTabInStandalone: true,
      allowSameTabFallback: false,
    })
    if (!opened && fallbackUrl && fallbackUrl !== targetUrl) {
      openDocumentUrl(appendDocxPreviewQuery(fallbackUrl), {
        preferSameTabInStandalone: true,
        allowSameTabFallback: false,
      })
    }
    return
  }

  if (isOfficeDocumentFile(fileName)) {
    const opened = openDocumentUrl(targetUrl, {
      preferSameTabInStandalone: true,
      allowSameTabFallback: false,
    })
    if (!opened && fallbackUrl && fallbackUrl !== targetUrl) {
      openDocumentUrl(fallbackUrl, {
        preferSameTabInStandalone: false,
        allowSameTabFallback: false,
      })
    }
    return
  }

  try {
    const response = await fetch(targetUrl, { credentials: 'include' })
    if (!response.ok) throw new Error(`Failed (${response.status})`)
    const blob = await response.blob()
    const opened = openBlobDocument({
      blob,
      fileName,
    })
    if (!opened && fallbackUrl) {
      openDocumentUrl(fallbackUrl, {
        preferSameTabInStandalone: true,
        allowSameTabFallback: false,
      })
    }
  } catch {
    if (fallbackUrl) {
      openDocumentUrl(fallbackUrl, {
        preferSameTabInStandalone: true,
        allowSameTabFallback: false,
      })
    }
  }
}

const ScoringPage: React.FC = () => {
  const { user } = useAuth()
  const { data: permissionsPayload } = useAuthPermissions({ enabled: Boolean(user) })
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isDelegateUser = user?.role === 'DELEGATE'
  const canViewPrivateContestantProfile = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE'].includes(user?.role || '')

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedContestId, setSelectedContestId] = useState<string>('')
  const [selectedContestant, setSelectedContestant] = useState<Contestant | null>(null)
  const [representedJudgeId, setRepresentedJudgeId] = useState<string>('')
  const [scoreFormData, setScoreFormData] = useState<Record<string, ScoreFormData>>({})
  const [categoryComment, setCategoryComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSignOffChecked, setIsSignOffChecked] = useState(false)
  const [saveStatus, setSaveStatus] = useState<OptimisticStatus>('idle')
  const [uploadingContext, setUploadingContext] = useState<string | null>(null)
  const [updatingCommentary, setUpdatingCommentary] = useState(false)
  const [pendingCommentaryFiles, setPendingCommentaryFiles] = useState<PendingCommentaryFile[]>([])
  const [selectedScoreSheetImportFileId, setSelectedScoreSheetImportFileId] = useState<string>('')
  const [processingScoreSheetImportFileId, setProcessingScoreSheetImportFileId] = useState<string | null>(null)
  const [scoreSheetImportReview, setScoreSheetImportReview] = useState<Record<string, ScoreSheetImportReviewEntry>>({})
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [typedSignature, setTypedSignature] = useState('')
  const [drawnSignatureData, setDrawnSignatureData] = useState('')
  const [isDrawingSignature, setIsDrawingSignature] = useState(false)
  const [queueMetrics, setQueueMetrics] = useState({ queuedCount: 0, failedCount: 0, syncingCount: 0 })
  const [restoredDraft, setRestoredDraft] = useState<ScoringWorkspaceDraft | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [draftRestoreResolved, setDraftRestoreResolved] = useState(false)

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/scoring'
  const basePath = currentPath.replace(/\/scoring\/?$/, '')
  const signatureCanvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const categorySectionRef = React.useRef<HTMLDivElement | null>(null)
  const contestantSectionRef = React.useRef<HTMLDivElement | null>(null)
  const scoreSheetSectionRef = React.useRef<HTMLDivElement | null>(null)
  const criteriaSectionRef = React.useRef<HTMLDivElement | null>(null)
  const scoringActionsRef = React.useRef<HTMLDivElement | null>(null)
  const initializedSelectionRef = React.useRef<string | null>(null)
  const initializedScoreSheetImportDraftRef = React.useRef<string | null>(null)
  const restoredSelectionDraftKeyRef = React.useRef<string | null>(null)
  const announcedRestoredDraftKeyRef = React.useRef<string | null>(null)
  const handledResumeRequestRef = React.useRef<number | null>(null)
  const pendingSyncDrainRef = React.useRef(false)
  const localEditSelectionKeyRef = React.useRef<string | null>(null)
  const { scrollToRef, scrollToTop } = useMobileWorkflowNavigation()
  const permissionSet = useMemo(
    () => permissionSetFromList(permissionsPayload?.permissions || []),
    [permissionsPayload],
  )
  const canRequestScoreGovernance = hasPermissionAction(permissionSet, 'score-governance:request')
  const canReadScoreFiles = hasPermissionAction(permissionSet, 'score-files:read')
  const canUploadScoreFiles = hasPermissionAction(permissionSet, 'score-files:upload')
  const canDeleteScoreFiles = hasPermissionAction(permissionSet, 'score-files:delete')
  const canUseDelegatedScoring = hasPermissionAction(permissionSet, 'delegated-scores:write')
    && hasPermissionAction(permissionSet, 'score-delegations:read')
  const selfJudgeId = (user as { judgeId?: string } | null)?.judgeId || user?.judge?.id || ''
  const effectiveRepresentedJudgeId = representedJudgeId || selfJudgeId || ''
  const isDelegatedMode = Boolean(
    effectiveRepresentedJudgeId &&
      (!selfJudgeId || effectiveRepresentedJudgeId !== selfJudgeId),
  )
  const requiresSignOff = user?.role === 'JUDGE' && !isDelegatedMode
  const commentaryMode = selectedCategory?.commentaryMode || 'PER_CRITERION'
  const commentaryScope = selectedCategory?.commentaryScope || 'CATEGORY'
  const supportsCriterionCommentary = commentaryMode !== 'PER_CATEGORY'
  const supportsCategoryCommentary = commentaryMode === 'PER_CATEGORY' || commentaryMode === 'HYBRID'
  const sharedCommentaryScopeKey = selectedCategory
    ? commentaryScope === 'EVENT'
      ? `event:${selectedCategory.contest.event.id}`
      : commentaryScope === 'CONTEST'
        ? `contest:${selectedCategory.contest.id}`
        : `category:${selectedCategory.id}`
    : 'category:none'
  const sharedCommentaryLabel = commentaryScope === 'EVENT'
    ? 'Event Commentary'
    : commentaryScope === 'CONTEST'
      ? 'Contest Commentary'
      : 'Category Commentary'
  const hasPendingScoreSync =
    queueMetrics.queuedCount > 0 ||
    queueMetrics.failedCount > 0 ||
    queueMetrics.syncingCount > 0 ||
    ['saving', 'retrying', 'queued', 'syncing', 'failed'].includes(saveStatus)

  const hasExplicitScoreValue = (value: ScoreFormData['score']): value is number => (
    value !== '' && Number.isFinite(Number(value))
  )

  const offlineOwner = useMemo(
    () => ({
      ownerUserId: user?.id || null,
      ownerTenantId: user?.tenantId || user?.tenant?.id || null,
    }),
    [user?.id, user?.tenantId, user?.tenant?.id],
  )

  useEffect(() => {
    if (!OFFLINE_MUTATION_QUEUE_ENABLED) return
    return startOfflineSyncOrchestrator((metrics) => {
      setQueueMetrics(metrics)
      if (metrics.syncingCount > 0) {
        setSaveStatus('syncing')
      } else if (metrics.queuedCount === 0 && saveStatus === 'syncing') {
        setSaveStatus('saved')
      }
    })
  }, [saveStatus])

  useEffect(() => {
    if (!OFFLINE_MUTATION_QUEUE_ENABLED) {
      pendingSyncDrainRef.current = false
      return
    }

    const hasPendingOfflineWrites =
      queueMetrics.queuedCount > 0 || queueMetrics.failedCount > 0 || queueMetrics.syncingCount > 0

    if (pendingSyncDrainRef.current && !hasPendingOfflineWrites) {
      void queryClient.invalidateQueries(['contestant-scores'])
      void queryClient.invalidateQueries(['category-comment'])
      void queryClient.invalidateQueries(['score-attachments'])
      void queryClient.invalidateQueries(['scoring-categories'])
    }

    pendingSyncDrainRef.current = hasPendingOfflineWrites
  }, [
    queryClient,
    queueMetrics.failedCount,
    queueMetrics.queuedCount,
    queueMetrics.syncingCount,
  ])

  useEffect(() => {
    let cancelled = false

    const loadDraft = async () => {
      if (!offlineOwner.ownerUserId) {
        if (!cancelled) {
          setRestoredDraft(null)
          setDraftLoaded(true)
        }
        return
      }

      const draft = await getOfflineWorkflowDraft(
        SCORING_DRAFT_WORKFLOW,
        SCORING_DRAFT_SCOPE,
        offlineOwner,
      )

      if (cancelled) return

      const payload = draft?.data as ScoringWorkspaceDraft | undefined
      setRestoredDraft(payload || null)
      setDraftLoaded(true)
    }

    setDraftLoaded(false)
    setDraftRestoreResolved(false)
    void loadDraft()

    return () => {
      cancelled = true
    }
  }, [offlineOwner])

  const executeMutationWithReliability = async (
    actionLabel: string,
    endpoint: string,
    method: 'POST' | 'PUT',
    payload: unknown,
    entityKey: string,
    runner: (headers: Record<string, string>) => Promise<void>,
    options: ReliabilityOptions = {},
  ): Promise<ScoreWriteReliabilityOutcome> => {
    const idempotencyKey = createMutationIdempotencyKey(actionLabel)
    const headers = { [IDEMPOTENCY_HEADER]: idempotencyKey }
    const notifyOnQueued = options.notifyOnQueued !== false
    const summary = options.summary || actionLabel

    try {
      setSaveStatus('saving')
      await executeWithRetry(
        async () => {
          await runner(headers)
        },
        undefined,
        {
          onRetry: () => setSaveStatus('retrying'),
        },
      )
      setSaveStatus('saved')
      return 'persisted'
    } catch (error) {
      const classification = classifyNetworkError(error)
      const ownership = matchOfflineWriteOwnership(method, endpoint)
      if (
        OFFLINE_MUTATION_QUEUE_ENABLED &&
        classification.retryable &&
        ownership?.queueOwner === 'app'
      ) {
        await enqueueMutation({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          endpoint,
          method,
          payload,
          headers,
          idempotencyKey,
          entityKey,
          ownerUserId: user?.id || null,
          ownerTenantId: user?.tenantId || user?.tenant?.id || null,
          summary,
        })
        void recordOfflineSyncTelemetryEvent(method, endpoint, 'enqueued', 'app', classification)
        setSaveStatus('queued')
        if (notifyOnQueued) {
          toast('Saved offline. Will sync automatically.')
        }
        return 'queued'
      }

      setSaveStatus(classification.retryable ? 'failed' : 'error')
      throw error
    }
  }

  // Scoring access requires either a linked judge context or delegated-scoring permission.
  const canAccessScoringWorkspace = Boolean(selfJudgeId || canUseDelegatedScoring)

  const { data: eligibleDelegatedJudges = [] } = useQuery<DelegatedJudgeOption[]>(
    ['eligible-delegated-judges', user?.id, selectedCategory?.id],
    async () => {
      if (!selectedCategory) return []
      const response = await scoreDelegationsAPI.getEligibleJudges(selectedCategory.id)
      const payload = response.data?.data ?? response.data
      return Array.isArray(payload) ? payload : []
    },
    {
      enabled: canUseDelegatedScoring && !!selectedCategory,
      retry: 1,
    },
  )

  useEffect(() => {
    if (selfJudgeId && !canUseDelegatedScoring) {
      setRepresentedJudgeId(selfJudgeId)
      return
    }

    if (!canUseDelegatedScoring) {
      return
    }

    if (selectedCategory && eligibleDelegatedJudges.length === 0) {
      setRepresentedJudgeId(selfJudgeId || '')
      return
    }

    if (
      effectiveRepresentedJudgeId &&
      effectiveRepresentedJudgeId === selfJudgeId
    ) {
      return
    }

    if (
      effectiveRepresentedJudgeId &&
      eligibleDelegatedJudges.some((judge) => judge.judgeId === effectiveRepresentedJudgeId)
    ) {
      return
    }

    if (selfJudgeId && !isDelegatedMode) {
      setRepresentedJudgeId(selfJudgeId)
      return
    }

    if (eligibleDelegatedJudges.length === 1) {
      setRepresentedJudgeId(eligibleDelegatedJudges[0].judgeId)
    }
  }, [
    canUseDelegatedScoring,
    effectiveRepresentedJudgeId,
    eligibleDelegatedJudges,
    isDelegatedMode,
    selectedCategory,
    selfJudgeId,
  ])

  // Fetch categories assigned to the judge
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery<Category[]>(
    ['scoring-categories', user?.id],
    async () => {
      const response = await scoringAPI.getCategories()
      // API wraps in { success, data: [...] }
      const unwrapped = response.data?.data ?? response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      enabled: canAccessScoringWorkspace,
      refetchInterval: 30000, // Refresh every 30 seconds
      retry: 1,
      onError: (err) => console.error('Fetch categories failed:', err),
    }
  )

  // Fetch contestants for selected category
  const { data: contestants, isLoading: contestantsLoading, error: contestantsError } = useQuery<Contestant[]>(
    ['category-contestants', selectedCategory?.id],
    async () => {
      if (!selectedCategory) return []
      // Get contestants from the category API
      const response = await scoringAPI.getCategories()
      const outer = response.data?.data ?? response.data
      const categories = Array.isArray(outer) ? outer : []
      const category = categories.find((cat: any) => cat.id === selectedCategory.id)
      return category?.contestants || []
    },
    {
      enabled: !!selectedCategory,
      retry: 1,
      onError: (err) => console.error('Fetch contestants failed:', err),
    }
  )

  const {
    data: contestantPrivateProfile,
    isLoading: contestantPrivateProfileLoading,
  } = useQuery<ContestantPrivateProfile | null>(
    ['contestant-private-profile', selectedContestant?.userId],
    async () => {
      if (!selectedContestant?.userId) return null
      const response = await usersAPI.getContestantPrivateProfile(selectedContestant.userId)
      const payload = response.data?.data ?? response.data
      return {
        accommodations: payload?.accommodations || null,
        privateNotes: payload?.privateNotes || null,
        recommendationNotes: payload?.recommendationNotes || null,
        privateDocuments: Array.isArray(payload?.privateDocuments) ? payload.privateDocuments : [],
      }
    },
    {
      enabled: canViewPrivateContestantProfile && !!selectedContestant?.userId,
      retry: 1,
      onError: (err) => console.error('Fetch contestant private profile failed:', err),
    }
  )

  // Fetch criteria for selected category
  const { data: criteria, isLoading: criteriaLoading, error: criteriaError } = useQuery<Criterion[]>(
    ['category-criteria', selectedCategory?.id],
    async () => {
      if (!selectedCategory) return []
      // Use the dedicated getCriteria endpoint
      const response = await scoringAPI.getCriteria(selectedCategory.id)
      const unwrapped = response.data?.data ?? response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      enabled: !!selectedCategory,
      retry: 1,
      onError: (err) => console.error('Fetch criteria failed:', err),
    }
  )

  // Fetch existing scores for selected contestant
  const { data: existingScores, error: existingScoresError, isLoading: existingScoresLoading } = useQuery<Score[]>(
    ['contestant-scores', selectedCategory?.id, selectedContestant?.id, effectiveRepresentedJudgeId],
    async () => {
      if (!selectedCategory || !selectedContestant || !effectiveRepresentedJudgeId) return []
      const response = await scoringAPI.getScores(selectedCategory.id, selectedContestant.id, effectiveRepresentedJudgeId)
      const unwrapped = response.data?.data ?? response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      enabled: !!selectedCategory && !!selectedContestant && !!effectiveRepresentedJudgeId,
      retry: 1,
      onError: (err) => console.error('Fetch existing scores failed:', err),
    }
  )

  const { data: scoreAttachments = [] } = useQuery<ScoreAttachment[]>(
    ['score-attachments', selectedCategory?.id, selectedContestant?.id, effectiveRepresentedJudgeId],
    async () => {
      if (!selectedCategory || !selectedContestant || !effectiveRepresentedJudgeId) return []
      const response = await scoreFilesAPI.getAll({
        categoryId: selectedCategory.id,
        contestantId: selectedContestant.id,
        judgeId: effectiveRepresentedJudgeId,
      })
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      enabled: !!selectedCategory && !!selectedContestant && !!effectiveRepresentedJudgeId && canReadScoreFiles,
      retry: 1,
    }
  )

  const { data: scoreSheetImportDraft, isFetching: isFetchingScoreSheetImportDraft } = useQuery<ScoreSheetImportDraft | null>(
    ['scoresheet-import-draft', selectedScoreSheetImportFileId],
    async () => {
      if (!selectedScoreSheetImportFileId) return null
      try {
        const response = await scoreFilesAPI.getScoresheetImportDraft(selectedScoreSheetImportFileId)
        return (response.data?.data ?? response.data) || null
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null
        }
        throw error
      }
    },
    {
      enabled: !!selectedScoreSheetImportFileId && canReadScoreFiles,
      retry: 1,
    },
  )

  const { data: existingCategoryComment = '' } = useQuery<string>(
    ['category-comment', sharedCommentaryScopeKey, selectedContestant?.id, effectiveRepresentedJudgeId],
    async () => {
      if (!selectedCategory || !selectedContestant || !effectiveRepresentedJudgeId) return ''
      const response = await commentaryAPI.getCategoryComment(
        selectedCategory.id,
        selectedContestant.id,
        effectiveRepresentedJudgeId,
      )
      const payload = response.data?.data ?? response.data
      return typeof payload?.comment === 'string' ? payload.comment : ''
    },
    {
      enabled: !!selectedCategory && !!selectedContestant && !!effectiveRepresentedJudgeId && supportsCategoryCommentary,
      retry: 1,
      onError: (err) => console.error('Fetch category comment failed:', err),
    }
  )

  const sortedCategories = useMemo<Category[]>(() => {
    if (!categories || categories.length === 0) return []
    return stableSort(categories, compareCategories)
  }, [categories])

  const assignedContests = useMemo<ContestOption[]>(() => {
    if (!categories || categories.length === 0) return []
    const contestMap = new Map<string, ContestOption>()
    for (const category of sortedCategories) {
      const contestId = category?.contest?.id
      if (!contestId || contestMap.has(contestId)) continue
      contestMap.set(contestId, {
        id: contestId,
        name: category.contest.name,
        eventName: category.contest.event?.name || '',
      })
    }
    return stableSort(Array.from(contestMap.values()), compareContests)
  }, [sortedCategories])

  const filteredCategories = useMemo<Category[]>(() => {
    if (sortedCategories.length === 0) return []
    if (!selectedContestId) return sortedCategories
    return sortedCategories.filter((category) => category.contest.id === selectedContestId)
  }, [sortedCategories, selectedContestId])
  const isDelegateGrantEmptyState = isDelegateUser && sortedCategories.length === 0

  const sortedContestants = useMemo<Contestant[]>(() => {
    if (!contestants || contestants.length === 0) return []
    return stableSort(contestants, compareContestants)
  }, [contestants])

  const normalizedExistingScores: Score[] = useMemo(() => (
    Array.isArray(existingScores)
      ? existingScores
      : ((existingScores as unknown as { scores?: Score[] })?.scores || [])
  ), [existingScores])

  const effectiveCriteria: Criterion[] = useMemo(() => (
    (criteria && criteria.length > 0)
      ? criteria
      : (selectedCategory
        ? [{
            id: '__category_total__',
            name: 'Category Total Score',
            maxScore: selectedCategory.scoreCap ?? 100,
            weight: 1,
            description: 'No criteria configured. Enter a single score for this category.',
          }]
        : [])
  ), [criteria, selectedCategory])

  const hasCertifiedScores = useMemo(
    () => normalizedExistingScores.some((score) => Boolean(score.isCertified || score.isLocked || score.certifiedAt)),
    [normalizedExistingScores]
  )
  const authoritativeScoreFormData = useMemo(
    () => buildScoreFormDataFromExistingScores(effectiveCriteria, normalizedExistingScores),
    [effectiveCriteria, normalizedExistingScores],
  )

  const activeSelectionKey = selectedCategory?.id && selectedContestant?.id
    ? `${selectedCategory.id}:${selectedContestant.id}`
    : null
  const hasLocalEditsForSelection = Boolean(
    activeSelectionKey && localEditSelectionKeyRef.current === activeSelectionKey,
  )
  const restoredDraftMatchesSelection = Boolean(
    activeSelectionKey &&
      restoredDraft?.selectedCategoryId === selectedCategory?.id &&
      restoredDraft?.selectedContestantId === selectedContestant?.id &&
      (restoredDraft?.representedJudgeId || selfJudgeId || '') === effectiveRepresentedJudgeId,
  )
  const draftInitializationKey = activeSelectionKey
    ? `${activeSelectionKey}:${restoredDraftMatchesSelection ? restoredDraft?.updatedAt || 'no-draft' : 'no-draft'}`
    : 'no-selection'
  const restoredDraftKey = restoredDraft
    ? [
        restoredDraft.updatedAt,
        restoredDraft.selectedContestId,
        restoredDraft.selectedCategoryId || '',
        restoredDraft.selectedContestantId || '',
        restoredDraft.representedJudgeId || '',
      ].join(':')
    : null
  const restoredDraftSelectionKey = restoredDraft
    ? [
        restoredDraft.selectedContestId || '',
        restoredDraft.selectedCategoryId || '',
        restoredDraft.selectedContestantId || '',
        restoredDraft.representedJudgeId || '',
      ].join(':')
    : null
  const resumeRequestedAt = (
    location.state as { resumeDraft?: boolean; resumeRequestedAt?: number } | null
  )?.resumeRequestedAt
  const scoreDraftHasMeaningfulChanges = useMemo(() => {
    if (!selectedContestant || effectiveCriteria.length === 0) {
      return false
    }

    return effectiveCriteria.some((criterion) => {
      const current = scoreFormData[criterion.id]
      if (!current) {
        return false
      }

      const existing = criterion.id === '__category_total__'
        ? normalizedExistingScores.find((score) => !score.criterionId)
        : normalizedExistingScores.find((score) => score.criterionId === criterion.id)

      const currentScore = hasExplicitScoreValue(current.score) ? Number(current.score) : null
      const existingScore = existing && Number.isFinite(Number(existing.score)) ? Number(existing.score) : null
      const currentComment = (current.comment || '').trim()
      const existingComment = (existing?.comment || '').trim()

      return currentScore !== existingScore || currentComment !== existingComment
    })
  }, [effectiveCriteria, normalizedExistingScores, scoreFormData, selectedContestant])
  const categoryCommentHasMeaningfulChanges = useMemo(() => {
    if (!supportsCategoryCommentary) {
      return false
    }

    return categoryComment.trim() !== existingCategoryComment.trim()
  }, [categoryComment, existingCategoryComment, supportsCategoryCommentary])

  useEffect(() => {
    localEditSelectionKeyRef.current = null
  }, [activeSelectionKey])

  // Initialize form state only when the selected scoring scope changes or when a matching draft loads.
  useEffect(() => {
    if (!activeSelectionKey || !selectedContestant || effectiveCriteria.length === 0) {
      initializedSelectionRef.current = null
      setCategoryComment('')
      setIsSignOffChecked(false)
      return
    }

    if (!restoredDraftMatchesSelection && existingScoresLoading) {
      return
    }

    if (initializedSelectionRef.current === draftInitializationKey) {
      return
    }

    const initialFormData = buildScoreFormDataFromExistingScores(
      effectiveCriteria,
      normalizedExistingScores,
    )

    if (restoredDraftMatchesSelection && restoredDraft?.scoreFormData) {
      Object.entries(restoredDraft.scoreFormData).forEach(([criterionId, draftValue]) => {
        if (initialFormData[criterionId]) {
          initialFormData[criterionId] = draftValue
        }
      })
    }

    setScoreFormData(initialFormData)
    setCategoryComment(
      !supportsCategoryCommentary
        ? ''
        : restoredDraftMatchesSelection
          ? restoredDraft?.categoryComment || ''
          : existingCategoryComment || '',
    )
    setIsSignOffChecked(restoredDraftMatchesSelection ? restoredDraft?.isSignOffChecked || false : false)
    initializedSelectionRef.current = draftInitializationKey
  }, [
    activeSelectionKey,
    draftInitializationKey,
    effectiveCriteria,
    existingScoresLoading,
    existingCategoryComment,
    normalizedExistingScores,
    restoredDraft,
    restoredDraftMatchesSelection,
    selectedContestant,
    supportsCategoryCommentary,
  ])

  useEffect(() => {
    if (!activeSelectionKey || !selectedContestant || effectiveCriteria.length === 0) {
      return
    }

    if (restoredDraftMatchesSelection) {
      return
    }

    if (existingScoresLoading || hasLocalEditsForSelection) {
      return
    }

    const currentScoreSignature = JSON.stringify(normalizeScoreDraftFormData(scoreFormData))
    const authoritativeScoreSignature = JSON.stringify(normalizeScoreDraftFormData(authoritativeScoreFormData))
    const nextCategoryComment = supportsCategoryCommentary ? existingCategoryComment || '' : ''

    if (
      currentScoreSignature === authoritativeScoreSignature &&
      categoryComment === nextCategoryComment
    ) {
      return
    }

    setScoreFormData(authoritativeScoreFormData)
    if (categoryComment !== nextCategoryComment) {
      setCategoryComment(nextCategoryComment)
    }
  }, [
    activeSelectionKey,
    authoritativeScoreFormData,
    categoryComment,
    existingScoresLoading,
    effectiveCriteria.length,
    existingCategoryComment,
    hasLocalEditsForSelection,
    isSignOffChecked,
    restoredDraftMatchesSelection,
    scoreFormData,
    selectedContestant,
    supportsCategoryCommentary,
  ])

  useEffect(() => {
    if (!selectedCategory || !selectedContestant) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      scrollToRef(criteriaSectionRef, { delayMs: 20, behavior: 'smooth' })
    }, 80)

    return () => window.clearTimeout(timeoutId)
  }, [scrollToRef, selectedCategory?.id, selectedContestant?.id])

  useEffect(() => {
    if (!draftLoaded) {
      return
    }

    if (assignedContests.length === 0) {
      setSelectedContestId('')
      setDraftRestoreResolved(true)
      return
    }

    if (!restoredDraft || !restoredDraftKey) {
      restoredSelectionDraftKeyRef.current = null
      setSelectedContestId((current) => {
        if (current && assignedContests.some((contest) => contest.id === current)) {
          return current
        }
        return assignedContests[0]?.id || ''
      })
      setDraftRestoreResolved(true)
      return
    }

    if (restoredSelectionDraftKeyRef.current === restoredDraftKey) {
      return
    }

    const desiredContestId =
      restoredDraft.selectedContestId &&
      assignedContests.some((contest) => contest.id === restoredDraft.selectedContestId)
        ? restoredDraft.selectedContestId
        : assignedContests[0]?.id || ''

    if (selectedContestId !== desiredContestId) {
      setSelectedContestId(desiredContestId)
      return
    }

    const restoredCategory =
      restoredDraft.selectedCategoryId
        ? filteredCategories.find((category) => category.id === restoredDraft.selectedCategoryId) || null
        : null
    if (restoredCategory && selectedCategory?.id !== restoredCategory.id) {
      setSelectedCategory(restoredCategory)
      return
    }

    const restoredContestant =
      restoredDraft.selectedContestantId
        ? sortedContestants.find((contestant) => contestant.id === restoredDraft.selectedContestantId) || null
        : null
    if (restoredContestant && selectedContestant?.id !== restoredContestant.id) {
      setSelectedContestant(restoredContestant)
      return
    }

    if (
      restoredDraft.representedJudgeId &&
      representedJudgeId !== restoredDraft.representedJudgeId
    ) {
      setRepresentedJudgeId(restoredDraft.representedJudgeId)
      return
    }

    restoredSelectionDraftKeyRef.current = restoredDraftKey
    setDraftRestoreResolved(true)
  }, [
    assignedContests,
    draftLoaded,
    filteredCategories,
    restoredDraft,
    restoredDraftKey,
    representedJudgeId,
    selectedCategory?.id,
    selectedContestId,
    selectedContestant?.id,
    sortedContestants,
  ])

  useEffect(() => {
    if (!draftLoaded) {
      return
    }

    if (!restoredDraft) {
      setDraftRestoreResolved(true)
      return
    }

    if (
      restoredSelectionDraftKeyRef.current === restoredDraftKey ||
      restoredSelectionDraftKeyRef.current === null
    ) {
      setDraftRestoreResolved(true)
    }
  }, [
    draftLoaded,
    restoredDraft,
    restoredDraftKey,
    selectedCategory?.id,
    selectedContestId,
    selectedContestant?.id,
  ])

  useEffect(() => {
    if (!draftRestoreResolved || !restoredDraft || !restoredDraftSelectionKey) {
      return
    }

    const restoredSelectionMatches =
      selectedContestId === restoredDraft.selectedContestId &&
      selectedCategory?.id === restoredDraft.selectedCategoryId &&
      selectedContestant?.id === restoredDraft.selectedContestantId &&
      (restoredDraft.representedJudgeId || '') === representedJudgeId

    if (!restoredSelectionMatches || announcedRestoredDraftKeyRef.current === restoredDraftSelectionKey) {
      return
    }

    announcedRestoredDraftKeyRef.current = restoredDraftSelectionKey
    const contestantLabel =
      restoredDraft.selectedContestantName ||
      (restoredDraft.selectedContestantNumber
        ? `Contestant #${restoredDraft.selectedContestantNumber}`
        : 'saved contestant')
    const categoryLabel = restoredDraft.selectedCategoryName || 'saved category'
    toast(`Resumed offline draft for ${contestantLabel} in ${categoryLabel}.`)
  }, [
    draftRestoreResolved,
    restoredDraft,
    restoredDraftSelectionKey,
    representedJudgeId,
    selectedCategory?.id,
    selectedContestId,
    selectedContestant?.id,
  ])

  useEffect(() => {
    if (!resumeRequestedAt || handledResumeRequestRef.current === resumeRequestedAt) {
      return
    }

    if (!draftRestoreResolved || !selectedCategory || !selectedContestant) {
      return
    }

    const scrollSheetIntoView = () => {
      scoreSheetSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const scrollToResumeTarget = () => {
      const firstScoreInput = scoreSheetSectionRef.current?.querySelector('input[type="number"]') as HTMLInputElement | null
      if (firstScoreInput) {
        scrollSheetIntoView()
        firstScoreInput.focus({ preventScroll: true })
        firstScoreInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return true
      }
      return false
    }

    const clearResumeState = () => {
      if (typeof window === 'undefined') {
        return
      }

      const historyState = window.history.state
      if (historyState && typeof historyState === 'object') {
        window.history.replaceState(
          {
            ...historyState,
            usr: null,
          },
          document.title,
          `${location.pathname}${location.search}${location.hash}`,
        )
      }
    }

    let cancelled = false

    const attemptResumeScroll = (attempt = 0) => {
      if (cancelled) {
        return
      }

      if (scrollToResumeTarget()) {
        handledResumeRequestRef.current = resumeRequestedAt
        return
      }

      if (attempt >= 15) {
        const targetRef = scoreSheetSectionRef.current ? scoreSheetSectionRef : contestantSectionRef
        targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        scrollToRef(targetRef, { delayMs: 20, behavior: 'smooth' })
        handledResumeRequestRef.current = resumeRequestedAt
        return
      }

      scrollSheetIntoView()
      window.setTimeout(() => {
        attemptResumeScroll(attempt + 1)
      }, 120)
    }

    const initialAttempt = window.setTimeout(() => {
      attemptResumeScroll()
    }, 80)

    clearResumeState()

    return () => {
      cancelled = true
      window.clearTimeout(initialAttempt)
    }
  }, [
    draftRestoreResolved,
    location.hash,
    location.pathname,
    location.search,
    resumeRequestedAt,
    scrollToRef,
    selectedCategory,
    selectedContestant,
  ])

  useEffect(() => {
    if (!selectedCategory) return
    if (selectedContestId && selectedCategory.contest.id !== selectedContestId) {
      setSelectedCategory(null)
      setSelectedContestant(null)
    }
  }, [selectedCategory, selectedContestId])

  useEffect(() => {
    if (!selectedCategory) return
    const nextSelectedCategory = filteredCategories.find((category) => category.id === selectedCategory.id) || null
    if (!nextSelectedCategory) {
      setSelectedCategory(null)
      setSelectedContestant(null)
      return
    }
    if (nextSelectedCategory !== selectedCategory) {
      setSelectedCategory(nextSelectedCategory)
    }
  }, [filteredCategories, selectedCategory])

  useEffect(() => {
    if (!selectedContestant) return
    const nextSelectedContestant = sortedContestants.find((contestant) => contestant.id === selectedContestant.id) || null
    if (!nextSelectedContestant) {
      setSelectedContestant(null)
      return
    }
    if (nextSelectedContestant !== selectedContestant) {
      setSelectedContestant(nextSelectedContestant)
    }
  }, [selectedContestant, sortedContestants])

  useEffect(() => {
    if (!draftLoaded || !draftRestoreResolved || !offlineOwner.ownerUserId) return

    const restoredDraftHasContent = Boolean(
      restoredDraft?.hasPendingLocalChanges &&
        (Object.keys(restoredDraft.scoreFormData || {}).length > 0 ||
          restoredDraft.categoryComment ||
          restoredDraft.isSignOffChecked)
    )
    const awaitingDraftContentHydration = Boolean(
      restoredDraftMatchesSelection &&
        restoredDraftHasContent &&
        initializedSelectionRef.current !== draftInitializationKey,
    )

    if (awaitingDraftContentHydration) {
      return
    }

    if (!restoredDraftMatchesSelection && existingScoresLoading) {
      return
    }

    const hasMeaningfulDraftState = Boolean(
      activeSelectionKey &&
        (scoreDraftHasMeaningfulChanges || categoryCommentHasMeaningfulChanges || isSignOffChecked),
    )
    const hasDraftContent = Boolean(
      scoreDraftHasMeaningfulChanges || categoryCommentHasMeaningfulChanges || isSignOffChecked,
    )

    const persistDraft = async () => {
      if (!activeSelectionKey && hasDraftContent) {
        return
      }

      if (!activeSelectionKey && restoredDraftHasContent) {
        return
      }

      if (!hasMeaningfulDraftState) {
        await deleteOfflineWorkflowDraft(createOfflineDraftId(SCORING_DRAFT_WORKFLOW, SCORING_DRAFT_SCOPE))
        setRestoredDraft(null)
        return
      }

      const selectedContest = assignedContests.find((contest) => contest.id === selectedContestId)
      const nextDraft: ScoringWorkspaceDraft = {
        selectedContestId,
        selectedContestName: selectedContest?.name || null,
        selectedCategoryId: selectedCategory?.id || null,
        selectedCategoryName: selectedCategory?.name || null,
        selectedContestantId: selectedContestant?.id || null,
        selectedContestantName: selectedContestant?.name || null,
        selectedContestantNumber: selectedContestant?.contestantNumber ?? null,
        representedJudgeId: effectiveRepresentedJudgeId || null,
        scoreFormData,
        categoryComment,
        isSignOffChecked,
        hasPendingLocalChanges: true,
        updatedAt: new Date().toISOString(),
      }

      if (scoringDraftPayloadSignature(restoredDraft) === scoringDraftPayloadSignature(nextDraft)) {
        return
      }

      await saveOfflineWorkflowDraft({
        workflowType: SCORING_DRAFT_WORKFLOW,
        scopeKey: SCORING_DRAFT_SCOPE,
        ownerUserId: offlineOwner.ownerUserId,
        ownerTenantId: offlineOwner.ownerTenantId,
        data: nextDraft,
      })
      setRestoredDraft(nextDraft)
    }

    const timeoutId = window.setTimeout(() => {
      void persistDraft()
    }, 150)

    return () => window.clearTimeout(timeoutId)
  }, [
    categoryComment,
    draftLoaded,
    draftRestoreResolved,
    activeSelectionKey,
    assignedContests,
    categoryCommentHasMeaningfulChanges,
    restoredDraft,
    isSignOffChecked,
    offlineOwner.ownerTenantId,
    offlineOwner.ownerUserId,
    existingScoresLoading,
    scoreDraftHasMeaningfulChanges,
    scoreFormData,
    effectiveRepresentedJudgeId,
    selectedCategory?.id,
    selectedContestId,
    selectedContestant?.id,
  ])

  // Submit score mutation with optimistic updates
  const submitScoreMutation = useOptimisticMutation<
    { success: true; hasQueuedWrites: boolean },
    { categoryId: string; contestantId: string; scores: ScoreFormData[] }
  >({
    mutationFn: async (data) => {
      const getNormalizedScores = (value: Score[] | { scores?: Score[] } | undefined): Score[] => (
        (Array.isArray(value) ? value : value?.scores || []).filter((score) => !isOptimisticScoreRecord(score))
      )
      const cachedScores = queryClient.getQueryData<Score[] | { scores?: Score[] }>([
        'contestant-scores',
        data.categoryId,
        data.contestantId,
        effectiveRepresentedJudgeId,
      ])
      let latestScores: Score[] = getNormalizedScores(
        cachedScores ?? normalizedExistingScores,
      )

      if (typeof navigator === 'undefined' || navigator.onLine) {
        try {
          const response = await scoringAPI.getScores(
            data.categoryId,
            data.contestantId,
            effectiveRepresentedJudgeId,
          )
          const authoritativeScores = getNormalizedScores(response.data?.data ?? response.data)
          latestScores = authoritativeScores
          queryClient.setQueryData(
            ['contestant-scores', data.categoryId, data.contestantId, effectiveRepresentedJudgeId],
            authoritativeScores,
          )
        } catch (error) {
          console.error('Authoritative score refresh failed before submit:', error)
        }
      }

      const writeOutcomes = await Promise.all(data.scores.map(async (scoreData) => {
        if (!hasExplicitScoreValue(scoreData.score)) {
          throw new Error('Each submitted score must include an explicit numeric value')
        }

        const criterionId = scoreData.criterionId === '__category_total__' ? undefined : scoreData.criterionId
        const existing = criterionId
          ? latestScores.find((s) => s.criterionId === criterionId)
          : latestScores.find((s) => !s.criterionId)
        const payload = {
          score: Number(scoreData.score),
          comments: scoreData.comment || '',
          ...(isDelegatedMode ? { representedJudgeId: effectiveRepresentedJudgeId } : {}),
        }
        const criterion = effectiveCriteria.find((entry) => entry.id === scoreData.criterionId)
        const contestantLabel = selectedContestant?.name
          || (selectedContestant?.contestantNumber ? `#${selectedContestant.contestantNumber}` : 'contestant')
        const scoreSummary = criterion?.name
          ? `Score for ${contestantLabel} • ${criterion.name}`
          : `Score for ${contestantLabel}`

        if (existing?.id) {
          return await executeMutationWithReliability(
            `score-update:${existing.id}`,
            `/scoring/${existing.id}`,
            'PUT',
            payload,
            `score:${existing.id}`,
            async (headers) => {
              await scoringAPI.updateScore(existing.id, payload, { headers })
            },
            { notifyOnQueued: false, summary: scoreSummary },
          )
        } else {
          const body = {
            criteriaId: criterionId,
            ...payload,
          }
          return await executeMutationWithReliability(
            `score-submit:${data.categoryId}:${data.contestantId}:${criterionId || 'total'}`,
            `/scoring/category/${data.categoryId}/contestant/${data.contestantId}`,
            'POST',
            body,
            `score:${data.categoryId}:${data.contestantId}:${criterionId || 'total'}`,
            async (headers) => {
              await scoringAPI.submitScore(data.categoryId, data.contestantId, body, { headers })
            },
            { notifyOnQueued: false, summary: scoreSummary },
          )
        }
      }))
      return { success: true, hasQueuedWrites: writeOutcomes.includes('queued') }
    },
    queryKey: ['contestant-scores', selectedCategory?.id, selectedContestant?.id, effectiveRepresentedJudgeId],
    updateFn: (oldData, variables) => {
      // Optimistically update scores in cache
      const oldScores = Array.isArray(oldData)
        ? (oldData as Score[])
        : ((oldData as { scores?: Score[] })?.scores || [])
      const newScores = variables.scores.map((scoreData) => ({
        id: `optimistic-${scoreData.criterionId}`,
        contestantId: variables.contestantId,
        judgeId: effectiveRepresentedJudgeId || selfJudgeId || user?.id || '',
        categoryId: variables.categoryId,
        criterionId: scoreData.criterionId,
        score: Number(scoreData.score),
        deduction: 0,
        comment: scoreData.comment || null,
        isSigned: false,
        signedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _optimistic: true,
      }))

      // Merge with existing scores (replace matching criterion scores)
      const mergedScores = oldScores.filter(
        (existing: Score) => !newScores.some((ns) => ns.criterionId === existing.criterionId)
      )

      return [...mergedScores, ...newScores]
    },
    onMutate: () => {
      setSaveStatus('saving')
    },
    onSuccess: () => {
      setSaveStatus('saved')
      queryClient.invalidateQueries(['scoring-categories'])
    },
    onError: (error) => {
      setSaveStatus('error')
      console.error('Score submission failed:', error)
    },
    invalidateOnSettled: true,
    invalidateKeys: [['scoring-categories']],
  })

  const handleScoreChange = (criterionId: string, field: keyof ScoreFormData, value: any) => {
    if (activeSelectionKey) {
      localEditSelectionKeyRef.current = activeSelectionKey
    }
    const criterion = effectiveCriteria.find((c) => c.id === criterionId)
    const maxScore = criterion?.maxScore ?? selectedCategory?.scoreCap ?? 100

    setScoreFormData((prev) => {
      const nextCurrent = prev[criterionId] || {
        criterionId,
        score: '',
        comment: '',
      }

      if (field === 'score') {
        if (value === '' || value === null || value === undefined) {
          return {
            ...prev,
            [criterionId]: {
              ...nextCurrent,
              score: '',
            },
          }
        }

        const numericValue = Number(value)
        if (!Number.isFinite(numericValue)) {
          return prev
        }

        const normalizedValue = Math.max(0, Math.min(numericValue, Number(maxScore)))
        return {
          ...prev,
          [criterionId]: {
            ...nextCurrent,
            score: normalizedValue,
          },
        }
      }

      return {
        ...prev,
        [criterionId]: {
          ...nextCurrent,
          [field]: value,
        },
      }
    })
  }

  const clearPersistedWorkspaceDraft = async () => {
    if (!offlineOwner.ownerUserId) return
    await deleteOfflineWorkflowDraft(createOfflineDraftId(SCORING_DRAFT_WORKFLOW, SCORING_DRAFT_SCOPE))
    setRestoredDraft(null)
    localEditSelectionKeyRef.current = null
  }

  const handleSubmitScores = async () => {
    if (!selectedCategory || !selectedContestant) return
    if (!effectiveRepresentedJudgeId) {
      toast.error('Select a represented judge before submitting scores')
      return
    }
    if (requiresSignOff && !isSignOffChecked) {
      toast.error('You must certify/sign off before submitting scores')
      return
    }

    setIsSubmitting(true)
    setSaveStatus('saving')
    try {
      const scores = Object.values(scoreFormData)
      const explicitScores = scores.filter((entry) => hasExplicitScoreValue(entry.score))
      const missingScores = scores.filter((entry) => !hasExplicitScoreValue(entry.score))

      if (requiresSignOff && missingScores.length > 0) {
        toast.error('Enter a score for every criterion before certifying')
        setSaveStatus('error')
        setIsSubmitting(false)
        return
      }

      const overCap = explicitScores.find((entry) => {
        const criterion = effectiveCriteria.find((c) => c.id === entry.criterionId)
        const maxScore = criterion?.maxScore ?? selectedCategory.scoreCap ?? 100
        return Number(entry.score) > Number(maxScore)
      })
      if (overCap) {
        toast.error('One or more scores exceed the allowed cap')
        setSaveStatus('error')
        setIsSubmitting(false)
        return
      }
      const submitResult = explicitScores.length > 0
        ? await submitScoreMutation.mutateAsync({
          categoryId: selectedCategory.id,
          contestantId: selectedContestant.id,
          scores: explicitScores,
        })
        : { success: true as const, hasQueuedWrites: false }
      const categoryCommentOutcome = await persistCategoryComment()
      await queryClient.invalidateQueries(['category-comment', sharedCommentaryScopeKey, selectedContestant.id, effectiveRepresentedJudgeId])
      const hasQueuedWrites = submitResult.hasQueuedWrites || categoryCommentOutcome === 'queued'
      if (requiresSignOff) {
        if (hasQueuedWrites || hasPendingScoreSync) {
          setSaveStatus('queued')
          toast('Scores saved offline. Reconnect and wait for sync before certifying.')
          return
        }
        setShowSignatureModal(true)
        return
      }
      if (hasQueuedWrites) {
        setSaveStatus('queued')
        toast.success('Scores saved offline. They will sync automatically.')
        return
      }
      await clearPersistedWorkspaceDraft()
      setSaveStatus('saved')
      toast.success('Scores submitted successfully!')
      scrollToRef(contestantSectionRef, { delayMs: 150 })
    } catch (error: unknown) {
      setSaveStatus('error')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit scores'
      toast.error(`Error submitting scores: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const startSignatureDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = signatureCanvasRef.current
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
    setIsDrawingSignature(true)
  }

  const drawSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingSignature) return
    event.preventDefault()
    const canvas = signatureCanvasRef.current
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

  const stopSignatureDrawing = (event?: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current
    if (canvas) {
      setDrawnSignatureData(canvas.toDataURL('image/png'))
    }
    if (event) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // no-op
      }
    }
    setIsDrawingSignature(false)
  }

  const clearSignatureDrawing = () => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setDrawnSignatureData('')
  }

  const submitCertificationSignature = async () => {
    if (!selectedCategory) return
    if (hasPendingScoreSync) {
      toast.error('Scores are still pending sync. Wait for syncing to finish before certifying.')
      return
    }
    if (!typedSignature.trim() && !drawnSignatureData.trim()) {
      toast.error('Provide typed and/or drawn signature')
      return
    }
    try {
      await scoringAPI.certifyScores(selectedCategory.id, {
        contestantId: selectedContestant?.id,
        typedSignature: typedSignature.trim() || undefined,
        drawnSignatureData: drawnSignatureData || undefined,
        ...(isDelegatedMode ? { representedJudgeId: effectiveRepresentedJudgeId } : {}),
      })
      if (selectedContestant) {
        await queryClient.invalidateQueries(['contestant-scores', selectedCategory.id, selectedContestant.id, effectiveRepresentedJudgeId])
      }
      await queryClient.invalidateQueries(['scoring-categories'])
      setShowSignatureModal(false)
      setTypedSignature('')
      setDrawnSignatureData('')
      await clearPersistedWorkspaceDraft()
      setSaveStatus('saved')
      toast.success('Scores submitted and certified successfully!')
      scrollToRef(contestantSectionRef, { delayMs: 150 })
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.response?.data?.message || 'Failed to certify scores'
      toast.error(message)
      setSaveStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const uploadAttachmentNow = async (file: File, criterionId?: string, silent = false) => {
    if (!selectedCategory || !selectedContestant || !file || !effectiveRepresentedJudgeId) return
    const contextKey = criterionId ? `criterion-${criterionId}` : 'category'
    setUploadingContext(contextKey)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('categoryId', selectedCategory.id)
      formData.append('contestantId', selectedContestant.id)
      if (isDelegatedMode && effectiveRepresentedJudgeId) {
        formData.append('representedJudgeId', effectiveRepresentedJudgeId)
      }
      if (criterionId) {
        formData.append('criterionId', criterionId)
        formData.append('contextType', 'CRITERION_COMMENT')
      } else {
        formData.append('contextType', 'CATEGORY')
      }
      await executeWithRetry(
        async () => {
          await scoreFilesAPI.upload(formData, {
            headers: {
              [IDEMPOTENCY_HEADER]: createMutationIdempotencyKey(
                `score-file-upload:${selectedCategory.id}:${selectedContestant.id}:${criterionId || 'category'}`,
              ),
            },
          })
        },
        undefined,
        {
          onRetry: () => setSaveStatus('retrying'),
        },
      )
      await queryClient.invalidateQueries(['score-attachments', selectedCategory.id, selectedContestant.id, effectiveRepresentedJudgeId])
      if (!silent) toast.success('Attachment uploaded')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload attachment')
      throw error
    } finally {
      setUploadingContext(null)
    }
  }

  const uploadScoresheetImportNow = async (file: File) => {
    if (!selectedCategory || !selectedContestant || !file || !effectiveRepresentedJudgeId) return
    setUploadingContext('scoresheet-import')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('categoryId', selectedCategory.id)
      formData.append('contestantId', selectedContestant.id)
      formData.append('contextType', 'SCORESHEET_IMPORT')
      formData.append('importIntent', 'SCORESHEET_IMPORT')
      if (isDelegatedMode && effectiveRepresentedJudgeId) {
        formData.append('representedJudgeId', effectiveRepresentedJudgeId)
      }

      const response = await scoreFilesAPI.upload(formData, {
        headers: {
          [IDEMPOTENCY_HEADER]: createMutationIdempotencyKey(
            `scoresheet-import-upload:${selectedCategory.id}:${selectedContestant.id}:${effectiveRepresentedJudgeId}`,
          ),
        },
      })
      const uploaded = response.data?.data ?? response.data
      const fileId = uploaded?.id as string | undefined
      await queryClient.invalidateQueries(['score-attachments', selectedCategory.id, selectedContestant.id, effectiveRepresentedJudgeId])

      if (fileId) {
        setSelectedScoreSheetImportFileId(fileId)
        setProcessingScoreSheetImportFileId(fileId)
        await scoreFilesAPI.processScoresheetImport(fileId, {
          headers: {
            [IDEMPOTENCY_HEADER]: createMutationIdempotencyKey(`scoresheet-import-process:${fileId}`),
          },
        })
        await queryClient.invalidateQueries(['scoresheet-import-draft', fileId])
      }

      toast.success('Scoresheet uploaded for review')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload scoresheet import')
    } finally {
      setUploadingContext(null)
      setProcessingScoreSheetImportFileId(null)
    }
  }

  const handleUploadAttachment = async (file: File, criterionId?: string) => {
    if (!selectedCategory || !selectedContestant || !file) return

    if (isCertifiedContext) {
      const pending: PendingCommentaryFile = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        fileName: file.name || file.type || 'Selected file',
        criterionId
      }
      setPendingCommentaryFiles((prev) => [...prev, pending])
      return
    }

    await uploadAttachmentNow(file, criterionId)
  }

  const handleProcessScoresheetImport = async (fileId: string) => {
    try {
      setSelectedScoreSheetImportFileId(fileId)
      setProcessingScoreSheetImportFileId(fileId)
      await scoreFilesAPI.processScoresheetImport(fileId, {
        headers: {
          [IDEMPOTENCY_HEADER]: createMutationIdempotencyKey(`scoresheet-import-process:${fileId}`),
        },
      })
      await queryClient.invalidateQueries(['scoresheet-import-draft', fileId])
      toast.success('Scoresheet import processed')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to process scoresheet import')
    } finally {
      setProcessingScoreSheetImportFileId(null)
    }
  }

  const handleScoreSheetImportReviewChange = (criterionId: string, value: string) => {
    const criterion = effectiveCriteria.find((entry) => entry.id === criterionId)
    const maxScore = criterion?.maxScore ?? selectedCategory?.scoreCap ?? 100

    setScoreSheetImportReview((prev) => {
      if (value === '') {
        return {
          ...prev,
          [criterionId]: {
            criterionId,
            score: '',
          },
        }
      }

      const numericValue = Number(value)
      if (!Number.isFinite(numericValue)) return prev
      return {
        ...prev,
        [criterionId]: {
          criterionId,
          score: Math.max(0, Math.min(numericValue, Number(maxScore))),
        },
      }
    })
  }

  const handleApplyScoresheetImportToForm = () => {
    if (!scoreSheetImportDraft?.extraction?.criteria?.length) {
      toast.error('No processed scoresheet draft available')
      return
    }

    if (activeSelectionKey) {
      localEditSelectionKeyRef.current = activeSelectionKey
    }

    setScoreFormData((prev) => {
      const next = { ...prev }
      for (const row of scoreSheetImportDraft.extraction?.criteria || []) {
        const reviewed = scoreSheetImportReview[row.criterionId]
        next[row.criterionId] = {
          ...(next[row.criterionId] || { criterionId: row.criterionId, comment: '' }),
          criterionId: row.criterionId,
          score: reviewed?.score ?? '',
        }
      }
      return next
    })

    setSaveStatus('idle')
    toast.success('Imported scores applied to the scoring form')
    scrollToRef(criteriaSectionRef, { delayMs: 20, behavior: 'smooth' })
  }

  const handleDownloadContestantPrivateDocument = async (fileId: string, originalName: string) => {
    if (!selectedContestant?.userId) return

    try {
      const response = await usersAPI.downloadContestantPrivateFile(selectedContestant.userId, fileId)
      const blob = new Blob([response.data])
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = originalName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to download private document'
      toast.error(errorMessage)
    }
  }

  const getTotalScore = () => {
    return Object.values(scoreFormData).reduce((sum, data) => sum + (Number(data.score) || 0), 0)
  }

  const scoresheetImportAttachments = scoreAttachments.filter((file) => file?.metadata?.intent === 'SCORESHEET_IMPORT')
  const categoryLevelAttachments = scoreAttachments.filter(
    (file) => file?.metadata?.intent !== 'SCORESHEET_IMPORT' && file?.metadata?.contextType !== 'CRITERION_COMMENT',
  )
  const criterionAttachments = (criterionId: string) => scoreAttachments.filter(
    (file) => file?.metadata?.intent !== 'SCORESHEET_IMPORT' &&
      file?.metadata?.contextType === 'CRITERION_COMMENT' &&
      file?.metadata?.criterionId === criterionId
  )
  const isCertifiedContext = normalizedExistingScores.length > 0

  useEffect(() => {
    if (scoresheetImportAttachments.length === 0) {
      setSelectedScoreSheetImportFileId('')
      setScoreSheetImportReview({})
      initializedScoreSheetImportDraftRef.current = null
      return
    }

    const stillExists = scoresheetImportAttachments.some((file) => file.id === selectedScoreSheetImportFileId)
    if (!selectedScoreSheetImportFileId || !stillExists) {
      setSelectedScoreSheetImportFileId(scoresheetImportAttachments[0]!.id)
    }
  }, [scoresheetImportAttachments, selectedScoreSheetImportFileId])

  useEffect(() => {
    if (!scoreSheetImportDraft) {
      initializedScoreSheetImportDraftRef.current = null
      setScoreSheetImportReview({})
      return
    }

    const draftKey = `${scoreSheetImportDraft.id}:${scoreSheetImportDraft.status}:${scoreSheetImportDraft.computedTotal ?? 'none'}`
    if (initializedScoreSheetImportDraftRef.current === draftKey) {
      return
    }

    const nextReview = (scoreSheetImportDraft.extraction?.criteria || []).reduce<Record<string, ScoreSheetImportReviewEntry>>((acc, row) => {
      acc[row.criterionId] = {
        criterionId: row.criterionId,
        score: row.detectedScore ?? '',
      }
      return acc
    }, {})

    setScoreSheetImportReview(nextReview)
    initializedScoreSheetImportDraftRef.current = draftKey
  }, [scoreSheetImportDraft])

  useEffect(() => {
    setPendingCommentaryFiles([])
  }, [selectedCategory?.id, selectedContestant?.id])

  const removePendingAttachment = (pendingId: string) => {
    setPendingCommentaryFiles((prev) => prev.filter((item) => item.id !== pendingId))
  }

  const removeUploadedAttachment = async (fileId: string) => {
    if (!selectedCategory || !selectedContestant) return
    try {
      await scoreFilesAPI.remove(fileId)
      await queryClient.invalidateQueries(['score-attachments', selectedCategory.id, selectedContestant.id, effectiveRepresentedJudgeId])
      toast.success('Attachment removed')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to remove attachment')
    }
  }

  const persistCategoryComment = async (): Promise<CategoryCommentPersistOutcome> => {
    if (!selectedCategory || !selectedContestant || !supportsCategoryCommentary || !effectiveRepresentedJudgeId) {
      return 'unchanged'
    }

    const nextComment = categoryComment.trim()
    const currentComment = existingCategoryComment.trim()
    if (nextComment === currentComment) {
      return 'unchanged'
    }

    const contestantLabel = selectedContestant.name
      || (selectedContestant.contestantNumber ? `#${selectedContestant.contestantNumber}` : 'contestant')
    const categoryCommentSummary = selectedCategory.name
      ? `Category commentary for ${contestantLabel} in ${selectedCategory.name}`
      : `Category commentary for ${contestantLabel}`

    return await executeMutationWithReliability(
      `category-comment-update:${sharedCommentaryScopeKey}:${selectedContestant.id}`,
      `/commentary/category/${selectedCategory.id}/contestant/${selectedContestant.id}`,
      'PUT',
      {
        comment: categoryComment,
        ...(isDelegatedMode ? { judgeId: effectiveRepresentedJudgeId } : {}),
      },
      `category-comment:${sharedCommentaryScopeKey}:${selectedContestant.id}`,
      async (headers) => {
        await commentaryAPI.updateCategoryComment(
          selectedCategory.id,
          selectedContestant.id,
          {
            comment: categoryComment,
            ...(isDelegatedMode ? { judgeId: effectiveRepresentedJudgeId } : {}),
          },
          { headers },
        )
      },
      { notifyOnQueued: false, summary: categoryCommentSummary },
    )
  }

  const handleUpdateCommentary = async () => {
    if (!selectedCategory || !selectedContestant || !effectiveRepresentedJudgeId) return

    setUpdatingCommentary(true)
    try {
      const contestantLabel = selectedContestant.name
        || (selectedContestant.contestantNumber ? `#${selectedContestant.contestantNumber}` : 'contestant')
      const existingByCriterion = new Map<string, Score>()
      normalizedExistingScores.forEach((score) => {
        const key = score.criterionId || '__category_total__'
        existingByCriterion.set(key, score)
      })

      const commentUpdates = supportsCriterionCommentary
        ? Array.from(existingByCriterion.entries()).map(async ([criterionKey, score]) => {
          const nextComment = scoreFormData[criterionKey]?.comment ?? ''
          const currentComment = score.comment ?? ''
          if (nextComment === currentComment) return null
          const criterionName = effectiveCriteria.find((entry) => entry.id === criterionKey)?.name
          const commentSummary = criterionName
            ? `Commentary for ${contestantLabel} • ${criterionName}`
            : `Commentary for ${contestantLabel}`
          return await executeMutationWithReliability(
            `comment-update:${score.id}`,
            `/scoring/${score.id}`,
            'PUT',
            {
              comments: nextComment,
              ...(isDelegatedMode ? { representedJudgeId: effectiveRepresentedJudgeId } : {}),
            },
            `comment:${score.id}`,
            async (headers) => {
              await scoringAPI.updateScore(
                score.id,
                {
                  comments: nextComment,
                  ...(isDelegatedMode ? { representedJudgeId: effectiveRepresentedJudgeId } : {}),
                },
                { headers },
              )
            },
            { notifyOnQueued: false, summary: commentSummary },
          )
        })
        : []
      const commentResults = await Promise.all(commentUpdates)
      const categoryCommentOutcome = await persistCategoryComment()
      if (commentResults.some(Boolean) || categoryCommentOutcome !== 'unchanged') {
        const queuedCommentaryWrites = commentResults.includes('queued') || categoryCommentOutcome === 'queued'
        setSaveStatus(queuedCommentaryWrites ? 'queued' : 'saved')
        if (!queuedCommentaryWrites) {
          await clearPersistedWorkspaceDraft()
        }
        if (queuedCommentaryWrites) {
          toast('Commentary saved offline. It will sync automatically.')
        }
      }

      if (pendingCommentaryFiles.length > 0) {
        for (const pending of pendingCommentaryFiles) {
          await uploadAttachmentNow(pending.file, pending.criterionId, true)
        }
      }

      await Promise.all([
        queryClient.invalidateQueries(['contestant-scores', selectedCategory.id, selectedContestant.id, effectiveRepresentedJudgeId]),
        queryClient.invalidateQueries(['score-attachments', selectedCategory.id, selectedContestant.id, effectiveRepresentedJudgeId]),
        queryClient.invalidateQueries(['category-comment', sharedCommentaryScopeKey, selectedContestant.id, effectiveRepresentedJudgeId]),
      ])

      setPendingCommentaryFiles([])
      if (!commentResults.includes('queued') && categoryCommentOutcome !== 'queued') {
        toast.success('Commentary Updated')
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update commentary')
    } finally {
      setUpdatingCommentary(false)
    }
  }

  // Authorization check
  if (!canAccessScoringWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
            This page requires a linked judge profile or delegated scoring permission.
          </p>
        </div>
      </div>
    )
  }

  // Error state handling
  if (categoriesError) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
        <p className="text-red-800 dark:text-red-200 mb-4">{String(categoriesError)}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">Reload Page</button>
      </div>
    )
  }

  if (contestantsError) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
        <p className="text-red-800 dark:text-red-200 mb-4">{String(contestantsError)}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">Reload Page</button>
      </div>
    )
  }

  if (criteriaError) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
        <p className="text-red-800 dark:text-red-200 mb-4">{String(criteriaError)}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">Reload Page</button>
      </div>
    )
  }

  if (existingScoresError) {
    return (
      <div className="cgr-page-container">
        <Card className="bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
          <p className="text-red-800 dark:text-red-200 mb-4">{String(existingScoresError)}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">Reload Page</button>
        </Card>
      </div>
    )
  }

  // Loading state
  if (categoriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Loading categories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="cgr-page-container">
        <PageHeader
          title="Scoring Dashboard"
          subtitle={isDelegateGrantEmptyState
            ? 'You need an active delegation grant before delegated scoring becomes available.'
            : assignedContests.length > 1
              ? 'Select a contest, category, represented judge, and contestant to begin scoring'
              : 'Select a category, represented judge, and contestant to begin scoring'}
          icon={TrophyIcon}
        />

        {isDelegateGrantEmptyState && (
          <Card className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-semibold text-amber-900">No Active Delegation Grants</h2>
            <p className="mt-2 text-sm text-amber-800">
              Your delegate account is ready, but there is no active delegation grant covering scoring right now.
              Ask an administrator or organizer to assign a delegation grant before attempting delegated score entry
              or delegated certification.
            </p>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Categories */}
          <div ref={categorySectionRef} className="lg:col-span-1">
            <Card className="rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Categories
              </h2>
              {assignedContests.length > 1 && (
                <div className="mb-4">
                  <label htmlFor="pages-scoringpage-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assigned Contest
                  </label>
                  <select id="pages-scoringpage-1"
                    value={selectedContestId}
                    onChange={(e) => {
                      setSelectedContestId(e.target.value)
                      setSelectedCategory(null)
                      setSelectedContestant(null)
                    }}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
                  >
                    {assignedContests.map((contest) => (
                      <option key={contest.id} value={contest.id}>
                        {contest.name}{contest.eventName ? ` (${contest.eventName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {filteredCategories.length > 0 ? (
                <div className="space-y-2">
                  {filteredCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category)
                        setSelectedContestant(null)
                        scrollToRef(contestantSectionRef, { delayMs: 140 })
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                        selectedCategory?.id === category.id
                          ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{category.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{category.contest.name}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {category._count.scores} scores • {category._count.categoryContestants ?? 0} contestants
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClockIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    {isDelegateGrantEmptyState
                      ? 'No active delegation grants currently allow delegated scoring.'
                      : categories && categories.length > 0
                      ? 'No categories assigned in the selected contest'
                      : 'No categories assigned yet'}
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Middle Column: Contestants */}
          <div ref={contestantSectionRef} className="lg:col-span-1">
            <Card className="rounded-lg p-6">
              {canUseDelegatedScoring && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <label htmlFor="pages-scoringpage-represented-judge" className="block text-sm font-medium text-amber-900 mb-1">
                    Represented Judge
                  </label>
                  <p className="mb-2 text-xs text-amber-800">
                    Delegated score entry records you as the entry actor and does not certify scores for the represented judge.
                  </p>
                  <select
                    id="pages-scoringpage-represented-judge"
                    value={representedJudgeId}
                    onChange={(event) => {
                      setRepresentedJudgeId(event.target.value)
                      setSelectedContestant(null)
                    }}
                    className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-gray-900"
                    disabled={!selectedCategory}
                  >
                    {!selectedCategory && <option value="">Select a category first</option>}
                    {selectedCategory && !selfJudgeId && eligibleDelegatedJudges.length === 0 && (
                      <option value="">No active delegation covers this category</option>
                    )}
                    {selfJudgeId && (
                      <option value={selfJudgeId}>My judging lane</option>
                    )}
                    {eligibleDelegatedJudges
                      .filter((judge) => judge.judgeId !== selfJudgeId)
                      .map((judge) => (
                        <option key={judge.judgeId} value={judge.judgeId}>
                          {judge.judgeName}{judge.judgeEmail ? ` (${judge.judgeEmail})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Contestants
              </h2>
              {selectedCategory ? (
                contestantsLoading ? (
                  <div className="text-center py-8">
                    <ArrowPathIcon className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
                  </div>
                ) : contestants && contestants.length > 0 ? (
                  <div className="space-y-2">
                    {sortedContestants.map(contestant => (
                      <button
                        key={contestant.id}
                        onClick={() => {
                          setSelectedContestant(contestant)
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                          selectedContestant?.id === contestant.id
                            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center">
                          {getImageUrl(contestant.imagePath) ? (
                            <img
                              src={getImageUrl(contestant.imagePath)!}
                              alt={contestant.name}
                              className="h-10 w-10 rounded-full mr-3"
                            />
                          ) : (
                            <UserIcon className="h-10 w-10 rounded-full mr-3 text-gray-400 dark:text-gray-500" />
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{contestant.name}</div>
                            {contestant.contestantNumber && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                                #{contestant.contestantNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UserIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      No contestants in this category
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    Select a category to view contestants
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Scoring Form */}
          <div id="score-sheet" ref={scoreSheetSectionRef} className="lg:col-span-1">
            <Card className="rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Score Sheet
              </h2>
              {selectedCategory && selectedContestant ? (
                <div>
                  <MobileWorkflowNav
                    className="mb-4"
                    actions={[
                      {
                        label: 'Top',
                        onClick: () => scrollToTop(),
                      },
                      {
                        label: 'Categories',
                        onClick: () => scrollToRef(categorySectionRef),
                      },
                      {
                        label: 'Contestants',
                        onClick: () => scrollToRef(contestantSectionRef),
                      },
                      {
                        label: 'Criteria',
                        onClick: () => scrollToRef(criteriaSectionRef),
                      },
                    ]}
                  />
                  {/* Contestant Info */}
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-start gap-3">
                      {getImageUrl(selectedContestant.imagePath) ? (
                        <img
                          src={getImageUrl(selectedContestant.imagePath)!}
                          alt={selectedContestant.name}
                          className="h-14 w-14 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <UserIcon className="h-14 w-14 text-gray-400 dark:text-gray-500" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{selectedContestant.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          {selectedCategory.name}
                          {selectedContestant.contestantNumber ? ` • #${selectedContestant.contestantNumber}` : ''}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedContestant.bio?.trim() || 'No bio available for this contestant.'}
                    </p>
                    {getFileUrl(selectedContestant.bioFilePath) && (
                      <button
                        type="button"
                        onClick={() => void openBioFile(selectedContestant.bioFilePath)}
                        className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        View uploaded bio file
                      </button>
                    )}
                    {canViewPrivateContestantProfile && (
                      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                        <div className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                          Private Contestant Notes
                        </div>
                        {contestantPrivateProfileLoading ? (
                          <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">Loading private profile...</div>
                        ) : contestantPrivateProfile ? (
                          <div className="mt-2 space-y-3 text-sm text-amber-900 dark:text-amber-100">
                            <div>
                              <div className="font-medium">Accommodations</div>
                              <div className="whitespace-pre-wrap">
                                {contestantPrivateProfile.accommodations?.trim() || 'None recorded'}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">Recommendation Notes</div>
                              <div className="whitespace-pre-wrap">
                                {contestantPrivateProfile.recommendationNotes?.trim() || 'None recorded'}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">Internal Notes</div>
                              <div className="whitespace-pre-wrap">
                                {contestantPrivateProfile.privateNotes?.trim() || 'None recorded'}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">Private Documents</div>
                              {contestantPrivateProfile.privateDocuments.length > 0 ? (
                                <div className="mt-1 space-y-1">
                                  {contestantPrivateProfile.privateDocuments.map((file) => (
                                    <button
                                      key={file.id}
                                      type="button"
                                      onClick={() => void handleDownloadContestantPrivateDocument(file.id, file.originalName)}
                                      className="block text-left text-sm text-blue-700 underline hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                                    >
                                      {file.originalName}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div>None uploaded</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">No private profile available.</div>
                        )}
                      </div>
                    )}
                    {user?.role === 'JUDGE' && hasCertifiedScores && canRequestScoreGovernance && (
                      <div className="mt-3">
                        <Link
                          to={`${basePath || ''}/score-governance?action=UNCERTIFY&scope=CONTESTANT_CATEGORY&contestId=${encodeURIComponent(selectedCategory.contest.id)}&categoryId=${encodeURIComponent(selectedCategory.id)}&contestantId=${encodeURIComponent(selectedContestant.id)}`}
                          className="inline-flex items-center rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-200"
                        >
                          Request Un-certify
                        </Link>
                      </div>
                    )}
                    {(supportsCategoryCommentary ||
                      categoryLevelAttachments.length > 0 ||
                      pendingCommentaryFiles.filter((f) => !f.criterionId).length > 0 ||
                      scoresheetImportAttachments.length > 0 ||
                      (canUploadScoreFiles && !hasCertifiedScores)) && (
                    <div className="mt-3">
                      {supportsCategoryCommentary && (
                        <>
                          <label htmlFor="pages-scoringpage-category-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {sharedCommentaryLabel}
                          </label>
                          <textarea
                            id="pages-scoringpage-category-comment"
                            placeholder={`${sharedCommentaryLabel} note`}
                            value={categoryComment}
                            onChange={(e) => {
                              if (activeSelectionKey) {
                                localEditSelectionKeyRef.current = activeSelectionKey
                              }
                              setCategoryComment(e.target.value)
                            }}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </>
                      )}
                      {canUploadScoreFiles && (
                        <>
                          <label htmlFor="pages-scoringpage-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Category Commentary Attachment
                          </label>
                          <input id="pages-scoringpage-2"
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) void handleUploadAttachment(file)
                              e.currentTarget.value = ''
                            }}
                            className="block w-full text-sm text-gray-600 dark:text-gray-300"
                          />
                          {uploadingContext === 'category' && (
                            <p className="mt-1 text-xs text-blue-600">Uploading...</p>
                          )}
                        </>
                      )}
                      {canUploadScoreFiles && !hasCertifiedScores && (
                        <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-3">
                          <label htmlFor="pages-scoringpage-scoresheet-import" className="block text-sm font-medium text-blue-900 mb-1">
                            Scoresheet Import
                          </label>
                          <p className="text-xs text-blue-800 mb-2">
                            Upload a filled paper scoresheet to extract criterion scores for review. Comments are not imported in Phase 1.
                          </p>
                          <input
                            id="pages-scoringpage-scoresheet-import"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,application/pdf,image/png,image/jpeg,image/webp,image/gif"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) void uploadScoresheetImportNow(file)
                              e.currentTarget.value = ''
                            }}
                            className="block w-full text-sm text-gray-600 dark:text-gray-300"
                          />
                          {uploadingContext === 'scoresheet-import' && (
                            <p className="mt-1 text-xs text-blue-700">Uploading and processing...</p>
                          )}
                        </div>
                      )}
                      {isCertifiedContext && pendingCommentaryFiles.filter((f) => !f.criterionId).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {pendingCommentaryFiles.filter((f) => !f.criterionId).map((pending) => (
                            <div key={pending.id} className="flex items-center justify-between gap-2 text-xs text-amber-700">
                              <span>Queued: {pending.fileName}</span>
                              <button
                                type="button"
                                onClick={() => removePendingAttachment(pending.id)}
                                className="text-red-600 hover:text-red-700 underline"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {categoryLevelAttachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {categoryLevelAttachments.map((file) => (
                            <div key={file.id} className="flex items-center justify-between gap-2">
                              <a
                                href={file.publicUrl || file.filePath}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 underline"
                              >
                                <PaperClipIcon className="h-4 w-4" />
                                {file.fileName}
                              </a>
                              {canDeleteScoreFiles && (
                                <button
                                  type="button"
                                  onClick={() => void removeUploadedAttachment(file.id)}
                                  className="text-xs text-red-600 hover:text-red-700 underline"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {scoresheetImportAttachments.length > 0 && (
                        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-slate-900">Imported Scoresheets</h4>
                            <p className="text-xs text-slate-600 mt-1">
                              Review extracted scores, correct them if needed, then apply them to the scoring form before normal submission.
                            </p>
                          </div>
                          <div className="space-y-2">
                            {scoresheetImportAttachments.map((file) => {
                              const isSelected = file.id === selectedScoreSheetImportFileId
                              const isProcessing = processingScoreSheetImportFileId === file.id
                              return (
                                <div key={file.id} className={`rounded-md border px-3 py-2 ${isSelected ? 'border-blue-300 bg-white' : 'border-slate-200 bg-white/80'}`}>
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedScoreSheetImportFileId(file.id)}
                                      className="text-left text-sm font-medium text-blue-700 underline hover:text-blue-800"
                                    >
                                      {file.fileName}
                                    </button>
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <a
                                        href={file.publicUrl || file.filePath}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-700 underline hover:text-blue-800"
                                      >
                                        View source
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => void handleProcessScoresheetImport(file.id)}
                                        disabled={isProcessing}
                                        className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                                      >
                                        {isProcessing ? 'Processing…' : 'Process / Retry'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {selectedScoreSheetImportFileId && (
                            <div className="rounded-md border border-blue-200 bg-white px-3 py-3">
                              {isFetchingScoreSheetImportDraft ? (
                                <p className="text-sm text-blue-700">Loading import draft…</p>
                              ) : scoreSheetImportDraft?.status === 'failed' ? (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-red-700">Import processing failed</p>
                                  <p className="text-sm text-red-600">{scoreSheetImportDraft.processingError || 'Unknown processing error'}</p>
                                </div>
                              ) : scoreSheetImportDraft?.extraction?.criteria?.length ? (
                                <div className="space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-medium text-slate-900">Review extracted scores</p>
                                      <p className="text-xs text-slate-600">
                                        Template: {scoreSheetImportDraft.templateKey || 'unknown'} · Confidence: {typeof scoreSheetImportDraft.overallConfidence === 'number' ? `${Math.round(scoreSheetImportDraft.overallConfidence * 100)}%` : 'n/a'}
                                      </p>
                                    </div>
                                    <div className="text-xs text-slate-700">
                                      Draft total: <span className="font-semibold">{scoreSheetImportDraft.computedTotal ?? 'n/a'}</span>
                                    </div>
                                  </div>
                                  {scoreSheetImportDraft.extraction.mismatchWarnings && scoreSheetImportDraft.extraction.mismatchWarnings.length > 0 && (
                                    <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                      {scoreSheetImportDraft.extraction.mismatchWarnings.join(' ')}
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    {scoreSheetImportDraft.extraction.criteria.map((row) => (
                                      <div key={row.criterionId} className="grid grid-cols-[minmax(0,1fr)_110px] gap-3 items-center rounded border border-slate-200 px-3 py-2">
                                        <div>
                                          <div className="text-sm font-medium text-slate-900">{row.criterionName}</div>
                                          <div className="text-xs text-slate-600">
                                            {row.ambiguous ? 'Low confidence or ambiguous extraction' : `Detected ${row.detectedColumnLabel ?? row.detectedScore ?? 'n/a'}`}
                                            {' · '}
                                            Confidence {Math.round(row.confidence * 100)}%
                                          </div>
                                        </div>
                                        <input
                                          type="number"
                                          min="0"
                                          max={effectiveCriteria.find((criterion) => criterion.id === row.criterionId)?.maxScore ?? selectedCategory?.scoreCap ?? 100}
                                          value={scoreSheetImportReview[row.criterionId]?.score ?? ''}
                                          onChange={(e) => handleScoreSheetImportReviewChange(row.criterionId, e.target.value)}
                                          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${row.ambiguous ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                                    <div className="text-sm text-slate-700">
                                      Reviewed total:{' '}
                                      <span className="font-semibold">
                                        {Object.values(scoreSheetImportReview).reduce((sum, entry) => sum + (Number(entry.score) || 0), 0)}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={handleApplyScoresheetImportToForm}
                                      className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                    >
                                      Apply Reviewed Scores to Form
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-600">Process this file to generate a review draft.</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    )}
                  </div>

                  {/* Scoring Criteria */}
                  {criteriaLoading ? (
                    <div className="text-center py-8">
                      <ArrowPathIcon className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
                    </div>
                  ) : effectiveCriteria.length > 0 ? (
                    <div ref={criteriaSectionRef} className="space-y-6">
                      {effectiveCriteria.map(criterion => (
                        <div key={criterion.id} className="border-b pb-4">
                          <label htmlFor="pages-scoringpage-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {criterion.name}
                            <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 ml-1">
                              (Max: {criterion.maxScore})
                            </span>
                          </label>
                          {criterion.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-2">
                              {criterion.description}
                            </p>
                          )}
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={criterion.maxScore}
                            value={scoreFormData[criterion.id]?.score ?? ''}
                            placeholder="0"
                            onChange={(e) => handleScoreChange(criterion.id, 'score', e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {supportsCriterionCommentary && (
                            <textarea
                              placeholder="Comments (optional)"
                              value={scoreFormData[criterion.id]?.comment || ''}
                              onChange={(e) => handleScoreChange(criterion.id, 'comment', e.target.value)}
                              rows={2}
                              className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                          {supportsCriterionCommentary && criterion.id !== '__category_total__' && (
                          <div className="mt-2">
                            {canUploadScoreFiles && (
                              <>
                                <label htmlFor="pages-scoringpage-3" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                  Criterion Attachment
                                </label>
                                <input id="pages-scoringpage-3"
                                  type="file"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) void handleUploadAttachment(file, criterion.id)
                                    e.currentTarget.value = ''
                                  }}
                                  className="block w-full text-xs text-gray-600 dark:text-gray-300"
                                />
                                {uploadingContext === `criterion-${criterion.id}` && (
                                  <p className="mt-1 text-xs text-blue-600">Uploading...</p>
                                )}
                              </>
                            )}
                            {isCertifiedContext && pendingCommentaryFiles.filter((f) => f.criterionId === criterion.id).length > 0 && (
                              <div className="mt-1 space-y-1">
                                {pendingCommentaryFiles.filter((f) => f.criterionId === criterion.id).map((pending) => (
                                  <div key={pending.id} className="flex items-center justify-between gap-2 text-xs text-amber-700">
                                    <span>Queued: {pending.fileName}</span>
                                    <button
                                      type="button"
                                      onClick={() => removePendingAttachment(pending.id)}
                                      className="text-red-600 hover:text-red-700 underline"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {criterionAttachments(criterion.id).length > 0 && (
                              <div className="mt-1 space-y-1">
                                {criterionAttachments(criterion.id).map((file) => (
                                  <div key={file.id} className="flex items-center justify-between gap-2">
                                    <a
                                      href={file.publicUrl || file.filePath}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 underline"
                                    >
                                      <PaperClipIcon className="h-3.5 w-3.5" />
                                      {file.fileName}
                                    </a>
                                    {canDeleteScoreFiles && (
                                      <button
                                        type="button"
                                        onClick={() => void removeUploadedAttachment(file.id)}
                                        className="text-xs text-red-600 hover:text-red-700 underline"
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          )}
                        </div>
                      ))}

                      {/* Total Score */}
                      <div className="pt-4 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Score:</span>
                          <span className="text-2xl font-bold text-blue-600">
                            {getTotalScore()}
                            {selectedCategory.scoreCap && (
                              <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 ml-1">
                                / {selectedCategory.scoreCap}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Submit Button with Save Status */}
                      <div ref={scoringActionsRef} className="space-y-2">
                        {isCertifiedContext && (
                          <button
                            onClick={handleUpdateCommentary}
                            disabled={updatingCommentary}
                            className="w-full px-4 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            {updatingCommentary ? (
                              <>
                                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                                Updating Commentary...
                              </>
                            ) : (
                              <>
                                <CheckCircleIcon className="h-5 w-5 mr-2" />
                                Update Commentary
                              </>
                            )}
                          </button>
                        )}
                        {requiresSignOff && (
                          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={isSignOffChecked}
                              onChange={(e) => {
                                if (activeSelectionKey) {
                                  localEditSelectionKeyRef.current = activeSelectionKey
                                }
                                setIsSignOffChecked(e.target.checked)
                              }}
                            />
                            I certify these scores are final and accurate.
                          </label>
                        )}
                        <button
                          onClick={handleSubmitScores}
                          disabled={isSubmitting || (requiresSignOff && !isSignOffChecked)}
                          className="w-full px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isSubmitting ? (
                            <>
                              <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="h-5 w-5 mr-2" />
                              Submit Scores
                            </>
                          )}
                        </button>
                        {/* Optimistic Save Status Indicator */}
                        <div className="flex justify-center">
                          <OptimisticIndicator
                            status={saveStatus}
                            size="md"
                            savingText="Saving…"
                            savedText="Scores saved"
                            errorText="Failed to save"
                          />
                        </div>
                        {OFFLINE_MUTATION_QUEUE_ENABLED && queueMetrics.queuedCount > 0 && (
                          <div className="text-center text-xs text-amber-700 dark:text-amber-300">
                            {queueMetrics.syncingCount > 0
                              ? `Syncing queued updates… ${queueMetrics.queuedCount} pending`
                              : `${queueMetrics.queuedCount} queued updates waiting for sync`}
                          </div>
                        )}
                        <MobileWorkflowNav
                          className="mt-3"
                          title="After scoring"
                          actions={[
                            {
                              label: 'Change contestant',
                              onClick: () => scrollToRef(contestantSectionRef),
                            },
                            {
                              label: 'Change category',
                              onClick: () => scrollToRef(categorySectionRef),
                            },
                            {
                              label: 'Top',
                              onClick: () => scrollToTop(),
                            },
                          ]}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        No scoring criteria defined for this category
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <PencilIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    Select a category and contestant to begin scoring
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {showSignatureModal && (
        <div className="cgr-modal-overlay-soft">
          <div className="w-full max-w-xl rounded-lg bg-white dark:bg-gray-800 p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Judge Certification Signature</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Provide typed and/or drawn signature to finalize score certification.</p>
            <div className="mt-4">
              <input
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Typed signature"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div className="mt-3">
              <canvas
                ref={signatureCanvasRef}
                width={560}
                height={140}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white touch-none"
                style={{ touchAction: 'none' }}
                onPointerDown={startSignatureDrawing}
                onPointerMove={drawSignature}
                onPointerUp={stopSignatureDrawing}
                onPointerLeave={stopSignatureDrawing}
                onPointerCancel={stopSignatureDrawing}
              />
              <button type="button" onClick={clearSignatureDrawing} className="mt-2 text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                Clear Drawn Signature
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSignatureModal(false)
                  setIsSubmitting(false)
                }}
                className="px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCertificationSignature}
                className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Certify and Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScoringPage
