import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { backupAPI } from '../services/api'
import {
  CircleStackIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { Card, PageHeader, ResponsiveTable } from '../components/ui'
import { safeFormatDate } from '../utils/dateUtils'

interface Backup {
  id: string
  type: 'FULL' | 'SCHEMA' | 'DATA'
  filename: string
  size: number | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  createdAt: string
  createdBy: string
  errorMessage?: string | null
  metadata?: {
    destination?: 'LOCAL' | 'OFF_SITE' | 'BOTH'
    offsite?: {
      attempted?: boolean
      successCount?: number
      failedCount?: number
      results?: Array<{
        targetId: string
        targetName: string
        success: boolean
        error?: string
      }>
    }
  }
}

const BackupManagementPage: React.FC = () => {
  const { user } = useAuth()
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [backupDestination, setBackupDestination] = useState<'LOCAL' | 'OFF_SITE' | 'BOTH'>('LOCAL')
  const [showRestoreModal, setShowRestoreModal] = useState<Backup | null>(null)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const canRestoreBackups = user?.role === 'SUPER_ADMIN'

  useEffect(() => {
    fetchBackups()
  }, [])

  const fetchBackups = async () => {
    try {
      setLoading(true)
      const response = await backupAPI.getAll()
      const unwrapped = response.data.data || response.data
      setBackups(unwrapped)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load backups')
    } finally {
      setLoading(false)
    }
  }

  const createBackup = async (type: 'FULL' | 'SCHEMA' | 'DATA') => {
    try {
      setCreating(true)
      setError(null)
      await backupAPI.create(type, backupDestination)
      await fetchBackups()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  const downloadBackup = async (backup: Backup) => {
    try {
      const blob = await backupAPI.download(backup.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = backup.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download backup')
    }
  }

  const restoreBackup = async (backup: Backup) => {
    try {
      setError(null)
      await backupAPI.restore(backup.id)
      setShowRestoreModal(null)
      alert('Backup restored successfully')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to restore backup')
    }
  }

  const restoreFromFile = async () => {
    if (!restoreFile) return
    try {
      setError(null)
      await backupAPI.restoreFromFile(restoreFile)
      setRestoreFile(null)
      alert('Backup restored successfully from file')
      await fetchBackups()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to restore from file')
    }
  }

  const deleteBackup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return
    try {
      await backupAPI.delete(id)
      await fetchBackups()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete backup')
    }
  }

  const formatSize = (bytes: number | null | undefined) => {
    if (bytes == null || Number.isNaN(bytes)) return '—'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'IN_PROGRESS':
        return <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />
      case 'FAILED':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
    }
  }

  const truncateIssueMessage = (message: string, maxLength = 220) => {
    if (message.length <= maxLength) return message
    return `${message.slice(0, maxLength - 3)}...`
  }

  const getBackupIssueMessage = (backup: Backup): string | null => {
    const directError = String(backup.errorMessage || '').trim()
    if (directError) return directError

    const offsite = backup.metadata?.offsite
    const failedCount = Number(offsite?.failedCount || 0)
    if (!offsite?.attempted || failedCount <= 0) return null

    const successCount = Number(offsite?.successCount || 0)
    const totalTargets = successCount + failedCount
    const firstFailure = offsite.results?.find((result) => !result.success)
    const summary = `Off-site transfer failed for ${failedCount}/${totalTargets || failedCount} target${(totalTargets || failedCount) === 1 ? '' : 's'}.`

    if (!firstFailure?.error) return summary
    return `${summary} ${firstFailure.error}`
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ORGANIZER' && user?.role !== 'BOARD') {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            You don't have permission to access backup management.
          </p>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center text-gray-600 dark:text-gray-400">Loading backups...</Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container">
        {/* Header */}
        <PageHeader
          title="Backup Management"
          subtitle={canRestoreBackups ? 'Create, manage, and restore database backups' : 'Create and manage database backups'}
        />

        {error && (
          <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </Card>
        )}

        {/* Create Backup Section */}
        <Card className="mb-8 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
            Create New Backup
          </h2>
          <div className="mb-4">
            <label htmlFor="pages-backupmanagementpage-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Backup Destination
            </label>
            <select id="pages-backupmanagementpage-1"
              value={backupDestination}
              onChange={(e) => setBackupDestination(e.target.value as 'LOCAL' | 'OFF_SITE' | 'BOTH')}
              className="w-full md:w-80 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="LOCAL">On-site only (local)</option>
              <option value="OFF_SITE">Off-site only (remote target)</option>
              <option value="BOTH">On-site + Off-site</option>
            </select>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
              Off-site uses enabled backup targets configured for your tenant or global defaults.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => createBackup('FULL')}
              disabled={creating}
              className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors disabled:opacity-50"
            >
              <CircleStackIcon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">Full Backup</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Schema + Data</p>
              </div>
            </button>
            <button
              onClick={() => createBackup('SCHEMA')}
              disabled={creating}
              className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors disabled:opacity-50"
            >
              <CircleStackIcon className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">Schema Only</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Structure only</p>
              </div>
            </button>
            <button
              onClick={() => createBackup('DATA')}
              disabled={creating}
              className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors disabled:opacity-50"
            >
              <CircleStackIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">Data Only</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Content only</p>
              </div>
            </button>
          </div>
        </Card>

        {/* Restore from File */}
        {canRestoreBackups && (
          <Card className="mb-8 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
              Restore from File
            </h2>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".sql,.dump"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                className="flex-1 text-gray-900 dark:text-white dark:text-white"
              />
              <button
                onClick={restoreFromFile}
                disabled={!restoreFile}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CloudArrowUpIcon className="h-5 w-5 inline mr-2" />
                Restore
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
              Warning: Restoring will overwrite current database data
            </p>
          </Card>
        )}

        {/* Backup History */}
        <Card className="rounded-lg p-0 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white">
              Backup History
            </h2>
          </div>
          <ResponsiveTable>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                      No backups found. Create your first backup above.
                    </td>
                  </tr>
                ) : (
                  backups.map((backup) => {
                    const issueMessage = getBackupIssueMessage(backup)
                    const issueToneClass = backup.status === 'FAILED'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-700 dark:text-amber-400'
                    return (
                    <tr key={backup.id} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusIcon(backup.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {backup.type}
                        </span>
                        {backup.metadata?.destination && (
                          <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {backup.metadata.destination}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white dark:text-white">
                        <div className="font-medium text-gray-900 dark:text-white">{backup.filename}</div>
                        {issueMessage && (
                          <p className={`mt-1 text-xs ${issueToneClass}`} title={issueMessage}>
                            {truncateIssueMessage(issueMessage)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        {formatSize(backup.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        {safeFormatDate(backup.createdAt, 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {backup.status === 'COMPLETED' && (
                            <>
                              <button
                                onClick={() => downloadBackup(backup)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                                title="Download"
                              >
                                <CloudArrowDownIcon className="h-5 w-5" />
                              </button>
                              {canRestoreBackups && (
                                <button
                                  onClick={() => setShowRestoreModal(backup)}
                                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors"
                                  title="Restore"
                                >
                                  <ArrowPathIcon className="h-5 w-5" />
                                </button>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => deleteBackup(backup.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </ResponsiveTable>
        </Card>

        {/* Restore Confirmation Modal */}
        {canRestoreBackups && showRestoreModal && (
          <div className="cgr-modal-overlay">
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl mx-4 mx-4 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-4">
                Confirm Restore
              </h3>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mb-6">
                Are you sure you want to restore from this backup? This will overwrite all current data.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => restoreBackup(showRestoreModal)}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Restore
                </button>
                <button
                  onClick={() => setShowRestoreModal(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

export default BackupManagementPage
