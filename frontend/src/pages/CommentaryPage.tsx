import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  MicrophoneIcon,
  PaperAirplaneIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface CommentaryEntry {
  id: string
  eventId: string
  categoryId?: string
  message: string
  commentator: string
  timestamp: string
}

const CommentaryPage: React.FC = () => {
  const { user } = useAuth()
  const [entries, setEntries] = useState<CommentaryEntry[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      fetchCommentary()
      const interval = setInterval(fetchCommentary, 3000) // Refresh every 3 seconds
      return () => clearInterval(interval)
    }
  }, [selectedEventId])

  const fetchEvents = async () => {
    try {
      const response = await api.get('/events')
      setEvents(response.data)
      if (response.data.length > 0) {
        setSelectedEventId(response.data[0].id)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const fetchCommentary = async () => {
    try {
      const response = await api.get(`/commentary/${selectedEventId}`)
      setEntries(response.data)
    } catch (err: any) {
      console.error('Failed to load commentary:', err)
    }
  }

  const sendCommentary = async () => {
    if (!message.trim()) return
    try {
      setError(null)
      await api.post('/commentary', {
        eventId: selectedEventId,
        message,
        commentator: user?.name || 'Unknown',
      })
      setMessage('')
      await fetchCommentary()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send commentary')
    }
  }

  const deleteEntry = async (id: string) => {
    try {
      await api.delete(`/commentary/${id}`)
      await fetchCommentary()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete commentary')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendCommentary()
    }
  }

  if (user?.role !== 'EMCEE' && user?.role !== 'ORGANIZER' && user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            Only emcees and organizers can access live commentary.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Loading commentary...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
            Live Commentary
          </h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mt-2">
            Provide live commentary for events and competitions
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Event Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
            Select Event
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        {/* Commentary Feed */}
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white flex items-center gap-2">
              <MicrophoneIcon className="h-6 w-6" />
              Commentary Feed
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {entries.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                No commentary yet. Start broadcasting!
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="p-4 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white dark:text-white">
                          {entry.commentator}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          {format(new Date(entry.timestamp), 'h:mm:ss a')}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300">{entry.message}</p>
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'ORGANIZER') && (
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your commentary... (Press Enter to send)"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
            />
            <button
              onClick={sendCommentary}
              disabled={!message.trim()}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
            Your commentary will be visible to all attendees in real-time
          </p>
        </div>
      </div>
    </div>
  )
}

export default CommentaryPage
