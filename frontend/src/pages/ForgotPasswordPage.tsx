import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { publicApi, settingsAPI } from '../services/api'
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

const ForgotPasswordPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS)
  const [isLoadingBranding, setIsLoadingBranding] = useState(true)

  const basePath = slug ? `/${slug}` : ''
  const helpBasePath = slug ? `/${slug}/help` : '/help'

  useEffect(() => {
    let isCurrent = true
    ;(async () => {
      try {
        const response = await settingsAPI.getPublicSettings(slug || undefined)
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
          setIsLoadingBranding(false)
        }
      }
    })()

    return () => {
      isCurrent = false
    }
  }, [slug])

  useEffect(() => {
    document.title = formatDocumentTitle(`${settings.appName} - Recover Password`)
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
    <main className="cgr-page-container min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">Recover Password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Request a reset link for the account you use to sign in to this tenant.
          </p>
          {slug && (
            <p className="mt-2 text-xs text-gray-500">
              If you belong to multiple tenants, stay on the correct tenant login page for password recovery and sign-in.
            </p>
          )}

          {isLoadingBranding ? (
            <p className="mt-4 text-sm text-gray-500">Loading recovery details...</p>
          ) : (
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
          )}

          <div className="mt-6 border-t border-gray-200 pt-4 space-y-3">
            <p className="text-sm text-gray-600">
              Need another way back in?
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-between text-sm">
              <Link to={`${basePath}/login`} className="text-blue-700 hover:underline font-medium">Back to Login</Link>
              <a href={helpBasePath} className="text-blue-700 hover:underline font-medium">Help Documentation</a>
            </div>
            <p className="text-xs text-gray-500">
              If you are waiting on an invitation or do not know which tenant to use, contact your event organizer or support contact.
            </p>
            <a
              href={`mailto:${settings.contactEmail || DEFAULT_APP_BASELINE.contactEmail}`}
              className="text-sm text-blue-700 hover:underline font-medium"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}

export default ForgotPasswordPage
