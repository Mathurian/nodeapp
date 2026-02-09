import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { usersAPI, api } from '../services/api'
import {
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
  KeyIcon,
  FunnelIcon,
  ShieldCheckIcon,
  ArrowsRightLeftIcon,
  PhotoIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline'
import { format, parseISO } from 'date-fns'
import DateFilterControls, { DateFilters } from '../components/DateFilterControls'
import { ConfirmModal } from '../components/ui'

interface User {
  id: string
  name: string
  preferredName: string | null
  email: string
  role: string
  gender: string | null
  pronouns?: string | null
  phone: string | null
  bio?: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  judgeId: string | null
  contestantId: string | null
  tenant?: {
    id: string
    name: string
    slug: string
  }
}

interface UserFormData {
  name: string
  preferredName: string
  email: string
  password: string
  role: string
  gender: string
  pronouns: string
  phone: string
  bio: string
  imagePath: string
  isActive: boolean
  customFields?: Record<string, any>
}

interface CustomField {
  id: string
  name: string
  label: string
  key: string
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN' | 'TEXT_AREA' | 'EMAIL' | 'PHONE' | 'URL'
  entityType: string
  required: boolean
  options?: string[]
  defaultValue?: string
  validation?: any
  order: number
}

const ROLES = [
  { value: 'ADMIN', label: 'Admin', color: 'bg-red-100 text-red-800' },
  { value: 'ORGANIZER', label: 'Organizer', color: 'bg-purple-100 text-purple-800' },
  { value: 'JUDGE', label: 'Judge', color: 'bg-blue-100 text-blue-800' },
  { value: 'CONTESTANT', label: 'Contestant', color: 'bg-green-100 text-green-800' },
  { value: 'EMCEE', label: 'Emcee', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'TALLY_MASTER', label: 'Tally Master', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'AUDITOR', label: 'Auditor', color: 'bg-pink-100 text-pink-800' },
  { value: 'BOARD', label: 'Board', color: 'bg-orange-100 text-orange-800' },
]

interface Tenant {
  id: string
  name: string
}

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [tenantFilter, setTenantFilter] = useState<string>('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string>('')
  const [newPassword, setNewPassword] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false)
  const [tenantReassignUserId, setTenantReassignUserId] = useState<string>('')
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [dateFilters, setDateFilters] = useState<DateFilters>({
    sortDirection: 'asc',
  })
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    preferredName: '',
    email: '',
    password: '',
    role: 'CONTESTANT',
    gender: '',
    pronouns: '',
    phone: '',
    bio: '',
    imagePath: '',
    isActive: true,
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedBioFile, setSelectedBioFile] = useState<File | null>(null)
  const bioFileInputRef = useRef<HTMLInputElement>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [loadingCustomFields, setLoadingCustomFields] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null,
  })
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

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
        setCustomFields(fieldsArray.sort((a, b) => a.order - b.order))
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
      const params: any = {
        includeInactive: true, // Always include inactive users for management purposes
      }

      // Add date filters if set
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
      // Backend returns { success: true, data: users }
      // response.data gives us { success, data, ... }, so we extract .data
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

  // Create user mutation
  const createMutation = useMutation(
    async (data: UserFormData) => {
      const response = await usersAPI.create(data)
      return response.data
    },
    {
      onSuccess: async (data) => {
        queryClient.invalidateQueries('users')
        const userId = data.data?.id

        // Save custom field values
        if (userId && formData.customFields) {
          try {
            await api.post('/custom-fields/values/bulk', {
              entityId: userId,
              values: formData.customFields,
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
      onError: (error: any) => {
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
      onSuccess: async (data) => {
        queryClient.invalidateQueries('users')
        const userId = data.userId

        // Save custom field values
        if (userId && formData.customFields) {
          try {
            await api.post('/custom-fields/values/bulk', {
              entityId: userId,
              values: formData.customFields,
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
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update user'
        toast.error(`Error updating user: ${errorMessage}`)
      },
    }
  )

  // Delete user mutation
  const deleteMutation = useMutation(
    async (id: string) => {
      const response = await usersAPI.delete(id)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users')
        toast.success('User deleted successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete user'
        toast.error(`Error deleting user: ${errorMessage}`)
      },
    }
  )

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
      onError: (error: any) => {
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
      onError: (error: any) => {
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
      onError: (error: any) => {
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
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete users'
        toast.error(`Error deleting users: ${errorMessage}`)
      },
    }
  )

  // Fetch tenants for SUPER_ADMIN
  const { data: tenants = [], error: tenantsError } = useQuery<Tenant[]>(
    'tenants',
    async () => {
      const response = await api.get('/tenants')
      const data = response.data
      // Backend returns { tenants: [], total } format
      const tenantsArray = data.tenants || data.data || data
      return Array.isArray(tenantsArray) ? tenantsArray : []
    },
    {
      enabled: isSuperAdmin,
      retry: 1,
      onError: (err) => console.error('Fetch tenants failed:', err),
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
      onError: (error: any) => {
        toast.error(error.message || 'Failed to reassign tenant')
      },
    }
  )

  const resetForm = () => {
    // Initialize custom fields with default values
    const initialCustomFields: Record<string, any> = {}
    customFields.forEach(field => {
      initialCustomFields[field.key] = field.defaultValue || ''
    })

    setFormData({
      name: '',
      preferredName: '',
      email: '',
      password: '',
      role: 'CONTESTANT',
      gender: '',
      pronouns: '',
      phone: '',
      bio: '',
      imagePath: '',
      isActive: true,
      customFields: initialCustomFields,
    })
    setEditingUser(null)
    setIsFormOpen(false)
    setSelectedImage(null)
    setImagePreview(null)
    setSelectedBioFile(null)
  }

  const handleEdit = async (user: User) => {
    setEditingUser(user)

    // Fetch custom field values for this user
    const userCustomFields: Record<string, any> = {}
    try {
      const response = await api.get(`/custom-fields/values/${user.id}?entityType=USER`)
      const values = response.data.data || response.data || []
      values.forEach((fieldValue: any) => {
        const field = customFields.find(f => f.id === fieldValue.customFieldId)
        if (field) {
          userCustomFields[field.key] = fieldValue.value
        }
      })
    } catch (error) {
      console.error('Failed to fetch custom field values:', error)
    }

    setFormData({
      name: user.name,
      preferredName: user.preferredName || '',
      email: user.email,
      password: '', // Don't populate password for security
      role: user.role,
      gender: user.gender || '',
      pronouns: user.pronouns || '',
      phone: user.phone || '',
      bio: user.bio || '',
      imagePath: '',
      isActive: user.isActive,
      customFields: userCustomFields,
    })
    setIsFormOpen(true)
  }

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

  const handleResetPassword = (userId: string) => {
    setResetPasswordUserId(userId)
    setNewPassword('')
    setIsResetPasswordOpen(true)
  }

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
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
    }
  }

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

  const handleTenantReassign = (userId: string) => {
    setTenantReassignUserId(userId)
    setSelectedTenantId('')
    setIsTenantModalOpen(true)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }
      setSelectedImage(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type (PDF, DOC, DOCX, TXT)
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ]
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a PDF, DOC, DOCX, or TXT file')
        return
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Bio file size must be less than 10MB')
        return
      }
      setSelectedBioFile(file)
      toast.success(`Bio file "${file.name}" selected`)
    }
  }

  const handleSubmitTenantReassign = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenantId) {
      toast.error('Please select a tenant')
      return
    }
    tenantReassignMutation.mutate({ userId: tenantReassignUserId, tenantId: selectedTenantId })
  }

  const handleSubmitResetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }
    resetPasswordMutation.mutate({ id: resetPasswordUserId, password: newPassword })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.role) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!editingUser && !formData.password) {
      toast.error('Password is required for new users')
      return
    }

    if (formData.password && formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    if (editingUser) {
      // Don't send password if it's empty (user doesn't want to change it)
      const updateData = { ...formData }
      if (!updateData.password) {
        delete (updateData as any).password
      }
      updateMutation.mutate({ id: editingUser.id, data: updateData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const getRoleBadge = (role: string) => {
    const roleInfo = ROLES.find(r => r.value === role)
    return roleInfo ? (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
        {roleInfo.label}
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {role}
      </span>
    )
  }

  // Render custom field input based on field type
  const renderCustomFieldInput = (field: CustomField) => {
    const value = formData.customFields?.[field.key] || ''
    const onChange = (newValue: any) => {
      setFormData({
        ...formData,
        customFields: {
          ...formData.customFields,
          [field.key]: newValue,
        },
      })
    }

    const baseClassName = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"

    switch (field.type) {
      case 'TEXT':
      case 'EMAIL':
      case 'PHONE':
      case 'URL':
        return (
          <input
            type={field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : field.type === 'URL' ? 'url' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClassName}
            placeholder={field.defaultValue || ''}
          />
        )
      case 'NUMBER':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClassName}
            placeholder={field.defaultValue || ''}
          />
        )
      case 'DATE':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClassName}
          />
        )
      case 'TEXT_AREA':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            rows={3}
            className={baseClassName}
            placeholder={field.defaultValue || ''}
          />
        )
      case 'SELECT':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClassName}
          >
            <option value="">Select...</option>
            {Array.isArray(field.options) && field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )
      case 'BOOLEAN':
        return (
          <input
            type="checkbox"
            checked={value === true || value === 'true'}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
        )
      case 'MULTI_SELECT':
        const multiValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {Array.isArray(field.options) && field.options.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={multiValues.includes(option)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...multiValues, option])
                    } else {
                      onChange(multiValues.filter((v: string) => v !== option))
                    }
                  }}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        )
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClassName}
          />
        )
    }
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

  if (!canManageUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
            You don't have permission to manage users.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
            <p className="text-red-800 dark:text-red-200 mb-4">{String(error)}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">
              Reload Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <UsersIcon className="h-8 w-8 mr-3 text-blue-600" />
              Users
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
              Manage user accounts and permissions
            </p>
          </div>
          <div className="flex gap-2">
            {selectedUsers.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center"
              >
                <TrashIcon className="h-5 w-5 mr-2" />
                Delete Selected ({selectedUsers.size})
              </button>
            )}
            <button
              onClick={() => {
                resetForm()
                setIsFormOpen(true)
              }}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create User
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            {/* Active Filter */}
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {/* Tenant Filter (SUPER_ADMIN only) */}
            {isSuperAdmin && (
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Tenants</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date Filter Controls */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <DateFilterControls
              filters={dateFilters}
              onFilterChange={setDateFilters}
              onClear={() => setDateFilters({ sortDirection: 'asc' })}
            />
          </div>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Loading users...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <caption className="sr-only">List of users with their roles, status, and available actions</caption>
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      aria-label="Select all users"
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  {isSuperAdmin && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={user.id === currentUser?.id}
                      />
                    </td>
                    <th scope="row" className="px-6 py-4 whitespace-nowrap font-normal">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                      {user.preferredName && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{user.preferredName}</div>
                      )}
                    </th>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                      {user.phone && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{user.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.tenant ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.tenant.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">/{user.tenant.slug}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      {user.lastLoginAt
                        ? format(parseISO(user.lastLoginAt), 'MMM d, yyyy')
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-900"
                          aria-label={`Edit user ${user.name}`}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                          aria-label={`Reset password for ${user.name}`}
                        >
                          <KeyIcon className="h-5 w-5" />
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleTenantReassign(user.id)}
                            className="text-purple-600 hover:text-purple-900"
                            aria-label={`Move ${user.name} to different tenant`}
                          >
                            <ArrowsRightLeftIcon className="h-5 w-5" />
                          </button>
                        )}
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(user)}
                            className="text-red-600 hover:text-red-900"
                            aria-label={`Delete user ${user.name}`}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              {searchQuery || roleFilter || activeFilter !== 'all' || tenantFilter
                ? 'No users found matching your filters'
                : 'No users yet. Create your first user to get started.'}
            </p>
          </div>
        )}

        {/* Create/Edit Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingUser ? 'Edit User' : 'Create New User'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500" aria-label="Close dialog">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Preferred Name
                    </label>
                    <input
                      type="text"
                      value={formData.preferredName}
                      onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password {!editingUser && <span className="text-red-500">*</span>}
                    {editingUser && <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs ml-1">(leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Min 8 characters"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Gender
                    </label>
                    <input
                      type="text"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Male, Female, Non-binary, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Pronouns
                    </label>
                    <input
                      type="text"
                      value={formData.pronouns}
                      onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., he/him, she/her, they/them"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter a brief bio or description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4">
                    {imagePreview && (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-24 h-24 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null)
                            setImagePreview(null)
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          aria-label="Remove selected image"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <PhotoIcon className="h-5 w-5" />
                        {imagePreview ? 'Change Image' : 'Select Image'}
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Max 5MB. Supports JPG, PNG, GIF
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bio File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bio File (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    {selectedBioFile && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                        <DocumentIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm text-blue-700 dark:text-blue-300">{selectedBioFile.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBioFile(null)
                            if (bioFileInputRef.current) {
                              bioFileInputRef.current.value = ''
                            }
                          }}
                          className="ml-2 text-red-500 hover:text-red-700"
                          aria-label="Remove selected bio file"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={bioFileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        onChange={handleBioFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => bioFileInputRef.current?.click()}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <DocumentIcon className="h-5 w-5" />
                        {selectedBioFile ? 'Change Bio File' : 'Select Bio File'}
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Max 10MB. Supports PDF, DOC, DOCX, TXT
                      </p>
                    </div>
                  </div>
                </div>

                {/* Custom Fields Section */}
                {customFields.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      Custom Fields
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {customFields.length}
                      </span>
                    </h3>
                    <div className="space-y-4">
                      {customFields.map((field) => (
                        <div key={field.id}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                            {field.type && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                {field.type}
                              </span>
                            )}
                          </label>
                          {renderCustomFieldInput(field)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                    Active Account
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:bg-gray-600 flex items-center justify-center"
                  >
                    {createMutation.isLoading || updateMutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-5 w-5 mr-2" />
                        {editingUser ? 'Update User' : 'Create User'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {isResetPasswordOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl mx-4 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
                <button
                  onClick={() => setIsResetPasswordOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500"
                  aria-label="Close reset password dialog"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Min 8 characters"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsResetPasswordOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetPasswordMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:bg-gray-600 flex items-center justify-center"
                  >
                    {resetPasswordMutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Resetting...
                      </>
                    ) : (
                      <>
                        <KeyIcon className="h-5 w-5 mr-2" />
                        Reset Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tenant Reassignment Modal (SUPER_ADMIN only) */}
        {isTenantModalOpen && isSuperAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl mx-4 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Move User to Tenant</h2>
                <button
                  onClick={() => setIsTenantModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500"
                  aria-label="Close tenant reassignment dialog"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitTenantReassign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Tenant <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a tenant...</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsTenantModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={tenantReassignMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center"
                  >
                    {tenantReassignMutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Moving...
                      </>
                    ) : (
                      <>
                        <ArrowsRightLeftIcon className="h-5 w-5 mr-2" />
                        Move User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
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
