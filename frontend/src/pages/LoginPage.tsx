import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../contexts/AuthContext'
import api, { settingsAPI } from '../services/api'
import { DEFAULT_APP_BASELINE } from '../config/appBaseline'
import { formatDocumentTitle } from '../utils/documentTitle'
import { EyeIcon, EyeSlashIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'
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

const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  appName: DEFAULT_APP_BASELINE.appName,
  appSubtitle: DEFAULT_APP_BASELINE.appSubtitle,
  appDescription: DEFAULT_APP_BASELINE.appDescription,
  showForgotPassword: true,
  logoPath: null,
  faviconPath: null,
  contactEmail: DEFAULT_APP_BASELINE.contactEmail
}

const LoginPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>()
  const [showPassword, setShowPassword] = useState(false)
  const [isTenantLoading, setIsTenantLoading] = useState(true)
  const [serverError, setServerError] = useState('')
  const [mfaPendingToken, setMfaPendingToken] = useState<string | null>(null)
  const [mfaRequiresSetup, setMfaRequiresSetup] = useState(false)
  const [mfaProviders, setMfaProviders] = useState<string[]>(['TOTP'])
  const [mfaSelectedProvider, setMfaSelectedProvider] = useState<'TOTP' | 'SMS' | 'EMAIL'>('TOTP')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaSecret, setMfaSecret] = useState<string | null>(null)
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null)
  const [mfaBackupCodes, setMfaBackupCodes] = useState<string[]>([])
  const [mfaSetupLoading, setMfaSetupLoading] = useState(false)
  const [mfaVerifyLoading, setMfaVerifyLoading] = useState(false)
  const [mfaChallengeSent, setMfaChallengeSent] = useState(false)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS)
  const { login, completeMfaLogin } = useAuth()
  const navigate = useNavigate()
  const helpBasePath = slug ? `/${slug}/help` : '/help'
  const installGuideHref = `${helpBasePath}/02-GETTING-STARTED#install-on-mobile-as-an-app-pwa`

  useEffect(() => {
    // Reset tenant branding immediately when switching between slug and default routes.
    setTenantInfo(null)
    setSettings({ ...DEFAULT_PUBLIC_SETTINGS })
  }, [slug])

  // Load tenant info if slug is provided
  useEffect(() => {
    let isCurrent = true
    const loadTenantInfo = async () => {
      const tenantSlug = slug || 'default'
      setIsTenantLoading(true)

      try {
        const response = await fetch(`/api/tenants/slug/${tenantSlug}`)
        if (!isCurrent) return
        if (response.ok) {
          const data = await response.json()
          if (!isCurrent) return
          const tenant = data.tenant || data
          setTenantInfo(tenant)

          // Apply tenant branding to settings
          if (tenant?.branding) {
            setSettings(prev => ({
              ...prev,
              appName: tenant.branding.appName || tenant.name || DEFAULT_APP_BASELINE.appName,
              appSubtitle: tenant.branding.appSubtitle || DEFAULT_APP_BASELINE.appSubtitle,
              logoPath: tenant.branding.logoPath || null
            }))
          }
        } else if (response.status === 404 && slug) {
          // Tenant not found - redirect to default login
          console.warn(`Tenant "${slug}" not found, redirecting to default login`)
          navigate('/login', { replace: true })
          return
        }
      } catch (err) {
        if (isCurrent) {
          console.error('Failed to load tenant info:', err)
        }
      } finally {
        if (isCurrent) {
          setIsTenantLoading(false)
        }
      }
    }

    loadTenantInfo()
    return () => {
      isCurrent = false
    }
  }, [slug, navigate])

  // Load theme settings (tenant-aware via slug)
  useEffect(() => {
    let isCurrent = true
    const loadSettings = async () => {
      try {
        // Pass slug to get tenant-specific theme settings
        const response = await settingsAPI.getThemeSettings(undefined, slug || undefined)
        const data = response.data?.data || response.data
        if (!isCurrent || !data) {
          return
        }
        setSettings(prev => ({
          ...prev,
          appName: data.app_name || data.appName || DEFAULT_APP_BASELINE.appName,
          appSubtitle: data.app_subtitle || data.appSubtitle || DEFAULT_APP_BASELINE.appSubtitle,
          logoPath: data.theme_logoPath || data.logoPath || null,
          faviconPath: data.theme_faviconPath || data.faviconPath || null
        }))
      } catch (err) {
        if (isCurrent) {
          console.error('Failed to load theme settings:', err)
        }
      }
    }
    loadSettings()
    return () => {
      isCurrent = false
    }
  }, [slug])

  useEffect(() => {
    let isCurrent = true
    const loadPublicSettings = async () => {
      try {
        const response = await settingsAPI.getPublicSettings(slug || undefined)
        const payload = response.data?.data || response.data || {}
        if (!isCurrent) {
          return
        }
        setSettings(prev => ({
          ...prev,
          appName: payload.appName || prev.appName,
          appSubtitle: payload.appSubtitle || prev.appSubtitle,
          appDescription: payload.appDescription || DEFAULT_APP_BASELINE.appDescription,
          showForgotPassword: payload.showForgotPassword !== false,
          logoPath: payload.logoPath || prev.logoPath,
          faviconPath: payload.faviconPath || prev.faviconPath,
          contactEmail: payload.contactEmail || DEFAULT_APP_BASELINE.contactEmail,
        }))
      } catch (err) {
        if (isCurrent) {
          console.error('Failed to load public settings:', err)
        }
      }
    }
    loadPublicSettings()
    return () => {
      isCurrent = false
    }
  }, [slug])

  // Update document title and favicon
  useEffect(() => {
    document.title = formatDocumentTitle(`${settings.appName} - Sign In`)
    const targetFavicon = settings.faviconPath || '/favicon.svg'
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
    if (favicon) {
      favicon.href = targetFavicon
      return
    }
    const newFavicon = document.createElement('link')
    newFavicon.rel = 'icon'
    newFavicon.href = targetFavicon
    document.head.appendChild(newFavicon)
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

  const getPostLoginPath = (role?: string, tenantSlug?: string | null) => {
    const roleRoute = getDefaultRouteForRole(role)
    const resolvedSlug = (slug || tenantSlug || '').trim()
    if (resolvedSlug) {
      return `/${resolvedSlug}${roleRoute}`
    }
    return roleRoute
  }

  const setupMfaEnrollment = async (tempToken: string) => {
    setMfaSetupLoading(true)
    try {
      const response = await api.post(
        '/mfa/setup',
        {},
        { headers: { Authorization: `Bearer ${tempToken}` } }
      )
      const payload = response.data?.data || response.data
      setMfaQrCode(payload?.qrCode || null)
      setMfaSecret(payload?.secret || payload?.manualEntryKey || null)
      setMfaBackupCodes(Array.isArray(payload?.backupCodes) ? payload.backupCodes : [])
    } catch (err: any) {
      setServerError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to initialize MFA setup')
    } finally {
      setMfaSetupLoading(false)
    }
  }

  const completeMfaChallenge = async () => {
    if (!mfaPendingToken) {
      setServerError('Missing MFA session. Please sign in again.')
      return
    }
    if (!mfaCode.trim()) {
      setServerError('Enter your MFA verification code.')
      return
    }

    setMfaVerifyLoading(true)
    setServerError('')
    try {
      const user = await completeMfaLogin(mfaPendingToken, mfaCode.trim(), mfaSelectedProvider)
      navigate(getPostLoginPath(user?.role, user?.tenant?.slug))
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'MFA verification failed')
    } finally {
      setMfaVerifyLoading(false)
    }
  }

  const verifyAndEnableMfa = async () => {
    if (!mfaPendingToken || !mfaSecret) {
      setServerError('Missing MFA setup session. Please sign in again.')
      return
    }
    if (!mfaCode.trim()) {
      setServerError('Enter the authenticator code to activate MFA.')
      return
    }

    setMfaVerifyLoading(true)
    setServerError('')
    try {
      await api.post(
        '/mfa/enable',
        {
          secret: mfaSecret,
          token: mfaCode.trim(),
          backupCodes: mfaBackupCodes,
        },
        { headers: { Authorization: `Bearer ${mfaPendingToken}` } }
      )
      await completeMfaChallenge()
    } catch (err: any) {
      setServerError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to enable MFA')
    } finally {
      setMfaVerifyLoading(false)
    }
  }

  const sendMfaChallenge = async () => {
    if (!mfaPendingToken) return
    if (mfaSelectedProvider === 'TOTP') return
    setMfaVerifyLoading(true)
    setServerError('')
    try {
      await api.post('/auth/mfa/challenge', {
        tempToken: mfaPendingToken,
        provider: mfaSelectedProvider,
      })
      setMfaChallengeSent(true)
    } catch (err: any) {
      setServerError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to send verification code')
    } finally {
      setMfaVerifyLoading(false)
    }
  }

  const onSubmit = async (data: LoginInput) => {
    setServerError('')
    try {
      const result = await login(data.email, data.password, slug || undefined)
      if (result.requiresMFA) {
        setMfaPendingToken(result.tempToken || null)
        setMfaRequiresSetup(Boolean(result.requiresMFASetup))
        const providers = (Array.isArray(result.mfaProviders) ? result.mfaProviders : ['TOTP'])
          .map((provider) => String(provider).toUpperCase())
          .filter((provider) => provider === 'TOTP' || provider === 'SMS' || provider === 'EMAIL') as Array<'TOTP' | 'SMS' | 'EMAIL'>
        const deduped = Array.from(new Set(providers))
        setMfaProviders(deduped.length > 0 ? deduped : ['TOTP'])
        setMfaSelectedProvider((deduped[0] || 'TOTP') as 'TOTP' | 'SMS' | 'EMAIL')
        setMfaChallengeSent(false)
        setServerError(result.message || '')
        if (result.requiresMFASetup && result.tempToken) {
          await setupMfaEnrollment(result.tempToken)
        }
        return
      }

      const user = result.user
      navigate(getPostLoginPath(user?.role, user?.tenant?.slug))
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <main className="cgr-page-container min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
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
            <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              {settings.appName}
            </h1>

            {/* Subtitle */}
            {settings.appSubtitle && (
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
                {settings.appSubtitle}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700">
            <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 p-4">
              <div className="flex items-start gap-3">
                <DevicePhoneMobileIcon className="h-5 w-5 text-blue-700 dark:text-blue-200 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-950 dark:text-blue-100">
                    Did you know?
                  </p>
                  <p className="mt-1 text-sm text-blue-900 dark:text-blue-100">
                    You can install {settings.appName} on your mobile device for quick access from your home screen.
                  </p>
                  <a
                    href={installGuideHref}
                    className="mt-2 inline-block text-sm font-semibold text-blue-900 dark:text-blue-100 hover:underline"
                  >
                    View mobile install instructions
                  </a>
                </div>
              </div>
            </div>

            {!mfaPendingToken ? (
              <FormProvider form={form} onSubmit={onSubmit} className="space-y-6">
                <FormInput
                  name="email"
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  autoFocus
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
                        'appearance-none block w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 sm:text-sm ' +
                        (form.formState.errors.password
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500')
                      }
                      aria-invalid={form.formState.errors.password ? 'true' : undefined}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100"
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
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  {settings.showForgotPassword ? (
                    <a
                      href={`${slug ? `/${slug}` : ''}/forgot-password`}
                      className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 hover:underline"
                    >
                      Forgot password?
                    </a>
                  ) : <span />}
                  <a
                    href={`${slug ? `/${slug}` : ''}/`}
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:underline"
                  >
                    Back to Home
                  </a>
                </div>
              </FormProvider>
            ) : (
              <div className="space-y-6">
                <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
                  <div className="text-sm text-blue-900 font-medium">
                    {mfaRequiresSetup ? 'MFA setup is required for this tenant before sign in.' : 'Enter your MFA code to complete sign in.'}
                  </div>
                  <div className="mt-1 text-xs text-blue-700">
                    Allowed providers: {mfaProviders.join(', ')}
                  </div>
                </div>

                {mfaRequiresSetup && (
                  <div className="space-y-4">
                    {mfaSetupLoading ? (
                      <div className="text-sm text-gray-600 dark:text-gray-300">Preparing MFA enrollment...</div>
                    ) : (
                      <>
                        {mfaQrCode && (
                          <div className="flex justify-center">
                            <img src={mfaQrCode} alt="MFA QR Code" className="w-48 h-48" />
                          </div>
                        )}
                        {mfaSecret && (
                          <div className="rounded-md bg-gray-100 p-3">
                            <div className="text-xs text-gray-600 mb-1">Manual secret key</div>
                            <code className="text-sm break-all text-gray-900">{mfaSecret}</code>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {!mfaRequiresSetup && (
                  <div>
                    <label htmlFor="pages-loginpage-1" className="block text-sm font-medium text-gray-700 mb-2">
                      MFA Provider
                    </label>
                    <select id="pages-loginpage-1"
                      value={mfaSelectedProvider}
                      onChange={(e) => {
                        setMfaSelectedProvider(e.target.value as 'TOTP' | 'SMS' | 'EMAIL')
                        setMfaChallengeSent(false)
                        setMfaCode('')
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {mfaProviders.map((provider) => (
                        <option key={provider} value={provider}>{provider}</option>
                      ))}
                    </select>
                  </div>
                )}

                {serverError && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-4" role="alert">
                    <div className="text-sm text-red-800 font-medium">{serverError}</div>
                  </div>
                )}

                {!mfaRequiresSetup && (mfaSelectedProvider === 'SMS' || mfaSelectedProvider === 'EMAIL') && (
                  <button
                    type="button"
                    onClick={sendMfaChallenge}
                    disabled={mfaVerifyLoading}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    {mfaVerifyLoading ? 'Sending code...' : `Send ${mfaSelectedProvider} Code`}
                  </button>
                )}

                {!mfaRequiresSetup && mfaSelectedProvider !== 'TOTP' && mfaChallengeSent && (
                  <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                    Verification code sent. Enter it below.
                  </div>
                )}

                <div>
                  <label htmlFor="pages-loginpage-2" className="block text-sm font-medium text-gray-700 mb-2">
                    MFA Verification Code
                  </label>
                  <input id="pages-loginpage-2"
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={12}
                  />
                </div>

                <button
                  type="button"
                  onClick={mfaRequiresSetup ? verifyAndEnableMfa : completeMfaChallenge}
                  disabled={mfaVerifyLoading || mfaCode.trim().length === 0}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {mfaVerifyLoading
                    ? (mfaRequiresSetup ? 'Enabling MFA...' : 'Verifying...')
                    : (mfaRequiresSetup ? 'Enable MFA and Sign In' : 'Verify and Sign In')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMfaPendingToken(null)
                    setMfaRequiresSetup(false)
                    setMfaCode('')
                    setMfaSecret(null)
                    setMfaQrCode(null)
                    setMfaBackupCodes([])
                    setServerError('')
                  }}
                  className="w-full text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline"
                >
                  Start over
                </button>
              </div>
            )}

            {/* Support Section */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Need help accessing your account?
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center items-center text-sm">
                  <a
                    href={helpBasePath}
                    className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 hover:underline font-medium"
                    aria-label="View help documentation"
                  >
                    Help Documentation
                  </a>
                  <span className="hidden sm:inline text-gray-400 dark:text-gray-500">|</span>
                  <a
                    href={`mailto:${settings.contactEmail || DEFAULT_APP_BASELINE.contactEmail}`}
                    className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 hover:underline font-medium"
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
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Accessible design with WCAG 2.1 Level AA compliance
          </p>
        </div>
    </main>
  )
}

export default LoginPage
