import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { scoringAPI } from '../services/api'
import {
  CheckCircleIcon,
  FlagIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { ConfirmModal } from '../components/ui'

interface Score {
  id: string
  categoryId: string
  categoryName: string
  contestantId: string
  contestantName: string
  judgeId: string
  judgeName: string
  score: number
  verified: boolean
  flagged: boolean
  notes?: string
  createdAt: string
}

const AuditorScoreVerificationPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedScore, setSelectedScore] = useState<Score | null>(null)
  const [flagComment, setFlagComment] = useState('')
  const [notes, setNotes] = useState('')
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [confirmVerify, setConfirmVerify] = useState<{ isOpen: boolean; score: Score | null }>({
    isOpen: false,
    score: null,
  })
  const [showNotesModal, setShowNotesModal] = useState(false)

  const { data: scores, isLoading, error } = useQuery<Score[]>(
    'score-verification',
    async () => {
      // Get all categories and their scores
      const categoriesResponse = await scoringAPI.getCategories()
      const categories = categoriesResponse.data.data || categoriesResponse.data || []

      // Mock scores for now - in production, would fetch from API
      const mockScores: Score[] = categories.flatMap((cat: any) =>
        Array(3).fill(null).map((_, i) => ({
          id: `${cat.id}-score-${i}`,
          categoryId: cat.id,
          categoryName: cat.name,
          contestantId: `contestant-${i}`,
          contestantName: `Contestant ${i + 1}`,
          judgeId: `judge-${i}`,
          judgeName: `Judge ${i + 1}`,
          score: Math.floor(Math.random() * 100),
          verified: false,
          flagged: false,
          createdAt: new Date().toISOString(),
        }))
      )

      return mockScores
    },
    {
      retry: 1,
      onError: (err) => console.error('Failed to fetch scores:', err),
    }
  )

  const verifyMutation = useMutation(
    async (scoreId: string) => {
      // In production, call API to verify score
      console.log('Verifying score:', scoreId)
      return { success: true }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('score-verification')
        alert('Score verified successfully')
      },
      onError: (error) => {
        console.error('Failed to verify score:', error)
        alert('Failed to verify score')
      },
    }
  )

  const flagMutation = useMutation(
    async ({ scoreId, comment }: { scoreId: string; comment: string }) => {
      console.log('Flagging score:', scoreId, comment)
      return { success: true }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('score-verification')
        setShowFlagModal(false)
        setFlagComment('')
        alert('Score flagged for review')
      },
      onError: (error) => {
        console.error('Failed to flag score:', error)
        alert('Failed to flag score')
      },
    }
  )

  const notesMutation = useMutation(
    async ({ scoreId, notes }: { scoreId: string; notes: string }) => {
      console.log('Adding notes to score:', scoreId, notes)
      return { success: true }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('score-verification')
        setShowNotesModal(false)
        setNotes('')
        alert('Notes saved successfully')
      },
      onError: (error) => {
        console.error('Failed to save notes:', error)
        alert('Failed to save notes')
      },
    }
  )

  const handleVerify = (score: Score) => {
    setConfirmVerify({ isOpen: true, score })
  }

  const executeVerify = () => {
    if (confirmVerify.score) {
      verifyMutation.mutate(confirmVerify.score.id)
    }
    setConfirmVerify({ isOpen: false, score: null })
  }

  const handleFlag = (score: Score) => {
    setSelectedScore(score)
    setShowFlagModal(true)
  }

  const handleAddNotes = (score: Score) => {
    setSelectedScore(score)
    setNotes(score.notes || '')
    setShowNotesModal(true)
  }

  const submitFlag = () => {
    if (selectedScore && flagComment.trim()) {
      flagMutation.mutate({ scoreId: selectedScore.id, comment: flagComment })
    }
  }

  const submitNotes = () => {
    if (selectedScore && notes.trim()) {
      notesMutation.mutate({ scoreId: selectedScore.id, notes })
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Scores
            </h2>
            <p className="text-red-800 dark:text-red-200">{String(error)}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="score-verification">
            Score Verification
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Verify and validate submitted scores
          </p>
        </div>

        {/* Scores Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading scores...
            </div>
          ) : !scores || scores.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No scores to verify
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" data-testid="scores-list">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contestant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Judge
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {scores.map((score) => (
                    <tr key={score.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {score.categoryName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {score.contestantName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {score.judgeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {score.score}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {score.verified ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            Verified
                          </span>
                        ) : score.flagged ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                            Flagged
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleVerify(score)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                          title="Verify"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => handleFlag(score)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title="Flag"
                        >
                          Flag
                        </button>
                        <button
                          onClick={() => handleAddNotes(score)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="Add Notes"
                        >
                          Notes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Flag Modal */}
        {showFlagModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Flag Score for Review
              </h3>
              <textarea
                name="comment"
                value={flagComment}
                onChange={(e) => setFlagComment(e.target.value)}
                placeholder="Enter reason for flagging this score..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                rows={4}
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowFlagModal(false)
                    setFlagComment('')
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={submitFlag}
                  disabled={!flagComment.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes Modal */}
        {showNotesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add Verification Notes
              </h3>
              <textarea
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this score verification..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                rows={4}
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowNotesModal(false)
                    setNotes('')
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={submitNotes}
                  disabled={!notes.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verify Score Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmVerify.isOpen}
          onClose={() => setConfirmVerify({ isOpen: false, score: null })}
          onConfirm={executeVerify}
          title="Verify Score"
          message={`Verify score ${confirmVerify.score?.score} for ${confirmVerify.score?.contestantName}?`}
          confirmText="Verify"
          variant="info"
          loading={verifyMutation.isLoading}
        />
      </div>
    </div>
  )
}

export default AuditorScoreVerificationPage
