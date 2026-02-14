import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '../contexts/AuthContext'
import { settingsAPI } from '../services/api'
import { DEFAULT_APP_BASELINE } from '../config/appBaseline'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  BookOpenIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  RocketLaunchIcon,
  CodeBracketIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon,
  LockClosedIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

interface DocItem {
  title: string
  path: string
  description: string
  requiredRole?: string[]
}

interface DocSection {
  title: string
  icon: React.ComponentType<any>
  docs: DocItem[]
}

const HelpPage: React.FC = () => {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { '*': docPath } = useParams()

  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [attemptedDoc, setAttemptedDoc] = useState<DocItem | null>(null)
  const [appName, setAppName] = useState<string>(DEFAULT_APP_BASELINE.appName)

  // Documentation structure - ALL docs always visible
  const docSections: DocSection[] = [
    {
      title: 'Getting Started',
      icon: RocketLaunchIcon,
      docs: [
        {
          title: 'System Architecture',
          path: '01-ARCHITECTURE',
          description: 'Overview of the application architecture'
        },
        {
          title: 'Getting Started',
          path: '02-GETTING-STARTED',
          description: 'Quick start guide for new users'
        },
        {
          title: 'Features Overview',
          path: '03-FEATURES',
          description: 'Comprehensive overview of all features'
        },
      ]
    },
    {
      title: 'Technical Reference',
      icon: CodeBracketIcon,
      docs: [
        {
          title: 'API Reference',
          path: '04-API-REFERENCE',
          description: 'Complete API documentation'
        },
        {
          title: 'Database Schema',
          path: '05-DATABASE',
          description: 'Database structure and relationships'
        },
        {
          title: 'Frontend Guide',
          path: '06-FRONTEND',
          description: 'Frontend architecture and development'
        },
      ]
    },
    {
      title: 'Security & Deployment',
      icon: ShieldCheckIcon,
      docs: [
        {
          title: 'Security Guide',
          path: '07-SECURITY',
          description: 'Security features and best practices'
        },
        {
          title: 'Deployment Guide',
          path: '08-DEPLOYMENT',
          description: 'Production deployment instructions',
          requiredRole: ['ADMIN', 'SUPER_ADMIN']
        },
        {
          title: 'Development Setup',
          path: '09-DEVELOPMENT',
          description: 'Local development environment setup',
          requiredRole: ['ADMIN', 'SUPER_ADMIN']
        },
      ]
    },
    {
      title: 'Operations',
      icon: WrenchScrewdriverIcon,
      docs: [
        {
          title: 'Troubleshooting',
          path: '10-TROUBLESHOOTING',
          description: 'Common issues and solutions'
        },
        {
          title: 'Disaster Recovery',
          path: '11-DISASTER-RECOVERY',
          description: 'Backup and restore procedures',
          requiredRole: ['ADMIN', 'SUPER_ADMIN']
        },
        {
          title: 'Admin Guide',
          path: '13-ADMIN-GUIDE',
          description: 'System administration and monitoring',
          requiredRole: ['ADMIN', 'SUPER_ADMIN']
        },
      ]
    },
  ]

  // Check if user has required role
  const hasRequiredRole = (requiredRole?: string[]): boolean => {
    if (!requiredRole || requiredRole.length === 0) return true
    if (!user) return false
    return requiredRole.includes(user.role)
  }

  // Check if doc is locked
  const isDocLocked = (doc: DocItem): boolean => {
    return !hasRequiredRole(doc.requiredRole)
  }

  // Load documentation content
  const loadDoc = async (path: string, doc?: DocItem) => {
    // Check if locked
    if (doc && isDocLocked(doc)) {
      setAttemptedDoc(doc)
      setShowLoginModal(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/docs/${path}.md`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Documentation not found')
      }

      const data = await response.json()

      if (data.success && data.data) {
        setContent(data.data.content)
      } else {
        throw new Error('Failed to load documentation')
      }
    } catch (err) {
      console.error('Error loading documentation:', err)
      setError(err instanceof Error ? err.message : 'Failed to load documentation')
      setContent('')
    } finally {
      setLoading(false)
    }
  }

  // Handle doc selection
  const selectDoc = (doc: DocItem) => {
    if (isDocLocked(doc)) {
      setAttemptedDoc(doc)
      setShowLoginModal(true)
      return
    }

    const basePath = location.pathname.includes('/:slug/help')
      ? location.pathname.split('/help')[0] + '/help'
      : '/help'
    navigate(`${basePath}/${doc.path}`)
  }

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)

    try {
      await login(loginEmail, loginPassword)
      toast.success('Logged in successfully!')
      setShowLoginModal(false)
      setLoginEmail('')
      setLoginPassword('')

      // Load the attempted doc if available
      if (attemptedDoc) {
        const basePath = location.pathname.includes('/:slug/help')
          ? location.pathname.split('/help')[0] + '/help'
          : '/help'
        navigate(`${basePath}/${attemptedDoc.path}`)
        setAttemptedDoc(null)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed')
    } finally {
      setLoginLoading(false)
    }
  }

  // Helper function to create slug from heading text
  const createSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  // Load app name from settings
  useEffect(() => {
    const loadAppName = async () => {
      try {
        const response = await settingsAPI.getThemeSettings()
        const data = response.data?.data || response.data
        if (data && (data.app_name || data.appName)) {
          setAppName(data.app_name || data.appName)
        }
      } catch (err) {
        console.error('Failed to load app name:', err)
        // Keep default baseline app name on error
      }
    }
    loadAppName()
  }, [])

  // Scroll to hash when content changes or hash changes
  useEffect(() => {
    const hash = location.hash
    if (hash && content) {
      // Wait for content to render
      setTimeout(() => {
        const element = document.getElementById(hash.substring(1))
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }, [content, location.hash])

  // Load doc on mount or path change
  useEffect(() => {
    if (docPath) {
      loadDoc(docPath)
    } else {
      // Default public content for non-authenticated users
      setContent(`# Welcome to ${appName} Documentation

## Getting Help

This documentation provides comprehensive information about the ${appName} event management system. Select a topic from the sidebar to learn more.

${!user ? `
### 🔓 Public Documentation

You can access the following without logging in:
- **Getting Started**: Learn the basics of the system
- **Features Overview**: Understand what ${appName} can do
- **Troubleshooting**: Common issues and solutions
- **Security Guide**: Best practices and security features

### 🔒 Administrator Documentation

Some advanced documentation requires administrator access. Topics marked with a lock icon 🔒 require you to log in with an admin account.

You can log in directly on this page by clicking any locked topic.
` : ''}

## Quick Troubleshooting

### Common Issues

**Cannot log in**
- Verify your email and password are correct
- Check that your account is active
- Contact your system administrator if you continue to have issues

**Scores not appearing**
- Ensure you've selected the correct event
- Verify scores have been submitted (not just saved)
- Check that you have permission to view the scores

**Page not loading**
- Try refreshing the page (Ctrl+R or Cmd+R)
- Clear your browser cache
- Try a different browser

**Print/Export not working**
- Ensure pop-ups are not blocked
- Check your printer settings
- Try exporting to PDF first

### Need More Help?

- **Search Documentation**: Use the search bar above to find specific topics
- **Contact Support**: Reach out to your system administrator
- **Report Issues**: Contact technical support if you encounter bugs

${user ? `
### Signed in as ${user.email}

You now have access to all documentation for your role (${user.role}).
` : ''}`)
    }
  }, [docPath, user, appName])

  return (
    <div className="cgr-page-container min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LockClosedIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Login Required
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowLoginModal(false)
                  setAttemptedDoc(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            {attemptedDoc && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-300">
                  <strong>{attemptedDoc.title}</strong> requires{' '}
                  {attemptedDoc.requiredRole?.join(' or ')} access.
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  {attemptedDoc.description}
                </p>
              </div>
            )}

            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Sign in with your administrator account to access this documentation.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loginLoading ? 'Signing in...' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false)
                    setAttemptedDoc(null)
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Don't have an account? Contact your system administrator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0`}>
        <div className="h-full overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BookOpenIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Documentation</h2>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Home Link */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                const basePath = location.pathname.includes('/:slug/help')
                  ? location.pathname.split('/help')[0] + '/help'
                  : '/help'
                navigate(basePath)
              }}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${
                !docPath
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <HomeIcon className="h-5 w-5 mr-3" />
              <span className="text-sm font-medium">Home</span>
            </button>
          </div>

          {/* Documentation Sections - ALWAYS SHOW ALL */}
          <nav className="p-4 space-y-6">
            {docSections.map((section, sectionIdx) => {
              const Icon = section.icon
              const filteredDocs = section.docs.filter(doc =>
                !searchQuery ||
                doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.description.toLowerCase().includes(searchQuery.toLowerCase())
              )

              if (filteredDocs.length === 0 && searchQuery) return null

              return (
                <div key={sectionIdx}>
                  <div className="flex items-center mb-3">
                    <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                      {section.title}
                    </h3>
                  </div>
                  <ul className="space-y-1">
                    {filteredDocs.map((doc, docIdx) => {
                      const locked = isDocLocked(doc)
                      return (
                        <li key={docIdx}>
                          <button
                            onClick={() => selectDoc(doc)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                              docPath === doc.path
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : locked
                                ? 'text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex-1 min-w-0 flex items-start gap-2">
                              {locked && (
                                <LockClosedIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{doc.title}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                  {doc.description}
                                </div>
                              </div>
                            </div>
                            <ChevronRightIcon className="h-4 w-4 ml-2 flex-shrink-0" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </nav>

          {/* Login Prompt at bottom if not logged in */}
          {!user && (
            <div className="p-4 m-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-300 mb-2 font-medium">
                🔒 Administrator Access
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-400 mb-3">
                Some documentation requires admin access. Click any locked topic to sign in.
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          {user ? (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Home
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Signed in as <span className="font-medium text-gray-900 dark:text-white">{user.email}</span>
              </span>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Back to Application
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading documentation...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">
                  Error Loading Documentation
                </h2>
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            ) : (
              <article className="prose prose-blue dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({node, children, ...props}) => {
                      const text = String(children)
                      const id = createSlug(text)
                      return <h1 id={id} className="text-4xl font-bold text-gray-900 dark:text-white mb-6 mt-8 border-b border-gray-200 dark:border-gray-700 pb-4" {...props}>{children}</h1>
                    },
                    h2: ({node, children, ...props}) => {
                      const text = String(children)
                      const id = createSlug(text)
                      return <h2 id={id} className="text-3xl font-semibold text-gray-900 dark:text-white mt-8 mb-4" {...props}>{children}</h2>
                    },
                    h3: ({node, children, ...props}) => {
                      const text = String(children)
                      const id = createSlug(text)
                      return <h3 id={id} className="text-2xl font-semibold text-gray-900 dark:text-white mt-6 mb-3" {...props}>{children}</h3>
                    },
                    h4: ({node, children, ...props}) => {
                      const text = String(children)
                      const id = createSlug(text)
                      return <h4 id={id} className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2" {...props}>{children}</h4>
                    },
                    p: ({node, ...props}) => <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2" {...props} />,
                    li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                    code: ({node, className, children, ...props}: any) => {
                      const isInline = !className?.includes('language-')
                      return isInline
                        ? <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-sm rounded font-mono text-blue-600 dark:text-blue-400" {...props}>{children}</code>
                        : <code className="block p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm overflow-x-auto mb-4 font-mono" {...props}>{children}</code>
                    },
                    pre: ({node, ...props}) => <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4 border border-gray-200 dark:border-gray-700" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 italic text-gray-600 dark:text-gray-400 mb-4 py-2" {...props} />,
                    a: ({node, ...props}) => <a className="text-blue-600 dark:text-blue-400 hover:underline font-medium" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-gray-900 dark:text-white" {...props} />,
                    hr: ({node, ...props}) => <hr className="my-8 border-gray-300 dark:border-gray-600" {...props} />,
                    table: ({node, ...props}) => <div className="overflow-x-auto mb-4"><table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700" {...props} /></div>,
                    thead: ({node, ...props}) => <thead className="bg-gray-50 dark:bg-gray-800" {...props} />,
                    tbody: ({node, ...props}) => <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800" {...props} />,
                    tr: ({node, ...props}) => <tr {...props} />,
                    th: ({node, ...props}) => <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" {...props} />,
                    td: ({node, ...props}) => <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300" {...props} />,
                  }}
                >
                  {content}
                </ReactMarkdown>
              </article>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default HelpPage
