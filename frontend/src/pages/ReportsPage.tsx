import React, { useEffect, useState } from 'react'
import { reportsAPI, api } from '../services/api'
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  TrophyIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { Button, Card, PageHeader, ResponsiveTable } from '../components/ui'
import { safeLocaleString } from '../utils/dateUtils'

type ReportType = 'event' | 'contest' | 'system'
type ExportFormat = 'pdf' | 'excel' | 'csv'

interface BasicOption {
  id: string
  name: string
}

interface ReportInstance {
  id: string
  name: string
  type: string
  format?: string | null
  generatedAt: string
}

interface ReportDetail {
  id: string
  name: string
  type: string
  format?: string | null
  generatedAt: string
  data?: Record<string, any> | null
}

const looksLikeHtml = (value: unknown): value is string =>
  typeof value === 'string' && /<\/?[a-z][\s\S]*>/i.test(value)

const parseCsvRows = (value: string): string[][] => {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 26) // header + 25 rows
    .map((line) => line.split(',').map((cell) => cell.trim()))
}

const ReportsPage: React.FC = () => {
  const [type, setType] = useState<ReportType>('event')
  const [eventId, setEventId] = useState('')
  const [contestId, setContestId] = useState('')
  const [events, setEvents] = useState<BasicOption[]>([])
  const [contests, setContests] = useState<BasicOption[]>([])
  const [instances, setInstances] = useState<ReportInstance[]>([])
  const [sendingReportId, setSendingReportId] = useState<string | null>(null)
  const [viewingReport, setViewingReport] = useState<ReportDetail | null>(null)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)
  const [isLoadingView, setIsLoadingView] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [emailRecipients, setEmailRecipients] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const csvRows = previewText ? parseCsvRows(previewText) : []

  const loadOptions = async () => {
    const [eventResponse, contestResponse] = await Promise.all([
      api.get('/events').catch(() => ({ data: { data: [] } })),
      api.get('/contests').catch(() => ({ data: { data: [] } })),
    ])

    const eventData = eventResponse.data?.data || eventResponse.data || []
    const contestData = contestResponse.data?.data || contestResponse.data || []

    setEvents(Array.isArray(eventData) ? eventData.map((e: any) => ({ id: e.id, name: e.name })) : [])
    setContests(Array.isArray(contestData) ? contestData.map((c: any) => ({ id: c.id, name: c.name })) : [])
  }

  const loadInstances = async () => {
    const response = await reportsAPI.getAll()
    const payload = response.data?.data || response.data || []
    setInstances(Array.isArray(payload) ? payload : [])
  }

  useEffect(() => {
    ;(async () => {
      try {
        setIsLoading(true)
        await Promise.all([loadOptions(), loadInstances()])
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load reports data')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const handleGenerateReport = async () => {
    try {
      if (type === 'event' && !eventId) {
        setError('Select an event for event report generation')
        return
      }
      if (type === 'contest' && !contestId) {
        setError('Select a contest for contest report generation')
        return
      }

      setIsGenerating(true)
      setError(null)
      setMessage(null)
      await reportsAPI.generate({
        type,
        ...(type === 'event' ? { eventId } : {}),
        ...(type === 'contest' ? { contestId } : {}),
      })
      setMessage('Report generated successfully')
      await loadInstances()
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Report generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = async (id: string, format: ExportFormat) => {
    try {
      const response =
        format === 'pdf'
          ? await reportsAPI.exportPdf(id)
          : format === 'excel'
            ? await reportsAPI.exportExcel(id)
            : await reportsAPI.exportCsv(id)
      const blob = new Blob([response.data], {
        type:
          format === 'pdf'
            ? 'application/pdf'
            : format === 'excel'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'text/csv',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${id}.${format === 'excel' ? 'xlsx' : format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to export ${format.toUpperCase()}`)
    }
  }

  const handleSend = async () => {
    if (!sendingReportId) return
    const recipients = emailRecipients
      .split(/[,\n]/)
      .map((v) => v.trim())
      .filter(Boolean)
    if (recipients.length === 0) {
      setError('Enter at least one email recipient')
      return
    }
    try {
      setError(null)
      await reportsAPI.sendEmail({ reportId: sendingReportId, recipients })
      setMessage('Report email request completed')
      setSendingReportId(null)
      setEmailRecipients('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send report email')
    }
  }

  const handleView = async (id: string) => {
    try {
      setError(null)
      setIsLoadingView(true)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      setPreviewText(null)
      const response = await reportsAPI.getById(id)
      const payload = response.data?.data || response.data || null
      setViewingReport(payload)
      try {
        // Prefer a rendered preview (PDF) even when stored format metadata is missing/inaccurate.
        const blobResponse = await reportsAPI.exportPdf(id)
        const url = URL.createObjectURL(new Blob([blobResponse.data], { type: 'application/pdf' }))
        setPreviewUrl(url)
      } catch {
        const reportFormat = String(payload?.format || '').toLowerCase()
        if (reportFormat.includes('csv') || reportFormat.includes('excel')) {
          const blobResponse = await reportsAPI.exportCsv(id)
          const text = await new Blob([blobResponse.data], { type: 'text/csv' }).text()
          setPreviewText(text)
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load report preview')
    } finally {
      setIsLoadingView(false)
    }
  }

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Delete this generated report? This cannot be undone.')) {
      return
    }

    try {
      setDeletingReportId(id)
      setError(null)
      await reportsAPI.delete(id)
      if (viewingReport?.id === id) {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
          setPreviewUrl(null)
        }
        setPreviewText(null)
        setViewingReport(null)
      }
      setMessage('Report deleted successfully')
      await loadInstances()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete report')
    } finally {
      setDeletingReportId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading reports...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="cgr-page-container space-y-6">
        <PageHeader
          title="Reports & Analytics"
          subtitle="Generate reports and export/download generated artifacts."
          icon={ChartBarIcon}
        />

        {error && <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200">{error}</div>}
        {message && <div className="p-3 rounded bg-green-50 text-green-700 border border-green-200">{message}</div>}

        <Card className="rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="event">Event</option>
                <option value="contest">Contest</option>
                <option value="system">System</option>
              </select>
            </div>

            {type === 'event' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event</label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                >
                  <option value="">Select event...</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>
            )}

            {type === 'contest' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contest</label>
                <select
                  value={contestId}
                  onChange={(e) => setContestId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                >
                  <option value="">Select contest...</option>
                  {contests.map((contest) => (
                    <option key={contest.id} value={contest.id}>{contest.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>
        </Card>

        <Card className="rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generated Reports</h2>
          {instances.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No reports generated yet.</p>
          ) : (
            <div className="space-y-3">
              {instances.map((instance) => (
                <div key={instance.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {instance.name || `${instance.type} report`}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3">
                        <span className="flex items-center"><CalendarIcon className="h-4 w-4 mr-1" />{safeLocaleString(instance.generatedAt)}</span>
                        <span className="flex items-center"><TrophyIcon className="h-4 w-4 mr-1" />{instance.type}</span>
                        <span className="flex items-center"><CheckCircleIcon className="h-4 w-4 mr-1" />{instance.format || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleView(instance.id)} className="px-3 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200">View</button>
                      <button onClick={() => handleExport(instance.id, 'pdf')} className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">PDF</button>
                      <button onClick={() => handleExport(instance.id, 'excel')} className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">Excel</button>
                      <button onClick={() => handleExport(instance.id, 'csv')} className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">CSV</button>
                      <button
                        onClick={() => setSendingReportId(instance.id)}
                        className="px-3 py-1 text-xs rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center"
                      >
                        <EnvelopeIcon className="h-4 w-4 mr-1" />
                        Email
                      </button>
                      <button
                        onClick={() => handleDeleteReport(instance.id)}
                        disabled={deletingReportId === instance.id}
                        className="px-3 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60 flex items-center"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        {deletingReportId === instance.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {sendingReportId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-full p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Report</h3>
              <textarea
                rows={4}
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="recipient1@example.com, recipient2@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              />
              <div className="flex gap-3">
                <button onClick={handleSend} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Send
                </button>
                <button onClick={() => setSendingReportId(null)} className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {viewingReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{viewingReport.name || 'Report Preview'}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {viewingReport.type} • {safeLocaleString(viewingReport.generatedAt)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl)
                      setPreviewUrl(null)
                    }
                    setPreviewText(null)
                    setViewingReport(null)
                  }}
                  className="px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
                >
                  Close
                </button>
              </div>

              {isLoadingView ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">Loading preview...</div>
              ) : (
                <div className="space-y-3">
                  {previewUrl ? (
                    <iframe
                      title="Report Preview"
                      className="w-full h-[60vh] border border-gray-200 dark:border-gray-700 rounded"
                      src={previewUrl}
                    />
                  ) : previewText ? (
                    csvRows.length > 0 ? (
                      <>
                        <ResponsiveTable className="border border-gray-200 dark:border-gray-700 rounded">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                              <tr>
                                {csvRows[0]?.map((header, index) => (
                                  <th key={`h-${index}`} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                                    {header || `Column ${index + 1}`}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {csvRows.slice(1).map((row, rowIndex) => (
                                <tr key={`r-${rowIndex}`} className="border-t border-gray-200 dark:border-gray-700">
                                  {row.map((cell, cellIndex) => (
                                    <td key={`c-${rowIndex}-${cellIndex}`} className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ResponsiveTable>
                        {previewText.split(/\r?\n/).filter(Boolean).length > 26 && (
                          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b">
                            Showing first 25 rows. Use CSV export for full data.
                          </div>
                        )}
                      </>
                    ) : (
                      <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4 overflow-x-auto whitespace-pre-wrap">
                        {previewText}
                      </pre>
                    )
                  ) : looksLikeHtml(viewingReport.data?.['html']) ? (
                    <iframe
                      title="Report Preview"
                      className="w-full h-[60vh] border border-gray-200 dark:border-gray-700 rounded"
                      sandbox="allow-same-origin"
                      srcDoc={String(viewingReport.data?.['html'])}
                    />
                  ) : viewingReport.data && Object.keys(viewingReport.data).length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {Object.entries(viewingReport.data).slice(0, 6).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3">
                            <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{key}</dt>
                            <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                              {typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean'
                                ? String(value)
                                : Array.isArray(value)
                                  ? `${value.length} items`
                                  : value && typeof value === 'object'
                                    ? `${Object.keys(value as Record<string, unknown>).length} fields`
                                    : 'N/A'}
                            </dd>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Structured preview shown. Expand raw data below for complete payload details.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4">
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div><dt className="text-gray-500">Type</dt><dd className="font-medium">{viewingReport.type}</dd></div>
                        <div><dt className="text-gray-500">Generated</dt><dd className="font-medium">{safeLocaleString(viewingReport.generatedAt)}</dd></div>
                        <div><dt className="text-gray-500">Format</dt><dd className="font-medium">{viewingReport.format || 'N/A'}</dd></div>
                        <div><dt className="text-gray-500">Name</dt><dd className="font-medium">{viewingReport.name}</dd></div>
                      </dl>
                    </div>
                  )}
                  {!previewUrl && !previewText && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Rendered file preview is not available for this report type. Use PDF/Excel/CSV export buttons for full output.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportsPage
