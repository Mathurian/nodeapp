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
} from '@heroicons/react/24/outline'

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
  createdAt: string
  updatedAt: string
}

const TenantManagementPage: React.FC = () => {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
      await api.post('/tenants', formData)
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
      await api.put(`/tenants/${editingTenant.id}`, formData)
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
    })
    setShowModal(true)
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            Only system administrators can manage tenants.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Loading tenants...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
              Tenant Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mt-2">
              Manage multi-tenant configurations and settings
            </p>
          </div>
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
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
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
                      ? 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600'
                      : 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600'
                  }`}
                >
                  {tenant.isActive ? 'Deactivate' : 'Activate'}
                </button>
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
    </div>
  )
}

export default TenantManagementPage
