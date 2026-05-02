import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '../contexts/AuthContext'
import { settingsAPI } from '../services/api'
import { DEFAULT_APP_BASELINE } from '../config/appBaseline'
import { extractTenantSlugFromPath } from '../utils/routeSegments'
import toast from 'react-hot-toast'
import { ResponsiveTable } from '../components/ui'
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
  id: string
  title: string
  routePath: string
  description: string
  order: number
}

interface DocSection {
  id: string
  title: string
  icon: React.ComponentType<any>
  docs: DocItem[]
}

interface DocsApiSection {
  id: string
  title: string
  order: number
}

interface DocsApiItem {
  path: string
  title: string
  description: string
  sectionId: string
  sectionTitle: string
  sectionOrder: number
  order: number
}

const SECTION_ICONS: Record<string, React.ComponentType<any>> = {
  'getting-started': RocketLaunchIcon,
  'technical-reference': CodeBracketIcon,
  'security-deployment': ShieldCheckIcon,
  operations: WrenchScrewdriverIcon,
  'administration-advanced': BookOpenIcon,
}

const HelpPage: React.FC = () => {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { slug, '*': docPath } = useParams()
  const tenantSlug = slug || extractTenantSlugFromPath(location.pathname)
  const helpBasePath = tenantSlug ? `/${tenantSlug}/help` : '/help'
  const tenantHomePath = tenantSlug ? `/${tenantSlug}` : '/'

  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 1024px)').matches
  })
  const [docSections, setDocSections] = useState<DocSection[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [appName, setAppName] = useState<string>(DEFAULT_APP_BASELINE.appName)

  // Load documentation content
  const loadDoc = async (path: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/docs/${path}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          setShowLoginModal(true)
          throw new Error('Sign in required to access this documentation')
        }

        if (response.status === 403) {
          throw new Error('You do not have access to this documentation')
        }

        if (response.status === 404) {
          throw new Error('Documentation not found')
        }

        throw new Error('Failed to load documentation')
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
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
    navigate(`${helpBasePath}/${doc.routePath}`)
  }

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)

    try {
      const result = await login(loginEmail, loginPassword)
      if (result.requiresMFA) {
        toast('MFA verification is required. Continue on the login page.')
        setShowLoginModal(false)
        setLoginPassword('')
        navigate(tenantSlug ? `/${tenantSlug}/login` : '/login')
        return
      }
      toast.success('Logged in successfully!')
      setShowLoginModal(false)
      setLoginEmail('')
      setLoginPassword('')
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

  useEffect(() => {
    let cancelled = false

    const loadDocsNavigation = async () => {
      try {
        const response = await fetch('/api/docs', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to load documentation index')
        }

        const payload = await response.json()
        const docs = (payload.data?.flat || []) as DocsApiItem[]
        const sections = (payload.data?.sections || []) as DocsApiSection[]
        const docsBySection = new Map<string, DocItem[]>()

        docs.forEach((doc) => {
          const routePath = doc.path.replace(/\.md$/i, '')
          const sectionDocs = docsBySection.get(doc.sectionId) || []
          sectionDocs.push({
            id: doc.path,
            title: doc.title,
            routePath,
            description: doc.description,
            order: doc.order,
          })
          docsBySection.set(doc.sectionId, sectionDocs)
        })

        const nextSections = sections
          .sort((a, b) => a.order - b.order)
          .map((section) => ({
            id: section.id,
            title: section.title,
            icon: SECTION_ICONS[section.id] || BookOpenIcon,
            docs: (docsBySection.get(section.id) || []).sort((a, b) => a.order - b.order),
          }))
          .filter((section) => section.docs.length > 0)

        if (!cancelled) {
          setDocSections(nextSections)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load documentation navigation:', err)
          setDocSections([])
        }
      }
    }

    loadDocsNavigation()

    return () => {
      cancelled = true
    }
  }, [user])

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
      setContent(`# Welcome to ${appName} Documentation

## Getting Help

This documentation provides comprehensive information about the ${appName} event management system. Select a topic from the sidebar to learn more.

${!user ? `
### Public Documentation

The sidebar shows every document currently published for public access.

### Administrator Documentation

Additional operational and administration guides become available after signing in with an authorized account.
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

The sidebar now reflects the documentation available for your role (${user.role}).
` : ''}`)
    }
  }, [docPath, user, appName])

  return (
    <div className="cgr-page-container min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Login Modal */}
      {showLoginModal && (
        <div className="cgr-modal-overlay">
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
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Sign in with an authorized account to access restricted documentation.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="pages-helppage-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input id="pages-helppage-1"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label htmlFor="pages-helppage-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input id="pages-helppage-2"
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
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setSidebarOpen(false)
                }
                navigate(helpBasePath)
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

          {/* Documentation Sections */}
          <nav className="p-4 space-y-6">
            {docSections.map((section) => {
              const Icon = section.icon
              const filteredDocs = section.docs.filter(doc =>
                !searchQuery ||
                doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.description.toLowerCase().includes(searchQuery.toLowerCase())
              )

              if (filteredDocs.length === 0 && searchQuery) return null

              return (
                <div key={section.id}>
                  <div className="flex items-center mb-3">
                    <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                      {section.title}
                    </h3>
                  </div>
                  <ul className="space-y-1">
                    {filteredDocs.map((doc) => {
                      return (
                        <li key={doc.id}>
                          <button
                            onClick={() => selectDoc(doc)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                              docPath === doc.routePath || docPath === `${doc.routePath}.md`
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{doc.title}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {doc.description}
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
                Administrator Documentation
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-400 mb-3">
                Sign in to view operational and administration guides that are not published publicly.
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
                onClick={() => navigate(tenantHomePath)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Home
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Signed in as <span className="font-medium text-gray-900 dark:text-white">{user.email}</span>
              </span>
              <button
                onClick={() => {
                  const tenantSlug = user?.tenant?.slug
                  navigate(tenantSlug ? `/${tenantSlug}/dashboard` : '/dashboard')
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Back to Application
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(tenantHomePath)}
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
                        : <code className="text-sm font-mono text-gray-900 dark:text-gray-100" {...props}>{children}</code>
                    },
                    pre: ({node, ...props}) => <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 italic text-gray-600 dark:text-gray-400 mb-4 py-2" {...props} />,
                    a: ({node, children, ...props}) => (
                      <a
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        aria-label={typeof children === 'string' ? undefined : props.href}
                        {...props}
                      >
                        {children || props.href}
                      </a>
                    ),
                    strong: ({node, ...props}) => <strong className="font-semibold text-gray-900 dark:text-white" {...props} />,
                    hr: ({node, ...props}) => <hr className="my-8 border-gray-300 dark:border-gray-600" {...props} />,
                    table: ({node, ...props}) => (
                      <ResponsiveTable className="mb-4" minWidth="640px">
                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700" {...props} />
                      </ResponsiveTable>
                    ),
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
