import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  ExclamationTriangleIcon,
  TrashIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'

const DataWipePage: React.FC = () => {
  const { user } = useAuth()
  const [confirmText, setConfirmText] = useState('')
  const [selectedScope, setSelectedScope] = useState<'ALL' | 'EVENTS' | 'USERS' | 'SCORES'>('ALL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const wipeData = async () => {
    const requiredText = `WIPE ${selectedScope} DATA`

    if (confirmText !== requiredText) {
      setError(`Please type exactly: ${requiredText}`)
      return
    }

    if (!confirm('This action is IRREVERSIBLE. Are you absolutely sure?')) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      await api.post('/data-wipe', { scope: selectedScope })
      setSuccess(true)
      setConfirmText('')
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to wipe data')
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Only system administrators can access data wipe functions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldExclamationIcon className="h-10 w-10 text-red-600" />
            <h1 className="text-3xl font-bold text-red-600 dark:text-red-400">
              DANGER ZONE - Data Wipe
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Permanently delete data from the system. THIS ACTION CANNOT BE UNDONE.
          </p>
        </div>

        {/* Warning Banner */}
        <div className="mb-8 p-6 bg-red-50 dark:bg-red-900 border-2 border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-start gap-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-2">
                CRITICAL WARNING
              </h3>
              <ul className="list-disc list-inside text-red-800 dark:text-red-200 space-y-1 text-sm">
                <li>This operation will permanently delete data</li>
                <li>There is NO way to recover deleted data</li>
                <li>All related records will be cascaded</li>
                <li>This action is logged and audited</li>
                <li>Make sure you have a recent backup before proceeding</li>
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-green-800 dark:text-green-200">
              Data wipe completed successfully
            </p>
          </div>
        )}

        {/* Wipe Options */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Select Data Scope
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                type="radio"
                name="scope"
                value="EVENTS"
                checked={selectedScope === 'EVENTS'}
                onChange={(e) => setSelectedScope(e.target.value as any)}
                className="h-4 w-4 text-red-600"
              />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Events Only</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Delete all events, contests, categories, and related scores
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                type="radio"
                name="scope"
                value="USERS"
                checked={selectedScope === 'USERS'}
                onChange={(e) => setSelectedScope(e.target.value as any)}
                className="h-4 w-4 text-red-600"
              />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Users Only</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Delete all non-admin users (keeps system administrators)
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                type="radio"
                name="scope"
                value="SCORES"
                checked={selectedScope === 'SCORES'}
                onChange={(e) => setSelectedScope(e.target.value as any)}
                className="h-4 w-4 text-red-600"
              />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Scores Only</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Delete all scoring data (keeps events and users)
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border-2 border-red-600 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900 transition-colors">
              <input
                type="radio"
                name="scope"
                value="ALL"
                checked={selectedScope === 'ALL'}
                onChange={(e) => setSelectedScope(e.target.value as any)}
                className="h-4 w-4 text-red-600"
              />
              <div>
                <p className="font-semibold text-red-600 dark:text-red-400">
                  ALL DATA (COMPLETE WIPE)
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Delete EVERYTHING except system administrators. Resets the system to initial state.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Confirmation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Confirmation Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            To proceed, type exactly: <span className="font-mono font-semibold">WIPE {selectedScope} DATA</span>
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`WIPE ${selectedScope} DATA`}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono mb-4"
          />
          <button
            onClick={wipeData}
            disabled={loading || confirmText !== `WIPE ${selectedScope} DATA`}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            <TrashIcon className="h-5 w-5" />
            {loading ? 'Wiping Data...' : `Wipe ${selectedScope} Data`}
          </button>
        </div>

        {/* Additional Warning */}
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Recommendation:</strong> Before wiping data, create a backup using the Backup Management page.
            This action is logged and can be audited for compliance purposes.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DataWipePage
