import React from 'react'
import { useQuery } from 'react-query'
import { categoriesAPI } from '../services/api'
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface CertificationStatus {
  id: string
  categoryName: string
  eventName: string
  contestName: string
  judgesCertified: number
  totalJudges: number
  tallyMasterCertified: boolean
  auditorCertified: boolean
  status: 'COMPLETE' | 'PENDING' | 'INCOMPLETE'
  lastUpdated: string
}

const AuditorCertificationStatusPage: React.FC = () => {
  const { data: statuses, isLoading, error } = useQuery<CertificationStatus[]>(
    'certification-status',
    async () => {
      const response = await categoriesAPI.getAll()
      const categories = response.data.data || response.data || []

      // Transform to status format with mock data
      return categories.map((cat: any) => {
        const totalJudges = 3
        const judgesCertified = Math.floor(Math.random() * (totalJudges + 1))
        const tallyMasterCertified = Math.random() > 0.5
        const auditorCertified = Math.random() > 0.5

        let status: 'COMPLETE' | 'PENDING' | 'INCOMPLETE' = 'INCOMPLETE'
        if (judgesCertified === totalJudges && tallyMasterCertified && auditorCertified) {
          status = 'COMPLETE'
        } else if (judgesCertified > 0 || tallyMasterCertified) {
          status = 'PENDING'
        }

        return {
          id: cat.id,
          categoryName: cat.name,
          eventName: cat.Contest?.Event?.name || 'Unknown Event',
          contestName: cat.Contest?.name || 'Unknown Contest',
          judgesCertified,
          totalJudges,
          tallyMasterCertified,
          auditorCertified,
          status,
          lastUpdated: new Date().toISOString(),
        }
      })
    },
    {
      retry: 1,
      onError: (err) => console.error('Failed to fetch certification status:', err),
    }
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'PENDING':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />
      default:
        return <XCircleIcon className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      COMPLETE: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      PENDING: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      INCOMPLETE: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    }
    return badges[status as keyof typeof badges] || badges.INCOMPLETE
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Certification Status
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
            Certification Status
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View certification progress across all categories
          </p>
        </div>

        {/* Status Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden" data-testid="certification-status">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading certification status...
            </div>
          ) : !statuses || statuses.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No certification data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
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
                      Judges
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tally Master
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Auditor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {statuses.map((status) => (
                    <tr key={status.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {status.eventName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {status.contestName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {status.categoryName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {status.judgesCertified}/{status.totalJudges}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {status.tallyMasterCertified ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-red-600" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {status.auditorCertified ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-red-600" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(status.status)}
                          <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(status.status)}`}>
                            {status.status}
                          </span>
                        </div>
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

export default AuditorCertificationStatusPage
