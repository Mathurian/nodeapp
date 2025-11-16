import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  CalendarIcon,
  TrophyIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

interface SearchResult {
  id: string
  type: 'EVENT' | 'CONTEST' | 'CATEGORY' | 'USER' | 'SCORE'
  title: string
  subtitle?: string
  description?: string
  url?: string
  metadata?: Record<string, any>
}

const SearchPage: React.FC = () => {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    type: 'ALL',
    includeArchived: false,
  })
  const [showFilters, setShowFilters] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/search', {
        params: {
          q: query,
          type: filters.type !== 'ALL' ? filters.type : undefined,
          includeArchived: filters.includeArchived,
        },
      })
      setResults(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search()
    }
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'EVENT':
        return CalendarIcon
      case 'CONTEST':
      case 'CATEGORY':
        return TrophyIcon
      case 'USER':
        return UserIcon
      default:
        return DocumentTextIcon
    }
  }

  const getResultColor = (type: string) => {
    switch (type) {
      case 'EVENT':
        return 'text-blue-600 dark:text-blue-400'
      case 'CONTEST':
        return 'text-green-600 dark:text-green-400'
      case 'CATEGORY':
        return 'text-purple-600 dark:text-purple-400'
      case 'USER':
        return 'text-orange-600 dark:text-orange-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Search
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Search across events, contests, categories, users, and more
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search for events, contests, users..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <FunnelIcon className="h-5 w-5" />
            </button>
            <button
              onClick={search}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="ALL">All Types</option>
                    <option value="EVENT">Events</option>
                    <option value="CONTEST">Contests</option>
                    <option value="CATEGORY">Categories</option>
                    <option value="USER">Users</option>
                    <option value="SCORE">Scores</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.includeArchived}
                      onChange={(e) => setFilters({ ...filters, includeArchived: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Include archived items
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Results */}
        {query && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {results.length} {results.length === 1 ? 'Result' : 'Results'}
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {results.length === 0 ? (
                <div className="p-12 text-center">
                  <MagnifyingGlassIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No results found for "{query}"
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Try adjusting your search terms or filters
                  </p>
                </div>
              ) : (
                results.map((result) => {
                  const Icon = getResultIcon(result.type)
                  const colorClass = getResultColor(result.type)

                  return (
                    <div
                      key={result.id}
                      className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <Icon className={`h-6 w-6 mt-1 ${colorClass}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 ${colorClass}`}>
                              {result.type}
                            </span>
                            {result.subtitle && (
                              <span className="text-sm text-gray-500 dark:text-gray-500">
                                {result.subtitle}
                              </span>
                            )}
                          </div>
                          {result.url ? (
                            <Link
                              to={result.url}
                              className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {result.title}
                            </Link>
                          ) : (
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {result.title}
                            </h3>
                          )}
                          {result.description && (
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                              {result.description}
                            </p>
                          )}
                          {result.metadata && Object.keys(result.metadata).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {Object.entries(result.metadata).map(([key, value]) => (
                                <span
                                  key={key}
                                  className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"
                                >
                                  <span className="font-semibold">{key}:</span> {String(value)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!query && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <MagnifyingGlassIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Start Searching
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Enter a search term to find events, contests, users, and more
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-500">
                Try searching for:
              </span>
              {['Championship', 'Judge', 'Dance', 'Competition'].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setQuery(term)
                    setTimeout(search, 100)
                  }}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchPage
