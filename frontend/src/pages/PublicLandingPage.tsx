import React, { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { settingsAPI } from '../services/api'
import { DEFAULT_APP_BASELINE } from '../config/appBaseline'
import { formatDocumentTitle } from '../utils/documentTitle'
import {
  CalendarIcon,
  TrophyIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  UsersIcon,
  DocumentCheckIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

const getRoleHomePath = (role?: string): string => {
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

interface FeatureProps {
  icon: React.ElementType
  title: string
  description: string
}

const Feature: React.FC<FeatureProps> = ({ icon: Icon, title, description }) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="group relative p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative">
      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  </motion.div>
)

const PublicLandingPage: React.FC = () => {
  const { user } = useAuth()
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const [appName, setAppName] = React.useState(DEFAULT_APP_BASELINE.appName)
  const [appSubtitle, setAppSubtitle] = React.useState(DEFAULT_APP_BASELINE.appSubtitle)
  const [appDescription, setAppDescription] = React.useState(DEFAULT_APP_BASELINE.appDescription)
  const [logoPath, setLogoPath] = React.useState<string | null>(null)
  const [faviconPath, setFaviconPath] = React.useState<string | null>(null)

  const basePath = useMemo(() => (slug ? `/${slug}` : ''), [slug])

  useEffect(() => {
    if (user) {
      navigate(`${basePath}${getRoleHomePath(user.role)}`, { replace: true })
    }
  }, [basePath, navigate, user])

  useEffect(() => {
    let isCurrent = true
    ;(async () => {
      try {
        const response = await settingsAPI.getPublicSettings(slug || undefined)
        const data = response.data?.data || response.data || {}
        if (!isCurrent) return
        setAppName(data.appName || DEFAULT_APP_BASELINE.appName)
        setAppSubtitle(data.appSubtitle || DEFAULT_APP_BASELINE.appSubtitle)
        setAppDescription(data.appDescription || DEFAULT_APP_BASELINE.appDescription)
        setLogoPath(data.logoPath || null)
        setFaviconPath(data.faviconPath || null)
        const themeResponse = await settingsAPI.getThemeSettings(undefined, slug || undefined)
        const themeData = themeResponse.data?.data || themeResponse.data || {}
        if (!isCurrent) return
        setAppName(themeData.app_name || themeData.appName || data.appName || DEFAULT_APP_BASELINE.appName)
        setAppSubtitle(themeData.app_subtitle || themeData.appSubtitle || data.appSubtitle || DEFAULT_APP_BASELINE.appSubtitle)
        setAppDescription(themeData.app_description || themeData.appDescription || data.appDescription || DEFAULT_APP_BASELINE.appDescription)
        setLogoPath(themeData.theme_logoPath || themeData.logoPath || data.logoPath || null)
        setFaviconPath(themeData.theme_faviconPath || themeData.faviconPath || data.faviconPath || null)
      } catch {
        if (!isCurrent) return
        setAppName(DEFAULT_APP_BASELINE.appName)
        setAppSubtitle(DEFAULT_APP_BASELINE.appSubtitle)
        setAppDescription(DEFAULT_APP_BASELINE.appDescription)
        setLogoPath(null)
        setFaviconPath(null)
      }
    })()
    return () => {
      isCurrent = false
    }
  }, [slug])

  useEffect(() => {
    document.title = formatDocumentTitle(appName)
    const targetFavicon = faviconPath || '/favicon.ico'
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
    if (favicon) {
      favicon.href = targetFavicon
      return
    }
    const icon = document.createElement('link')
    icon.rel = 'icon'
    icon.href = targetFavicon
    document.head.appendChild(icon)
  }, [appName, faviconPath])

  const features: FeatureProps[] = [
    {
      icon: CalendarIcon,
      title: 'Event Management',
      description: 'Create, organize, and manage events with intuitive tools designed for contest organizers.',
    },
    {
      icon: TrophyIcon,
      title: 'Scoring & Results',
      description: 'Real-time scoring, automated calculations, and instant result publication for participants.',
    },
    {
      icon: DocumentCheckIcon,
      title: 'Certifications',
      description: 'Generate and distribute professional certificates with customizable templates and verification.',
    },
    {
      icon: ChartBarIcon,
      title: 'Reporting & Analytics',
      description: 'Comprehensive reports and insights to track performance and make data-driven decisions.',
    },
    {
      icon: UsersIcon,
      title: 'Role-Based Access',
      description: 'Secure multi-user system with tailored dashboards for organizers, auditors, and participants.',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with audit trails, backups, and disaster recovery capabilities.',
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  }

  return (
    <div className="cgr-page-container min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              {logoPath || faviconPath ? (
                <img
                  src={logoPath || faviconPath || ''}
                  alt={appName}
                  className="w-8 h-8 rounded-lg object-cover border border-blue-100 dark:border-gray-700"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="text-xl font-bold text-gray-900 dark:text-white">{appName}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to={`${basePath}/login`}
                className="inline-flex h-9 items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-transparent to-indigo-100/50 dark:from-blue-900/20 dark:via-transparent dark:to-indigo-900/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-40">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium mb-8">
              <SparklesIcon className="w-4 h-4" />
              <span>Event Management Simplified</span>
            </motion.div>
            
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6"
            >
              Manage Events, Scoring &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                Certifications
              </span>{' '}
              in One Place
            </motion.h1>
            
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              {appDescription}
            </motion.p>
            
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to={`${basePath}/login`}
                className="group w-full sm:w-auto px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-700/25 hover:shadow-blue-700/40"
              >
                Log In to Your Account
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <motion.p
              variants={itemVariants}
              className="mt-6 text-sm text-gray-500 dark:text-gray-500"
            >
              New accounts require an invitation from an organizer or admin
            </motion.p>
            {appSubtitle && (
              <motion.p
                variants={itemVariants}
                className="mt-2 text-xs text-gray-500 dark:text-gray-500"
              >
                {appSubtitle}
              </motion.p>
            )}
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl" />
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Run Successful Events
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful features designed to handle every aspect of event management, 
              from planning to post-event reporting.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Feature {...feature} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Streamline Your Events?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              {appName} provides practical tools for scoring, certifications, and event administration.
              Sign in or contact your administrator for access.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={`${basePath}/login`}
                className="w-full sm:w-auto px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-700/25"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {logoPath || faviconPath ? (
                <img
                  src={logoPath || faviconPath || ''}
                  alt={appName}
                  className="w-8 h-8 rounded-lg object-cover border border-blue-100 dark:border-gray-700"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="text-lg font-bold text-gray-900 dark:text-white">{appName}</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
              © {new Date().getFullYear()} {appName}. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                to={`${basePath}/login`}
                className="inline-flex h-9 items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PublicLandingPage
