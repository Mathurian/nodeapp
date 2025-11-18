import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { eventsAPI, contestsAPI, categoriesAPI } from '../services/api'
import {
  MicrophoneIcon,
  TrophyIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

interface Event {
  id: string
  name: string
  description: string | null
  startDate: string
  endDate: string
}

interface Contest {
  id: string
  name: string
  description: string | null
  eventId: string
}

interface Category {
  id: string
  name: string
  description: string | null
  contestId: string
  scoreCap: number | null
  _count?: {
    contestants: number
    scores: number
  }
  totalsCertified: boolean
}

const EmceePage: React.FC = () => {
  const { user } = useAuth()

  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [selectedContestId, setSelectedContestId] = useState<string>('')

  // Check if user is emcee
  const isEmcee = ['EMCEE', 'ADMIN', 'ORGANIZER'].includes(user?.role || '')

  // Fetch events
  const { data: events } = useQuery<Event[]>(
    'events',
    async () => {
      const response = await eventsAPI.getAll()
      return response.data
    }
  )

  // Fetch contests for selected event
  const { data: contests } = useQuery<Contest[]>(
    ['contests', selectedEventId],
    async () => {
      if (!selectedEventId) return []
      const response = await contestsAPI.getByEvent(selectedEventId)
      return response.data
    },
    {
      enabled: !!selectedEventId,
    }
  )

  // Fetch categories for selected contest
  const { data: categories } = useQuery<Category[]>(
    ['categories', selectedContestId],
    async () => {
      if (!selectedContestId) return []
      const response = await categoriesAPI.getByContest(selectedContestId)
      return response.data
    },
    {
      enabled: !!selectedContestId,
    }
  )

  if (!isEmcee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MicrophoneIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500">
            You must be an emcee to access this page.
          </p>
        </div>
      </div>
    )
  }

  const selectedEvent = events?.find(e => e.id === selectedEventId)
  const selectedContest = contests?.find(c => c.id === selectedContestId)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <MicrophoneIcon className="h-8 w-8 mr-3 text-blue-600" />
            Emcee Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Competition overview and announcements
          </p>
        </div>

        {/* Event Selection */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Event</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value)
                  setSelectedContestId('')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an event...</option>
                {events?.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contest
              </label>
              <select
                value={selectedContestId}
                onChange={(e) => setSelectedContestId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedEventId}
              >
                <option value="">Select a contest...</option>
                {contests?.map((contest) => (
                  <option key={contest.id} value={contest.id}>
                    {contest.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Event Information */}
        {selectedEvent && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DocumentTextIcon className="h-6 w-6 mr-2 text-gray-600" />
              Event Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Event Name</p>
                <p className="text-lg text-gray-900">{selectedEvent.name}</p>
              </div>
              {selectedEvent.description && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Description</p>
                  <p className="text-gray-900">{selectedEvent.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Start Date</p>
                  <p className="text-gray-900">
                    {new Date(selectedEvent.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">End Date</p>
                  <p className="text-gray-900">
                    {new Date(selectedEvent.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contest Information */}
        {selectedContest && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrophyIcon className="h-6 w-6 mr-2 text-gray-600" />
              Contest Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Contest Name</p>
                <p className="text-lg text-gray-900">{selectedContest.name}</p>
              </div>
              {selectedContest.description && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Description</p>
                  <p className="text-gray-900">{selectedContest.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categories Overview */}
        {selectedContestId && categories && categories.length > 0 ? (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserGroupIcon className="h-6 w-6 mr-2 text-gray-600" />
              Categories
            </h2>
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="border-l-4 border-blue-500 pl-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-md font-semibold text-gray-900">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 mr-1" />
                          {category._count?.contestants || 0} contestants
                        </span>
                        <span className="flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          {category._count?.scores || 0} scores
                        </span>
                        {category.scoreCap && (
                          <span className="flex items-center">
                            <TrophyIcon className="h-4 w-4 mr-1" />
                            Max: {category.scoreCap}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      {category.totalsCertified ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Certified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : selectedContestId ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm text-gray-500">
              No categories in this contest yet
            </p>
          </div>
        ) : selectedEventId ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm text-gray-500">
              Select a contest to view categories
            </p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <MicrophoneIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm text-gray-500">
              Select an event to begin
            </p>
          </div>
        )}

        {/* Quick Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Emcee Tips</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li className="flex items-start">
              <ChevronRightIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Use this dashboard to monitor contest progress and category status</span>
            </li>
            <li className="flex items-start">
              <ChevronRightIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Check certification status to know when results are ready to announce</span>
            </li>
            <li className="flex items-start">
              <ChevronRightIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Navigate to the Results page to view winners and rankings</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default EmceePage
