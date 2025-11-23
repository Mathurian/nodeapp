import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { settingsAPI } from '../services/api'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface TenantBranding {
  appName: string
  appSubtitle: string | null
  logoPath: string | null
  primaryColor: string | null
}

interface TenantInfo {
  id: string
  name: string
  slug: string
  isActive: boolean
  branding: TenantBranding
}

interface PublicSettings {
  appName: string
  appSubtitle: string
  showForgotPassword: boolean
  logoPath: string | null
  faviconPath: string | null
  contactEmail: string | null
}

const LoginPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isTenantLoading, setIsTenantLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [settings, setSettings] = useState<PublicSettings>({
    appName: 'Event Manager',
    appSubtitle: 'Contest Management System',
    showForgotPassword: false,
    logoPath: null,
    faviconPath: null,
    contactEmail: 'support@conmgr.com'
  })
  const { login } = useAuth()
  const navigate = useNavigate()

  // Load tenant info if slug is provided
  useEffect(() => {
    const loadTenantInfo = async () => {
      const tenantSlug = slug || 'default'
      setIsTenantLoading(true)

      try {
        const response = await fetch(`/api/tenants/slug/${tenantSlug}`)
        if (response.ok) {
          const data = await response.json()
          const tenant = data.tenant || data
          setTenantInfo(tenant)

          // Apply tenant branding to settings
          if (tenant?.branding) {
            setSettings(prev => ({
              ...prev,
              appName: tenant.branding.appName || tenant.name || prev.appName,
              appSubtitle: tenant.branding.appSubtitle || prev.appSubtitle,
              logoPath: tenant.branding.logoPath || prev.logoPath
            }))
          }
        } else if (response.status === 404 && slug) {
          // Tenant not found - redirect to default login
          console.warn(`Tenant "${slug}" not found, redirecting to default login`)
          navigate('/login', { replace: true })
          return
        }
      } catch (err) {
        console.error('Failed to load tenant info:', err)
      } finally {
        setIsTenantLoading(false)
      }
    }

    loadTenantInfo()
  }, [slug, navigate])

  // Load theme settings (tenant-aware via slug)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Pass slug to get tenant-specific theme settings
        const response = await settingsAPI.getThemeSettings(undefined, slug || undefined)
        const data = response.data?.data || response.data
        if (data) {
          setSettings(prev => ({
            ...prev,
            appName: data.app_name || data.appName || prev.appName,
            appSubtitle: data.app_subtitle || data.appSubtitle || prev.appSubtitle,
            logoPath: data.theme_logoPath || data.logoPath || prev.logoPath,
            faviconPath: data.theme_faviconPath || data.faviconPath || prev.faviconPath
          }))
        }
      } catch (err) {
        console.error('Failed to load theme settings:', err)
      }
    }
    loadSettings()
  }, [slug])

  // Update document title and favicon
  useEffect(() => {
    document.title = `${settings.appName} - Sign In`

    // Update favicon if provided
    if (settings.faviconPath) {
      const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
      if (favicon) {
        favicon.href = settings.faviconPath
      } else {
        const newFavicon = document.createElement('link')
        newFavicon.rel = 'icon'
        newFavicon.href = settings.faviconPath
        document.head.appendChild(newFavicon)
      }
    }
  }, [settings.appName, settings.faviconPath])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Pass tenant slug to login for proper tenant context
      const user = await login(email, password, slug || undefined)

      // Determine where to redirect after login
      // If user has a tenant and we know their tenant's slug, redirect to tenant-prefixed URL
      // Otherwise redirect to default dashboard
      if (slug && slug !== 'default') {
        // User logged in via tenant-specific URL - stay in that tenant context
        navigate(`/${slug}/dashboard`)
      } else if (user?.tenant?.slug && user.tenant.slug !== 'default') {
        // User has a non-default tenant - redirect to their tenant URL
        navigate(`/${user.tenant.slug}/dashboard`)
      } else {
        // Default tenant or no tenant info - use default URL
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            {/* Custom Logo */}
            {settings.logoPath && (
              <div className="flex justify-center mb-4">
                <img
                  src={settings.logoPath}
                  alt={`${settings.appName} logo`}
                  className="h-16 w-auto"
                  onError={(e) => {
                    // Hide image if it fails to load
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}

            {/* App Name */}
            <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {settings.appName}
            </h1>

            {/* Subtitle */}
            <p className="mt-2 text-center text-sm text-gray-600">
              {settings.appSubtitle}
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border border-gray-200">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 bg-white text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter your email"
                    aria-label="Email address"
                    aria-required="true"
                    aria-describedby={error ? 'login-error' : undefined}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 bg-white text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter your password"
                    aria-label="Password"
                    aria-required="true"
                    aria-describedby={error ? 'login-error' : undefined}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div
                  className="rounded-md bg-red-50 border border-red-200 p-4"
                  role="alert"
                  id="login-error"
                >
                  <div className="text-sm text-red-800 font-medium">
                    {error}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>
            </form>

            {/* Support Section */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Need help accessing your account?
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center items-center text-sm">
                  <a
                    href={`mailto:${settings.contactEmail || 'support@conmgr.com'}`}
                    className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                    aria-label="Contact support via email"
                  >
                    Contact Support
                  </a>
                  <span className="hidden sm:inline text-gray-400">|</span>
                  <span className="text-gray-600">
                    Email: {settings.contactEmail || 'support@conmgr.com'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Contact your administrator for login credentials
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Accessible design with WCAG 2.1 Level AA compliance
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
