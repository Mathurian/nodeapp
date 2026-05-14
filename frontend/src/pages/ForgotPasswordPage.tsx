import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { publicApi } from '../services/api'

const ForgotPasswordPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const basePath = slug ? `/${slug}` : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)
    try {
      const headers: Record<string, string> = {}
      if (slug) {
        headers['X-Tenant-Slug'] = slug
      }

      const csrfResponse = await publicApi.get('/csrf-token', {
        withCredentials: true,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      })
      const csrfToken =
        csrfResponse.data?.csrfToken ||
        csrfResponse.data?.token ||
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('_csrf='))
          ?.split('=')[1]

      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken
      }

      await publicApi.post(
        '/auth/forgot-password',
        { email },
        {
          withCredentials: true,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        }
      )
      setMessage('If the account exists, a password reset email has been sent.')
      setEmail('')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to submit password recovery request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="cgr-page-container min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Recover Password</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter the email address you use for this tenant to request a reset link.
        </p>
        {slug && (
          <p className="mt-2 text-xs text-gray-500">
            If you belong to multiple tenants, make sure you are recovering access from the correct tenant login page.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
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
            {isSubmitting ? 'Submitting...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-4 text-sm">
          <Link to={`${basePath}/login`} className="text-blue-600 hover:underline">Back to Login</Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
