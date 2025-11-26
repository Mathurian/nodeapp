import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

interface RateLimitConfig {
  id: string
  name: string
  tier: string | null
  tenantId: string | null
  userId: string | null
  endpoint: string | null
  requestsPerHour: number
  requestsPerMinute: number
  burstLimit: number
  enabled: boolean
  priority: number
  description: string | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
  tenant?: {
    id: string
    name: string
    planType: string
  } | null
  user?: {
    id: string
    name: string
    email: string
  } | null
}

interface RateLimitTier {
  key: string
  name: string
  requestsPerHour: number
  requestsPerMinute: number
  burstLimit: number
}

const RateLimitConfigPage: React.FC = () => {
  const { user } = useAuth()
  const [configs, setConfigs] = useState<RateLimitConfig[]>([])
  const [tiers, setTiers] = useState<RateLimitTier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState<RateLimitConfig | null>(null)
  const [deletingConfig, setDeletingConfig] = useState<RateLimitConfig | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEnabled, setFilterEnabled] = useState<boolean | null>(null)
  const [filterTier, setFilterTier] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '',
    tier: '',
    tenantId: '',
    userId: '',
    endpoint: '',
    requestsPerHour: 1000,
    requestsPerMinute: 50,
    burstLimit: 100,
    enabled: true,
    priority: 0,
    description: '',
  })

  useEffect(() => {
    fetchConfigs()
    fetchTiers()
  }, [])

  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/rate-limit-configs')
      setConfigs(response.data.data || [])
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load rate limit configurations')
    } finally {
      setLoading(false)
    }
  }

  const fetchTiers = async () => {
    try {
      const response = await api.get('/admin/rate-limit-configs/tiers')
      setTiers(response.data.data || [])
    } catch (err: any) {
      console.error('Failed to load tiers:', err)
    }
  }

  const createConfig = async () => {
    try {
      await api.post('/admin/rate-limit-configs', {
        ...formData,
        tenantId: formData.tenantId || null,
        userId: formData.userId || null,
        endpoint: formData.endpoint || null,
        tier: formData.tier || null,
        description: formData.description || null,
      })
      setShowModal(false)
      resetForm()
      await fetchConfigs()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create configuration')
    }
  }

  const updateConfig = async () => {
    if (!editingConfig) return
    try {
      await api.put(`/admin/rate-limit-configs/${editingConfig.id}`, {
        ...formData,
        tenantId: formData.tenantId || null,
        userId: formData.userId || null,
        endpoint: formData.endpoint || null,
        tier: formData.tier || null,
        description: formData.description || null,
      })
      setShowModal(false)
      setEditingConfig(null)
      resetForm()
      await fetchConfigs()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update configuration')
    }
  }

  const deleteConfig = async () => {
    if (!deletingConfig) return
    try {
      await api.delete(`/admin/rate-limit-configs/${deletingConfig.id}`)
      setShowDeleteModal(false)
      setDeletingConfig(null)
      await fetchConfigs()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete configuration')
    }
  }

  const toggleEnabled = async (config: RateLimitConfig) => {
    try {
      await api.put(`/admin/rate-limit-configs/${config.id}`, {
        enabled: !config.enabled,
      })
      await fetchConfigs()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle configuration')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      tier: '',
      tenantId: '',
      userId: '',
      endpoint: '',
      requestsPerHour: 1000,
      requestsPerMinute: 50,
      burstLimit: 100,
      enabled: true,
      priority: 0,
      description: '',
    })
  }

  const openEditModal = (config: RateLimitConfig) => {
    setEditingConfig(config)
    setFormData({
      name: config.name,
      tier: config.tier || '',
      tenantId: config.tenantId || '',
      userId: config.userId || '',
      endpoint: config.endpoint || '',
      requestsPerHour: config.requestsPerHour,
      requestsPerMinute: config.requestsPerMinute,
      burstLimit: config.burstLimit,
      enabled: config.enabled,
      priority: config.priority,
      description: config.description || '',
    })
    setShowModal(true)
  }

  const openDeleteModal = (config: RateLimitConfig) => {
    setDeletingConfig(config)
    setShowDeleteModal(true)
  }

  const applyTierPreset = (tierKey: string) => {
    const tier = tiers.find(t => t.key === tierKey)
    if (tier) {
      setFormData({
        ...formData,
        tier: tierKey,
        requestsPerHour: tier.requestsPerHour,
        requestsPerMinute: tier.requestsPerMinute,
        burstLimit: tier.burstLimit,
      })
    }
  }

  // Filter and search configs
  const filteredConfigs = configs.filter(config => {
    const matchesSearch = !searchTerm ||
      config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.endpoint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.tenant?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.user?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesEnabled = filterEnabled === null || config.enabled === filterEnabled
    const matchesTier = !filterTier || config.tier === filterTier

    return matchesSearch && matchesEnabled && matchesTier
  })

  const getPriorityBadgeColor = (priority: number) => {
    if (priority >= 100) return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
    if (priority >= 50) return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
    if (priority >= 10) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
    return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
  }

  const getScopeBadges = (config: RateLimitConfig) => {
    const badges = []
    if (config.tier) badges.push({ label: `Tier: ${config.tier}`, color: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' })
    if (config.tenant) badges.push({ label: `Tenant: ${config.tenant.name}`, color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' })
    if (config.user) badges.push({ label: `User: ${config.user.name}`, color: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' })
    if (config.endpoint) badges.push({ label: `Endpoint: ${config.endpoint}`, color: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' })
    return badges
  }

  if (!user?.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Only Super Admins can manage rate limit configurations.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading configurations...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Rate Limit Configuration
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage API rate limits per tenant, user, and endpoint
            </p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setEditingConfig(null)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Create Configuration
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, endpoint, tenant, or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <select
                value={filterEnabled === null ? 'all' : filterEnabled ? 'enabled' : 'disabled'}
                onChange={(e) => setFilterEnabled(e.target.value === 'all' ? null : e.target.value === 'enabled')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="enabled">Enabled Only</option>
                <option value="disabled">Disabled Only</option>
              </select>
            </div>
            <div>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Tiers</option>
                {tiers.map(tier => (
                  <option key={tier.key} value={tier.key}>{tier.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Configurations Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name & Scope
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Limits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredConfigs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No configurations found. Create your first rate limit configuration.
                    </td>
                  </tr>
                ) : (
                  filteredConfigs.map((config) => (
                    <tr key={config.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <ShieldCheckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {config.name}
                            </div>
                            {config.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {config.description}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {getScopeBadges(config).map((badge, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badge.color}`}
                                >
                                  {badge.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          <div>{config.requestsPerHour}/hour</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {config.requestsPerMinute}/min • Burst: {config.burstLimit}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeColor(config.priority)}`}>
                          {config.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleEnabled(config)}
                          className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                            config.enabled
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800'
                          }`}
                        >
                          {config.enabled ? (
                            <>
                              <CheckCircleIcon className="h-3 w-3" />
                              Enabled
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-3 w-3" />
                              Disabled
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(config)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(config)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingConfig ? 'Edit Configuration' : 'Create Configuration'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Configuration Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Premium User Limits"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Scope (Optional - leave blank for tier defaults)
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tier
                    </label>
                    <select
                      value={formData.tier}
                      onChange={(e) => {
                        const value = e.target.value
                        setFormData({ ...formData, tier: value })
                        if (value) applyTierPreset(value)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">No Tier</option>
                      {tiers.map(tier => (
                        <option key={tier.key} value={tier.key}>{tier.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tenant ID
                    </label>
                    <input
                      type="text"
                      value={formData.tenantId}
                      onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                      placeholder="Leave blank for all tenants"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                      placeholder="Leave blank for all users"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Endpoint
                    </label>
                    <input
                      type="text"
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                      placeholder="e.g., /api/auth/login"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Rate Limits *
                  </h4>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Requests/Hour
                    </label>
                    <input
                      type="number"
                      value={formData.requestsPerHour}
                      onChange={(e) => setFormData({ ...formData, requestsPerHour: parseInt(e.target.value) || 0 })}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Requests/Minute
                    </label>
                    <input
                      type="number"
                      value={formData.requestsPerMinute}
                      onChange={(e) => setFormData({ ...formData, requestsPerMinute: parseInt(e.target.value) || 0 })}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Burst Limit
                    </label>
                    <input
                      type="number"
                      value={formData.burstLimit}
                      onChange={(e) => setFormData({ ...formData, burstLimit: parseInt(e.target.value) || 0 })}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority (higher = takes precedence)
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mt-7">
                      <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Enabled
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={editingConfig ? updateConfig : createConfig}
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  {editingConfig ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingConfig(null)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingConfig && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Confirm Deletion
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete the configuration <strong>{deletingConfig.name}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={deleteConfig}
                  className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletingConfig(null)
                  }}
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

export default RateLimitConfigPage
