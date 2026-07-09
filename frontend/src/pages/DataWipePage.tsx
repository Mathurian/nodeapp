import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api, { eventsAPI } from '../services/api'
import {
  ExclamationTriangleIcon,
  TrashIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import { Button, Card, PageHeader } from '../components/ui'

type WipeScope = 'ALL' | 'EVENTS' | 'USERS' | 'SCORES' | 'EVENT'

interface EventOption {
  id: string
  name: string
  startDate?: string
  endDate?: string
}

interface DataWipeSummary {
  scope: 'GLOBAL' | 'EVENT' | 'TENANT'
  eventId?: string
  tenantId?: string
  counts: Record<string, number>
  dryRun: boolean
}

const SCOPE_CONTENT: Record<
  WipeScope,
  {
    label: string
    shortLabel: string
    description: string
    included: string[]
    preserved: string[]
    accentClass: string
  }
> = {
  EVENTS: {
    label: 'Events Only',
    shortLabel: 'EVENTS',
    description: 'Delete all tenant events, contests, categories, and related scoring data.',
    included: [
      'All tenant events and their contest/category structure',
      'Assignments, scores, and category certification records attached to those events',
      'Event-linked deductions and event-linked role assignments',
    ],
    preserved: [
      'Tenant admins and super admins',
      'Tenant-level users, judges, and contestants',
      'Tenant data outside event structure such as notifications and files',
    ],
    accentClass: 'border-gray-300 dark:border-gray-600',
  },
  USERS: {
    label: 'Users Only',
    shortLabel: 'USERS',
    description: 'Delete all non-admin tenant users while keeping administrators intact.',
    included: [
      'Non-admin tenant users',
      'Judge and contestant profile records tied to those users',
      'User-linked assignments, scores, certifications, and related contest activity that cascades from those profiles',
    ],
    preserved: [
      'Admins and super admins',
      'Event, contest, and category structure',
      'Tenant settings and templates',
    ],
    accentClass: 'border-gray-300 dark:border-gray-600',
  },
  SCORES: {
    label: 'Scores Only',
    shortLabel: 'SCORES',
    description: 'Delete scoring and certification data while keeping events and users.',
    included: [
      'Scores and judge comments',
      'Category and contest certification state',
      'Score governance and deduction requests tied to scoring workflows',
    ],
    preserved: [
      'Events, contests, and categories',
      'Users, judges, and contestants',
      'Templates and general tenant settings',
    ],
    accentClass: 'border-gray-300 dark:border-gray-600',
  },
  EVENT: {
    label: 'Single Event',
    shortLabel: 'EVENT',
    description: 'Delete one selected event and only the data attached to that event.',
    included: [
      'The selected event, its contests, categories, and criteria',
      'Scores, comments, assignments, deductions, and category certifications tied to that event',
      'Event-linked role assignments and contestant/judge category or contest links for that event',
    ],
    preserved: [
      'All unrelated events in the same tenant',
      'Tenant-level users, judges, contestants, files, and notifications',
      'Other event structures and scoring data outside the selected event',
    ],
    accentClass: 'border-amber-400 dark:border-amber-500',
  },
  ALL: {
    label: 'All Data (Complete Wipe)',
    shortLabel: 'ALL',
    description: 'Delete all tenant data except administrator identities.',
    included: [
      'Events, contests, categories, assignments, and scores',
      'Non-admin users and their judge/contestant records',
      'Most tenant operational records and related workflow data',
    ],
    preserved: [
      'Admins and super admins',
    ],
    accentClass: 'border-red-600 dark:border-red-500',
  },
}

const formatCountLabel = (key: string): string =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (char) => char.toUpperCase())

const formatEventWindow = (event: EventOption): string => {
  if (!event.startDate && !event.endDate) {
    return ''
  }

  const start = event.startDate ? new Date(event.startDate).toLocaleDateString() : ''
  const end = event.endDate ? new Date(event.endDate).toLocaleDateString() : ''
  if (start && end) {
    return `${start} - ${end}`
  }
  return start || end
}

