import React, { useEffect, useMemo, useState } from 'react'
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
import { Button, Card, PageHeader } from '../components/ui'

type WorkflowRole = 'SUPER_ADMIN' | 'ADMIN' | 'ORGANIZER' | 'BOARD' | 'TALLY_MASTER' | 'AUDITOR' | 'JUDGE' | 'EMCEE' | 'CONTESTANT'

interface WorkflowStep {
  id?: string
  name: string
  description?: string
  stepOrder: number
  requiredRole?: WorkflowRole | ''
  requireApproval?: boolean
  autoAdvance?: boolean
}

interface WorkflowTemplate {
  id: string
  name: string
  description?: string
  type: string
  isActive: boolean
  createdAt: string
  steps: WorkflowStep[]
}

interface WorkflowInstance {
  id: string
  entityType: string
  entityId: string
  status: string
  currentStepId?: string | null
  createdAt: string
  updatedAt: string
}

interface WorkflowForm {
  name: string
  description: string
  type: string
  isActive: boolean
  steps: WorkflowStep[]
}

const EMPTY_STEP = (order: number): WorkflowStep => ({
  name: '',
  description: '',
  stepOrder: order,
  requiredRole: '',
  requireApproval: true,
  autoAdvance: false,
})

const EMPTY_FORM: WorkflowForm = {
  name: '',
  description: '',
  type: 'custom',
  isActive: true,
  steps: [EMPTY_STEP(1)],
}

const ROLE_OPTIONS: WorkflowRole[] = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE', 'EMCEE', 'CONTESTANT']
const WORKFLOW_TRIGGER_TYPES = [
  { value: 'custom', label: 'Manual (custom)' },
  { value: 'user.created', label: 'User Created' },
  { value: 'event.created', label: 'Event Created' },
  { value: 'contest.created', label: 'Contest Created' },
  { value: 'category.created', label: 'Category Created' },
  { value: 'score.submitted', label: 'Score Submitted' },
  { value: 'scores.finalized', label: 'Scores Finalized' },
  { value: 'certification.approved', label: 'Certification Approved' },
  { value: 'certification.rejected', label: 'Certification Rejected' },
  { value: 'assignment.created', label: 'Assignment Created' },
]

const parseTemplate = (raw: any): WorkflowTemplate => {
  const parsedSteps: WorkflowStep[] = Array.isArray(raw?.steps)
    ? raw.steps
    : Array.isArray(raw?.config?.steps)
      ? raw.config.steps
      : []

  return {
    id: raw.id,
    name: raw.name || 'Untitled Workflow',
    description: raw.description || '',
    type: raw.type || 'custom',
    isActive: Boolean(raw.isActive),
    createdAt: raw.createdAt,
    steps: parsedSteps
      .map((step: any, index: number) => ({
        id: step.id,
        name: String(step.name || '').trim(),
        description: step.description || '',
        stepOrder: Number(step.stepOrder || index + 1),
        requiredRole: (step.requiredRole || '') as WorkflowRole | '',
        requireApproval: step.requireApproval !== false,
        autoAdvance: Boolean(step.autoAdvance),
      }))
      .sort((a: WorkflowStep, b: WorkflowStep) => a.stepOrder - b.stepOrder),
  }
}

const buildPayload = (form: WorkflowForm) => {
  const steps = form.steps
    .map((step, index) => ({
      name: step.name.trim(),
      description: step.description?.trim() || undefined,
      stepOrder: index + 1,
      requiredRole: step.requiredRole || undefined,
      requireApproval: step.requireApproval !== false,
      autoAdvance: Boolean(step.autoAdvance),
    }))
    .filter((step) => step.name.length > 0)

  return {
    name: form.name.trim(),
    description: form.description.trim(),
    type: form.type.trim() || 'custom',
    isActive: form.isActive,
    steps,
  }
}

