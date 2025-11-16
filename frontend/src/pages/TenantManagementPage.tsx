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
  })

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      setLoading(true)
      const response = await api.get('/tenant')
      setTenants(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  const createTenant = async () => {
    try {
      await api.post('/tenant', formData)
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
      await api.put(`/tenant/${editingTenant.id}`, formData)
      setEditingTenant(null)
      resetForm()
      await fetchTenants()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update tenant')
    }
  }

  const toggleTenant = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/tenant/${id}`, { isActive: !isActive })
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
    })
  }

  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant)
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain || '',
      isActive: tenant.isActive,
    })
    setShowModal(true)
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Only system administrators can manage tenants.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading tenants...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Tenant Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage multi-tenant configurations and settings
            </p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setEditingTenant(null)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
            <div key={tenant.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <BuildingOfficeIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {tenant.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <PencilIcon className="h-4 w-4 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => toggleTenant(tenant.id, tenant.isActive)}
                  className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                    tenant.isActive
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingTenant ? 'Edit Tenant' : 'Create Tenant'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tenant Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Slug (URL identifier)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="tenant-slug"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Domain (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="custom.domain.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Active
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={editingTenant ? updateTenant : createTenant}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTenant ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingTenant(null)
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
      </div>
    </div>
  )
}

export default TenantManagementPage
