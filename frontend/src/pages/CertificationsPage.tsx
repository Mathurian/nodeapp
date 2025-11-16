import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  AcademicCapIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface Certification {
  id: string
  judgeId: string
  judge: {
    id: string
    user: {
      name: string
      email: string
    }
  }
  certificationType: string
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED'
  issuedDate: string
  expiryDate: string | null
  certifiedBy: string
}

const CertificationsPage: React.FC = () => {
  const { user } = useAuth()
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('ALL')

  useEffect(() => {
    fetchCertifications()
  }, [])

  const fetchCertifications = async () => {
    try {
      setLoading(true)
      const response = await api.get('/judge-certifications')
      setCertifications(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load certifications')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'EXPIRED':
        return <ClockIcon className="h-5 w-5 text-gray-600" />
      case 'SUSPENDED':
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'EXPIRED':
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
      case 'SUSPENDED':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
    }
  }

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  }

  const filteredCertifications = certifications.filter(c => filter === 'ALL' || c.status === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading certifications...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Judge Certifications
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage judge certifications and credentials
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
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All ({certifications.length})
          </button>
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'ACTIVE'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Active ({certifications.filter(c => c.status === 'ACTIVE').length})
          </button>
          <button
            onClick={() => setFilter('EXPIRED')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'EXPIRED'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Expired ({certifications.filter(c => c.status === 'EXPIRED').length})
          </button>
          <button
            onClick={() => setFilter('SUSPENDED')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'SUSPENDED'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Suspended ({certifications.filter(c => c.status === 'SUSPENDED').length})
          </button>
        </div>

        {/* Certifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {filteredCertifications.length === 0 ? (
            <div className="p-12 text-center">
              <AcademicCapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No certifications {filter !== 'ALL' && filter.toLowerCase()}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Judge
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Issued
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Expiry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Certified By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCertifications.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(cert.status)}
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(cert.status)}`}>
                            {cert.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {cert.judge.user.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {cert.judge.user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {cert.certificationType}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {format(new Date(cert.issuedDate), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        {cert.expiryDate ? (
                          <div>
                            <p className={`${isExpiringSoon(cert.expiryDate) ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                              {format(new Date(cert.expiryDate), 'MMM d, yyyy')}
                            </p>
                            {isExpiringSoon(cert.expiryDate) && (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                Expiring soon
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-500">No expiry</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {cert.certifiedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CertificationsPage
