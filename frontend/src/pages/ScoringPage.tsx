import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { scoringAPI } from '../services/api'
import { scoreFilesAPI } from '../services/api'
import { useOptimisticMutation } from '../hooks'
import { OptimisticIndicator, OptimisticStatus } from '../components/ui'
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
  isSigned: boolean
  signedAt: Date | null
  createdAt: Date
  updatedAt: Date
  _optimistic?: boolean
}

interface ScoreFormData {
  criterionId: string
  score: number
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

const getImageUrl = (path?: string | null): string | null => {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) return path
  return `/${path}`
}

const getFileUrl = (path?: string | null): string | null => {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) return path
  return `/${path}`
}

const ScoringPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedContestant, setSelectedContestant] = useState<Contestant | null>(null)
  const [scoreFormData, setScoreFormData] = useState<Record<string, ScoreFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSignOffChecked, setIsSignOffChecked] = useState(false)
  const [saveStatus, setSaveStatus] = useState<OptimisticStatus>('idle')
  const [uploadingContext, setUploadingContext] = useState<string | null>(null)
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

  const normalizedExistingScores: Score[] = Array.isArray(existingScores)
    ? existingScores
    : ((existingScores as unknown as { scores?: Score[] })?.scores || [])

  // Initialize form data when contestant or scores change
  useEffect(() => {
    if (criteria && selectedContestant) {
      const initialFormData: Record<string, ScoreFormData> = {}
      criteria.forEach(criterion => {
        const existingScore = normalizedExistingScores.find(s => s.criterionId === criterion.id)
        initialFormData[criterion.id] = {
          criterionId: criterion.id,
          score: existingScore?.score || 0,
          comment: existingScore?.comment || '',
        }
      })
      setScoreFormData(initialFormData)
    }
  }, [criteria, selectedContestant, normalizedExistingScores])

  useEffect(() => {
    setIsSignOffChecked(false)
  }, [selectedCategory?.id, selectedContestant?.id])

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
        const existing = latestScores.find((s) => s.criterionId === scoreData.criterionId)
        const payload = {
          score: Number(scoreData.score) || 0,
          comments: scoreData.comment || '',
        }

        if (existing?.id) {
          await scoringAPI.updateScore(existing.id, payload)
        } else {
          await scoringAPI.submitScore(data.categoryId, data.contestantId, {
            criteriaId: scoreData.criterionId,
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
        score: scoreData.score,
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
    setScoreFormData(prev => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        [field]: value,
      },
    }))
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
      await submitScoreMutation.mutateAsync({
        categoryId: selectedCategory.id,
        contestantId: selectedContestant.id,
        scores,
      })
      if (requiresSignOff) {
        await scoringAPI.certifyScores(selectedCategory.id)
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

  const handleUploadAttachment = async (file: File, criterionId?: string) => {
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
      toast.success('Attachment uploaded')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload attachment')
    } finally {
      setUploadingContext(null)
    }
  }

  const getTotalScore = () => {
    return Object.values(scoreFormData).reduce((sum, data) => sum + (Number(data.score) || 0), 0)
  }

  const contestantLevelAttachments = scoreAttachments.filter((file) => file?.metadata?.contextType !== 'CRITERION_COMMENT')
  const criterionAttachments = (criterionId: string) => scoreAttachments.filter(
    (file) => file?.metadata?.contextType === 'CRITERION_COMMENT' && file?.metadata?.criterionId === criterionId
  )

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
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
        <p className="text-red-800 dark:text-red-200 mb-4">{String(existingScoresError)}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">Reload Page</button>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <TrophyIcon className="h-8 w-8 mr-3 text-blue-600" />
            Scoring Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
            Select a category and contestant to begin scoring
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Categories */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Categories
              </h2>
              {categories && categories.length > 0 ? (
                <div className="space-y-2">
                  {categories.map(category => (
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
                    No categories assigned yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Middle Column: Contestants */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
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
            </div>
          </div>

          {/* Right Column: Scoring Form */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
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
                      <a
                        href={getFileUrl(selectedContestant.bioFilePath)!}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        View uploaded bio file
                      </a>
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
                      {contestantLevelAttachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {contestantLevelAttachments.map((file) => (
                            <a
                              key={file.id}
                              href={file.publicUrl || file.filePath}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 underline"
                            >
                              <PaperClipIcon className="h-4 w-4" />
                              {file.fileName}
                            </a>
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
                  ) : criteria && criteria.length > 0 ? (
                    <div className="space-y-6">
                      {criteria.map(criterion => (
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
                            value={scoreFormData[criterion.id]?.score || 0}
                            onChange={(e) => handleScoreChange(criterion.id, 'score', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <textarea
                            placeholder="Comments (optional)"
                            value={scoreFormData[criterion.id]?.comment || ''}
                            onChange={(e) => handleScoreChange(criterion.id, 'comment', e.target.value)}
                            rows={2}
                            className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
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
                            {criterionAttachments(criterion.id).length > 0 && (
                              <div className="mt-1 space-y-1">
                                {criterionAttachments(criterion.id).map((file) => (
                                  <a
                                    key={file.id}
                                    href={file.publicUrl || file.filePath}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 underline"
                                  >
                                    <PaperClipIcon className="h-3.5 w-3.5" />
                                    {file.fileName}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScoringPage
