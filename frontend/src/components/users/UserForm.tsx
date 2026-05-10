import React, { useRef, useState, useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  XMarkIcon,
  CheckIcon,
  PhotoIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { User, UserFormData, CustomField, ROLES, ContestantPrivateDocument } from './types'
import UploadProgress, { UploadStatus } from '../ui/UploadProgress'
import { emailSchema, nameSchema, passwordSchema } from '../../lib/validation'

export interface FileUploadState {
  /** Upload progress percentage (0-100) */
  progress: number
  /** Current upload status */
  status: UploadStatus
  /** Error message if upload failed */
  error?: string
}

export interface UserFormProps {
  /** Whether the form modal is open */
  isOpen: boolean
  /** User being edited (null for create mode) */
  editingUser: User | null
  /** Initial values for edit mode (derived from editingUser in parent) */
  defaultValues?: Partial<UserFormData>
  /** Available custom fields */
  customFields: CustomField[]
  /** Whether custom fields are loading */
  loadingCustomFields: boolean
  /** Selected image file for upload */
  selectedImage: File | null
  /** Callback when image is selected */
  onImageSelect: (file: File | null) => void
  /** Image preview URL */
  imagePreview: string | null
  /** Callback when image preview changes */
  onImagePreviewChange: (preview: string | null) => void
  /** Selected bio file for upload */
  selectedBioFile: File | null
  /** Callback when bio file is selected */
  onBioFileSelect: (file: File | null) => void
  /** Selected private contestant files for upload */
  selectedContestantPrivateFiles: File[]
  /** Callback when private contestant files change */
  onContestantPrivateFilesChange: (files: File[]) => void
  /** Existing stored private contestant documents */
  existingContestantPrivateDocuments: ContestantPrivateDocument[]
  /** Remove an existing stored private contestant document */
  onDeleteContestantPrivateDocument?: (fileId: string) => void
  /** Download an existing stored private contestant document */
  onDownloadContestantPrivateDocument?: (fileId: string, originalName: string) => void
  /** Image upload progress state */
  imageUploadState?: FileUploadState
  /** Bio file upload progress state */
  bioUploadState?: FileUploadState
  /** Callback to cancel image upload */
  onCancelImageUpload?: () => void
  /** Callback to cancel bio file upload */
  onCancelBioUpload?: () => void
  /** Whether form is submitting */
  isSubmitting: boolean
  /** Current authenticated user role (used for role assignment restrictions) */
  currentUserRole?: string
  /** Whether the private contestant section should be shown */
  canManageContestantPrivateData?: boolean
  /** Callback when form is submitted with validated data */
  onSubmit: (data: UserFormData) => void
  /** Callback when form is closed/reset */
  onClose: () => void
}

// Zod schema — password required for create, optional for edit
const userFormSchema = z.object({
  name: nameSchema,
  preferredName: z.string().optional(),
  email: emailSchema,
  password: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  boardRole: z.string().max(100, 'Board role must be 100 characters or fewer').optional(),
  gender: z.string().optional(),
  pronouns: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  isActive: z.boolean(),
  contestantNumber: z.string().optional(),
  accommodations: z.string().optional(),
  privateNotes: z.string().optional(),
  recommendationNotes: z.string().optional(),
})

type UserFormFields = z.infer<typeof userFormSchema>

/**
 * UserForm component provides create/edit form for users.
 * Includes form validation, image upload with preview, bio file upload,
 * role selection, and custom fields rendering.
 */
const UserForm: React.FC<UserFormProps> = ({
  isOpen,
  editingUser,
  defaultValues,
  customFields,
  loadingCustomFields,
  selectedImage,
  onImageSelect,
  imagePreview,
  onImagePreviewChange,
  selectedBioFile,
  onBioFileSelect,
  selectedContestantPrivateFiles,
  onContestantPrivateFilesChange,
  existingContestantPrivateDocuments,
  onDeleteContestantPrivateDocument,
  onDownloadContestantPrivateDocument,
  imageUploadState,
  bioUploadState,
  onCancelImageUpload,
  onCancelBioUpload,
  isSubmitting,
  currentUserRole,
  canManageContestantPrivateData,
  onSubmit,
  onClose,
}) => {
  const idBase = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bioFileInputRef = useRef<HTMLInputElement>(null)
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>(
    (defaultValues?.customFields as Record<string, unknown>) ?? {}
  )

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    setError,
    reset,
    setValue,
    watch,
  } = useForm<UserFormFields>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      preferredName: defaultValues?.preferredName ?? '',
      email: defaultValues?.email ?? '',
      password: '',
      role: defaultValues?.role ?? 'CONTESTANT',
      boardRole: defaultValues?.boardRole ?? '',
      gender: defaultValues?.gender ?? '',
      pronouns: defaultValues?.pronouns ?? '',
      phone: defaultValues?.phone ?? '',
      bio: defaultValues?.bio ?? '',
      isActive: defaultValues?.isActive ?? true,
      contestantNumber: defaultValues?.contestantNumber ?? '',
      accommodations: defaultValues?.accommodations ?? '',
      privateNotes: defaultValues?.privateNotes ?? '',
      recommendationNotes: defaultValues?.recommendationNotes ?? '',
    },
  })

  // Repopulate form when defaultValues change (edit mode: different user selected)
  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name ?? '',
        preferredName: defaultValues.preferredName ?? '',
        email: defaultValues.email ?? '',
        password: '',
        role: defaultValues.role ?? 'CONTESTANT',
        boardRole: defaultValues.boardRole ?? '',
        gender: defaultValues.gender ?? '',
        pronouns: defaultValues.pronouns ?? '',
        phone: defaultValues.phone ?? '',
        bio: defaultValues.bio ?? '',
        isActive: defaultValues.isActive ?? true,
        contestantNumber: defaultValues.contestantNumber ?? '',
        accommodations: defaultValues.accommodations ?? '',
        privateNotes: defaultValues.privateNotes ?? '',
        recommendationNotes: defaultValues.recommendationNotes ?? '',
      })
    }
  }, [defaultValues, reset])

  const watchedRole = watch('role')
  const canAssignSuperAdmin = currentUserRole === 'SUPER_ADMIN'
  const visibleRoles = canAssignSuperAdmin
    ? ROLES
    : ROLES.filter((role) => role.value !== 'SUPER_ADMIN')

  useEffect(() => {
    if (!canAssignSuperAdmin && watchedRole === 'SUPER_ADMIN') {
      setValue('role', 'ADMIN', { shouldValidate: true, shouldDirty: true })
    }
  }, [canAssignSuperAdmin, watchedRole, setValue])

  useEffect(() => {
    if (watchedRole !== 'BOARD') {
      setValue('boardRole', '')
    }
  }, [watchedRole, setValue])

  const handleFormSubmit = (data: UserFormFields) => {
    // Password required for new users
    if (!editingUser && !data.password) {
      setError('password', { message: 'Password is required for new users' })
      return
    }
    // Password strength check if provided (edit mode)
    if (data.password) {
      const pwResult = passwordSchema.safeParse(data.password)
      if (!pwResult.success) {
        setError('password', { message: pwResult.error.issues[0]?.message ?? 'Invalid password' })
        return
      }
    }
    onSubmit({ ...data, customFields: customFieldValues } as UserFormData)
  }

  // Check if uploads are in progress
  const isImageUploading = imageUploadState?.status === 'uploading'
  const isBioUploading = bioUploadState?.status === 'uploading'
  const isAnyUploading = isImageUploading || isBioUploading

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
      onImageSelect(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        onImagePreviewChange(reader.result as string)
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
      onBioFileSelect(file)
      toast.success(`Bio file "${file.name}" selected`)
    }
  }

  const handleRemoveImage = () => {
    onImageSelect(null)
    onImagePreviewChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveBioFile = () => {
    onBioFileSelect(null)
    if (bioFileInputRef.current) {
      bioFileInputRef.current.value = ''
    }
  }

  const handleContestantPrivateFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(e.target.files || [])
    if (nextFiles.length === 0) {
      return
    }

    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    for (const file of nextFiles) {
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select TXT, PDF, DOC, or DOCX files')
        return
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error('Private document size must be less than 20MB')
        return
      }
    }

    onContestantPrivateFilesChange([...selectedContestantPrivateFiles, ...nextFiles])
  }

  const handleRemoveContestantPrivateFile = (index: number) => {
    onContestantPrivateFilesChange(selectedContestantPrivateFiles.filter((_, currentIndex) => currentIndex !== index))
  }

  /**
   * Render custom field input based on field type
   */
  const renderCustomFieldInput = (field: CustomField, inputId: string) => {
    const value = customFieldValues[field.key] || ''
    const onChange = (newValue: unknown) => {
      setCustomFieldValues(prev => ({
        ...prev,
        [field.key]: newValue,
      }))
    }

    const baseClassName = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"

    switch (field.type) {
      case 'TEXT':
      case 'EMAIL':
      case 'PHONE':
      case 'URL':
        return (
          <input
            id={inputId}
            type={field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : field.type === 'URL' ? 'url' : 'text'}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClassName}
            placeholder={field.defaultValue || ''}
          />
        )
      case 'NUMBER':
        return (
          <input
            id={inputId}
            type="number"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClassName}
            placeholder={field.defaultValue || ''}
          />
        )
      case 'DATE':
        return (
          <input
            id={inputId}
            type="date"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClassName}
          />
        )
      case 'TEXT_AREA':
        return (
          <textarea
            id={inputId}
            value={value as string}
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
            id={inputId}
            value={value as string}
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
            id={inputId}
            type="checkbox"
            checked={value === true || value === 'true'}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
        )
      case 'MULTI_SELECT': {
        const multiValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {Array.isArray(field.options) && field.options.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  id={`${inputId}-${option}`}
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
      }
      default:
        return (
          <input
            id={inputId}
            type="text"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClassName}
          />
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="cgr-modal-overlay">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editingUser ? 'Edit User' : 'Create New User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close dialog"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={rhfHandleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${idBase}-name`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id={`${idBase}-name`}
                type="text"
                {...register('name')}
                className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'}`}
                aria-invalid={errors.name ? 'true' : undefined}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600" role="alert">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor={`${idBase}-preferred-name`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Name
              </label>
              <input
                id={`${idBase}-preferred-name`}
                type="text"
                {...register('preferredName')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${idBase}-email`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id={`${idBase}-email`}
              type="email"
              {...register('email')}
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'}`}
              aria-invalid={errors.email ? 'true' : undefined}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600" role="alert">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor={`${idBase}-password`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password {!editingUser && <span className="text-red-500">*</span>}
              {editingUser && <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">(leave blank to keep current)</span>}
            </label>
            <input
              id={`${idBase}-password`}
              type="password"
              {...register('password')}
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'}`}
              placeholder={editingUser ? 'Leave blank to keep current' : 'Min 8 characters'}
              aria-invalid={errors.password ? 'true' : undefined}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600" role="alert">{errors.password.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${idBase}-role`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id={`${idBase}-role`}
                {...register('role')}
                className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${errors.role ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'}`}
                aria-invalid={errors.role ? 'true' : undefined}
              >
                {visibleRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && <p className="mt-1 text-xs text-red-600" role="alert">{errors.role.message}</p>}
            </div>
            <div>
              <label htmlFor={`${idBase}-gender`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gender
              </label>
              <input
                id={`${idBase}-gender`}
                type="text"
                {...register('gender')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Male, Female, Non-binary, etc."
              />
            </div>
          </div>

          {/* Contestant Number — only shown for CONTESTANT role */}
          {watchedRole === 'CONTESTANT' && (
            <div className="space-y-4">
              <div>
                <label htmlFor={`${idBase}-contestant-number`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contestant Number
                </label>
                <input
                  id={`${idBase}-contestant-number`}
                  type="number"
                  {...register('contestantNumber')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 1, 2, 3..."
                  min={1}
                />
              </div>

              {canManageContestantPrivateData && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-amber-900 dark:text-amber-100">
                      Private Contestant Profile
                    </h3>
                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                      These fields are intended for staff-only contestant accommodations, recommendation context, and internal notes.
                    </p>
                  </div>

                  <div>
                    <label htmlFor={`${idBase}-accommodations`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ADA / Access Accommodations
                    </label>
                    <textarea
                      id={`${idBase}-accommodations`}
                      {...register('accommodations')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Record accommodations or access needs for staff use."
                    />
                  </div>

                  <div>
                    <label htmlFor={`${idBase}-recommendation-notes`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Recommendation / Supporting Notes
                    </label>
                    <textarea
                      id={`${idBase}-recommendation-notes`}
                      {...register('recommendationNotes')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Capture recommendation highlights or supporting context."
                    />
                  </div>

                  <div>
                    <label htmlFor={`${idBase}-private-notes`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Internal Staff Notes
                    </label>
                    <textarea
                      id={`${idBase}-private-notes`}
                      {...register('privateNotes')}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add internal-only notes for admin and organizer workflows."
                    />
                  </div>

                  <div>
                    <label htmlFor={`${idBase}-private-documents`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Private Supporting Documents
                    </label>
                    <input
                      id={`${idBase}-private-documents`}
                      type="file"
                      multiple
                      accept=".txt,.pdf,.doc,.docx"
                      onChange={handleContestantPrivateFilesSelect}
                      className="block w-full text-sm text-gray-700 dark:text-gray-300"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      TXT, PDF, DOC, and DOCX files up to 20MB each.
                    </p>

                    {selectedContestantPrivateFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedContestantPrivateFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
                            <span className="text-gray-800 dark:text-gray-200">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveContestantPrivateFile(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {existingContestantPrivateDocuments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Existing Documents
                        </p>
                        {existingContestantPrivateDocuments.map((file) => (
                          <div key={file.id} className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
                            <button
                              type="button"
                              onClick={() => onDownloadContestantPrivateDocument?.(file.id, file.originalName)}
                              className="text-left text-blue-600 hover:text-blue-700"
                            >
                              {file.originalName}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteContestantPrivateDocument?.(file.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {watchedRole === 'BOARD' && (
            <div>
              <label htmlFor={`${idBase}-board-role`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Board Role
              </label>
              <input
                id={`${idBase}-board-role`}
                type="text"
                {...register('boardRole')}
                className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${errors.boardRole ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'}`}
                placeholder="e.g., President, Treasurer, Secretary"
                aria-invalid={errors.boardRole ? 'true' : undefined}
              />
              {errors.boardRole && <p className="mt-1 text-xs text-red-600" role="alert">{errors.boardRole.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${idBase}-pronouns`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pronouns
              </label>
              <input
                id={`${idBase}-pronouns`}
                type="text"
                {...register('pronouns')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., he/him, she/her, they/them"
              />
            </div>
            <div>
              <label htmlFor={`${idBase}-phone`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone
              </label>
              <input
                id={`${idBase}-phone`}
                type="tel"
                {...register('phone')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${idBase}-bio`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bio
            </label>
            <textarea
              id={`${idBase}-bio`}
              {...register('bio')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter a brief bio or description..."
            />
          </div>

          {/* Profile Picture Upload */}
          <div>
            <label htmlFor={`${idBase}-profile-picture`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Profile Picture
            </label>
            {/* Show upload progress when uploading */}
            {imageUploadState && imageUploadState.status !== 'idle' && selectedImage ? (
              <UploadProgress
                progress={imageUploadState.progress}
                fileName={selectedImage.name}
                fileSize={selectedImage.size}
                status={imageUploadState.status}
                onCancel={onCancelImageUpload}
                errorMessage={imageUploadState.error}
                className="mb-2"
              />
            ) : (
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
                      onClick={handleRemoveImage}
                      disabled={isSubmitting || isAnyUploading}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
                      aria-label="Remove selected image"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    id={`${idBase}-profile-picture`}
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={isSubmitting || isAnyUploading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || isAnyUploading}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PhotoIcon className="h-5 w-5" />
                    {imagePreview ? 'Change Image' : 'Select Image'}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Max 5MB. Supports JPG, PNG, GIF
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bio File Upload */}
          <div>
            <label htmlFor={`${idBase}-bio-file`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bio File (Optional)
            </label>
            {/* Show upload progress when uploading */}
            {bioUploadState && bioUploadState.status !== 'idle' && selectedBioFile ? (
              <UploadProgress
                progress={bioUploadState.progress}
                fileName={selectedBioFile.name}
                fileSize={selectedBioFile.size}
                status={bioUploadState.status}
                onCancel={onCancelBioUpload}
                errorMessage={bioUploadState.error}
                className="mb-2"
              />
            ) : (
              <div className="flex items-center gap-4">
                {selectedBioFile && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <DocumentIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">{selectedBioFile.name}</span>
                    <button
                      type="button"
                      onClick={handleRemoveBioFile}
                      disabled={isSubmitting || isAnyUploading}
                      className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                      aria-label="Remove selected bio file"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    id={`${idBase}-bio-file`}
                    ref={bioFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleBioFileSelect}
                    disabled={isSubmitting || isAnyUploading}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => bioFileInputRef.current?.click()}
                    disabled={isSubmitting || isAnyUploading}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DocumentIcon className="h-5 w-5" />
                    {selectedBioFile ? 'Change Bio File' : 'Select Bio File'}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Max 10MB. Supports PDF, DOC, DOCX, TXT
                  </p>
                </div>
              </div>
            )}
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
              {loadingCustomFields && (
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Loading custom field definitions...</p>
              )}
              <div className="space-y-4">
                {customFields.map((field) => (
                  <div key={field.id}>
                    {field.type === 'MULTI_SELECT' ? (
                      <fieldset>
                        <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                          {field.type && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              {field.type}
                            </span>
                          )}
                        </legend>
                        {renderCustomFieldInput(field, `${idBase}-custom-${field.id}`)}
                      </fieldset>
                    ) : (
                      <>
                        <label htmlFor={`${idBase}-custom-${field.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                          {field.type && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              {field.type}
                            </span>
                          )}
                        </label>
                        {renderCustomFieldInput(field, `${idBase}-custom-${field.id}`)}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Account Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('isActive')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              id="isActive"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-white">
              Active Account
            </label>
          </div>

          {/* Form Actions */}
          <div className="cgr-form-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={isAnyUploading}
              className="w-full sm:flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isAnyUploading}
              className="w-full sm:flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : isAnyUploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Uploading Files...
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
  )
}

export default UserForm
