import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { scoringAPI } from '../services/api'
import {
  MinusCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface Deduction {
  id: string
  categoryId: string
  category: {
    id: string
    name: string
  }
  contestantId: string
  contestant: {
    id: string
    contestantNumber: string
    user: {
      name: string
    }
  }
  points: number
  reason: string
  requestedBy: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedBy?: string
  rejectionReason?: string
  createdAt: string
}

const DeductionsPage: React.FC = () => {
  const { user } = useAuth()
  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('ALL')
  const [showApproveModal, setShowApproveModal] = useState<Deduction | null>(null)
  const [showRejectModal, setShowRejectModal] = useState<Deduction | null>(null)
  const [signature, setSignature] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    fetchDeductions()
  }, [])

  const fetchDeductions = async () => {
    try {
      setLoading(true)
      const response = await scoringAPI.getDeductions()
      setDeductions(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load deductions')
    } finally {
      setLoading(false)
    }
  }

  const approveDeduction = async (id: string) => {
    try {
      await scoringAPI.approveDeduction(id, signature)
      setShowApproveModal(null)
      setSignature('')
      await fetchDeductions()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve deduction')
    }
  }

  const rejectDeduction = async (id: string) => {
    try {
      await scoringAPI.rejectDeduction(id, rejectionReason)
      setShowRejectModal(null)
      setRejectionReason('')
      await fetchDeductions()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject deduction')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'REJECTED':
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'REJECTED':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
    }
  }

  const filteredDeductions = deductions.filter(d => filter === 'ALL' || d.status === filter)

  const canApprove = user?.role === 'ORGANIZER' || user?.role === 'TALLY_MASTER' || user?.role === 'BOARD'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Loading deductions...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
            Score Deductions
          </h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mt-2">
            Manage and approve score deduction requests
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'ALL'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All ({deductions.length})
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'PENDING'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Pending ({deductions.filter(d => d.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'APPROVED'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Approved ({deductions.filter(d => d.status === 'APPROVED').length})
          </button>
          <button
            onClick={() => setFilter('REJECTED')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'REJECTED'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Rejected ({deductions.filter(d => d.status === 'REJECTED').length})
          </button>
        </div>

        {/* Deductions List */}
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {filteredDeductions.length === 0 ? (
            <div className="p-12 text-center">
              <MinusCircleIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                No deductions {filter !== 'ALL' && filter.toLowerCase()}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase">
                      Contestant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase">
                      Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase">
                      Requested
                    </th>
                    {canApprove && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDeductions.map((deduction) => (
                    <tr key={deduction.id} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(deduction.status)}
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deduction.status)}`}>
                            {deduction.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white dark:text-white">
                        {deduction.category.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white dark:text-white">
                        #{deduction.contestant.contestantNumber} - {deduction.contestant.user.name}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                        -{deduction.points}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        {deduction.reason}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {format(new Date(deduction.createdAt), 'MMM d, h:mm a')}
                      </td>
                      {canApprove && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {deduction.status === 'PENDING' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowApproveModal(deduction)}
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <CheckCircleIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => setShowRejectModal(deduction)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <XCircleIcon className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Approve Modal */}
        {showApproveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-4">
                Approve Deduction
              </h3>
              <div className="mb-4">
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mb-2">
                  Deduct <strong>{showApproveModal.points} points</strong> from contestant #{showApproveModal.contestant.contestantNumber}?
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  Reason: {showApproveModal.reason}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Your Signature
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => approveDeduction(showApproveModal.id)}
                  disabled={!signature}
                  className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    setShowApproveModal(null)
                    setSignature('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-4">
                Reject Deduction
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Reason for Rejection
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => rejectDeduction(showRejectModal.id)}
                  disabled={!rejectionReason}
                  className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(null)
                    setRejectionReason('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DeductionsPage
