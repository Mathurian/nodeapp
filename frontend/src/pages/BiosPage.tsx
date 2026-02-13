import React, { useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import {
  UserCircleIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline'

interface DirectoryContest {
  id: string
  name: string
  eventName: string | null
}

interface DirectoryContestant {
  id: string
  name: string
  contestantNumber: number | null
  gender: string | null
  pronouns: string | null
  imagePath: string | null
  bio: string | null
  bioFilePath: string | null
  contests: Array<{ id: string; name: string }>
}

interface DirectoryJudge {
  id: string
  name: string
  gender: string | null
  pronouns: string | null
  isHeadJudge: boolean
  imagePath: string | null
  bio: string | null
  bioFilePath: string | null
  contests: Array<{ id: string; name: string }>
}

interface BioDirectoryResponse {
  contests: DirectoryContest[]
  contestants: DirectoryContestant[]
  judges: DirectoryJudge[]
}

const toImageUrl = (path?: string | null): string | null => {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) return path
  return `/${path}`
}

const allowedRoles = ['JUDGE', 'EMCEE', 'ORGANIZER', 'BOARD', 'ADMIN', 'SUPER_ADMIN', 'CONTESTANT', 'TALLY_MASTER', 'AUDITOR']

const BiosPage: React.FC = () => {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContestId, setSelectedContestId] = useState('')
  const isEmcee = user?.role === 'EMCEE'
  const isContestant = user?.role === 'CONTESTANT'
  const showJudgesTab = isEmcee || isContestant
  const [activeTab, setActiveTab] = useState<'contestants' | 'judges'>('contestants')

  const hasAccess = allowedRoles.includes(user?.role || '')

  const { data, isLoading, error } = useQuery<BioDirectoryResponse>(
    ['bio-directory', selectedContestId, user?.id, user?.role],
    async () => {
      const response = await api.get('/bios/directory', {
        params: selectedContestId ? { contestId: selectedContestId } : undefined,
      })
      return response.data?.data || response.data
    },
    {
      enabled: hasAccess,
      refetchInterval: 30000,
    }
  )

  const filteredContestants = useMemo(() => {
    const contestants = data?.contestants || []
    if (!searchQuery.trim()) return contestants
    const q = searchQuery.toLowerCase()
    return contestants.filter((contestant) =>
      contestant.name.toLowerCase().includes(q) ||
      String(contestant.contestantNumber || '').includes(q) ||
      (contestant.bio || '').toLowerCase().includes(q)
    )
  }, [data?.contestants, searchQuery])

  const filteredJudges = useMemo(() => {
    const judges = data?.judges || []
    if (!searchQuery.trim()) return judges
    const q = searchQuery.toLowerCase()
    return judges.filter((judge) =>
      judge.name.toLowerCase().includes(q) ||
      (judge.bio || '').toLowerCase().includes(q)
    )
  }, [data?.judges, searchQuery])

  if (!hasAccess) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            You do not have access to the bio directory.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserCircleIcon className="w-8 h-8" />
            Bio Directory
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View scoped contestant bios and photos{showJudgesTab ? ', plus judge profiles' : ''}.
          </p>
        </div>
        <div className="w-full sm:w-80">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filter by Contest
          </label>
          <select
            value={selectedContestId}
            onChange={(e) => setSelectedContestId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
          >
            <option value="">All Contests</option>
            {(data?.contests || []).map((contest) => (
              <option key={contest.id} value={contest.id}>
                {contest.name}{contest.eventName ? ` (${contest.eventName})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search names, numbers, or bio text..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
        />
      </div>

      {showJudgesTab && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('contestants')}
              className={`py-3 px-1 border-b-2 text-sm font-medium ${
                activeTab === 'contestants'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              }`}
            >
              Contestants ({data?.contestants?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('judges')}
              className={`py-3 px-1 border-b-2 text-sm font-medium ${
                activeTab === 'judges'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              }`}
            >
              Judges ({data?.judges?.length || 0})
            </button>
          </nav>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading profiles...</div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          Failed to load bio directory.
        </div>
      ) : (
        <>
          {(activeTab === 'contestants' || !showJudgesTab) && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredContestants.map((contestant) => (
                <div key={contestant.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {toImageUrl(contestant.imagePath) ? (
                      <img src={toImageUrl(contestant.imagePath)!} alt={contestant.name} className="h-14 w-14 rounded-full object-cover" />
                    ) : (
                      <UserCircleIcon className="h-14 w-14 text-gray-400" />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{contestant.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {contestant.contestantNumber ? `#${contestant.contestantNumber}` : 'No contestant number'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {contestant.bio?.trim() || 'No bio text provided.'}
                  </p>
                  {contestant.bioFilePath && (
                    <a
                      href={contestant.bioFilePath}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      View bio file
                    </a>
                  )}
                </div>
              ))}
              {filteredContestants.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
                  No contestants match the current filters.
                </div>
              )}
            </div>
          )}

          {showJudgesTab && activeTab === 'judges' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredJudges.map((judge) => (
                <div key={judge.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {toImageUrl(judge.imagePath) ? (
                      <img src={toImageUrl(judge.imagePath)!} alt={judge.name} className="h-14 w-14 rounded-full object-cover" />
                    ) : (
                      <UsersIcon className="h-14 w-14 text-gray-400" />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{judge.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {judge.isHeadJudge ? 'Head Judge' : 'Judge'}
                      </p>
                    </div>
                    <MicrophoneIcon className="h-5 w-5 text-gray-300 ml-auto" />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {judge.bio?.trim() || 'No bio text provided.'}
                  </p>
                  {judge.bioFilePath && (
                    <a
                      href={judge.bioFilePath}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      View bio file
                    </a>
                  )}
                </div>
              ))}
              {filteredJudges.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
                  No judges match the current filters.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default BiosPage