const DataWipePage: React.FC = () => {
  const { user } = useAuth()
  const [confirmText, setConfirmText] = useState('')
  const [selectedScope, setSelectedScope] = useState<WipeScope>('ALL')
  const [events, setEvents] = useState<EventOption[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [preview, setPreview] = useState<DataWipeSummary | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  )
  const scopeContent = SCOPE_CONTENT[selectedScope]
  const requiredText = selectedScope === 'EVENT' ? 'WIPE EVENT DATA' : `WIPE ${selectedScope} DATA`

  useEffect(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return
    }

    const loadEvents = async () => {
      try {
        setEventsLoading(true)
        const response = await eventsAPI.getAll({ archived: false })
        const payload = response.data?.data || response.data
        setEvents(Array.isArray(payload) ? payload : [])
      } catch (err) {
        console.error('Failed to load events for data wipe page', err)
      } finally {
        setEventsLoading(false)
      }
    }

    void loadEvents()
  }, [user?.role])

  useEffect(() => {
    setError(null)
    setSuccessMessage(null)
    setPreview(null)
    setConfirmText('')
  }, [selectedScope, selectedEventId])

  const executeWipe = async (dryRun: boolean): Promise<DataWipeSummary | null> => {
    if (selectedScope === 'EVENT') {
      if (!selectedEventId) {
        setError('Select an event before previewing or wiping event-scoped data.')
        return null
      }

      const response = await api.post(`/data-wipe/event/${selectedEventId}`, { dryRun })
      return response.data?.data || response.data
    }

    const response = await api.post('/data-wipe', { scope: selectedScope, dryRun })
    return response.data?.data || response.data
  }

  const previewWipe = async () => {
    try {
      setPreviewLoading(true)
      setError(null)
      setSuccessMessage(null)
      const result = await executeWipe(true)
      setPreview(result)
    } catch (err: any) {
      setPreview(null)
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to preview data wipe')
    } finally {
      setPreviewLoading(false)
    }
  }

  const wipeData = async () => {
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
      const result = await executeWipe(false)
      setPreview(result)
      setSuccessMessage(
        selectedScope === 'EVENT'
          ? `Event data wipe completed${selectedEvent ? ` for ${selectedEvent.name}` : ''}.`
          : `${scopeContent.label} data wipe completed successfully.`
      )
      setConfirmText('')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to wipe data')
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            Only system administrators can access data wipe functions.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container">
        <div className="mb-8">
          <PageHeader
            title="DANGER ZONE - Data Wipe"
            subtitle="Permanently delete data from the system. THIS ACTION CANNOT BE UNDONE."
            icon={ShieldExclamationIcon}
          />
        </div>

        {/* Warning Banner */}
        <Card className="mb-8 p-6 bg-red-50 dark:bg-red-900 border-2 border-red-200 dark:border-red-700 rounded-lg">
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
        </Card>

        {error && (
          <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </Card>
        )}

        {successMessage && (
          <Card className="mb-6 p-4 bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{successMessage}</p>
          </Card>
        )}

        {/* Wipe Options */}
        <Card className="rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
            Select Data Scope
          </h2>
          <div className="space-y-3">
            <label
              className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700 transition-colors"
              aria-label="Events Only"
            >
              <input
                type="radio"
                name="scope"
                value="EVENTS"
                checked={selectedScope === 'EVENTS'}
                onChange={(e) => setSelectedScope(e.target.value as WipeScope)}
                className="h-4 w-4 text-red-600"
              />
              <span className="flex flex-col">
                <span className="block font-semibold text-gray-900 dark:text-white dark:text-white">Events Only</span>
                <span className="block text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                  Delete all events, contests, categories, and related scores
                </span>
              </span>
            </label>

            <label
              className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700 transition-colors"
              aria-label="Users Only"
            >
              <input
                type="radio"
                name="scope"
                value="USERS"
                checked={selectedScope === 'USERS'}
                onChange={(e) => setSelectedScope(e.target.value as WipeScope)}
                className="h-4 w-4 text-red-600"
              />
              <span className="flex flex-col">
                <span className="block font-semibold text-gray-900 dark:text-white dark:text-white">Users Only</span>
                <span className="block text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                  Delete all non-admin users (keeps system administrators)
                </span>
              </span>
            </label>

            <label
              className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700 transition-colors"
              aria-label="Scores Only"
            >
              <input
                type="radio"
                name="scope"
                value="SCORES"
                checked={selectedScope === 'SCORES'}
                onChange={(e) => setSelectedScope(e.target.value as WipeScope)}
                className="h-4 w-4 text-red-600"
              />
              <span className="flex flex-col">
                <span className="block font-semibold text-gray-900 dark:text-white dark:text-white">Scores Only</span>
                <span className="block text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                  Delete all scoring data (keeps events and users)
                </span>
              </span>
            </label>

            <label
              className="flex items-center gap-3 p-4 border-2 border-amber-400 dark:border-amber-500 rounded-lg cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
              aria-label="Single Event"
            >
              <input
                type="radio"
                name="scope"
                value="EVENT"
                checked={selectedScope === 'EVENT'}
                onChange={(e) => setSelectedScope(e.target.value as WipeScope)}
                className="h-4 w-4 text-red-600"
              />
              <span className="flex flex-col">
                <span className="block font-semibold text-amber-700 dark:text-amber-300">
                  Single Event
                </span>
                <span className="block text-sm text-amber-800 dark:text-amber-200">
                  Delete one selected event and only the data tied to that event.
                </span>
              </span>
            </label>

            <label
              className="flex items-center gap-3 p-4 border-2 border-red-600 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
              aria-label="All Data Complete Wipe"
            >
              <input
                type="radio"
                name="scope"
                value="ALL"
                checked={selectedScope === 'ALL'}
                onChange={(e) => setSelectedScope(e.target.value as WipeScope)}
                className="h-4 w-4 text-red-600"
              />
              <span className="flex flex-col">
                <span className="block font-semibold text-red-600 dark:text-red-400">
                  ALL DATA (COMPLETE WIPE)
                </span>
                <span className="block text-sm text-red-700 dark:text-red-300">
                  Delete EVERYTHING except system administrators. Resets the system to initial state.
                </span>
              </span>
            </label>
          </div>
        </Card>

        <Card className={`rounded-lg p-6 mb-6 border-2 ${scopeContent.accentClass}`}>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Scope Definition
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{scopeContent.description}</p>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Included in this wipe</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {scopeContent.included.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Preserved outside this wipe</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {scopeContent.preserved.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        {selectedScope === 'EVENT' && (
          <Card className="rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Select Event Scope
            </h2>
            <label htmlFor="pages-datawipepage-event" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event to wipe
            </label>
            <select
              id="pages-datawipepage-event"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={eventsLoading}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{eventsLoading ? 'Loading events...' : 'Select an event...'}</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            {selectedEvent && (
              <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-3 text-sm text-amber-900 dark:text-amber-100">
                <div className="font-semibold">{selectedEvent.name}</div>
                {formatEventWindow(selectedEvent) && (
                  <div className="mt-1">{formatEventWindow(selectedEvent)}</div>
                )}
                <div className="mt-2 text-amber-800 dark:text-amber-200">
                  Only this event and its attached contest/category/scoring records will be removed.
                </div>
              </div>
            )}
          </Card>
        )}

        <Card className="rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Preview Impact
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Run a dry-run preview to inspect the affected record counts before executing the irreversible wipe.
          </p>
          <button
            type="button"
            onClick={previewWipe}
            disabled={previewLoading || (selectedScope === 'EVENT' && !selectedEventId)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {previewLoading ? 'Previewing affected records...' : 'Preview affected records'}
          </button>
        </Card>

        {preview && (
          <Card className="rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Dry-Run Summary
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              No data has been deleted yet. This preview reflects the current affected counts for the selected scope.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Object.entries(preview.counts).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3"
                >
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {formatCountLabel(key)}
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Confirmation */}
        <Card className="rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
            Confirmation Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mb-4">
            To proceed, type exactly: <span className="font-mono font-semibold">{requiredText}</span>
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={requiredText}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white font-mono mb-4"
          />
          <Button
            onClick={wipeData}
            disabled={loading || confirmText !== requiredText || (selectedScope === 'EVENT' && !selectedEventId)}
            variant="danger"
            className="w-full justify-center font-semibold"
          >
            <TrashIcon className="h-5 w-5" />
            {loading ? 'Wiping Data...' : `Wipe ${scopeContent.shortLabel} Data`}
          </Button>
        </Card>

        {/* Additional Warning */}
        <Card className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Recommendation:</strong> Before wiping data, create a backup using the Backup Management page.
            This action is logged and can be audited for compliance purposes.
          </p>
        </Card>
    </div>
  )
}

export default DataWipePage
