import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  DocumentDuplicateIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline'
import { Button, Card, PageHeader } from '../components/ui'

interface CriterionTemplate {
  name: string
  maxScore: number
}

interface ContestTemplate {
  id: string
  name: string
  description?: string
}

interface CategoryTemplate {
  id?: string
  contestId?: string
  name: string
  description?: string
  scoreCap?: number | null
  criteria?: CriterionTemplate[]
}

interface EventTemplate {
  id: string
  name: string
  description?: string
  contests: ContestTemplate[]
  categories: CategoryTemplate[]
  createdAt: string
  updatedAt?: string
}

interface TemplateFormState {
  name: string
  description: string
  contests: ContestTemplate[]
  categories: CategoryTemplate[]
}

interface CreateEventState {
  templateId: string
  eventName: string
  eventDescription: string
  startDate: string
  endDate: string
}

const uid = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const EMPTY_FORM: TemplateFormState = {
  name: '',
  description: '',
  contests: [{ id: uid(), name: '', description: '' }],
  categories: [{ id: uid(), contestId: '', name: '', description: '', scoreCap: null, criteria: [] }],
}

const mapTemplate = (raw: any): EventTemplate => ({
  id: raw.id,
  name: raw.name || 'Untitled Template',
  description: raw.description || '',
  contests: Array.isArray(raw.contests) ? raw.contests : [],
  categories: Array.isArray(raw.categories) ? raw.categories : [],
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
})

