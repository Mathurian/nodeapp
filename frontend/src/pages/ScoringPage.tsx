import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { scoringAPI } from '../services/api'
import {
  TrophyIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilIcon,
  ArrowPathIcon,
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
    contestants: number
  }
}

interface Contestant {
  id: string
  name: string
  contestantNumber: number | null
  bio: string | null
  imagePath: string | null
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
}

interface ScoreFormData {
  criterionId: string
  score: number
  comment: string
}

const ScoringPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedContestant, setSelectedContestant] = useState<Contestant | null>(null)
  const [scoreFormData, setScoreFormData] = useState<Record<string, ScoreFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if user is a judge
  const isJudge = user?.role === 'JUDGE' || user?.role === 'ADMIN'

  // Fetch categories assigned to the judge
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>(
    ['scoring-categories', user?.id],
    async () => {
      const response = await scoringAPI.getCategories()
      return response.data
    },
    {
      enabled: isJudge,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  )

  // Fetch contestants for selected category
  const { data: contestants, isLoading: contestantsLoading } = useQuery<Contestant[]>(
    ['category-contestants', selectedCategory?.id],
    async () => {
      if (!selectedCategory) return []
      // Assuming there's an endpoint to get contestants by category
      const response = await scoringAPI.getScores(selectedCategory.id, '')
      return response.data.contestants || []
    },
    {
      enabled: !!selectedCategory,
    }
  )

  // Fetch criteria for selected category
  const { data: criteria, isLoading: criteriaLoading } = useQuery<Criterion[]>(
    ['category-criteria', selectedCategory?.id],
    async () => {
      if (!selectedCategory) return []
      // Assuming there's an endpoint to get criteria by category
      const response = await scoringAPI.getScores(selectedCategory.id, '')
      return response.data.criteria || []
    },
    {
      enabled: !!selectedCategory,
    }
  )

  // Fetch existing scores for selected contestant
  const { data: existingScores } = useQuery<Score[]>(
    ['contestant-scores', selectedCategory?.id, selectedContestant?.id],
    async () => {
      if (!selectedCategory || !selectedContestant) return []
      const response = await scoringAPI.getScores(selectedCategory.id, selectedContestant.id)
      return response.data.scores || []
    },
    {
      enabled: !!selectedCategory && !!selectedContestant,
    }
  )

  // Initialize form data when contestant or scores change
  useEffect(() => {
    if (criteria && selectedContestant) {
      const initialFormData: Record<string, ScoreFormData> = {}
      criteria.forEach(criterion => {
        const existingScore = existingScores?.find(s => s.criterionId === criterion.id)
        initialFormData[criterion.id] = {
          criterionId: criterion.id,
          score: existingScore?.score || 0,
          comment: existingScore?.comment || '',
        }
      })
      setScoreFormData(initialFormData)
    }
  }, [criteria, selectedContestant, existingScores])

  // Submit score mutation
  const submitScoreMutation = useMutation(
    async (data: { categoryId: string; contestantId: string; scores: ScoreFormData[] }) => {
      const response = await scoringAPI.submitScore(data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['contestant-scores'])
        queryClient.invalidateQueries(['scoring-categories'])
      },
    }
  )

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

    setIsSubmitting(true)
    try {
      const scores = Object.values(scoreFormData)
      await submitScoreMutation.mutateAsync({
        categoryId: selectedCategory.id,
        contestantId: selectedContestant.id,
        scores,
      })
      alert('Scores submitted successfully!')
    } catch (error: any) {
      alert(`Error submitting scores: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTotalScore = () => {
    return Object.values(scoreFormData).reduce((sum, data) => sum + (Number(data.score) || 0), 0)
  }

  // Authorization check
  if (!isJudge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500">
            You must be a judge to access the scoring page.
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (categoriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
          <p className="mt-2 text-sm text-gray-500">Loading categories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <TrophyIcon className="h-8 w-8 mr-3 text-blue-600" />
            Scoring Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Select a category and contestant to begin scoring
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Categories */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                      <div className="font-medium text-gray-900">{category.name}</div>
                      <div className="text-sm text-gray-500">{category.contest.name}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {category._count.scores} scores • {category._count.contestants} contestants
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    No categories assigned yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Middle Column: Contestants */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                          {contestant.imagePath ? (
                            <img
                              src={contestant.imagePath}
                              alt={contestant.name}
                              className="h-10 w-10 rounded-full mr-3"
                            />
                          ) : (
                            <UserIcon className="h-10 w-10 rounded-full mr-3 text-gray-400" />
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{contestant.name}</div>
                            {contestant.contestantNumber && (
                              <div className="text-sm text-gray-500">
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
                    <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                      No contestants in this category
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">
                    Select a category to view contestants
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Scoring Form */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Score Sheet
              </h2>
              {selectedCategory && selectedContestant ? (
                <div>
                  {/* Contestant Info */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{selectedContestant.name}</div>
                    <div className="text-sm text-gray-500">{selectedCategory.name}</div>
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {criterion.name}
                            <span className="text-gray-500 ml-1">
                              (Max: {criterion.maxScore})
                            </span>
                          </label>
                          {criterion.description && (
                            <p className="text-xs text-gray-500 mb-2">
                              {criterion.description}
                            </p>
                          )}
                          <input
                            type="number"
                            min="0"
                            max={criterion.maxScore}
                            value={scoreFormData[criterion.id]?.score || 0}
                            onChange={(e) => handleScoreChange(criterion.id, 'score', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <textarea
                            placeholder="Comments (optional)"
                            value={scoreFormData[criterion.id]?.comment || ''}
                            onChange={(e) => handleScoreChange(criterion.id, 'comment', e.target.value)}
                            rows={2}
                            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}

                      {/* Total Score */}
                      <div className="pt-4 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-900">Total Score:</span>
                          <span className="text-2xl font-bold text-blue-600">
                            {getTotalScore()}
                            {selectedCategory.scoreCap && (
                              <span className="text-sm text-gray-500 ml-1">
                                / {selectedCategory.scoreCap}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        onClick={handleSubmitScores}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
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
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">
                        No scoring criteria defined for this category
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <PencilIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
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
