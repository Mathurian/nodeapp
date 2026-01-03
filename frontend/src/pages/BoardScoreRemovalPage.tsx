import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { scoringAPI } from '../services/api'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface ScoreRemovalRequest {
  id: string
  scoreId: string
  categoryName: string
  contestantName: string
  judgeName: string
  score: number
  reason: string
  requestedBy: string
  requestedAt: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

const BoardScoreRemovalPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedRequest, setSelectedRequest] = useState<ScoreRemovalRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  const { data: requests, isLoading, error } = useQuery<ScoreRemovalRequest[]>(
    'score-removal-requests',
    async () => {
      // Mock data since backend endpoint doesn't exist yet
      // In production, this would call an actual API endpoint
      return [
        {
          id: '1',
          scoreId: 'score-1',
          categoryName: 'Category A',
          contestantName: 'Contestant 1',
          judgeName: 'Judge Smith',
          score: 85,
          reason: 'Data entry error',
          requestedBy: 'Admin User',
          requestedAt: new Date().toISOString(),
          status: 'PENDING',
        },
      ] as ScoreRemovalRequest[]
    },
    {
      retry: 1,
      onError: (err) => console.error('Failed to fetch requests:', err),
    }
  )

  const approveMutation = useMutation(
    async (requestId: string) => {
      console.log('Approving score removal request:', requestId)
      return { success: true }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('score-removal-requests')
        alert('Score removal request approved')
      },
      onError: (error) => {
        console.error('Failed to approve request:', error)
        alert('Failed to approve request')
      },
    }
  )

  const rejectMutation = useMutation(
    async ({ requestId, reason }: { requestId: string; reason: string }) => {
      console.log('Rejecting score removal request:', requestId, reason)
      return { success: true }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('score-removal-requests')
        setShowRejectModal(false)
        setRejectReason('')
        alert('Score removal request rejected')
      },
      onError: (error) => {
        console.error('Failed to reject request:', error)
        alert('Failed to reject request')
      },
    }
  )

  const handleApprove = (request: ScoreRemovalRequest) => {
    if (window.confirm(`Approve score removal for ${request.contestantName}?`)) {
      approveMutation.mutate(request.id)
    }
  }

  const handleReject = (request: ScoreRemovalRequest) => {
    setSelectedRequest(request)
    setShowRejectModal(true)
  }

  const submitReject = () => {
    if (selectedRequest && rejectReason.trim()) {
      rejectMutation.mutate({
        requestId: selectedRequest.id,
        reason: rejectReason,
      })
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Score Removal Requests
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Score Removal Requests
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and approve requests to remove scores
          </p>
        </div>

        {/* Requests Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden" data-testid="score-removal">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading score removal requests...
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No score removal requests
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 request-list">
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
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Requested By
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
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {request.categoryName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {request.contestantName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {request.judgeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {request.score}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {request.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {request.requestedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.status === 'APPROVED'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : request.status === 'REJECTED'
                            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {request.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(request)}
                              disabled={approveMutation.isLoading}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(request)}
                              disabled={rejectMutation.isLoading}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Reject Score Removal Request
              </h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                rows={4}
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectReason('')
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReject}
                  disabled={!rejectReason.trim() || rejectMutation.isLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rejectMutation.isLoading ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BoardScoreRemovalPage
