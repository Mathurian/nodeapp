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

function App() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [showUpdateRecoveryNotice, setShowUpdateRecoveryNotice] = useState(false)
  const updateRecoveryNoticeKey = 'app:update-recovery-notice'

  useEffect(() => {
    if (typeof window === 'undefined') return
    const shouldShow = window.sessionStorage.getItem(updateRecoveryNoticeKey) === '1'
    if (!shouldShow) return
    setShowUpdateRecoveryNotice(true)
    window.sessionStorage.removeItem(updateRecoveryNoticeKey)
    const timer = window.setTimeout(() => setShowUpdateRecoveryNotice(false), 7000)
    return () => window.clearTimeout(timer)
  }, [])

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
                  {showUpdateRecoveryNotice && (
                    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-md bg-blue-600 text-white text-sm shadow-lg">
                      App updated. We refreshed automatically to recover from a stale browser cache.
                    </div>
                  )}
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#fff',
                        color: '#363636',
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
                    onComplete={() => setIsCommandPaletteOpen(true)}
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
