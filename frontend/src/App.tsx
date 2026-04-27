import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useEffect, useState, Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SystemSettingsProvider } from './contexts/SystemSettingsContext'
import ErrorBoundary from './components/ErrorBoundary'
import CommandPaletteOnboardingWrapper from './components/CommandPaletteOnboardingWrapper'
import TenantRouter from './components/TenantRouter'
import { lazyWithRetry } from './utils/lazyWithRetry'
import { PWA_HARD_REFRESH_NOTICE_KEY } from './utils/pwaRefresh'
import './index.css'

// Lazy load command palette
const CommandPalette = lazyWithRetry(() => import('./components/CommandPalette'), 'CommandPalette')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const isStandalonePwaContext = (): boolean => {
  if (typeof window === 'undefined') return false
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches === true
  const iosStandalone = (window.navigator as any)?.standalone === true
  return mediaStandalone || iosStandalone
}

function App() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [updateNotice, setUpdateNotice] = useState<string | null>(null)
  const [isCompactToastViewport, setIsCompactToastViewport] = useState(false)
  const updateRecoveryNoticeKey = 'app:update-recovery-notice'

  useEffect(() => {
    if (typeof window === 'undefined') return
    const recoveredFromStaleCache = window.sessionStorage.getItem(updateRecoveryNoticeKey) === '1'
    const recoveredFromHardRefresh = window.sessionStorage.getItem(PWA_HARD_REFRESH_NOTICE_KEY) === '1'

    if (recoveredFromStaleCache) {
      setUpdateNotice('App updated. We refreshed automatically to recover from a stale browser cache.')
      window.sessionStorage.removeItem(updateRecoveryNoticeKey)
    } else if (recoveredFromHardRefresh) {
      setUpdateNotice('App refreshed and cache revalidated.')
      window.sessionStorage.removeItem(PWA_HARD_REFRESH_NOTICE_KEY)
    } else {
      return
    }

    const timer = window.setTimeout(() => setUpdateNotice(null), 7000)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    const compactViewportQuery = window.matchMedia('(max-width: 640px)')

    const syncToastViewport = () => {
      const iosStandalone = (window.navigator as any)?.standalone === true
      setIsCompactToastViewport(
        compactViewportQuery.matches || standaloneQuery.matches || iosStandalone
      )
    }

    syncToastViewport()

    const handleStandaloneChange = () => syncToastViewport()
    const handleCompactViewportChange = () => syncToastViewport()

    if (typeof standaloneQuery.addEventListener === 'function') {
      standaloneQuery.addEventListener('change', handleStandaloneChange)
    } else {
      standaloneQuery.addListener?.(handleStandaloneChange)
    }

    if (typeof compactViewportQuery.addEventListener === 'function') {
      compactViewportQuery.addEventListener('change', handleCompactViewportChange)
    } else {
      compactViewportQuery.addListener?.(handleCompactViewportChange)
    }

    window.addEventListener('orientationchange', syncToastViewport)

    return () => {
      if (typeof standaloneQuery.removeEventListener === 'function') {
        standaloneQuery.removeEventListener('change', handleStandaloneChange)
      } else {
        standaloneQuery.removeListener?.(handleStandaloneChange)
      }

      if (typeof compactViewportQuery.removeEventListener === 'function') {
        compactViewportQuery.removeEventListener('change', handleCompactViewportChange)
      } else {
        compactViewportQuery.removeListener?.(handleCompactViewportChange)
      }

      window.removeEventListener('orientationchange', syncToastViewport)
    }
  }, [])

  const useCompactToastLayout = isCompactToastViewport || isStandalonePwaContext()

  // Global keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
      }
      // Escape to close
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Router>
            <SystemSettingsProvider>
              <AuthProvider>
                <SocketProvider>
                  {updateNotice && (
                    <div className="pwa-update-recovery-notice">
                      {updateNotice}
                    </div>
                  )}
                  <Toaster
                    position={useCompactToastLayout ? 'top-center' : 'top-right'}
                    gutter={12}
                    containerClassName="app-toast-container"
                    containerStyle={{
                      top: useCompactToastLayout
                        ? 'max(env(safe-area-inset-top, 0px), 0px)'
                        : 'max(env(safe-area-inset-top, 0px), 0px)',
                      left: useCompactToastLayout ? 'max(env(safe-area-inset-left, 0px), 0px)' : undefined,
                      right: 'max(env(safe-area-inset-right, 0px), 0px)',
                    }}
                    toastOptions={{
                      duration: 4000,
                      className: 'app-toast',
                      style: {
                        background: '#fff',
                        color: '#363636',
                        borderRadius: '16px',
                        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.24)',
                        maxWidth: useCompactToastLayout ? 'min(92vw, 28rem)' : '26rem',
                        padding: '0.95rem 1rem',
                      },
                      success: {
                        duration: 3000,
                        iconTheme: {
                          primary: '#10b981',
                          secondary: '#fff',
                        },
                      },
                      error: {
                        duration: 5000,
                        iconTheme: {
                          primary: '#ef4444',
                          secondary: '#fff',
                        },
                      },
                    }}
                  />
                  <Suspense fallback={null}>
                    <CommandPalette
                      isOpen={isCommandPaletteOpen}
                      onClose={() => setIsCommandPaletteOpen(false)}
                    />
                  </Suspense>
                  <CommandPaletteOnboardingWrapper
                    onComplete={(options) => {
                      if (options?.openCommandPalette) {
                        setIsCommandPaletteOpen(true)
                      }
                    }}
                  />
                  <TenantRouter onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
                </SocketProvider>
              </AuthProvider>
            </SystemSettingsProvider>
          </Router>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
