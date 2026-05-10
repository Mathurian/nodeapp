import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { assignmentsAPI, judgeSchedulesAPI } from '../services/api'
import { Button, Card, PageHeader } from '../components/ui'

interface ScheduleEntry {
  id: string
  title: string
  startAt: string
  endAt?: string | null
  location?: string | null
  notes?: string | null
  importBatchId: string
  judge: {
    id: string
    name: string
    email?: string | null
  }
  event?: {
    id: string
    name: string
  } | null
  contest?: {
    id: string
    name: string
  } | null
  category?: {
    id: string
    name: string
  } | null
}

interface JudgeOption {
  id: string
  name: string
  email?: string | null
}

interface ImportError {
  row: number
  field: string
  error: string
  value?: unknown
}

interface ImportResult {
  importBatchId: string
  total: number
  successful: number
  failed: number
  errors: ImportError[]
}

const formatRange = (startAt: string, endAt?: string | null) => {
  const start = new Date(startAt)
  const startLabel = format(start, 'MMM d, yyyy h:mm a')
  if (!endAt) return startLabel
  const end = new Date(endAt)
  return `${startLabel} - ${format(end, 'h:mm a')}`
}

const JudgeSchedulesPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isStaff = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'].includes(user?.role || '')
  const [selectedJudgeId, setSelectedJudgeId] = useState('')
  const [includePast, setIncludePast] = useState<boolean>(!isStaff ? false : true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null)

  const { data: judges = [] } = useQuery<JudgeOption[]>(
    ['judge-schedule-judges'],
    async () => {
      const response = await assignmentsAPI.getJudges()
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    },
    {
      enabled: isStaff,
      retry: 1,
    },
  )

  const { data: schedules = [], isLoading } = useQuery<ScheduleEntry[]>(
    ['judge-schedules', selectedJudgeId, includePast],
    async () => {
      const response = await judgeSchedulesAPI.list({
        ...(selectedJudgeId ? { judgeId: selectedJudgeId } : {}),
        includePast,
      })
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    },
    {
      retry: 1,
    },
  )

  const importMutation = useMutation(
    async () => {
      if (!selectedFile) {
        throw new Error('Select a CSV file to import')
      }
      const formData = new FormData()
      formData.append('file', selectedFile)
      const response = await judgeSchedulesAPI.importCsv(formData)
      return response.data?.data || response.data
    },
    {
      onSuccess: (result: any) => {
        queryClient.invalidateQueries(['judge-schedules'])
        setSelectedFile(null)
        setLastImportResult(result)
        const summary = `${result.successful}/${result.total} rows imported`
        if (result.failed > 0) {
          toast.error(`${summary}. ${result.failed} row(s) failed. Review the import results below.`)
        } else {
          toast.success(summary)
        }
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || error.message || 'Failed to import judge schedule CSV')
      },
    },
  )

  const handleTemplateDownload = async () => {
    try {
      const response = await judgeSchedulesAPI.downloadTemplate()
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'judge-schedule-template.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to download CSV template')
    }
  }

  const groupedSchedules = useMemo(() => {
    const groups = new Map<string, ScheduleEntry[]>()
    schedules.forEach((entry) => {
      const key = format(new Date(entry.startAt), 'yyyy-MM-dd')
      const existing = groups.get(key) || []
      existing.push(entry)
      groups.set(key, existing)
    })
    return Array.from(groups.entries())
  }, [schedules])

  return (
    <div className="cgr-page-container space-y-6">
      <PageHeader
        title={isStaff ? 'Judge Schedules' : 'My Schedule'}
        subtitle={isStaff
          ? 'Upload judge schedules from CSV and review imported rows in-app.'
          : 'View your upcoming judging schedule without leaving the application.'}
        icon={CalendarDaysIcon}
      />

      {isStaff && (
        <Card className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Import Schedule CSV</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Supported columns: <code>judgeEmail</code>, <code>title</code>, <code>startAt</code>, <code>endAt</code>, <code>eventName</code>, <code>contestName</code>, <code>categoryName</code>, <code>location</code>, <code>notes</code>.
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Use ISO 8601 or <code>YYYY-MM-DD HH:mm</code> date/time values. Category rows require the contest name; ambiguous contest names require the event name.
              </p>
            </div>
            <Button type="button" variant="ghost" onClick={() => void handleTemplateDownload()}>
              <ArrowDownTrayIcon className="h-5 w-5" />
              Download Template
            </Button>
          </div>

          {lastImportResult && (
            <div className={`rounded-lg border p-4 ${lastImportResult.failed > 0 ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30' : 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'}`}>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                Last import: {lastImportResult.successful}/{lastImportResult.total} rows imported
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                Batch: {lastImportResult.importBatchId}
              </div>
              {lastImportResult.errors.length > 0 && (
                <div className="mt-3 space-y-2">
                  {lastImportResult.errors.map((error, index) => (
                    <div key={`${error.row}-${error.field}-${index}`} className="text-sm text-amber-900 dark:text-amber-100">
                      Row {error.row}, <span className="font-medium">{error.field}</span>: {error.error}
                      {error.value !== undefined && error.value !== null ? ` (${String(error.value)})` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3">
            <label className="flex-1 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-4 py-3 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <span className="flex items-center gap-2">
                <CloudArrowUpIcon className="h-5 w-5" />
                {selectedFile ? selectedFile.name : 'Choose judge schedule CSV'}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </label>
            <Button
              type="button"
              onClick={() => importMutation.mutate()}
              disabled={!selectedFile || importMutation.isLoading}
            >
              {importMutation.isLoading ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="h-5 w-5" />
                  Import CSV
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          {isStaff && (
            <div className="w-full lg:max-w-sm">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Judge</label>
              <select
                value={selectedJudgeId}
                onChange={(e) => setSelectedJudgeId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All judges</option>
                {judges.map((judge) => (
                  <option key={judge.id} value={judge.id}>
                    {judge.name || judge.email || 'Judge'}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={includePast}
              onChange={(e) => setIncludePast(e.target.checked)}
            />
            Include past schedule items
          </label>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">Loading schedule...</div>
        ) : schedules.length === 0 ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            {isStaff ? 'No judge schedule rows have been uploaded yet.' : 'No schedule items are available for your judge profile yet.'}
          </div>
        ) : (
          <div className="space-y-6">
            {groupedSchedules.map(([dateKey, entries]) => (
              <div key={dateKey} className="space-y-3">
                <div className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {format(new Date(`${dateKey}T00:00:00`), 'EEEE, MMM d, yyyy')}
                </div>
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/60">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-gray-900 dark:text-white">{entry.title}</div>
                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{formatRange(entry.startAt, entry.endAt)}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {entry.event?.name && <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-1">Event: {entry.event.name}</span>}
                            {entry.contest?.name && <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-1">Contest: {entry.contest.name}</span>}
                            {entry.category?.name && <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-1">Category: {entry.category.name}</span>}
                            {entry.location && <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-1">Location: {entry.location}</span>}
                          </div>
                          {entry.notes && (
                            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{entry.notes}</div>
                          )}
                        </div>
                        {isStaff && (
                          <div className="text-sm text-gray-600 dark:text-gray-300 lg:text-right">
                            <div className="font-medium">{entry.judge.name || 'Judge'}</div>
                            <div>{entry.judge.email || 'No email'}</div>
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Batch: {entry.importBatchId.slice(0, 8)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default JudgeSchedulesPage
