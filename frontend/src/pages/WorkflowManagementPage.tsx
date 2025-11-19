import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  Square3Stack3DIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'

interface Workflow {
  id: string
  name: string
  description: string
  trigger: 'EVENT_CREATED' | 'SCORE_SUBMITTED' | 'CERTIFICATION_APPROVED' | 'MANUAL'
  isActive: boolean
  actions: WorkflowAction[]
  createdAt: string
}

interface WorkflowAction {
  id: string
  type: 'SEND_EMAIL' | 'SEND_NOTIFICATION' | 'UPDATE_STATUS' | 'CREATE_TASK'
  config: Record<string, any>
  order: number
}

const WorkflowManagementPage: React.FC = () => {
  const { user } = useAuth()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger: 'MANUAL' as const,
    actions: [] as WorkflowAction[],
  })

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    try {
      setLoading(true)
      const response = await api.get('/workflow')
      setWorkflows(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }

  const createWorkflow = async () => {
    try {
      await api.post('/workflow', newWorkflow)
      setShowCreateModal(false)
      setNewWorkflow({
        name: '',
        description: '',
        trigger: 'MANUAL',
        actions: [],
      })
      await fetchWorkflows()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create workflow')
    }
  }

  const updateWorkflow = async (id: string, data: Partial<Workflow>) => {
    try {
      await api.put(`/workflow/${id}`, data)
      setEditingWorkflow(null)
      await fetchWorkflows()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update workflow')
    }
  }

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return
    try {
      await api.delete(`/workflow/${id}`)
      await fetchWorkflows()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete workflow')
    }
  }

  const toggleWorkflow = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/workflow/${id}`, { isActive: !isActive })
      await fetchWorkflows()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle workflow')
    }
  }

  const executeWorkflow = async (id: string) => {
    try {
      await api.post(`/workflow/${id}/execute`)
      alert('Workflow executed successfully')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to execute workflow')
    }
  }

  const addAction = () => {
    setNewWorkflow({
      ...newWorkflow,
      actions: [
        ...newWorkflow.actions,
        {
          id: `temp-${Date.now()}`,
          type: 'SEND_EMAIL',
          config: {},
          order: newWorkflow.actions.length,
        },
      ],
    })
  }

  const removeAction = (index: number) => {
    setNewWorkflow({
      ...newWorkflow,
      actions: newWorkflow.actions.filter((_, i) => i !== index),
    })
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'ORGANIZER') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            You don't have permission to manage workflows.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Loading workflows...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
              Workflow Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mt-2">
              Automate tasks with workflow triggers and actions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Create Workflow
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {workflows.length === 0 ? (
            <div className="col-span-2 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <Square3Stack3DIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                No workflows created yet. Create your first workflow to automate tasks.
              </p>
            </div>
          ) : (
            workflows.map((workflow) => (
              <div key={workflow.id} className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-2">
                      {workflow.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 text-sm mb-3">
                      {workflow.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleWorkflow(workflow.id, workflow.isActive)}
                      className={`p-2 rounded-lg transition-colors ${
                        workflow.isActive
                          ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900'
                          : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      title={workflow.isActive ? 'Active' : 'Inactive'}
                    >
                      {workflow.isActive ? (
                        <PlayIcon className="h-5 w-5" />
                      ) : (
                        <PauseIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BoltIcon className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
                      Trigger:
                    </span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {workflow.trigger.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                      Actions ({workflow.actions.length}):
                    </p>
                    <div className="space-y-2">
                      {workflow.actions.map((action, index) => (
                        <div
                          key={action.id}
                          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500"
                        >
                          <span className="w-6 h-6 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full text-xs">
                            {index + 1}
                          </span>
                          {action.type.replace(/_/g, ' ')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {workflow.trigger === 'MANUAL' && (
                    <button
                      onClick={() => executeWorkflow(workflow.id)}
                      className="flex-1 px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm"
                    >
                      Execute
                    </button>
                  )}
                  <button
                    onClick={() => setEditingWorkflow(workflow)}
                    className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteWorkflow(workflow.id)}
                    className="px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Workflow Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-4">
                Create Workflow
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newWorkflow.name}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Trigger
                  </label>
                  <select
                    value={newWorkflow.trigger}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, trigger: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  >
                    <option value="MANUAL">Manual</option>
                    <option value="EVENT_CREATED">Event Created</option>
                    <option value="SCORE_SUBMITTED">Score Submitted</option>
                    <option value="CERTIFICATION_APPROVED">Certification Approved</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
                      Actions
                    </label>
                    <button
                      onClick={addAction}
                      className="px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded text-sm hover:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      Add Action
                    </button>
                  </div>
                  <div className="space-y-2">
                    {newWorkflow.actions.map((action, index) => (
                      <div key={action.id} className="flex gap-2">
                        <select
                          value={action.type}
                          onChange={(e) => {
                            const newActions = [...newWorkflow.actions]
                            newActions[index].type = e.target.value as any
                            setNewWorkflow({ ...newWorkflow, actions: newActions })
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                        >
                          <option value="SEND_EMAIL">Send Email</option>
                          <option value="SEND_NOTIFICATION">Send Notification</option>
                          <option value="UPDATE_STATUS">Update Status</option>
                          <option value="CREATE_TASK">Create Task</option>
                        </select>
                        <button
                          onClick={() => removeAction(index)}
                          className="px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={createWorkflow}
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  Create
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

export default WorkflowManagementPage
