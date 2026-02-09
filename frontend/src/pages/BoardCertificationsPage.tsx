import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { boardAPI } from '../services/api'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { ConfirmModal } from '../components/ui'

interface Certification {
  id: string
  categoryId: string
  categoryName: string
  eventName: string
  contestName: string
  auditorId: string
  auditorName: string
  status: string
  certifiedAt: string
  notes?: string
}

const BoardCertificationsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedCertification, setSelectedCertification] = useState<Certification | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [confirmApprove, setConfirmApprove] = useState<{ isOpen: boolean; certification: Certification | null }>({
    isOpen: false,
    certification: null,
  })

  const { data: certifications, isLoading, error } = useQuery<Certification[]>(
    'board-certifications',
    async () => {
      const response = await boardAPI.getCertifications()
      return response.data.data || response.data || []
    },
    {
      retry: 1,
      onError: (err) => console.error('Failed to fetch certifications:', err),
    }
  )

  const approveMutation = useMutation(
    async (certificationId: string) => {
      return await boardAPI.approveCertification(certificationId)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('board-certifications')
        alert('Certification approved successfully')
      },
      onError: (error) => {
        console.error('Failed to approve certification:', error)
        alert('Failed to approve certification')
      },
    }
  )

  const rejectMutation = useMutation(
    async ({ certificationId, reason }: { certificationId: string; reason: string }) => {
      return await boardAPI.rejectCertification(certificationId, reason)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('board-certifications')
        setShowRejectModal(false)
        setRejectReason('')
        alert('Certification rejected')
      },
      onError: (error) => {
        console.error('Failed to reject certification:', error)
        alert('Failed to reject certification')
      },
    }
  )

  const handleApprove = (certification: Certification) => {
    setConfirmApprove({ isOpen: true, certification })
  }

  const executeApprove = () => {
    if (confirmApprove.certification) {
      approveMutation.mutate(confirmApprove.certification.id)
    }
    setConfirmApprove({ isOpen: false, certification: null })
  }

  const handleReject = (certification: Certification) => {
    setSelectedCertification(certification)
    setShowRejectModal(true)
  }

  const submitReject = () => {
    if (selectedCertification && rejectReason.trim()) {
      rejectMutation.mutate({
        certificationId: selectedCertification.id,
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
              Error Loading Certifications
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
            Certifications
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and approve final certifications
          </p>
        </div>

        {/* Certifications Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden" data-testid="certifications">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading certifications...
            </div>
          ) : !certifications || certifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No certifications pending approval
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 certification-list">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Auditor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Certified Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {certifications.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cert.eventName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cert.contestName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cert.categoryName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cert.auditorName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          cert.status === 'APPROVED'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : cert.status === 'REJECTED'
                            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        }`}>
                          {cert.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(cert.certifiedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {cert.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(cert)}
                              disabled={approveMutation.isLoading}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(cert)}
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
                Reject Certification
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

        {/* Approve Certification Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmApprove.isOpen}
          onClose={() => setConfirmApprove({ isOpen: false, certification: null })}
          onConfirm={executeApprove}
          title="Approve Certification"
          message={`Approve certification for ${confirmApprove.certification?.categoryName}?`}
          confirmText="Approve"
          variant="info"
          loading={approveMutation.isLoading}
        />
      </div>
    </div>
  )
}

export default BoardCertificationsPage
