import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  ShieldExclamationIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlayIcon,
  DocumentTextIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { ResponsiveTable } from '../components/ui'
import { safeFormatDate } from '../utils/dateUtils'

interface DRPlan {
  id: string
  name: string
  description: string
  type: 'FAILOVER' | 'BACKUP_RESTORE' | 'DATA_REPLICATION'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  rto: number // Recovery Time Objective in minutes
  rpo: number // Recovery Point Objective in minutes
  lastTested: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'TESTING'
  createdAt: string
}

type DRFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly'

interface NewDRPlanForm {
  name: string
  description: string
  type: DRPlan['type']
  priority: DRPlan['priority']
  frequency: DRFrequency
  rto: number
  rpo: number
}

interface DRTest {
  id: string
  planId: string
  plan: DRPlan
  status: 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED'
  startedAt: string
  completedAt: string | null
  notes: string | null
}

const DisasterRecoveryPage: React.FC = () => {
  const { user } = useAuth()
  const [plans, setPlans] = useState<DRPlan[]>([])
  const [tests, setTests] = useState<DRTest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [testingPlan, setTestingPlan] = useState<string | null>(null)
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null)
  const [newPlan, setNewPlan] = useState<NewDRPlanForm>({
    name: '',
    description: '',
    type: 'BACKUP_RESTORE',
    priority: 'MEDIUM',
    frequency: 'daily',
    rto: 60,
    rpo: 30,
  })

  useEffect(() => {
    fetchPlans()
    fetchTests()
  }, [])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const response = await api.get('/dr/schedules')
      const data = response.data?.data || response.data
      const normalizedPlans: DRPlan[] = Array.isArray(data)
        ? data.map((row: any) => {
            const backupType = String(row?.backupType || '').toLowerCase()
            const mappedType: DRPlan['type'] =
              backupType === 'data'
                ? 'DATA_REPLICATION'
                : backupType === 'schema'
                  ? 'BACKUP_RESTORE'
                  : 'FAILOVER'
            return {
              id: row.id,
              name: row.name || 'Untitled plan',
              description: row.description || `${String(row.frequency || 'daily').toUpperCase()} ${mappedType.replace('_', ' ')}`,
              type: mappedType,
              priority: (row.priority as DRPlan['priority']) || 'MEDIUM',
              rto: Number(row.rto ?? 60),
              rpo: Number(row.rpo ?? row.retentionDays ?? 30),
              lastTested: row.lastRunAt || null,
              status: row.enabled ? 'ACTIVE' : 'INACTIVE',
              createdAt: row.createdAt || new Date().toISOString(),
            }
          })
        : []
      setPlans(normalizedPlans)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load DR plans')
    } finally {
      setLoading(false)
    }
  }

  const fetchTests = async () => {
    try {
      const response = await api.get('/dr/metrics')
      const data = response.data?.data || response.data
      setTests(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('Failed to load DR tests:', err)
    }
  }

  const createPlan = async () => {
    try {
      const backupType =
        newPlan.type === 'DATA_REPLICATION'
          ? 'data'
          : newPlan.type === 'BACKUP_RESTORE'
            ? 'schema'
            : 'full'

      await api.post('/dr/schedules', {
        name: newPlan.name,
        description: newPlan.description,
        type: newPlan.type,
        priority: newPlan.priority,
        rto: newPlan.rto,
        rpo: newPlan.rpo,
        backupType,
        frequency: newPlan.frequency,
        retentionDays: Math.max(1, Number(newPlan.rpo) || 30),
      })
      setShowCreateModal(false)
      setSuccess('Disaster recovery plan created successfully')
      setNewPlan({
        name: '',
        description: '',
        type: 'BACKUP_RESTORE',
        priority: 'MEDIUM',
        frequency: 'daily',
        rto: 60,
        rpo: 30,
      })
      await fetchPlans()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create DR plan')
    }
  }

  const testPlan = async (planId: string) => {
    if (!confirm('Run DR test for this plan? This performs an automated recovery simulation (backup + restore/integrity checks) and does not trigger live failover.')) {
      return
    }
    try {
      setTestingPlan(planId)
      await api.post('/dr/test/execute', { planId })
      setSuccess('DR test started successfully')
      await fetchTests()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to test DR plan')
    } finally {
      setTestingPlan(null)
    }
  }

  const executeFailover = async (planId: string) => {
    if (!confirm('WARNING: This will initiate failover. Are you absolutely sure?')) {
      return
    }
    try {
      await api.post('/dr/backup/execute', { planId })
      alert('Failover initiated successfully')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to execute failover')
    }
  }

  const deletePlan = async (planId: string) => {
    if (!confirm('Delete this DR plan? This action cannot be undone.')) {
      return
    }
    try {
      setDeletingPlanId(planId)
      setError(null)
      await api.delete(`/dr/schedules/${planId}`)
      setSuccess('Disaster recovery plan deleted successfully')
      await fetchPlans()
      await fetchTests()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete DR plan')
    } finally {
      setDeletingPlanId(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      case 'MEDIUM':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'LOW':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'FAILED':
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      case 'IN_PROGRESS':
        return <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
    }
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            Only administrators can access disaster recovery management.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Loading DR plans...</div>
      </div>
    )
  }

  return (
    <div className="cgr-page-container min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
              Disaster Recovery
            </h1>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mt-2">
              Manage disaster recovery plans and failover procedures
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Create DR Plan
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        <div className="mb-6 p-4 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <DocumentTextIcon className="h-5 w-5 mt-0.5 text-blue-700 dark:text-blue-300" />
            <div className="text-sm text-blue-900 dark:text-blue-100 space-y-1">
              <p className="font-semibold">What this page does</p>
              <p>Disaster recovery plans define how backups are created, tested, and restored so your team can recover from outages or data loss.</p>
              <p>Use each plan’s RTO/RPO values to set expected recovery time and acceptable data loss window.</p>
              <p><strong>Test Plan</strong> runs an automated simulation against backup artifacts to verify recoverability; it records outcomes in Recent DR Tests.</p>
            </div>
          </div>
        </div>

        {/* DR Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 text-sm mb-3">
                    {plan.description}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(plan.priority)}`}>
                  {plan.priority}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Type</p>
                  <p className="font-semibold text-gray-900 dark:text-white dark:text-white">{plan.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Status</p>
                  <p className="font-semibold text-gray-900 dark:text-white dark:text-white">{plan.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">RTO</p>
                  <p className="font-semibold text-gray-900 dark:text-white dark:text-white">{plan.rto} min</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">RPO</p>
                  <p className="font-semibold text-gray-900 dark:text-white dark:text-white">{plan.rpo} min</p>
                </div>
              </div>

              {plan.lastTested && (
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mb-4">
                  Last tested: {safeFormatDate(plan.lastTested, 'MMM d, yyyy h:mm a')}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => testPlan(plan.id)}
                  disabled={testingPlan === plan.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <PlayIcon className="h-4 w-4" />
                  Test Plan
                </button>
                {plan.type === 'FAILOVER' && (
                  <button
                    onClick={() => executeFailover(plan.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                  >
                    <ShieldExclamationIcon className="h-4 w-4" />
                    Failover
                  </button>
                )}
                <button
                  onClick={() => deletePlan(plan.id)}
                  disabled={deletingPlanId === plan.id}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-60 inline-flex items-center gap-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  {deletingPlanId === plan.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Test Plan validates backup recovery procedures in simulation mode; use Failover only for a real cutover event.
              </p>
            </div>
          ))}
        </div>

        {/* Recent Tests */}
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white">
              Recent DR Tests
            </h2>
          </div>
          <ResponsiveTable>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                      No DR tests recorded
                    </td>
                  </tr>
                ) : (
                  tests.map((test) => (
                    <tr key={test.id} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusIcon(test.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white dark:text-white">
                        {test.plan.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        {safeFormatDate(test.startedAt, 'MMM d, h:mm a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        {test.completedAt ? safeFormatDate(test.completedAt, 'MMM d, h:mm a') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        {test.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>

        {/* Create Plan Modal */}
        {showCreateModal && (
          <div className="cgr-modal-overlay">
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl mx-4 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-4">
                Create DR Plan
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="pages-disasterrecoverypage-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Plan Name
                  </label>
                  <input id="pages-disasterrecoverypage-1"
                    type="text"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="pages-disasterrecoverypage-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea id="pages-disasterrecoverypage-2"
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pages-disasterrecoverypage-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select id="pages-disasterrecoverypage-3"
                      value={newPlan.type}
                      onChange={(e) => setNewPlan({ ...newPlan, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                    >
                      <option value="FAILOVER">Failover</option>
                      <option value="BACKUP_RESTORE">Backup & Restore</option>
                      <option value="DATA_REPLICATION">Data Replication</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pages-disasterrecoverypage-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select id="pages-disasterrecoverypage-4"
                      value={newPlan.priority}
                      onChange={(e) => setNewPlan({ ...newPlan, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                    >
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="pages-disasterrecoverypage-5" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Backup Frequency
                  </label>
                  <select id="pages-disasterrecoverypage-5"
                    value={newPlan.frequency}
                    onChange={(e) => setNewPlan({ ...newPlan, frequency: e.target.value as DRFrequency })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pages-disasterrecoverypage-6" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      RTO (minutes)
                    </label>
                    <input id="pages-disasterrecoverypage-6"
                      type="number"
                      value={newPlan.rto}
                      onChange={(e) => setNewPlan({ ...newPlan, rto: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="pages-disasterrecoverypage-7" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      RPO (minutes)
                    </label>
                    <input id="pages-disasterrecoverypage-7"
                      type="number"
                      value={newPlan.rpo}
                      onChange={(e) => setNewPlan({ ...newPlan, rpo: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={createPlan}
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  Create Plan
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DisasterRecoveryPage
