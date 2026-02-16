import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { usersAPI, api } from '../services/api'
import { UsersIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { DateFilters } from '../components/DateFilterControls'
import { Button, Card, ConfirmModal, PageHeader } from '../components/ui'
import { useOptimisticMutation } from '../hooks'
import {
  UserTable,
  UserForm,
  UserFilters,
  UserBulkActions,
  ResetPasswordModal,
  TenantReassignModal,
  User,
  UserFormData,
  CustomField,
  Tenant,
} from '../components/users'

/** Extended User type with optimistic state flags */
interface OptimisticUser extends User {
  _optimistic?: boolean
  _deleting?: boolean
}

/**
 * UsersPage - User management page component
 *
 * Provides comprehensive user management functionality including:
 * - User listing with filtering and search
 * - User CRUD operations
 * - Password reset
 * - Bulk operations
 * - Tenant reassignment (SUPER_ADMIN only)
 * - Custom fields support
 */
const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [tenantFilter, setTenantFilter] = useState<string>('')
  const [dateFilters, setDateFilters] = useState<DateFilters>({
    sortDirection: 'asc',
  })

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formDefaultValues, setFormDefaultValues] = useState<Partial<UserFormData>>({})
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedBioFile, setSelectedBioFile] = useState<File | null>(null)

  // Reset password state
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string>('')
  const [newPassword, setNewPassword] = useState('')

  // Tenant reassignment state (SUPER_ADMIN only)
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false)
  const [tenantReassignUserId, setTenantReassignUserId] = useState<string>('')
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')

  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())

  // Confirmation modals state
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null,
  })
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [loadingCustomFields, setLoadingCustomFields] = useState(true)

  // Check permissions
  const canManageUsers = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(currentUser?.role || '')
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'

  // Fetch custom fields for USER entity type
  React.useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        setLoadingCustomFields(true)
        const response = await api.get('/custom-fields/USER')
        const fieldsData = response.data.data || response.data || []
        const fieldsArray = Array.isArray(fieldsData) ? fieldsData : []
        setCustomFields(fieldsArray.sort((a: CustomField, b: CustomField) => a.order - b.order))
      } catch (error) {
        console.error('Failed to fetch custom fields:', error)
        setCustomFields([])
      } finally {
        setLoadingCustomFields(false)
      }
    }

    fetchCustomFields()
  }, [])

  // Fetch users
  const { data: users = [], isLoading, error } = useQuery<User[]>(
    ['users', dateFilters],
    async () => {
      const params: Record<string, unknown> = {
        includeInactive: true,
      }

      if (dateFilters.createdAfter) {
        params.createdAfter = new Date(dateFilters.createdAfter).toISOString()
      }
      if (dateFilters.createdBefore) {
        params.createdBefore = new Date(dateFilters.createdBefore).toISOString()
      }
      if (dateFilters.sortBy) {
        params.sortBy = dateFilters.sortBy
      }
      if (dateFilters.sortDirection) {
        params.sortDirection = dateFilters.sortDirection
      }

      const response = await usersAPI.getAll(params)
      const unwrapped = response.data.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      enabled: canManageUsers,
      refetchInterval: 30000,
      retry: 1,
      onError: (err) => console.error('Fetch users failed:', err),
    }
  )

  // Fetch tenants for SUPER_ADMIN
  const { data: tenants = [] } = useQuery<Tenant[]>(
    'tenants',
    async () => {
      const response = await api.get('/tenants')
      const data = response.data
      const tenantsArray = data.tenants || data.data || data
      return Array.isArray(tenantsArray) ? tenantsArray : []
    },
    {
      enabled: isSuperAdmin,
      retry: 1,
      onError: (err) => console.error('Fetch tenants failed:', err),
    }
  )

  // Create user mutation
  const createMutation = useMutation(
    async (data: UserFormData) => {
      const response = await usersAPI.create(data)
      return response.data
    },
    {
      onSuccess: async (data, submittedData) => {
        queryClient.invalidateQueries('users')
        const userId = data.data?.id

        // Save custom field values
        if (userId && submittedData.customFields) {
          try {
            await api.post('/custom-fields/values/bulk', {
              entityId: userId,
              values: submittedData.customFields,
            })
          } catch (error) {
            console.error('Failed to save custom field values:', error)
            toast.error('User created, but custom fields failed to save')
          }
        }

        // Upload image if selected
        if (selectedImage && userId) {
          uploadImageMutation.mutate({ userId, file: selectedImage })
        }
        // Upload bio file if selected
        if (selectedBioFile && userId) {
          uploadBioFileMutation.mutate({ userId, file: selectedBioFile })
        }
        resetForm()
        toast.success('User created successfully!')
      },
      onError: (error: Error & { response?: { data?: { message?: string } } }) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create user'
        toast.error(`Error creating user: ${errorMessage}`)
      },
    }
  )

  // Update user mutation
  const updateMutation = useMutation(
    async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      const response = await usersAPI.update(id, data)
      return { ...response.data, userId: id }
    },
    {
      onSuccess: async (data, { data: submittedData }) => {
        queryClient.invalidateQueries('users')
        const userId = data.userId

        // Save custom field values
        if (userId && submittedData.customFields) {
          try {
            await api.post('/custom-fields/values/bulk', {
              entityId: userId,
              values: submittedData.customFields,
            })
          } catch (error) {
            console.error('Failed to save custom field values:', error)
            toast.error('User updated, but custom fields failed to save')
          }
        }

        // Upload image if selected
        if (selectedImage && userId) {
          uploadImageMutation.mutate({ userId, file: selectedImage })
        }
        // Upload bio file if selected
        if (selectedBioFile && userId) {
          uploadBioFileMutation.mutate({ userId, file: selectedBioFile })
        }
        resetForm()
        toast.success('User updated successfully!')
      },
      onError: (error: Error & { response?: { data?: { message?: string } } }) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update user'
        toast.error(`Error updating user: ${errorMessage}`)
      },
    }
  )

  // Delete user mutation with optimistic updates
  const deleteMutation = useOptimisticMutation<unknown, string>({
    mutationFn: async (id: string) => {
      const response = await usersAPI.delete(id)
      return response.data
    },
    queryKey: ['users', dateFilters],
    updateFn: (oldData, userId) => {
      // Optimistically mark user as deleting (grayed out)
      const users = oldData as OptimisticUser[] | undefined
      if (!users) return []
      return users.map((user) =>
        user.id === userId ? { ...user, _optimistic: true, _deleting: true } : user
      )
    },
    onSuccess: () => {
      toast.success('User deleted successfully!')
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete user'
      toast.error(`Error deleting user: ${errorMessage}`)
    },
    invalidateOnSettled: true,
  })

  // Toggle user active status with optimistic updates
  const toggleStatusMutation = useOptimisticMutation<
    unknown,
    { userId: string; isActive: boolean }
  >({
    mutationFn: async ({ userId, isActive }) => {
      const response = await usersAPI.update(userId, { isActive })
      return response.data
    },
    queryKey: ['users', dateFilters],
    updateFn: (oldData, { userId, isActive }) => {
      // Optimistically toggle the user's active status
      const users = oldData as OptimisticUser[] | undefined
      if (!users) return []
      return users.map((user) =>
        user.id === userId ? { ...user, isActive, _optimistic: true } : user
      )
    },
    onSuccess: (_, { isActive }) => {
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully!`)
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update user status'
      toast.error(`Error updating user status: ${errorMessage}`)
    },
    invalidateOnSettled: true,
  })

  // Reset password mutation
  const resetPasswordMutation = useMutation(
    async ({ id, password }: { id: string; password: string }) => {
      const response = await usersAPI.resetPassword(id, { newPassword: password })
      return response.data
    },
    {
      onSuccess: () => {
        setIsResetPasswordOpen(false)
        setResetPasswordUserId('')
        setNewPassword('')
        toast.success('Password reset successfully!')
      },
      onError: (error: Error & { response?: { data?: { details?: string; message?: string } } }) => {
        const errorMessage = error.response?.data?.details || error.response?.data?.message || error.message || 'Failed to reset password'
        toast.error(errorMessage)
      },
    }
  )

  // Upload image mutation
  const uploadImageMutation = useMutation(
    async ({ userId, file }: { userId: string; file: File }) => {
      const formData = new FormData()
      formData.append('image', file)
      const response = await usersAPI.uploadImage(userId, formData)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users')
        toast.success('Profile image uploaded successfully!')
      },
      onError: (error: Error) => {
        toast.error(`Error uploading image: ${error.message}`)
      },
    }
  )

  // Upload bio file mutation
  const uploadBioFileMutation = useMutation(
    async ({ userId, file }: { userId: string; file: File }) => {
      const formData = new FormData()
      formData.append('bioFile', file)
      const response = await usersAPI.uploadBioFile(userId, formData)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users')
        toast.success('Bio file uploaded successfully!')
      },
      onError: (error: Error) => {
        toast.error(`Error uploading bio file: ${error.message}`)
      },
    }
  )

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation(
    async (userIds: string[]) => {
      const response = await usersAPI.bulkDelete({ userIds, forceDeleteAdmin: true })
      return response.data
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('users')
        setSelectedUsers(new Set())
        toast.success(data.message || `Deleted ${selectedUsers.size} user(s) successfully!`)
      },
      onError: (error: Error & { response?: { data?: { message?: string } } }) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete users'
        toast.error(`Error deleting users: ${errorMessage}`)
      },
    }
  )

  // Tenant reassignment mutation
  const tenantReassignMutation = useMutation(
    async ({ userId, tenantId }: { userId: string; tenantId: string }) => {
      const response = await api.put(`/users/${userId}/tenant`, { tenantId })
      return response.data
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('users')
        setIsTenantModalOpen(false)
        setTenantReassignUserId('')
        setSelectedTenantId('')
        toast.success(data.message || 'User tenant reassigned successfully!')
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to reassign tenant')
      },
    }
  )

  // Reset form to initial state
  const resetForm = () => {
    setFormDefaultValues({})
    setEditingUser(null)
    setIsFormOpen(false)
    setSelectedImage(null)
    setImagePreview(null)
    setSelectedBioFile(null)
  }

  // Handle edit user
  const handleEdit = async (user: User) => {
    setEditingUser(user)

    // Fetch custom field values for this user
    const userCustomFields: Record<string, unknown> = {}
    try {
      const response = await api.get(`/custom-fields/values/${user.id}?entityType=USER`)
      const values = response.data.data || response.data || []
      values.forEach((fieldValue: { customFieldId: string; value: unknown }) => {
        const field = customFields.find(f => f.id === fieldValue.customFieldId)
        if (field) {
          userCustomFields[field.key] = fieldValue.value
        }
      })
    } catch (error) {
      console.error('Failed to fetch custom field values:', error)
    }

    setFormDefaultValues({
      name: user.name,
      preferredName: user.preferredName || '',
      email: user.email,
      password: '',
      role: user.role,
      gender: user.gender || '',
      pronouns: user.pronouns || '',
      phone: user.phone || '',
      bio: user.bio || '',
      imagePath: '',
      isActive: user.isActive,
      contestantNumber: user.contestant?.contestantNumber != null
        ? String(user.contestant.contestantNumber)
        : '',
      customFields: userCustomFields,
    })
    setIsFormOpen(true)
  }

  // Handle delete user
  const handleDelete = (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('You cannot delete your own account!')
      return
    }
    setConfirmDelete({ isOpen: true, user })
  }

  const executeDelete = () => {
    if (confirmDelete.user) {
      deleteMutation.mutate(confirmDelete.user.id)
    }
    setConfirmDelete({ isOpen: false, user: null })
  }

  // Handle toggle user active status
  const handleToggleStatus = (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('You cannot deactivate your own account!')
      return
    }
    toggleStatusMutation.mutate({ userId: user.id, isActive: !user.isActive })
  }

  // Handle reset password
  const handleResetPassword = (userId: string) => {
    setResetPasswordUserId(userId)
    setNewPassword('')
    setIsResetPasswordOpen(true)
  }

  const handleSubmitResetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }
    resetPasswordMutation.mutate({ id: resetPasswordUserId, password: newPassword })
  }

  // Handle tenant reassignment
  const handleTenantReassign = (userId: string) => {
    setTenantReassignUserId(userId)
    setSelectedTenantId('')
    setIsTenantModalOpen(true)
  }

  const handleSubmitTenantReassign = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenantId) {
      toast.error('Please select a tenant')
      return
    }
    tenantReassignMutation.mutate({ userId: tenantReassignUserId, tenantId: selectedTenantId })
  }

  // Handle user selection
  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleSelectAll = () => {
    setSelectedUsers((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        // Deselect only currently visible/filtered users.
        visibleUserIds.forEach((id) => next.delete(id))
      } else {
        // Select all currently visible/filtered users.
        visibleUserIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  // Handle bulk delete
  const handleBulkDelete = () => {
    const selectedIds = Array.from(selectedUsers).filter(id => id !== currentUser?.id)
    if (selectedIds.length === 0) {
      toast.error('No users selected for deletion (you cannot delete yourself)')
      return
    }
    setConfirmBulkDelete(true)
  }

  const executeBulkDelete = () => {
    const selectedIds = Array.from(selectedUsers).filter(id => id !== currentUser?.id)
    bulkDeleteMutation.mutate(selectedIds)
    setConfirmBulkDelete(false)
  }

  // Handle form submit — receives validated data from UserForm
  const handleSubmit = (data: UserFormData) => {
    if (editingUser) {
      const updateData = { ...data }
      if (!updateData.password) {
        delete (updateData as Partial<UserFormData>).password
      }
      updateMutation.mutate({ id: editingUser.id, data: updateData })
    } else {
      createMutation.mutate(data)
    }
  }

  // Handle create user button
  const handleCreateUser = () => {
    resetForm()
    setIsFormOpen(true)
  }

  // Filter users
  const filteredUsers = Array.isArray(users) ? users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.preferredName?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = roleFilter ? user.role === roleFilter : true

    const matchesActive = activeFilter === 'all' ? true :
                          activeFilter === 'active' ? user.isActive : !user.isActive

    const matchesTenant = tenantFilter ? user.tenant?.id === tenantFilter : true

    return matchesSearch && matchesRole && matchesActive && matchesTenant
  }) : []

  const visibleUserIds = filteredUsers.map((u) => u.id)
  const selectedVisibleCount = visibleUserIds.filter((id) => selectedUsers.has(id)).length
  const allVisibleSelected = visibleUserIds.length > 0 && selectedVisibleCount === visibleUserIds.length
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected

  // Check if any filters are active
  const hasActiveFilters = !!(searchQuery || roleFilter || activeFilter !== 'all' || tenantFilter)

  // Render access denied
  if (!canManageUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You don't have permission to manage users.
          </p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="cgr-page-container">
          <Card className="bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
            <p className="text-red-800 dark:text-red-200 mb-4">{String(error)}</p>
            <Button variant="danger" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="cgr-page-container">
        {/* Header */}
        <PageHeader
          title="Users"
          subtitle="Manage user accounts and permissions"
          icon={UsersIcon}
          actions={(
            <UserBulkActions
              selectedCount={selectedUsers.size}
              isDeleting={bulkDeleteMutation.isLoading}
              onBulkDelete={handleBulkDelete}
              onCreateUser={handleCreateUser}
            />
          )}
        />

        {/* Filters */}
        <UserFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          activeFilter={activeFilter}
          onActiveFilterChange={setActiveFilter}
          tenantFilter={tenantFilter}
          onTenantFilterChange={setTenantFilter}
          dateFilters={dateFilters}
          onDateFiltersChange={setDateFilters}
          isSuperAdmin={isSuperAdmin}
          tenants={tenants}
        />

        {/* Users Table */}
        <UserTable
          users={filteredUsers}
          isLoading={isLoading}
          selectedUsers={selectedUsers}
          currentUserId={currentUser?.id}
          isSuperAdmin={isSuperAdmin}
          hasActiveFilters={hasActiveFilters}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onResetPassword={handleResetPassword}
          onTenantReassign={handleTenantReassign}
          onSelectUser={handleSelectUser}
          onSelectAll={handleSelectAll}
          allVisibleSelected={allVisibleSelected}
          someVisibleSelected={someVisibleSelected}
          visibleCount={visibleUserIds.length}
          onToggleStatus={handleToggleStatus}
        />

        {/* User Form Modal */}
        <UserForm
          isOpen={isFormOpen}
          editingUser={editingUser}
          defaultValues={formDefaultValues}
          customFields={customFields}
          loadingCustomFields={loadingCustomFields}
          selectedImage={selectedImage}
          onImageSelect={setSelectedImage}
          imagePreview={imagePreview}
          onImagePreviewChange={setImagePreview}
          selectedBioFile={selectedBioFile}
          onBioFileSelect={setSelectedBioFile}
          isSubmitting={createMutation.isLoading || updateMutation.isLoading}
          onSubmit={handleSubmit}
          onClose={resetForm}
        />

        {/* Reset Password Modal */}
        <ResetPasswordModal
          isOpen={isResetPasswordOpen}
          password={newPassword}
          onPasswordChange={setNewPassword}
          isLoading={resetPasswordMutation.isLoading}
          onSubmit={handleSubmitResetPassword}
          onClose={() => setIsResetPasswordOpen(false)}
        />

        {/* Tenant Reassign Modal (SUPER_ADMIN only) */}
        {isSuperAdmin && (
          <TenantReassignModal
            isOpen={isTenantModalOpen}
            tenants={tenants}
            selectedTenantId={selectedTenantId}
            onTenantChange={setSelectedTenantId}
            isLoading={tenantReassignMutation.isLoading}
            onSubmit={handleSubmitTenantReassign}
            onClose={() => setIsTenantModalOpen(false)}
          />
        )}

        {/* Delete User Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmDelete.isOpen}
          onClose={() => setConfirmDelete({ isOpen: false, user: null })}
          onConfirm={executeDelete}
          title="Delete User"
          message={`Are you sure you want to delete user "${confirmDelete.user?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          loading={deleteMutation.isLoading}
        />

        {/* Bulk Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmBulkDelete}
          onClose={() => setConfirmBulkDelete(false)}
          onConfirm={executeBulkDelete}
          title="Delete Selected Users"
          message={`Are you sure you want to delete ${Array.from(selectedUsers).filter(id => id !== currentUser?.id).length} user(s)? This action cannot be undone.`}
          confirmText="Delete All"
          variant="danger"
          loading={bulkDeleteMutation.isLoading}
        />
      </div>
    </div>
  )
}

export default UsersPage
