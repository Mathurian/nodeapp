import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import {
  UserCircleIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface Contestant {
  id: string
  name: string
  bio: string | null
  imagePath: string | null
  gender: string | null
  pronouns: string | null
  contestantNumber: number | null
}

interface Judge {
  id: string
  name: string
  bio: string | null
  imagePath: string | null
  gender: string | null
  pronouns: string | null
  isHeadJudge: boolean
}

interface BioFormData {
  bio: string
  image: File | null
}

const BiosPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'contestants' | 'judges'>('contestants')
  const [searchQuery, setSearchQuery] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingContestant, setEditingContestant] = useState<Contestant | null>(null)
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formData, setFormData] = useState<BioFormData>({
    bio: '',
    image: null,
  })

  // Check permissions
  const canManageBios = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(currentUser?.role || '')

  // Fetch contestants
  const { data: contestants = [], isLoading: isLoadingContestants } = useQuery<Contestant[]>(
    'contestants-bios',
    async () => {
      const response = await api.get('/api/bios/contestants')
      const unwrapped = response.data.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      refetchInterval: 30000,
    }
  )

  // Fetch judges
  const { data: judges = [], isLoading: isLoadingJudges } = useQuery<Judge[]>(
    'judges-bios',
    async () => {
      const response = await api.get('/api/bios/judges')
      const unwrapped = response.data.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      refetchInterval: 30000,
    }
  )

  // Update contestant bio mutation
  const updateContestantMutation = useMutation(
    async ({ id, data }: { id: string; data: FormData }) => {
      const response = await api.put(`/api/bios/contestants/${id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contestants-bios')
        resetForm()
        toast.success('Contestant bio updated successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update bio'
        toast.error(`Error updating bio: ${errorMessage}`)
      },
    }
  )

  // Update judge bio mutation
  const updateJudgeMutation = useMutation(
    async ({ id, data }: { id: string; data: FormData }) => {
      const response = await api.put(`/api/bios/judges/${id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('judges-bios')
        resetForm()
        toast.success('Judge bio updated successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update bio'
        toast.error(`Error updating bio: ${errorMessage}`)
      },
    }
  )

  const handleEdit = (item: Contestant | Judge) => {
    if (activeTab === 'contestants') {
      setEditingContestant(item as Contestant)
      setEditingJudge(null)
    } else {
      setEditingJudge(item as Judge)
      setEditingContestant(null)
    }
    setFormData({
      bio: item.bio || '',
      image: null,
    })
    setImagePreview(item.imagePath || null)
    setIsFormOpen(true)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB')
        return
      }
      setFormData({ ...formData, image: file })
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setFormData({ ...formData, image: null })
    setImagePreview(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const formDataToSend = new FormData()
    formDataToSend.append('bio', formData.bio)
    if (formData.image) {
      formDataToSend.append('image', formData.image)
    }

    if (editingContestant) {
      updateContestantMutation.mutate({ id: editingContestant.id, data: formDataToSend })
    } else if (editingJudge) {
      updateJudgeMutation.mutate({ id: editingJudge.id, data: formDataToSend })
    }
  }

  const resetForm = () => {
    setFormData({
      bio: '',
      image: null,
    })
    setImagePreview(null)
    setEditingContestant(null)
    setEditingJudge(null)
    setIsFormOpen(false)
  }

  // Filter data based on search
  const filteredContestants = contestants.filter((contestant) =>
    contestant.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredJudges = judges.filter((judge) =>
    judge.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isLoading = activeTab === 'contestants' ? isLoadingContestants : isLoadingJudges
  const currentData = activeTab === 'contestants' ? filteredContestants : filteredJudges

  if (!canManageBios) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            You don't have permission to manage bios. Contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserCircleIcon className="w-8 h-8" />
            Bios Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage contestant and judge bios and photos
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('contestants')}
            className={`${
              activeTab === 'contestants'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Contestants ({contestants.length})
          </button>
          <button
            onClick={() => setActiveTab('judges')}
            className={`${
              activeTab === 'judges'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Judges ({judges.length})
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading {activeTab}...</p>
        </div>
      ) : currentData.length === 0 ? (
        <div className="text-center py-12">
          <UserCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No {activeTab} found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Try adjusting your search' : `No ${activeTab} available`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentData.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                {item.imagePath ? (
                  <img
                    src={item.imagePath}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircleIcon className="w-24 h-24 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.name}
                    </h3>
                    {activeTab === 'contestants' && (item as Contestant).contestantNumber && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        #{(item as Contestant).contestantNumber}
                      </p>
                    )}
                    {activeTab === 'judges' && (item as Judge).isHeadJudge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                        Head Judge
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="Edit bio"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                </div>

                {item.gender && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {item.gender}
                    {item.pronouns && ` (${item.pronouns})`}
                  </p>
                )}

                {item.bio ? (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                    {item.bio}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No bio added</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Edit {activeTab === 'contestants' ? 'Contestant' : 'Judge'} Bio
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingContestant?.name || editingJudge?.name || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Photo
                  </label>
                  <div className="space-y-4">
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-48 h-48 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-48 h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                        <PhotoIcon className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                    <label className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                      <PhotoIcon className="w-5 h-5 mr-2" />
                      Choose Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      JPG, PNG, GIF, or WebP (max 10MB)
                    </p>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter bio..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateContestantMutation.isLoading || updateJudgeMutation.isLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {updateContestantMutation.isLoading || updateJudgeMutation.isLoading
                      ? 'Saving...'
                      : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BiosPage
