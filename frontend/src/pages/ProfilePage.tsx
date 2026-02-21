import React, { useState, useRef } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../contexts/AuthContext'
import { useTheme, type Theme } from '../contexts/ThemeContext'
import { usersAPI } from '../services/api'
import {
  UserCircleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  KeyIcon,
  PhotoIcon,
  TrashIcon,
  ComputerDesktopIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { FormProvider, FormInput, FormSubmitButton } from '../components/form'
import { changePasswordSchema, ChangePasswordInput } from '../lib/validation'
import { Button, Card, PageHeader } from '../components/ui'

interface ProfileFormData {
  name: string
  preferredName: string
  email: string
  phone: string
  gender: string
  pronouns: string
  bio: string
}


const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const { theme, actualTheme, setTheme } = useTheme()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.name || '',
    preferredName: user?.preferredName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    pronouns: user?.pronouns || '',
    bio: user?.bio || '',
  })
  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  // Update profile mutation
  const updateProfileMutation = useMutation(
    async (data: ProfileFormData) => {
      if (!user?.id) throw new Error('User not found')
      const response = await usersAPI.updateProfile(user.id, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('auth-user')
        refreshUser?.()
        setIsEditing(false)
        alert('Profile updated successfully!')
      },
      onError: (error: any) => {
        alert(`Error updating profile: ${error.message}`)
      },
    }
  )

  // Change password mutation
  const changePasswordMutation = useMutation(
    async (data: { currentPassword: string; newPassword: string }) => {
      if (!user?.id) throw new Error('User not found')
      const response = await usersAPI.changePassword(user.id, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      return response.data
    },
    {
      onSuccess: () => {
        passwordForm.reset()
        setIsChangingPassword(false)
        toast.success('Password changed successfully!')
      },
      onError: (error: any) => {
        toast.error(`Error changing password: ${error.message}`)
      },
    }
  )

  // Upload image mutation
  const uploadImageMutation = useMutation(
    async (file: File) => {
      if (!user?.id) throw new Error('User not found')
      const formData = new FormData()
      formData.append('image', file)
      const response = await usersAPI.uploadImage(user.id, formData)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('auth-user')
        refreshUser?.()
        setSelectedImage(null)
        setImagePreview(null)
        toast.success('Profile image uploaded successfully!')
      },
      onError: (error: any) => {
        toast.error(`Error uploading image: ${error.message}`)
      },
    }
  )

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

  const handleUploadImage = () => {
    if (selectedImage) {
      uploadImageMutation.mutate(selectedImage)
    }
  }

  const handleCancelImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      preferredName: user?.preferredName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      gender: user?.gender || '',
      pronouns: user?.pronouns || '',
      bio: user?.bio || '',
    })
    setIsEditing(false)
  }

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate(formData)
  }

  const handleSubmitPassword = (data: ChangePasswordInput) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    })
  }

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      ADMIN: 'bg-red-100 text-red-800',
      ORGANIZER: 'bg-purple-100 text-purple-800',
      JUDGE: 'bg-blue-100 text-blue-800',
      CONTESTANT: 'bg-green-100 text-green-800',
      EMCEE: 'bg-yellow-100 text-yellow-800',
      TALLY_MASTER: 'bg-indigo-100 text-indigo-800',
      AUDITOR: 'bg-pink-100 text-pink-800',
      BOARD: 'bg-orange-100 text-orange-800',
    }
    const colorClass = roleColors[role] || 'bg-gray-100 text-gray-800'
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
        {role.replace('_', ' ')}
      </span>
    )
  }

  return (
    <div className="cgr-page-container">
        {/* Header */}
        <PageHeader
          title="My Profile"
          subtitle="Manage your personal information and account settings"
          icon={UserCircleIcon}
        />

        <Card className="rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px,1fr]">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme Preference
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="auto">Auto (System)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <ComputerDesktopIcon className="h-4 w-4" />
                Preference: {theme}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                {actualTheme === 'dark' ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
                Active: {actualTheme}
              </span>
            </div>
          </div>
        </Card>

        {/* Profile Image */}
        <Card className="rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Profile Image</h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Current Image Display */}
            <div className="flex-shrink-0">
              {user?.imagePath || imagePreview ? (
                <img
                  src={imagePreview || user?.imagePath}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <UserCircleIcon className="w-20 h-20 text-gray-400 dark:text-gray-500" />
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Upload a profile image. Recommended size: 400x400px. Max file size: 5MB.
              </p>

              {selectedImage ? (
                <div className="space-y-3">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Selected: {selectedImage.name}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleUploadImage}
                      disabled={uploadImageMutation.isLoading}
                    >
                      {uploadImageMutation.isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-5 w-5 mr-2" />
                          Upload Image
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancelImage}
                      disabled={uploadImageMutation.isLoading}
                      variant="secondary"
                    >
                      <XMarkIcon className="h-5 w-5 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                  >
                    <PhotoIcon className="h-5 w-5 mr-2" />
                    Choose Image
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Profile Information */}
        <Card className="rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Information</h2>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
              >
                <PencilIcon className="h-5 w-5 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmitProfile} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pronouns
                </label>
                <input
                  type="text"
                  value={formData.pronouns}
                  onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., he/him, she/her, they/them, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="cgr-form-actions">
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="secondary"
                  className="w-full sm:flex-1 justify-center"
                >
                  <XMarkIcon className="h-5 w-5 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isLoading}
                  className="w-full sm:flex-1 justify-center"
                >
                  {updateProfileMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-5 w-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Full Name</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{user?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Preferred Name</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{user?.preferredName || 'Not set'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Email</p>
                <p className="mt-1 text-gray-900 dark:text-white">{user?.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Phone</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{user?.phone || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Gender</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{user?.gender || 'Not set'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Pronouns</p>
                <p className="mt-1 text-gray-900 dark:text-white">{user?.pronouns || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Role</p>
                <div className="mt-1">{getRoleBadge(user?.role || '')}</div>
              </div>
              {user?.bio && (
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Bio</p>
                  <p className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">{user.bio}</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Change Password */}
        <Card className="rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security</h2>
            {!isChangingPassword && (
              <Button
                onClick={() => setIsChangingPassword(true)}
                variant="secondary"
              >
                <KeyIcon className="h-5 w-5 mr-2" />
                Change Password
              </Button>
            )}
          </div>

          {isChangingPassword ? (
            <FormProvider form={passwordForm} onSubmit={handleSubmitPassword} className="space-y-4">
              <FormInput
                name="currentPassword"
                label="Current Password"
                type="password"
                autoComplete="current-password"
                required
              />
              <FormInput
                name="newPassword"
                label="New Password"
                type="password"
                autoComplete="new-password"
                placeholder="Min 8 characters, with uppercase, number, and symbol"
                required
              />
              <FormInput
                name="confirmPassword"
                label="Confirm New Password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter new password"
                required
              />
              <div className="cgr-form-actions">
                <Button
                  type="button"
                  onClick={() => {
                    passwordForm.reset()
                    setIsChangingPassword(false)
                  }}
                  variant="secondary"
                  className="w-full sm:flex-1 justify-center"
                >
                  <XMarkIcon className="h-5 w-5 mr-2" />
                  Cancel
                </Button>
                <FormSubmitButton
                  loading={changePasswordMutation.isLoading}
                  className="w-full sm:flex-1 sm:!w-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <KeyIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                  Change Password
                </FormSubmitButton>
              </div>
            </FormProvider>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
              <p>Use a strong password to keep your account secure.</p>
              <p className="mt-2">Password must be at least 8 characters long.</p>
            </div>
          )}
        </Card>
    </div>
  )
}

export default ProfilePage
