import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { adminAPI } from '../services/api'
import { format } from 'date-fns'
import { Card, PageHeader, ResponsiveTable } from '../components/ui'

interface AuditLogEntry {
  id: string
  action: string
  resourceType: string
  resourceId: string
  metadata?: Record<string, unknown>
  createdAt: string
  user?: {
    id: string
    name: string
    role: string
  }
}

const CERTIFICATION_ACTIONS = [
  'SCORE_CERTIFIED',
  'CERTIFY_TOTALS',
  'FINAL_CERTIFICATION',
  'SUBMIT_FINAL_CERTIFICATION',
  'CERTIFICATION_APPROVED',
  'CERTIFICATION_REJECTED',
  'REJECT_AUDIT'
]

const AuditorAuditLogPage: React.FC = () => {
  const [actionFilter, setActionFilter] = useState<string>('')

  const { data: logs = [], isLoading, error } = useQuery<AuditLogEntry[]>(
    ['auditor-audit-log', actionFilter],
    async () => {
      const params: Record<string, string> = {}
      if (actionFilter) params.action = actionFilter

      const response = await adminAPI.getAuditLogs(params)
      const unwrapped = response.data?.data || response.data || {}
      const data = Array.isArray(unwrapped?.data)
        ? unwrapped.data
        : Array.isArray(unwrapped)
          ? unwrapped
          : []

      return data as AuditLogEntry[]
    },
    { retry: 1 }
  )

  return (
    <div className="cgr-page-container space-y-6">
        <PageHeader
          title="Auditor Audit Log"
          subtitle="Certification-related activity trail for review and traceability."
        />

        <Card className="rounded-lg p-4">
          <label htmlFor="action-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action Filter</label>
          <select
            id="action-filter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full md:w-80 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All certification actions</option>
            {CERTIFICATION_ACTIONS.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </Card>

        <Card className="rounded-lg overflow-hidden p-0">
          {error ? (
            <div className="p-6 text-red-700 dark:text-red-300">Failed to load audit logs.</div>
          ) : isLoading ? (
            <div className="p-6 text-gray-500 dark:text-gray-400">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-gray-500 dark:text-gray-400">No logs found for current filter.</div>
          ) : (
            <ResponsiveTable caption="Auditor audit log entries" minWidth="980px">
              <table className="w-full min-w-[980px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Resource</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{log.user?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{log.user?.role || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{log.action}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{log.resourceType} {log.resourceId ? `(${log.resourceId})` : ''}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{log.metadata ? JSON.stringify(log.metadata) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          )}
        </Card>
    </div>
  )
}

export default AuditorAuditLogPage
