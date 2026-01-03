import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  AcademicCapIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface Certification {
  id: string
  categoryId: string
  contestId: string
  eventId: string
  userId: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'CERTIFIED' | 'REJECTED'
  currentStep: number
  totalSteps: number
  judgeCertified: boolean
  tallyCertified: boolean
  auditorCertified: boolean
  boardApproved: boolean
  certifiedAt: string | null
  certifiedBy: string | null
  rejectionReason: string | null
  comments: string | null
  createdAt: string
  updatedAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

const CertificationsPage: React.FC = () => {
  const { user } = useAuth()
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchCertifications()
  }, [page, filter])

  const fetchCertifications = async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = { page, limit: 50 }
      if (filter !== 'ALL') {
        params.status = filter
      }
      const response = await api.get('/certifications', { params })
      const unwrapped = response.data.data || response.data
      setCertifications(unwrapped.certifications || [])
      setPagination(unwrapped.pagination || null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load certifications')
      setCertifications([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CERTIFIED':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'IN_PROGRESS':
        return <ClockIcon className="h-5 w-5 text-blue-600" />
      case 'PENDING':
        return <ClockIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      case 'REJECTED':
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CERTIFIED':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'IN_PROGRESS':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'PENDING':
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
      case 'REJECTED':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
    }
  }

  const getProgressPercentage = (cert: Certification): number => {
    let completed = 0
    if (cert.judgeCertified) completed++
    if (cert.tallyCertified) completed++
    if (cert.auditorCertified) completed++
    if (cert.boardApproved) completed++
    return (completed / cert.totalSteps) * 100
  }

  const getProgressSteps = (cert: Certification): string[] => {
    const steps: string[] = []
    if (cert.judgeCertified) steps.push('Judge')
    if (cert.tallyCertified) steps.push('Tally')
    if (cert.auditorCertified) steps.push('Auditor')
    if (cert.boardApproved) steps.push('Board')
    return steps
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Loading certifications...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Category Certifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track certification workflow progress for categories
            </p>
          </div>
          <button
            onClick={fetchCertifications}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => { setFilter('ALL'); setPage(1); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All ({pagination?.total || 0})
          </button>
          <button
            onClick={() => { setFilter('PENDING'); setPage(1); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'PENDING'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => { setFilter('IN_PROGRESS'); setPage(1); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'IN_PROGRESS'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => { setFilter('CERTIFIED'); setPage(1); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'CERTIFIED'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Certified
          </button>
          <button
            onClick={() => { setFilter('REJECTED'); setPage(1); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'REJECTED'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Certifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {certifications.length === 0 ? (
            <div className="p-12 text-center">
              <AcademicCapIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {filter !== 'ALL'
                  ? `No ${filter.toLowerCase().replace('_', ' ')} certifications found`
                  : 'No certifications found'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Category ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Workflow Steps
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Certified
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {certifications.map((cert) => (
                      <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(cert.status)}
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(cert.status)}`}>
                              {cert.status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {cert.categoryId}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Event: {cert.eventId}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-24">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${getProgressPercentage(cert)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {cert.currentStep}/{cert.totalSteps}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            <span className={`px-2 py-1 text-xs rounded ${cert.judgeCertified ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                              Judge {cert.judgeCertified ? '✓' : '○'}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded ${cert.tallyCertified ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                              Tally {cert.tallyCertified ? '✓' : '○'}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded ${cert.auditorCertified ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                              Auditor {cert.auditorCertified ? '✓' : '○'}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded ${cert.boardApproved ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                              Board {cert.boardApproved ? '✓' : '○'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {format(new Date(cert.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {cert.certifiedAt ? (
                            <span className="text-gray-600 dark:text-gray-400">
                              {format(new Date(cert.certifiedAt), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} certifications
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-500"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={!pagination.hasMore}
                        className="px-3 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-500"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CertificationsPage
