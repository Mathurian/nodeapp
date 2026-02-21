import React, { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { boardAPI } from '../services/api'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { Button, Card, ConfirmModal, PageHeader, ResponsiveTable, getOptimisticRowClass } from '../components/ui'
import { useOptimisticMutation } from '../hooks'

interface Certification {
  id: string
  categoryId: string
  categoryName: string
  eventName: string
  contestName: string
  auditorId: string | null
  auditorIds: string[]
  auditorSignedCount: number
  auditorName: string
  status: string
  certifiedAt: string
  notes?: string
  _optimistic?: boolean
  _deleting?: boolean
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
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [typedSignature, setTypedSignature] = useState('')
  const [drawnSignatureData, setDrawnSignatureData] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

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

  // Approve mutation with optimistic update
  const approveMutation = useOptimisticMutation<unknown, { certificationId: string; signature: { typedSignature?: string; drawnSignatureData?: string } }>({
    mutationFn: async ({ certificationId, signature }) => {
      return await boardAPI.approveCertification(certificationId, signature)
    },
    queryKey: ['board-certifications'],
    updateFn: (oldData, { certificationId }) => {
      const certs = oldData as Certification[] | undefined
      if (!certs) return []
      return certs.map((cert) =>
        cert.id === certificationId
          ? { ...cert, status: 'APPROVED', _optimistic: true }
          : cert
      )
    },
    onSuccess: () => {
      toast.success('Certification approved successfully')
    },
    onError: (error) => {
      console.error('Failed to approve certification:', error)
      toast.error('Failed to approve certification')
    },
    invalidateOnSettled: true,
  })

  // Reject mutation with optimistic update
  const rejectMutation = useOptimisticMutation<
    unknown,
    { certificationId: string; reason: string }
  >({
    mutationFn: async ({ certificationId, reason }) => {
      return await boardAPI.rejectCertification(certificationId, reason)
    },
    queryKey: ['board-certifications'],
    updateFn: (oldData, { certificationId }) => {
      const certs = oldData as Certification[] | undefined
      if (!certs) return []
      return certs.map((cert) =>
        cert.id === certificationId
          ? { ...cert, status: 'REJECTED', _optimistic: true }
          : cert
      )
    },
    onSuccess: () => {
      setShowRejectModal(false)
      setRejectReason('')
      toast.success('Certification rejected')
    },
    onError: (error) => {
      console.error('Failed to reject certification:', error)
      toast.error('Failed to reject certification')
    },
    invalidateOnSettled: true,
  })

  const handleApprove = (certification: Certification) => {
    setConfirmApprove({ isOpen: true, certification })
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
      // no-op
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
      setDrawnSignatureData(canvas.toDataURL('image/png'))
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

  const executeApprove = () => {
    if (confirmApprove.certification) {
      setShowSignatureModal(true)
      setConfirmApprove({ isOpen: false, certification: confirmApprove.certification })
    }
  }

  const submitApprovalWithSignature = () => {
    if (!confirmApprove.certification) return
    if (!typedSignature.trim() && !drawnSignatureData.trim()) {
      toast.error('A typed or drawn signature is required')
      return
    }
    approveMutation.mutate({
      certificationId: confirmApprove.certification.id,
      signature: {
        typedSignature: typedSignature.trim() || undefined,
        drawnSignatureData: drawnSignatureData || undefined
      }
    })
    setShowSignatureModal(false)
    setConfirmApprove({ isOpen: false, certification: null })
    setTypedSignature('')
    setDrawnSignatureData('')
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
      <div className="cgr-page-container">
          <Card className="bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Certifications
            </h2>
            <p className="text-red-800 dark:text-red-200">{String(error)}</p>
          </Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container">
        <PageHeader
          title="Certifications"
          subtitle="Review and approve final certifications"
        />

        {/* Certifications Table */}
        <Card className="rounded-lg overflow-hidden p-0" data-testid="certifications">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading certifications...
            </div>
          ) : !certifications || certifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No certifications pending approval
            </div>
          ) : (
            <ResponsiveTable caption="Board certification queue" minWidth="900px">
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
                  {certifications.map((cert) => {
                    const optimisticClass = getOptimisticRowClass(cert)
                    return (
                    <tr
                      key={cert.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 ${optimisticClass}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cert.eventName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cert.contestName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cert.categoryName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="flex flex-col">
                          <span className="break-words">{cert.auditorName}</span>
                          {cert.auditorSignedCount > 1 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {cert.auditorSignedCount} auditors signed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
                          cert.status === 'APPROVED' || cert.status === 'CERTIFIED'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : cert.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                            : cert.status === 'REJECTED'
                            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        }`}>
                          {cert.status}
                          {cert._optimistic && (
                            <span className="ml-1 h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(cert.certifiedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {cert.status !== 'CERTIFIED' && cert.status !== 'APPROVED' && (
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
                    )
                  })}
                </tbody>
              </table>
            </ResponsiveTable>
          )}
        </Card>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="cgr-modal-overlay">
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
                <Button
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectReason('')
                  }}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitReject}
                  disabled={!rejectReason.trim() || rejectMutation.isLoading}
                  variant="danger"
                >
                  {rejectMutation.isLoading ? 'Rejecting...' : 'Reject'}
                </Button>
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

        {showSignatureModal && (
          <div className="cgr-modal-overlay-soft">
            <div className="w-full max-w-xl rounded-lg bg-white dark:bg-gray-800 p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Board Approval Signature</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Provide typed and/or drawn signature to approve.</p>
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
                  ref={canvasRef}
                  width={560}
                  height={140}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white touch-none"
                  style={{ touchAction: 'none' }}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  onPointerCancel={stopDrawing}
                />
                <button type="button" onClick={clearDrawing} className="mt-2 text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                  Clear Drawn Signature
                </button>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => setShowSignatureModal(false)}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={submitApprovalWithSignature}
                >
                  Approve and Sign
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

export default BoardCertificationsPage
