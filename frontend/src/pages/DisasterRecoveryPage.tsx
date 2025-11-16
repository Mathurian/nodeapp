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
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [testingPlan, setTestingPlan] = useState<string | null>(null)
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    type: 'BACKUP_RESTORE' as const,
    priority: 'MEDIUM' as const,
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
      const response = await api.get('/dr/plans')
      setPlans(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load DR plans')
    } finally {
      setLoading(false)
    }
  }

  const fetchTests = async () => {
    try {
      const response = await api.get('/dr/tests')
      setTests(response.data)
    } catch (err: any) {
      console.error('Failed to load DR tests:', err)
    }
  }

  const createPlan = async () => {
    try {
      await api.post('/dr/plans', newPlan)
      setShowCreateModal(false)
      setNewPlan({
        name: '',
        description: '',
        type: 'BACKUP_RESTORE',
        priority: 'MEDIUM',
        rto: 60,
        rpo: 30,
      })
      await fetchPlans()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create DR plan')
    }
  }

  const testPlan = async (planId: string) => {
    if (!confirm('Are you sure you want to test this DR plan? This may affect system availability.')) {
      return
    }
    try {
      setTestingPlan(planId)
      await api.post(`/dr/plans/${planId}/test`)
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
      await api.post(`/dr/plans/${planId}/failover`)
      alert('Failover initiated successfully')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to execute failover')
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
        return <ClockIcon className="h-5 w-5 text-gray-400" />
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
            Only administrators can access disaster recovery management.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading DR plans...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Disaster Recovery
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage disaster recovery plans and failover procedures
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create DR Plan
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* DR Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    {plan.description}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(plan.priority)}`}>
                  {plan.priority}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{plan.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{plan.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">RTO</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{plan.rto} min</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">RPO</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{plan.rpo} min</p>
                </div>
              </div>

              {plan.lastTested && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Last tested: {format(new Date(plan.lastTested), 'MMM d, yyyy h:mm a')}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => testPlan(plan.id)}
                  disabled={testingPlan === plan.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <PlayIcon className="h-4 w-4" />
                  Test Plan
                </button>
                {plan.type === 'FAILOVER' && (
                  <button
                    onClick={() => executeFailover(plan.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <ShieldExclamationIcon className="h-4 w-4" />
                    Failover
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Tests */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent DR Tests
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No DR tests recorded
                    </td>
                  </tr>
                ) : (
                  tests.map((test) => (
                    <tr key={test.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusIcon(test.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {test.plan.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(test.startedAt), 'MMM d, h:mm a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {test.completedAt ? format(new Date(test.completedAt), 'MMM d, h:mm a') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {test.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Plan Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Create DR Plan
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={newPlan.type}
                      onChange={(e) => setNewPlan({ ...newPlan, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="FAILOVER">Failover</option>
                      <option value="BACKUP_RESTORE">Backup & Restore</option>
                      <option value="DATA_REPLICATION">Data Replication</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={newPlan.priority}
                      onChange={(e) => setNewPlan({ ...newPlan, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      RTO (minutes)
                    </label>
                    <input
                      type="number"
                      value={newPlan.rto}
                      onChange={(e) => setNewPlan({ ...newPlan, rto: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      RPO (minutes)
                    </label>
                    <input
                      type="number"
                      value={newPlan.rpo}
                      onChange={(e) => setNewPlan({ ...newPlan, rpo: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={createPlan}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Plan
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
