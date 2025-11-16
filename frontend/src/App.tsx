import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useEffect, useState } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SystemSettingsProvider } from './contexts/SystemSettingsContext'
import Layout from './components/Layout'
import CommandPalette from './components/CommandPalette'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EventsPage from './pages/EventsPage'
import ContestsPage from './pages/ContestsPage'
import CategoriesPage from './pages/CategoriesPage'
import ScoringPage from './pages/ScoringPage'
import ResultsPage from './pages/ResultsPage'
import UsersPage from './pages/UsersPage'
import AdminPage from './pages/AdminPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import EmceePage from './pages/EmceePage'
import TemplatesPage from './pages/TemplatesPage'
import ReportsPage from './pages/ReportsPage'
import NotificationsPage from './pages/NotificationsPage'
import BackupManagementPage from './pages/BackupManagementPage'
import DisasterRecoveryPage from './pages/DisasterRecoveryPage'
import WorkflowManagementPage from './pages/WorkflowManagementPage'
import SearchPage from './pages/SearchPage'
import FileManagementPage from './pages/FileManagementPage'
import EmailTemplatesPage from './pages/EmailTemplatesPage'
import CustomFieldsPage from './pages/CustomFieldsPage'
import TenantManagementPage from './pages/TenantManagementPage'
import MFASettingsPage from './pages/MFASettingsPage'
import DatabaseBrowserPage from './pages/DatabaseBrowserPage'
import CacheManagementPage from './pages/CacheManagementPage'
import ArchivePage from './pages/ArchivePage'
import DeductionsPage from './pages/DeductionsPage'
import CertificationsPage from './pages/CertificationsPage'
import LogViewerPage from './pages/LogViewerPage'
import PerformancePage from './pages/PerformancePage'
import DataWipePage from './pages/DataWipePage'
import EventTemplatesPage from './pages/EventTemplatesPage'
import BulkOperationsPage from './pages/BulkOperationsPage'
import CommentaryPage from './pages/CommentaryPage'
import CategoryTypesPage from './pages/CategoryTypesPage'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

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
                  <CommandPalette
                    isOpen={isCommandPaletteOpen}
                    onClose={() => setIsCommandPaletteOpen(false)}
                  />
                  <div className="min-h-screen bg-gray-50">
                    <Routes>
                      <Route path="/login" element={<LoginPage />} />
                      <Route
                        path="/*"
                        element={
                          <ProtectedRoute>
                            <Layout onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}>
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
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
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
