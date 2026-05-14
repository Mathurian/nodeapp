import React, { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { settingsAPI } from '../services/api'
import axios from 'axios'

const RegisterPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const basePath = slug ? `/${slug}` : ''

  useEffect(() => {
    ;(async () => {
      try {
        await settingsAPI.getPublicSettings(slug)
      } catch {
        // no-op
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!inviteToken) {
      setError('Missing invitation token. Use the registration link from your invitation email.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      await axios.post(
        '/api/v1/auth/complete-invitation-registration',
        { token: inviteToken, password },
        {
          withCredentials: true,
          headers: slug ? { 'X-Tenant-Slug': slug } : undefined,
        }
      )
      setMessage('Registration completed. You can now log in.')
      setPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Unable to complete registration')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="cgr-page-container min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-xl shadow border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Registration</h1>
        {isLoading ? (
          <p className="mt-3 text-sm text-gray-600">Loading registration form...</p>
        ) : inviteToken ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">
              Complete your invited account setup by choosing a password.
            </p>
            {slug && (
              <p className="text-xs text-gray-500">
                This registration flow is tenant-specific. Finish setup here, then sign in through the same tenant login page.
              </p>
            )}

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create password"
              className="w-full px-3 py-2 rounded-md border border-gray-300"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full px-3 py-2 rounded-md border border-gray-300"
              required
            />

            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
            {message && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{message}</div>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Completing...' : 'Complete Registration'}
            </button>
          </form>
        ) : (
          <div className="mt-3 text-sm text-gray-700">
            Invite-only registration is enabled. Use the registration link from your invitation email for the correct tenant.
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Link to={`${basePath}/login`} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Log In</Link>
          <Link to={`${basePath}/forgot-password`} className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200">Recover Password</Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
