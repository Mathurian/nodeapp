import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useEffect, useState, lazy, Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SystemSettingsProvider } from './contexts/SystemSettingsContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import CommandPaletteOnboarding from './components/CommandPaletteOnboarding'
import './index.css'

// Lazy load all pages for code splitting
const CommandPalette = lazy(() => import('./components/CommandPalette'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const EventsPage = lazy(() => import('./pages/EventsPage'))
const ContestsPage = lazy(() => import('./pages/ContestsPage'))
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'))
const ScoringPage = lazy(() => import('./pages/ScoringPage'))
const ResultsPage = lazy(() => import('./pages/ResultsPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const EmceePage = lazy(() => import('./pages/EmceePage'))
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const BackupManagementPage = lazy(() => import('./pages/BackupManagementPage'))
const DisasterRecoveryPage = lazy(() => import('./pages/DisasterRecoveryPage'))
const WorkflowManagementPage = lazy(() => import('./pages/WorkflowManagementPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const FileManagementPage = lazy(() => import('./pages/FileManagementPage'))
const EmailTemplatesPage = lazy(() => import('./pages/EmailTemplatesPage'))
const CustomFieldsPage = lazy(() => import('./pages/CustomFieldsPage'))
const TenantManagementPage = lazy(() => import('./pages/TenantManagementPage'))
const MFASettingsPage = lazy(() => import('./pages/MFASettingsPage'))
const DatabaseBrowserPage = lazy(() => import('./pages/DatabaseBrowserPage'))
const CacheManagementPage = lazy(() => import('./pages/CacheManagementPage'))
const ArchivePage = lazy(() => import('./pages/ArchivePage'))
const DeductionsPage = lazy(() => import('./pages/DeductionsPage'))
const CertificationsPage = lazy(() => import('./pages/CertificationsPage'))
const LogViewerPage = lazy(() => import('./pages/LogViewerPage'))
const PerformancePage = lazy(() => import('./pages/PerformancePage'))
const DataWipePage = lazy(() => import('./pages/DataWipePage'))
const EventTemplatesPage = lazy(() => import('./pages/EventTemplatesPage'))
const BulkOperationsPage = lazy(() => import('./pages/BulkOperationsPage'))
const CommentaryPage = lazy(() => import('./pages/CommentaryPage'))
const CategoryTypesPage = lazy(() => import('./pages/CategoryTypesPage'))

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
)

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
        <SystemSettingsProvider>
          <ThemeProvider>
            <Router>
              <AuthProvider>
                <SocketProvider>
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
                  <CommandPaletteOnboarding
                    onComplete={() => setIsCommandPaletteOpen(true)}
                  />
                  <div className="min-h-screen bg-gray-50">
                    <Suspense fallback={<LoadingFallback />}>
                      <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route
                          path="/*"
                          element={
                            <ProtectedRoute>
                              <Layout onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}>
                                <Suspense fallback={<LoadingFallback />}>
                                  <Routes>
                                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                    <Route path="/dashboard" element={<DashboardPage />} />
                                    <Route path="/events" element={<EventsPage />} />
                                    <Route path="/events/:eventId/contests" element={<ContestsPage />} />
                                    <Route path="/contests/:contestId/categories" element={<CategoriesPage />} />
                                    <Route path="/scoring" element={<ScoringPage />} />
                                    <Route path="/results" element={<ResultsPage />} />
                                    <Route path="/users" element={<UsersPage />} />
                                    <Route path="/admin" element={<AdminPage />} />
                                    <Route path="/settings" element={<SettingsPage />} />
                                    <Route path="/profile" element={<ProfilePage />} />
                                    <Route path="/emcee" element={<EmceePage />} />
                                    <Route path="/templates" element={<TemplatesPage />} />
                                    <Route path="/reports" element={<ReportsPage />} />
                                    <Route path="/notifications" element={<NotificationsPage />} />
                                    <Route path="/backups" element={<BackupManagementPage />} />
                                    <Route path="/disaster-recovery" element={<DisasterRecoveryPage />} />
                                    <Route path="/workflows" element={<WorkflowManagementPage />} />
                                    <Route path="/search" element={<SearchPage />} />
                                    <Route path="/files" element={<FileManagementPage />} />
                                    <Route path="/email-templates" element={<EmailTemplatesPage />} />
                                    <Route path="/custom-fields" element={<CustomFieldsPage />} />
                                    <Route path="/tenants" element={<TenantManagementPage />} />
                                    <Route path="/mfa" element={<MFASettingsPage />} />
                                    <Route path="/database" element={<DatabaseBrowserPage />} />
                                    <Route path="/cache" element={<CacheManagementPage />} />
                                    <Route path="/archive" element={<ArchivePage />} />
                                    <Route path="/deductions" element={<DeductionsPage />} />
                                    <Route path="/certifications" element={<CertificationsPage />} />
                                    <Route path="/logs" element={<LogViewerPage />} />
                                    <Route path="/performance" element={<PerformancePage />} />
                                    <Route path="/data-wipe" element={<DataWipePage />} />
                                    <Route path="/event-templates" element={<EventTemplatesPage />} />
                                    <Route path="/bulk-operations" element={<BulkOperationsPage />} />
                                    <Route path="/commentary" element={<CommentaryPage />} />
                                    <Route path="/category-types" element={<CategoryTypesPage />} />
                                  </Routes>
                                </Suspense>
                              </Layout>
                            </ProtectedRoute>
                          }
                        />
                      </Routes>
                    </Suspense>
                  </div>
                </SocketProvider>
              </AuthProvider>
            </Router>
          </ThemeProvider>
        </SystemSettingsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