const EventTemplatesPage: React.FC = () => {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<EventTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [formData, setFormData] = useState<TemplateFormState>(EMPTY_FORM)
  const [eventForm, setEventForm] = useState<CreateEventState>({
    templateId: '',
    eventName: '',
    eventDescription: '',
    startDate: '',
    endDate: '',
  })

  const canManage = useMemo(
    () => ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || ''),
    [user?.role]
  )

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await api.get('/event-templates')
      const payload = response.data?.data || response.data
      const list = Array.isArray(payload) ? payload : []
      setTemplates(list.map(mapTemplate))
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const openCreateTemplate = () => {
    setEditingTemplateId(null)
    setFormData(EMPTY_FORM)
    setShowTemplateModal(true)
  }

  const openEditTemplate = (template: EventTemplate) => {
    setEditingTemplateId(template.id)
    setFormData({
      name: template.name,
      description: template.description || '',
      contests: template.contests.length > 0
        ? template.contests.map((contest) => ({
            id: contest.id || uid(),
            name: contest.name || '',
            description: contest.description || '',
          }))
        : [{ id: uid(), name: '', description: '' }],
      categories: template.categories.length > 0
        ? template.categories.map((category) => ({
            id: category.id || uid(),
            contestId: category.contestId || '',
            name: category.name || '',
            description: category.description || '',
            scoreCap: category.scoreCap ?? null,
            criteria: Array.isArray(category.criteria) ? category.criteria : [],
          }))
        : [{ id: uid(), contestId: '', name: '', description: '', scoreCap: null, criteria: [] }],
    })
    setShowTemplateModal(true)
  }

  const closeTemplateModal = () => {
    setShowTemplateModal(false)
    setEditingTemplateId(null)
    setFormData(EMPTY_FORM)
  }

  const saveTemplate = async () => {
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      contests: formData.contests
        .filter((contest) => contest.name.trim())
        .map((contest) => ({ id: contest.id, name: contest.name.trim(), description: contest.description?.trim() || undefined })),
      categories: formData.categories
        .filter((category) => category.name.trim())
        .map((category) => ({
          contestId: category.contestId || undefined,
          name: category.name.trim(),
          description: category.description?.trim() || undefined,
          scoreCap: category.scoreCap ?? undefined,
          criteria: (category.criteria || []).filter((criterion) => criterion.name.trim()).map((criterion) => ({
            name: criterion.name.trim(),
            maxScore: Number(criterion.maxScore) || 10,
          })),
        })),
    }

    if (!payload.name) {
      setError('Template name is required')
      return
    }
    if (payload.contests.length === 0) {
      setError('At least one contest is required')
      return
    }
    if (payload.categories.length === 0) {
      setError('At least one category is required')
      return
    }

    try {
      setSaving(true)
      if (editingTemplateId) {
        await api.put(`/event-templates/${editingTemplateId}`, payload)
      } else {
        await api.post('/event-templates', payload)
      }
      closeTemplateModal()
      await fetchTemplates()
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this event template?')) return
    try {
      await api.delete(`/event-templates/${id}`)
      await fetchTemplates()
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to delete template')
    }
  }

  const openCreateEvent = (template: EventTemplate) => {
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const dateString = (value: Date) => value.toISOString().slice(0, 10)

    setEventForm({
      templateId: template.id,
      eventName: `${template.name} Event`,
      eventDescription: template.description || '',
      startDate: dateString(today),
      endDate: dateString(tomorrow),
    })
    setShowCreateEventModal(true)
  }

  const createEventFromTemplate = async () => {
    if (!eventForm.templateId) return
    try {
      setSaving(true)
      const response = await api.post(`/event-templates/${eventForm.templateId}/create-event`, {
        eventName: eventForm.eventName.trim(),
        eventDescription: eventForm.eventDescription.trim(),
        startDate: eventForm.startDate,
        endDate: eventForm.endDate,
      })
      const createdEvent = response.data?.data || response.data
      alert(`Event created successfully: ${createdEvent?.name || createdEvent?.id || 'Event created'}`)
      setShowCreateEventModal(false)
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create event from template')
    } finally {
      setSaving(false)
    }
  }

  const addContest = () => {
    setFormData((prev) => ({
      ...prev,
      contests: [...prev.contests, { id: uid(), name: '', description: '' }],
    }))
  }

  const updateContest = (index: number, patch: Partial<ContestTemplate>) => {
    setFormData((prev) => ({
      ...prev,
      contests: prev.contests.map((contest, contestIndex) => (contestIndex === index ? { ...contest, ...patch } : contest)),
    }))
  }

  const removeContest = (index: number) => {
    setFormData((prev) => {
      const removed = prev.contests[index]
      const contests = prev.contests.filter((_, contestIndex) => contestIndex !== index)
      const categories = prev.categories.map((category) => (
        category.contestId === removed?.id ? { ...category, contestId: '' } : category
      ))
      return { ...prev, contests: contests.length > 0 ? contests : [{ id: uid(), name: '', description: '' }], categories }
    })
  }

  const addCategory = () => {
    const defaultContestId = formData.contests[0]?.id || ''
    setFormData((prev) => ({
      ...prev,
      categories: [...prev.categories, { id: uid(), contestId: defaultContestId, name: '', description: '', scoreCap: null, criteria: [] }],
    }))
  }

  const updateCategory = (index: number, patch: Partial<CategoryTemplate>) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.map((category, categoryIndex) => (categoryIndex === index ? { ...category, ...patch } : category)),
    }))
  }

  const removeCategory = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, categoryIndex) => categoryIndex !== index).length > 0
        ? prev.categories.filter((_, categoryIndex) => categoryIndex !== index)
        : [{ id: uid(), contestId: prev.contests[0]?.id || '', name: '', description: '', scoreCap: null, criteria: [] }],
    }))
  }

  const addCriterion = (categoryIndex: number) => {
    const next = [...formData.categories]
    const target = next[categoryIndex]
    if (!target) return
    target.criteria = [...(target.criteria || []), { name: '', maxScore: 10 }]
    setFormData((prev) => ({ ...prev, categories: next }))
  }

  const updateCriterion = (categoryIndex: number, criterionIndex: number, patch: Partial<CriterionTemplate>) => {
    const next = [...formData.categories]
    const target = next[categoryIndex]
    if (!target) return
    target.criteria = (target.criteria || []).map((criterion, index) => index === criterionIndex ? { ...criterion, ...patch } : criterion)
    setFormData((prev) => ({ ...prev, categories: next }))
  }

  const removeCriterion = (categoryIndex: number, criterionIndex: number) => {
    const next = [...formData.categories]
    const target = next[categoryIndex]
    if (!target) return
    target.criteria = (target.criteria || []).filter((_, index) => index !== criterionIndex)
    setFormData((prev) => ({ ...prev, categories: next }))
  }

  if (!canManage) {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to manage event templates.</p>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center text-gray-600 dark:text-gray-400">Loading templates...</Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container">
        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center mb-8">
          <PageHeader
            title="Event Templates"
            subtitle="Build reusable contest and category structures, then generate new events in one click."
            icon={DocumentDuplicateIcon}
          />
          <Button
            onClick={openCreateTemplate}
          >
            <PlusIcon className="h-5 w-5" />
            Create Template
          </Button>
        </div>

        {error && (
          <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {templates.length === 0 ? (
            <Card className="col-span-full rounded-lg p-12 text-center">
              <DocumentDuplicateIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No event templates yet. Create your first template to streamline event creation.
              </p>
            </Card>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{template.description || 'No description provided.'}</p>
                  </div>
                  <DocumentDuplicateIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                  <p>Contests: {template.contests.length}</p>
                  <p>Categories: {template.categories.length}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openCreateEvent(template)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm"
                  >
                    <RocketLaunchIcon className="h-4 w-4" />
                    Use Template
                  </button>
                  <button
                    onClick={() => openEditTemplate(template)}
                    className="px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                </Card>
              ))
          )}
        </div>

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingTemplateId ? 'Edit Event Template' : 'Create Event Template'}
            </h3>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Contests</h4>
                  <button
                    onClick={addContest}
                    className="px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded text-sm hover:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    Add Contest
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.contests.map((contest, index) => (
                    <div key={contest.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                      <input
                        type="text"
                        placeholder="Contest name"
                        value={contest.name}
                        onChange={(e) => updateContest(index, { name: e.target.value })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={contest.description || ''}
                        onChange={(e) => updateContest(index, { description: e.target.value })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button onClick={() => removeContest(index)} className="px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg">Remove</button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Categories</h4>
                  <button
                    onClick={addCategory}
                    className="px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded text-sm hover:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    Add Category
                  </button>
                </div>
                <div className="space-y-4">
                  {formData.categories.map((category, index) => (
                    <div key={category.id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Category name"
                          value={category.name}
                          onChange={(e) => updateCategory(index, { name: e.target.value })}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <select
                          value={category.contestId || ''}
                          onChange={(e) => updateCategory(index, { contestId: e.target.value })}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Select contest</option>
                          {formData.contests.map((contest) => (
                            <option key={contest.id} value={contest.id}>
                              {contest.name || 'Untitled contest'}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Description"
                          value={category.description || ''}
                          onChange={(e) => updateCategory(index, { description: e.target.value })}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <input
                          type="number"
                          placeholder="Score cap"
                          value={category.scoreCap ?? ''}
                          onChange={(e) => updateCategory(index, { scoreCap: e.target.value ? Number(e.target.value) : null })}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Criteria</span>
                          <button
                            onClick={() => addCriterion(index)}
                            className="px-2 py-1 text-xs bg-blue-600 dark:bg-blue-500 text-white rounded"
                          >
                            Add Criterion
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(category.criteria || []).map((criterion, criterionIndex) => (
                            <div key={`criterion-${criterionIndex}`} className="grid grid-cols-[1fr_120px_auto] gap-2">
                              <input
                                type="text"
                                placeholder="Criterion name"
                                value={criterion.name}
                                onChange={(e) => updateCriterion(index, criterionIndex, { name: e.target.value })}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <input
                                type="number"
                                value={criterion.maxScore}
                                onChange={(e) => updateCriterion(index, criterionIndex, { maxScore: Number(e.target.value) || 10 })}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <button
                                onClick={() => removeCriterion(index, criterionIndex)}
                                className="px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => removeCategory(index)}
                        className="mt-3 px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg text-sm"
                      >
                        Remove Category
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-70"
              >
                {saving ? 'Saving...' : editingTemplateId ? 'Save Changes' : 'Create Template'}
              </button>
              <button
                onClick={closeTemplateModal}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Event from Template</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={eventForm.eventName}
                onChange={(e) => setEventForm((prev) => ({ ...prev, eventName: e.target.value }))}
                placeholder="Event name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <textarea
                value={eventForm.eventDescription}
                onChange={(e) => setEventForm((prev) => ({ ...prev, eventDescription: e.target.value }))}
                placeholder="Description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={eventForm.startDate}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="date"
                  value={eventForm.endDate}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={createEventFromTemplate}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-70"
              >
                {saving ? 'Creating...' : 'Create Event'}
              </button>
              <button
                onClick={() => setShowCreateEventModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
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

export default EventTemplatesPage
