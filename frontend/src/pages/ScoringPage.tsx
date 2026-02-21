import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { scoringAPI } from '../services/api'
import { scoreFilesAPI } from '../services/api'
import { useOptimisticMutation } from '../hooks'
import { Card, OptimisticIndicator, OptimisticStatus, PageHeader } from '../components/ui'
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

interface Category {
  id: string
  name: string
  description: string | null
  scoreCap: number | null
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

interface ScoreAttachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  filePath: string
  publicUrl?: string
  metadata?: {
    contextType?: 'CRITERION_COMMENT' | 'CONTESTANT' | 'CATEGORY'
    criterionId?: string | null
    noteText?: string | null
  } | null
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
  const queryClient = useQueryClient()

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedContestId, setSelectedContestId] = useState<string>('')
  const [selectedContestant, setSelectedContestant] = useState<Contestant | null>(null)
  const [scoreFormData, setScoreFormData] = useState<Record<string, ScoreFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSignOffChecked, setIsSignOffChecked] = useState(false)
  const [saveStatus, setSaveStatus] = useState<OptimisticStatus>('idle')
  const [uploadingContext, setUploadingContext] = useState<string | null>(null)
  const [updatingCommentary, setUpdatingCommentary] = useState(false)
  const [pendingCommentaryFiles, setPendingCommentaryFiles] = useState<PendingCommentaryFile[]>([])
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [typedSignature, setTypedSignature] = useState('')
  const [drawnSignatureData, setDrawnSignatureData] = useState('')
  const [isDrawingSignature, setIsDrawingSignature] = useState(false)

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/scoring'
  const basePath = currentPath.replace(/\/scoring\/?$/, '')
  const signatureCanvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const requiresSignOff = user?.role === 'JUDGE'

  // Check if user can access scoring page (judges, admins, board members, and tally masters for viewing)
  const isJudge = ['JUDGE', 'SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER', 'BOARD'].includes(user?.role || '')

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
      enabled: isJudge,
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
  const { data: existingScores, error: existingScoresError } = useQuery<Score[]>(
    ['contestant-scores', selectedCategory?.id, selectedContestant?.id],
    async () => {
      if (!selectedCategory || !selectedContestant) return []
      const response = await scoringAPI.getScores(selectedCategory.id, selectedContestant.id)
      const unwrapped = response.data?.data ?? response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      enabled: !!selectedCategory && !!selectedContestant,
      retry: 1,
      onError: (err) => console.error('Fetch existing scores failed:', err),
    }
  )

  const { data: scoreAttachments = [] } = useQuery<ScoreAttachment[]>(
    ['score-attachments', selectedCategory?.id, selectedContestant?.id],
    async () => {
      if (!selectedCategory || !selectedContestant) return []
      const response = await scoreFilesAPI.getAll({
        categoryId: selectedCategory.id,
        contestantId: selectedContestant.id,
      })
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      enabled: !!selectedCategory && !!selectedContestant,
      retry: 1,
    }
  )

  const assignedContests = useMemo<ContestOption[]>(() => {
    if (!categories || categories.length === 0) return []
    const contestMap = new Map<string, ContestOption>()
    for (const category of categories) {
      const contestId = category?.contest?.id
      if (!contestId || contestMap.has(contestId)) continue
      contestMap.set(contestId, {
        id: contestId,
        name: category.contest.name,
        eventName: category.contest.event?.name || '',
      })
    }
    return Array.from(contestMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [categories])

  const filteredCategories = useMemo<Category[]>(() => {
    if (!categories || categories.length === 0) return []
    if (!selectedContestId) return categories
    return categories.filter((category) => category.contest.id === selectedContestId)
  }, [categories, selectedContestId])

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

  // Initialize form data when contestant or scores change
  useEffect(() => {
    if (selectedContestant && effectiveCriteria.length > 0) {
      const initialFormData: Record<string, ScoreFormData> = {}
      effectiveCriteria.forEach(criterion => {
        const existingScore = criterion.id === '__category_total__'
          ? normalizedExistingScores.find(s => !s.criterionId)
          : normalizedExistingScores.find(s => s.criterionId === criterion.id)
        initialFormData[criterion.id] = {
          criterionId: criterion.id,
          score: existingScore?.score ?? '',
          comment: existingScore?.comment || '',
        }
      })
      setScoreFormData(initialFormData)
    }
  }, [effectiveCriteria, selectedContestant, normalizedExistingScores])

  useEffect(() => {
    setIsSignOffChecked(false)
  }, [selectedCategory?.id, selectedContestant?.id])

  useEffect(() => {
    if (assignedContests.length === 0) {
      setSelectedContestId('')
      return
    }
    setSelectedContestId((current) => {
      if (current && assignedContests.some((contest) => contest.id === current)) {
        return current
      }
      return assignedContests[0]?.id || ''
    })
  }, [assignedContests])

  useEffect(() => {
    if (!selectedCategory) return
    if (selectedContestId && selectedCategory.contest.id !== selectedContestId) {
      setSelectedCategory(null)
      setSelectedContestant(null)
    }
  }, [selectedCategory, selectedContestId])

  // Submit score mutation with optimistic updates
  const submitScoreMutation = useOptimisticMutation<
    unknown,
    { categoryId: string; contestantId: string; scores: ScoreFormData[] }
  >({
    mutationFn: async (data) => {
      const latestResponse = await scoringAPI.getScores(data.categoryId, data.contestantId)
      const latestRaw = latestResponse.data?.data ?? latestResponse.data
      const latestScores: Score[] = Array.isArray(latestRaw) ? latestRaw : []

      await Promise.all(data.scores.map(async (scoreData) => {
        const criterionId = scoreData.criterionId === '__category_total__' ? undefined : scoreData.criterionId
        const existing = criterionId
          ? latestScores.find((s) => s.criterionId === criterionId)
          : latestScores.find((s) => !s.criterionId)
        const payload = {
          score: Number(scoreData.score) || 0,
          comments: scoreData.comment || '',
        }

        if (existing?.id) {
          await scoringAPI.updateScore(existing.id, payload)
        } else {
          await scoringAPI.submitScore(data.categoryId, data.contestantId, {
            criteriaId: criterionId,
            ...payload,
          })
        }
      }))
      return { success: true }
    },
    queryKey: ['contestant-scores', selectedCategory?.id, selectedContestant?.id],
    updateFn: (oldData, variables) => {
      // Optimistically update scores in cache
      const oldScores = Array.isArray(oldData)
        ? (oldData as Score[])
        : ((oldData as { scores?: Score[] })?.scores || [])
      const newScores = variables.scores.map((scoreData) => ({
        id: `optimistic-${scoreData.criterionId}`,
        contestantId: variables.contestantId,
        judgeId: user?.id || '',
        categoryId: variables.categoryId,
        criterionId: scoreData.criterionId,
        score: Number(scoreData.score || 0),
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

  const handleSubmitScores = async () => {
    if (!selectedCategory || !selectedContestant) return
    if (requiresSignOff && !isSignOffChecked) {
      toast.error('You must certify/sign off before submitting scores')
      return
    }

    setIsSubmitting(true)
    setSaveStatus('saving')
    try {
      const scores = Object.values(scoreFormData)
      const overCap = scores.find((entry) => {
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
      await submitScoreMutation.mutateAsync({
        categoryId: selectedCategory.id,
        contestantId: selectedContestant.id,
        scores,
      })
      if (requiresSignOff) {
        setShowSignatureModal(true)
        return
      }
      setSaveStatus('saved')
      toast.success('Scores submitted successfully!')
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
    if (!typedSignature.trim() && !drawnSignatureData.trim()) {
      toast.error('Provide typed and/or drawn signature')
      return
    }
    try {
      await scoringAPI.certifyScores(selectedCategory.id, {
        typedSignature: typedSignature.trim() || undefined,
        drawnSignatureData: drawnSignatureData || undefined
      })
      if (selectedContestant) {
        await queryClient.invalidateQueries(['contestant-scores', selectedCategory.id, selectedContestant.id])
      }
      await queryClient.invalidateQueries(['scoring-categories'])
      setShowSignatureModal(false)
      setTypedSignature('')
      setDrawnSignatureData('')
      setSaveStatus('saved')
      toast.success('Scores submitted and certified successfully!')
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Failed to certify scores')
      setSaveStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const uploadAttachmentNow = async (file: File, criterionId?: string, silent = false) => {
    if (!selectedCategory || !selectedContestant || !file) return
    const contextKey = criterionId ? `criterion-${criterionId}` : 'contestant'
    setUploadingContext(contextKey)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('categoryId', selectedCategory.id)
      formData.append('contestantId', selectedContestant.id)
      if (criterionId) {
        formData.append('criterionId', criterionId)
      }
      await scoreFilesAPI.upload(formData)
      await queryClient.invalidateQueries(['score-attachments', selectedCategory.id, selectedContestant.id])
      if (!silent) toast.success('Attachment uploaded')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload attachment')
      throw error
    } finally {
      setUploadingContext(null)
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

  const getTotalScore = () => {
    return Object.values(scoreFormData).reduce((sum, data) => sum + (Number(data.score) || 0), 0)
  }

  const contestantLevelAttachments = scoreAttachments.filter((file) => file?.metadata?.contextType !== 'CRITERION_COMMENT')
  const criterionAttachments = (criterionId: string) => scoreAttachments.filter(
    (file) => file?.metadata?.contextType === 'CRITERION_COMMENT' && file?.metadata?.criterionId === criterionId
  )
  const isCertifiedContext = normalizedExistingScores.length > 0

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
      await queryClient.invalidateQueries(['score-attachments', selectedCategory.id, selectedContestant.id])
      toast.success('Attachment removed')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to remove attachment')
    }
  }

  const handleUpdateCommentary = async () => {
    if (!selectedCategory || !selectedContestant) return

    setUpdatingCommentary(true)
    try {
      const existingByCriterion = new Map<string, Score>()
      normalizedExistingScores.forEach((score) => {
        const key = score.criterionId || '__category_total__'
        existingByCriterion.set(key, score)
      })

      const commentUpdates = Array.from(existingByCriterion.entries())
        .map(([criterionKey, score]) => {
          const nextComment = scoreFormData[criterionKey]?.comment ?? ''
          const currentComment = score.comment ?? ''
          if (nextComment === currentComment) return null
          return scoringAPI.updateScore(score.id, { comments: nextComment })
        })
        .filter((entry): entry is ReturnType<typeof scoringAPI.updateScore> => Boolean(entry))

      if (commentUpdates.length > 0) {
        await Promise.all(commentUpdates)
      }

      if (pendingCommentaryFiles.length > 0) {
        for (const pending of pendingCommentaryFiles) {
          await uploadAttachmentNow(pending.file, pending.criterionId, true)
        }
      }

      await Promise.all([
        queryClient.invalidateQueries(['contestant-scores', selectedCategory.id, selectedContestant.id]),
        queryClient.invalidateQueries(['score-attachments', selectedCategory.id, selectedContestant.id])
      ])

      setPendingCommentaryFiles([])
      toast.success('Commentary Updated')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update commentary')
    } finally {
      setUpdatingCommentary(false)
    }
  }

  // Authorization check
  if (!isJudge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
            You must be a judge to access the scoring page.
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
          subtitle={assignedContests.length > 1 ? 'Select a contest, category, and contestant to begin scoring' : 'Select a category and contestant to begin scoring'}
          icon={TrophyIcon}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Categories */}
          <div className="lg:col-span-1">
            <Card className="rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Categories
              </h2>
              {assignedContests.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assigned Contest
                  </label>
                  <select
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
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                        selectedCategory?.id === category.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
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
                    {categories && categories.length > 0
                      ? 'No categories assigned in the selected contest'
                      : 'No categories assigned yet'}
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Middle Column: Contestants */}
          <div className="lg:col-span-1">
            <Card className="rounded-lg p-6">
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
                    {contestants.map(contestant => (
                      <button
                        key={contestant.id}
                        onClick={() => setSelectedContestant(contestant)}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                          selectedContestant?.id === contestant.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
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
          <div className="lg:col-span-1">
            <Card className="rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Score Sheet
              </h2>
              {selectedCategory && selectedContestant ? (
                <div>
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
                    {user?.role === 'JUDGE' && hasCertifiedScores && (
                      <div className="mt-3">
                        <Link
                          to={`${basePath || ''}/score-governance?action=UNCERTIFY&scope=CONTESTANT_CATEGORY&contestId=${encodeURIComponent(selectedCategory.contest.id)}&categoryId=${encodeURIComponent(selectedCategory.id)}&contestantId=${encodeURIComponent(selectedContestant.id)}`}
                          className="inline-flex items-center rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-200"
                        >
                          Request Un-certify
                        </Link>
                      </div>
                    )}
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Contestant Commentary Attachment
                      </label>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) void handleUploadAttachment(file)
                          e.currentTarget.value = ''
                        }}
                        className="block w-full text-sm text-gray-600 dark:text-gray-300"
                      />
                      {uploadingContext === 'contestant' && (
                        <p className="mt-1 text-xs text-blue-600">Uploading...</p>
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
                      {contestantLevelAttachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {contestantLevelAttachments.map((file) => (
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
                              <button
                                type="button"
                                onClick={() => void removeUploadedAttachment(file.id)}
                                className="text-xs text-red-600 hover:text-red-700 underline"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scoring Criteria */}
                  {criteriaLoading ? (
                    <div className="text-center py-8">
                      <ArrowPathIcon className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
                    </div>
                  ) : effectiveCriteria.length > 0 ? (
                    <div className="space-y-6">
                      {effectiveCriteria.map(criterion => (
                        <div key={criterion.id} className="border-b pb-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                            min="0"
                            max={criterion.maxScore}
                            value={scoreFormData[criterion.id]?.score ?? ''}
                            placeholder="0"
                            onChange={(e) => handleScoreChange(criterion.id, 'score', e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <textarea
                            placeholder="Comments (optional)"
                            value={scoreFormData[criterion.id]?.comment || ''}
                            onChange={(e) => handleScoreChange(criterion.id, 'comment', e.target.value)}
                            rows={2}
                            className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {criterion.id !== '__category_total__' && (
                          <div className="mt-2">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                              Criterion Attachment
                            </label>
                            <input
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
                                    <button
                                      type="button"
                                      onClick={() => void removeUploadedAttachment(file.id)}
                                      className="text-xs text-red-600 hover:text-red-700 underline"
                                    >
                                      Remove
                                    </button>
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
                      <div className="space-y-2">
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
                              onChange={(e) => setIsSignOffChecked(e.target.checked)}
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
                            savingText="Saving scores..."
                            savedText="Scores saved"
                            errorText="Failed to save - scores rolled back"
                          />
                        </div>
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