const WorkflowManagementPage: React.FC = () => {
  const { user } = useAuth()
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null)
  const [form, setForm] = useState<WorkflowForm>(EMPTY_FORM)
  const [executionTarget, setExecutionTarget] = useState({ entityType: 'CONTEST', entityId: '' })
  const [instances, setInstances] = useState<WorkflowInstance[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)

  const canManage = useMemo(
    () => ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || ''),
    [user?.role]
  )

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    try {
      setLoading(true)
      const response = await api.get('/workflows/templates')
      const payload = response.data?.data || response.data
      const list = Array.isArray(payload) ? payload : []
      setWorkflows(list.map(parseTemplate))
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingWorkflowId(null)
    setForm(EMPTY_FORM)
    setIsModalOpen(true)
  }

  const openEdit = (workflow: WorkflowTemplate) => {
    setEditingWorkflowId(workflow.id)
    setForm({
      name: workflow.name,
      description: workflow.description || '',
      type: workflow.type || 'custom',
      isActive: workflow.isActive,
      steps: workflow.steps.length > 0
        ? workflow.steps.map((step, index) => ({
            ...step,
            stepOrder: index + 1,
          }))
        : [EMPTY_STEP(1)],
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingWorkflowId(null)
    setForm(EMPTY_FORM)
  }

  const saveWorkflow = async () => {
    const payload = buildPayload(form)
    if (!payload.name) {
      setError('Workflow name is required')
      return
    }

    try {
      setSaving(true)
      if (editingWorkflowId) {
        await api.put(`/workflows/templates/${editingWorkflowId}`, payload)
      } else {
        await api.post('/workflows/templates', payload)
      }
      closeModal()
      await fetchWorkflows()
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save workflow')
    } finally {
      setSaving(false)
    }
  }

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Delete this workflow template?')) return
    try {
      await api.delete(`/workflows/templates/${id}`)
      await fetchWorkflows()
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to delete workflow')
    }
  }

  const toggleWorkflow = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/workflows/templates/${id}`, { isActive: !isActive })
      await fetchWorkflows()
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to toggle workflow')
    }
  }

  const executeWorkflow = async (id: string) => {
    try {
      const resolvedEntityId = executionTarget.entityId || `manual-${Date.now()}`
      await api.post('/workflows/instances', {
        templateId: id,
        entityType: executionTarget.entityType,
        entityId: resolvedEntityId,
      })
      if (!executionTarget.entityId) {
        setExecutionTarget((prev) => ({ ...prev, entityId: resolvedEntityId }))
      }
      await loadInstancesForEntity()
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to execute workflow')
    }
  }

  const loadInstancesForEntity = async () => {
    if (!executionTarget.entityType || !executionTarget.entityId) return
    try {
      const response = await api.get(`/workflows/instances/${executionTarget.entityType}/${executionTarget.entityId}`)
      const payload = response.data?.data || response.data || []
      setInstances(Array.isArray(payload) ? payload : [])
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load workflow instances')
    }
  }

  const advanceInstance = async (instanceId: string, approvalStatus: 'approved' | 'rejected') => {
    try {
      await api.post(`/workflows/instances/${instanceId}/advance`, { approvalStatus })
      await loadInstancesForEntity()
      if (selectedInstanceId === instanceId) {
        setSelectedInstanceId(null)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to advance workflow')
    }
  }

  const addStep = () => {
    setForm((prev) => ({
      ...prev,
      steps: [...prev.steps, EMPTY_STEP(prev.steps.length + 1)],
    }))
  }

  const updateStep = (index: number, patch: Partial<WorkflowStep>) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...patch, stepOrder: stepIndex + 1 } : step
      ),
    }))
  }

  const removeStep = (index: number) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, stepIndex) => stepIndex !== index).map((step, idx) => ({ ...step, stepOrder: idx + 1 })),
    }))
  }

  if (!canManage) {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to manage workflows.</p>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center text-gray-600 dark:text-gray-400">Loading workflows...</Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container">
        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center mb-8">
          <PageHeader
            title="Workflow Management"
            subtitle="Configure step-based automation templates and execute manual workflows."
            icon={Square3Stack3DIcon}
          />
          <Button
            onClick={openCreate}
          >
            <PlusIcon className="h-5 w-5" />
            Create Workflow
          </Button>
        </div>

        {error && (
          <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </Card>
        )}

        <Card className="rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Execution Console</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Workflows execute against a target entity. Use this console to run and track workflow progression.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={executionTarget.entityType}
              onChange={(e) => setExecutionTarget((prev) => ({ ...prev, entityType: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {['CONTEST', 'CATEGORY', 'EVENT', 'CERTIFICATION', 'MANUAL_EXECUTION'].map((typeOption) => (
                <option key={typeOption} value={typeOption}>{typeOption}</option>
              ))}
            </select>
            <input
              value={executionTarget.entityId}
              onChange={(e) => setExecutionTarget((prev) => ({ ...prev, entityId: e.target.value }))}
              placeholder="Entity ID (required to list existing instances)"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={loadInstancesForEntity}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Load Instances
            </button>
          </div>

          {instances.length > 0 && (
            <div className="mt-4 space-y-2">
              {instances.map((instance) => (
                <div key={instance.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {instance.id}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {instance.entityType}:{instance.entityId} | Status: {instance.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => advanceInstance(instance.id, 'approved')}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Approve / Advance
                      </button>
                      <button
                        onClick={() => advanceInstance(instance.id, 'rejected')}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setSelectedInstanceId((prev) => (prev === instance.id ? null : instance.id))}
                        className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded"
                      >
                        {selectedInstanceId === instance.id ? 'Hide Details' : 'Details'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {workflows.length === 0 ? (
            <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <Square3Stack3DIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No workflows created yet. Create a workflow template to define your stage process.
              </p>
            </div>
          ) : (
            workflows.map((workflow) => (
              <div key={workflow.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex justify-between items-start gap-3 mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{workflow.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{workflow.description || 'No description provided.'}</p>
                    <div className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                      Type: {workflow.type}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleWorkflow(workflow.id, workflow.isActive)}
                    className={`p-2 rounded-lg transition-colors ${
                      workflow.isActive
                        ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900'
                        : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    title={workflow.isActive ? 'Active' : 'Inactive'}
                  >
                    {workflow.isActive ? <PlayIcon className="h-5 w-5" /> : <PauseIcon className="h-5 w-5" />}
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BoltIcon className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Steps ({workflow.steps.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {workflow.steps.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No configured steps.</p>
                    ) : (
                      workflow.steps.map((step) => (
                        <div key={`${workflow.id}-${step.stepOrder}-${step.id || step.name}`} className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded p-2">
                          <div className="font-medium">
                            {step.stepOrder}. {step.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Role: {step.requiredRole || 'Any'} | Approval: {step.requireApproval ? 'Required' : 'Not required'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => executeWorkflow(workflow.id)}
                    className="px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm"
                  >
                    Execute
                  </button>
                  <button
                    onClick={() => openEdit(workflow)}
                    className="px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
                  >
                    <PencilIcon className="h-4 w-4 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteWorkflow(workflow.id)}
                    className="px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-sm"
                  >
                    <TrashIcon className="h-4 w-4 inline mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingWorkflowId ? 'Edit Workflow' : 'Create Workflow'}
            </h3>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {WORKFLOW_TRIGGER_TYPES.map((trigger) => (
                      <option key={trigger.value} value={trigger.value}>{trigger.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Non-custom types auto-start when the matching application event occurs.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="workflow-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                <label htmlFor="workflow-active" className="text-sm text-gray-700 dark:text-gray-300">
                  Active
                </label>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Workflow Steps</label>
                  <button
                    onClick={addStep}
                    className="px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded text-sm hover:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    Add Step
                  </button>
                </div>
                <div className="space-y-3">
                  {form.steps.map((step, index) => (
                    <div key={`step-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          Step {index + 1}
                        </h4>
                        <button
                          onClick={() => removeStep(index)}
                          disabled={form.steps.length <= 1}
                          className="text-red-600 disabled:text-gray-400"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Step name"
                          value={step.name}
                          onChange={(e) => updateStep(index, { name: e.target.value })}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <select
                          value={step.requiredRole || ''}
                          onChange={(e) => updateStep(index, { requiredRole: e.target.value as WorkflowRole | '' })}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Any role</option>
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        placeholder="Step description"
                        value={step.description || ''}
                        onChange={(e) => updateStep(index, { description: e.target.value })}
                        rows={2}
                        className="mt-3 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <div className="flex flex-wrap gap-4 mt-3">
                        <label className="text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={step.requireApproval !== false}
                            onChange={(e) => updateStep(index, { requireApproval: e.target.checked })}
                            className="mr-2"
                          />
                          Require approval
                        </label>
                        <label className="text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={Boolean(step.autoAdvance)}
                            onChange={(e) => updateStep(index, { autoAdvance: e.target.checked })}
                            className="mr-2"
                          />
                          Auto-advance
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveWorkflow}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-70"
              >
                {saving ? 'Saving...' : editingWorkflowId ? 'Save Changes' : 'Create Workflow'}
              </button>
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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

export default WorkflowManagementPage
