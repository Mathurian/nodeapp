import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  BuildingOfficeIcon,
  PlusIcon,
  PencilIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { Card, PageHeader } from '../components/ui'

interface Tenant {
  id: string
  name: string
  slug: string
  domain?: string
  isActive: boolean
  settings: Record<string, any>
  maxUsers?: number | null
  maxEvents?: number | null
  maxStorage?: number | null
  planType: string
  subscriptionStatus: string
  subscriptionEndsAt?: string | null
  scoringType: 'STRAIGHT' | 'OLYMPIC'
  createdAt: string
  updatedAt: string
}

const TenantManagementPage: React.FC = () => {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    isActive: true,
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    maxUsers: '' as string | number,
    maxEvents: '' as string | number,
    maxStorage: '' as string | number,
    planType: 'free',
    subscriptionStatus: 'active',
    scoringType: 'STRAIGHT' as 'STRAIGHT' | 'OLYMPIC',
  })

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      setLoading(true)
      const response = await api.get('/tenants')
      // Backend returns { tenants: [...], total, skip, take }
      const tenantsData = response.data.tenants || []
      setTenants(Array.isArray(tenantsData) ? tenantsData : [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  const createTenant = async () => {
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        domain: formData.domain.trim() || undefined,
        adminName: formData.adminName.trim(),
        adminEmail: formData.adminEmail.trim().toLowerCase(),
        maxUsers: formData.maxUsers === '' ? undefined : Number(formData.maxUsers),
        maxEvents: formData.maxEvents === '' ? undefined : Number(formData.maxEvents),
        maxStorage: formData.maxStorage === '' ? undefined : Number(formData.maxStorage),
      }

      await api.post('/tenants', payload)
      setShowModal(false)
      resetForm()
      await fetchTenants()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create tenant')
    }
  }

  const updateTenant = async () => {
    if (!editingTenant) return
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        domain: formData.domain.trim() || undefined,
        maxUsers: formData.maxUsers === '' ? undefined : Number(formData.maxUsers),
        maxEvents: formData.maxEvents === '' ? undefined : Number(formData.maxEvents),
        maxStorage: formData.maxStorage === '' ? undefined : Number(formData.maxStorage),
      }

      await api.put(`/tenants/${editingTenant.id}`, payload)
      setEditingTenant(null)
      resetForm()
      await fetchTenants()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update tenant')
    }
  }

  const toggleTenant = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/tenants/${id}`, { isActive: !isActive })
      await fetchTenants()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle tenant')
    }
  }

  const deleteTenant = async (id: string, name: string) => {
    // Clear any previous messages
    setError(null)
    setSuccessMessage(null)

    const confirmMessage = `Are you sure you want to DELETE tenant "${name}"?\n\nThis will PERMANENTLY remove:\n- All users\n- All events and contests\n- All scores and data\n\nThis action CANNOT be undone!`

    if (!window.confirm(confirmMessage)) {
      return
    }

    const secondConfirm = window.prompt(
      `Type the tenant name "${name}" to confirm deletion:`
    )

    // Case-insensitive comparison with whitespace trimming
    if (!secondConfirm || secondConfirm.trim().toLowerCase() !== name.trim().toLowerCase()) {
      setError(`Tenant name did not match. You typed "${secondConfirm || ''}" but expected "${name}". Deletion cancelled.`)
      return
    }

    try {
      // Set loading state
      setDeletingTenantId(id)

      await api.delete(`/tenants/${id}?hard=true`)

      // Show success message
      setSuccessMessage(`Tenant "${name}" has been permanently deleted.`)

      // Refresh tenant list
      await fetchTenants()

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to delete tenant'
      setError(`Failed to delete tenant "${name}": ${errorMsg}`)
    } finally {
      setDeletingTenantId(null)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      domain: '',
      isActive: true,
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      maxUsers: '',
      maxEvents: '',
      maxStorage: '',
      planType: 'free',
      subscriptionStatus: 'active',
      scoringType: 'STRAIGHT' as 'STRAIGHT' | 'OLYMPIC',
    })
  }

  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant)
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain || '',
      isActive: tenant.isActive,
      adminName: '', // Not used when editing
      adminEmail: '', // Not used when editing
      adminPassword: '', // Not used when editing
      maxUsers: tenant.maxUsers ?? '',
      maxEvents: tenant.maxEvents ?? '',
      maxStorage: tenant.maxStorage ?? '',
      planType: tenant.planType || 'free',
      subscriptionStatus: tenant.subscriptionStatus || 'active',
      scoringType: tenant.scoringType || 'STRAIGHT',
    })
    setShowModal(true)
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            Only system administrators can manage tenants.
          </p>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center text-gray-600 dark:text-gray-400">Loading tenants...</Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container">
        <div className="flex justify-between items-center mb-8">
          <PageHeader
            title="Tenant Management"
            subtitle="Manage multi-tenant configurations and settings"
            icon={BuildingOfficeIcon}
          />
          <button
            onClick={() => {
              resetForm()
              setEditingTenant(null)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Create Tenant
          </button>
        </div>

        {error && (
          <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg flex justify-between items-start">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
              title="Dismiss"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </Card>
        )}

        {successMessage && (
          <Card className="mb-6 p-4 bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700 rounded-lg flex justify-between items-start">
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-800 dark:text-green-200">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-200"
              title="Dismiss"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <BuildingOfficeIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
                      {tenant.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      /{tenant.slug}
                    </p>
                  </div>
                </div>
                {tenant.isActive ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                )}
              </div>

              {tenant.domain && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                    <span className="font-medium">Domain:</span> {tenant.domain}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  tenant.isActive
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {tenant.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(tenant)}
                  className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
                >
                  <PencilIcon className="h-4 w-4 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => toggleTenant(tenant.id, tenant.isActive)}
                  className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                    tenant.isActive
                      ? 'bg-yellow-600 dark:bg-yellow-500 text-white hover:bg-yellow-700 dark:hover:bg-yellow-600'
                      : 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600'
                  }`}
                >
                  {tenant.isActive ? 'Deactivate' : 'Activate'}
                </button>
                {user?.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={() => deleteTenant(tenant.id, tenant.name)}
                    disabled={deletingTenantId === tenant.id}
                    className={`px-3 py-2 text-white rounded-lg transition-colors text-sm ${
                      deletingTenantId === tenant.id
                        ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                        : 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600'
                    }`}
                    title={deletingTenantId === tenant.id ? 'Deleting...' : 'Permanently delete tenant'}
                  >
                    {deletingTenantId === tenant.id ? (
                      <div className="flex items-center gap-1">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    ) : (
                      <TrashIcon className="h-4 w-4 inline" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingTenant ? 'Edit Tenant' : 'Create Tenant'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Tenant Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Slug (URL identifier)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="tenant-slug"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Custom Domain (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="custom.domain.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                  />
                </div>

                {/* Admin user fields - only show when creating new tenant */}
                {!editingTenant && (
                  <>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Admin User Details
                      </h4>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Admin Name
                      </label>
                      <input
                        type="text"
                        value={formData.adminName}
                        onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                        placeholder="Admin User"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Admin Email
                      </label>
                      <input
                        type="email"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                        placeholder="admin@example.com"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Admin Password
                      </label>
                      <input
                        type="password"
                        value={formData.adminPassword}
                        onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                        placeholder="Secure password"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
                      Active
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Scoring Type
                  </label>
                  <select
                    value={formData.scoringType}
                    onChange={(e) => setFormData({ ...formData, scoringType: e.target.value as 'STRAIGHT' | 'OLYMPIC' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="STRAIGHT">Straight Scoring (Average all scores)</option>
                    <option value="OLYMPIC">Olympic Scoring (Drop high & low, requires 3+ judges)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This setting can be overridden at the event or contest level.
                  </p>
                </div>

                {/* Plan & Limits Section */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Plan & Limits
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Plan Type
                    </label>
                    <select
                      value={formData.planType}
                      onChange={(e) => setFormData({ ...formData, planType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="free">Free</option>
                      <option value="basic">Basic</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subscription Status
                    </label>
                    <select
                      value={formData.subscriptionStatus}
                      onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="suspended">Suspended</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Users
                    </label>
                    <input
                      type="number"
                      value={formData.maxUsers}
                      onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value ? parseInt(e.target.value) : '' })}
                      placeholder="Unlimited"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Events
                    </label>
                    <input
                      type="number"
                      value={formData.maxEvents}
                      onChange={(e) => setFormData({ ...formData, maxEvents: e.target.value ? parseInt(e.target.value) : '' })}
                      placeholder="Unlimited"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Storage (MB)
                    </label>
                    <input
                      type="number"
                      value={formData.maxStorage}
                      onChange={(e) => setFormData({ ...formData, maxStorage: e.target.value ? parseInt(e.target.value) : '' })}
                      placeholder="Unlimited"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={editingTenant ? updateTenant : createTenant}
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  {editingTenant ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingTenant(null)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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

export default TenantManagementPage
