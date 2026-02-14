import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../contexts/AuthContext'
import { settingsAPI } from '../services/api'
import { DEFAULT_APP_BASELINE } from '../config/appBaseline'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { FormProvider, FormInput, FormField } from '../components/form'
import { loginSchema, LoginInput } from '../lib/validation'

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
  appDescription: string
  showForgotPassword: boolean
  logoPath: string | null
  faviconPath: string | null
  contactEmail: string | null
}

const LoginPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>()
  const [showPassword, setShowPassword] = useState(false)
  const [isTenantLoading, setIsTenantLoading] = useState(true)
  const [serverError, setServerError] = useState('')

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [settings, setSettings] = useState<PublicSettings>({
    appName: DEFAULT_APP_BASELINE.appName,
    appSubtitle: DEFAULT_APP_BASELINE.appSubtitle,
    appDescription: DEFAULT_APP_BASELINE.appDescription,
    showForgotPassword: true,
    logoPath: null,
    faviconPath: null,
    contactEmail: DEFAULT_APP_BASELINE.contactEmail
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

  useEffect(() => {
    const loadPublicSettings = async () => {
      try {
        const response = await fetch('/api/v1/settings/public', {
          headers: slug ? { 'X-Tenant-Slug': slug } : undefined,
          credentials: 'include',
        })
        if (!response.ok) return
        const data = await response.json()
        const payload = data.data || data
        setSettings((prev) => ({
          ...prev,
          appName: payload.appName || prev.appName,
          appSubtitle: payload.appSubtitle || prev.appSubtitle,
          appDescription: payload.appDescription || prev.appDescription,
          showForgotPassword: payload.showForgotPassword !== false,
          contactEmail: payload.contactEmail || prev.contactEmail,
        }))
      } catch (err) {
        console.error('Failed to load public settings:', err)
      }
    }
    loadPublicSettings()
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

  const getDefaultRouteForRole = (role?: string) => {
    switch (role) {
      case 'AUDITOR':
        return '/auditor'
      case 'TALLY_MASTER':
        return '/tally-master'
      case 'EMCEE':
        return '/emcee'
      case 'BOARD':
        return '/board'
      default:
        return '/dashboard'
    }
  }

  const onSubmit = async (data: LoginInput) => {
    setServerError('')
    try {
      const user = await login(data.email, data.password, slug || undefined)
      const roleRoute = getDefaultRouteForRole(user?.role)
      if (slug && slug !== 'default') {
        navigate(`/${slug}${roleRoute}`)
      } else if (user?.tenant?.slug && user.tenant.slug !== 'default') {
        navigate(`/${user.tenant.slug}${roleRoute}`)
      } else {
        navigate(roleRoute)
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div>
      <div className="cgr-page-container min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
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
            {settings.appSubtitle && (
              <p className="mt-2 text-center text-sm text-gray-600">
                {settings.appSubtitle}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border border-gray-200">
            <FormProvider form={form} onSubmit={onSubmit} className="space-y-6">
              <FormInput
                name="email"
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                required
              />

              {/* Password with show/hide toggle */}
              <FormField name="password" label="Password" required>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...form.register('password')}
                    className={
                      'appearance-none block w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 bg-white text-gray-900 focus:outline-none focus:ring-2 sm:text-sm ' +
                      (form.formState.errors.password
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500')
                    }
                    aria-invalid={form.formState.errors.password ? 'true' : undefined}
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
              </FormField>

              {/* Server-side error */}
              {serverError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-4" role="alert">
                  <div className="text-sm text-red-800 font-medium">{serverError}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>

              <div className="flex items-center justify-between text-sm">
                {settings.showForgotPassword ? (
                  <a
                    href={`${slug ? `/${slug}` : ''}/forgot-password`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Forgot password?
                  </a>
                ) : <span />}
              </div>
            </FormProvider>

            {/* Support Section */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Need help accessing your account?
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center items-center text-sm">
                  <a
                    href="/help"
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    aria-label="View help documentation"
                  >
                    Help Documentation
                  </a>
                  <span className="hidden sm:inline text-gray-400">|</span>
                  <a
                    href={`mailto:${settings.contactEmail || DEFAULT_APP_BASELINE.contactEmail}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    aria-label="Contact support via email"
                  >
                    Contact Support
                  </a>
                </div>
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
