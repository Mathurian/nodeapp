import React, { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { settingsAPI } from '../services/api'
import axios from 'axios'
import { DEFAULT_APP_BASELINE } from '../config/appBaseline'
import { formatDocumentTitle } from '../utils/documentTitle'

interface PublicSettings {
  appName: string
  appSubtitle: string
  contactEmail: string | null
  logoPath: string | null
  faviconPath: string | null
}

const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  appName: DEFAULT_APP_BASELINE.appName,
  appSubtitle: DEFAULT_APP_BASELINE.appSubtitle,
  contactEmail: DEFAULT_APP_BASELINE.contactEmail,
  logoPath: null,
  faviconPath: null,
}

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
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS)

  const basePath = slug ? `/${slug}` : ''
  const helpBasePath = slug ? `/${slug}/help` : '/help'

  useEffect(() => {
    let isCurrent = true
    ;(async () => {
      try {
        const response = await settingsAPI.getPublicSettings(slug)
        const payload = response.data?.data || response.data || {}
        if (!isCurrent) return
        setSettings({
          appName: payload.appName || DEFAULT_APP_BASELINE.appName,
          appSubtitle: payload.appSubtitle || DEFAULT_APP_BASELINE.appSubtitle,
          contactEmail: payload.contactEmail || DEFAULT_APP_BASELINE.contactEmail,
          logoPath: payload.logoPath || null,
          faviconPath: payload.faviconPath || null,
        })
      } catch {
        if (!isCurrent) return
        setSettings(DEFAULT_PUBLIC_SETTINGS)
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    })()
    return () => {
      isCurrent = false
    }
  }, [slug])

  useEffect(() => {
    document.title = formatDocumentTitle(`${settings.appName} - Registration`)
    const targetFavicon = settings.faviconPath || '/favicon.svg'
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
    if (favicon) {
      favicon.href = targetFavicon
      return
    }
    const icon = document.createElement('link')
    icon.rel = 'icon'
    icon.href = targetFavicon
    document.head.appendChild(icon)
  }, [settings.appName, settings.faviconPath])

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
    <main className="cgr-page-container min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        {settings.logoPath && (
          <div className="flex justify-center mb-4">
            <img
              src={settings.logoPath}
              alt={`${settings.appName} logo`}
              className="h-16 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}
        <h1 className="text-3xl font-extrabold text-gray-900">{settings.appName}</h1>
        {settings.appSubtitle && (
          <p className="mt-2 text-sm text-gray-600">{settings.appSubtitle}</p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">Registration</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-gray-600">Loading registration form...</p>
        ) : inviteToken ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">
              Complete your invited account setup by choosing a password for this tenant.
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
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            <p>
              Invite-only registration is enabled. Use the registration link from your invitation email for the correct tenant.
            </p>
            <p className="text-xs text-gray-500">
              If you do not have an invitation, contact your event organizer or administrator instead of creating a new account here.
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to={`${basePath}/login`} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-center">Log In</Link>
            <Link to={`${basePath}/forgot-password`} className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 text-center">Recover Password</Link>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-between text-sm">
            <a href={helpBasePath} className="text-blue-700 hover:underline font-medium">Help Documentation</a>
            <a
              href={`mailto:${settings.contactEmail || DEFAULT_APP_BASELINE.contactEmail}`}
              className="text-blue-700 hover:underline font-medium"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
      </div>
    </main>
  )
}

export default RegisterPage
