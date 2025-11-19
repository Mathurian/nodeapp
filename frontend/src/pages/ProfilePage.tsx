import React, { useState } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { usersAPI } from '../services/api'
import {
  UserCircleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'

interface ProfileFormData {
  name: string
  preferredName: string
  email: string
  phone: string
  gender: string
  bio: string
}

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.name || '',
    preferredName: user?.preferredName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    bio: user?.bio || '',
  })
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
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
      const response = await usersAPI.update(user.id, {
        currentPassword: data.currentPassword,
        password: data.newPassword,
      })
      return response.data
    },
    {
      onSuccess: () => {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
        setIsChangingPassword(false)
        alert('Password changed successfully!')
      },
      onError: (error: any) => {
        alert(`Error changing password: ${error.message}`)
      },
    }
  )

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      preferredName: user?.preferredName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      gender: user?.gender || '',
      bio: user?.bio || '',
    })
    setIsEditing(false)
  }

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate(formData)
  }

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!')
      return
    }

    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters long')
      return
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <UserCircleIcon className="h-8 w-8 mr-3 text-blue-600" />
            My Profile
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
            Manage your personal information and account settings
          </p>
        </div>

        {/* Profile Information */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center"
              >
                <PencilIcon className="h-5 w-5 mr-2" />
                Edit Profile
              </button>
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
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

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
                >
                  <XMarkIcon className="h-5 w-5 mr-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center justify-center"
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
                </button>
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
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security</h2>
            {!isChangingPassword && (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center"
              >
                <KeyIcon className="h-5 w-5 mr-2" />
                Change Password
              </button>
            )}
          </div>

          {isChangingPassword ? (
            <form onSubmit={handleSubmitPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min 8 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Re-enter new password"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    })
                    setIsChangingPassword(false)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
                >
                  <XMarkIcon className="h-5 w-5 mr-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center justify-center"
                >
                  {changePasswordMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Changing...
                    </>
                  ) : (
                    <>
                      <KeyIcon className="h-5 w-5 mr-2" />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
              <p>Use a strong password to keep your account secure.</p>
              <p className="mt-2">Password must be at least 8 characters long.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
