import React, { useRef, useState } from 'react'
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
import { User, UserFormData, CustomField, ROLES } from './types'
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
  gender: z.string().optional(),
  pronouns: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  isActive: z.boolean(),
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
  imageUploadState,
  bioUploadState,
  onCancelImageUpload,
  onCancelBioUpload,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
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
  } = useForm<UserFormFields>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      preferredName: defaultValues?.preferredName ?? '',
      email: defaultValues?.email ?? '',
      password: '',
      role: defaultValues?.role ?? 'CONTESTANT',
      gender: defaultValues?.gender ?? '',
      pronouns: defaultValues?.pronouns ?? '',
      phone: defaultValues?.phone ?? '',
      bio: defaultValues?.bio ?? '',
      isActive: defaultValues?.isActive ?? true,
    },
  })

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

  /**
   * Render custom field input based on field type
   */
  const renderCustomFieldInput = (field: CustomField) => {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'}`}
                aria-invalid={errors.name ? 'true' : undefined}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600" role="alert">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Name
              </label>
              <input
                type="text"
                {...register('preferredName')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              {...register('email')}
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'}`}
              aria-invalid={errors.email ? 'true' : undefined}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600" role="alert">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password {!editingUser && <span className="text-red-500">*</span>}
              {editingUser && <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">(leave blank to keep current)</span>}
            </label>
            <input
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                {...register('role')}
                className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${errors.role ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'}`}
                aria-invalid={errors.role ? 'true' : undefined}
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && <p className="mt-1 text-xs text-red-600" role="alert">{errors.role.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gender
              </label>
              <input
                type="text"
                {...register('gender')}
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
                {...register('pronouns')}
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
                {...register('phone')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bio
            </label>
            <textarea
              {...register('bio')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter a brief bio or description..."
            />
          </div>

          {/* Profile Picture Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isAnyUploading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isAnyUploading}
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
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
