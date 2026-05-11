import React, { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { settingsAPI } from '../services/api'
import { DEFAULT_APP_BASELINE } from '../config/appBaseline'
import { formatDocumentTitle } from '../utils/documentTitle'
import {
  clonePublicLandingContent,
  normalizePublicLandingContent,
  type PublicLandingContent,
  type PublicLandingFeatureIcon,
} from '../types/publicLandingContent'
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

const getFeatureIcon = (icon: PublicLandingFeatureIcon): React.ElementType => {
  switch (icon) {
    case 'calendar':
      return CalendarIcon
    case 'trophy':
      return TrophyIcon
    case 'chart':
      return ChartBarIcon
    case 'shield':
      return ShieldCheckIcon
    case 'users':
      return UsersIcon
    case 'document':
      return DocumentCheckIcon
    case 'sparkles':
    default:
      return SparklesIcon
  }
}

const isExternalHref = (href: string): boolean => /^(https?:|mailto:|tel:)/i.test(href)

const buildTenantAwareHref = (href: string, basePath: string): string => {
  if (!href.startsWith('/')) return href
  if (!basePath) return href
  if (href === '/') return basePath
  if (href === basePath || href.startsWith(`${basePath}/`)) return href
  return `${basePath}${href}`
}

const isAllowedInvitationHref = (href: string): boolean =>
  href.startsWith('/') || /^(https?:|mailto:|tel:)/i.test(href)

const renderInlineLinkedText = (text: string, basePath: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = []
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|((?:https?:\/\/|mailto:|tel:)[^\s]+)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const markdownLabel = match[1]
    const markdownHref = match[2]
    const plainHref = match[3]
    const rawHref = markdownHref || plainHref || ''

    if (!rawHref || !isAllowedInvitationHref(rawHref)) {
      parts.push(match[0])
    } else {
      const resolvedHref = buildTenantAwareHref(rawHref, basePath)
      const isHttpLink = /^https?:\/\//i.test(resolvedHref)
      parts.push(
        <a
          key={`inline-link-${match.index}`}
          href={resolvedHref}
          className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
          target={isHttpLink ? '_blank' : undefined}
          rel={isHttpLink ? 'noreferrer' : undefined}
        >
          {markdownLabel || plainHref}
        </a>
      )
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
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

interface LandingActionLinkProps {
  href: string
  basePath: string
  className: string
  children: React.ReactNode
}

const LandingActionLink: React.FC<LandingActionLinkProps> = ({
  href,
  basePath,
  className,
  children,
}) => {
  const resolvedHref = buildTenantAwareHref(href, basePath)
  const isHttpLink = /^https?:\/\//i.test(resolvedHref)
  const isExternal = isExternalHref(resolvedHref)

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (/^(mailto:|tel:)/i.test(resolvedHref)) {
      event.preventDefault()
      window.location.href = resolvedHref
    }
  }

  return (
    <a
      href={resolvedHref}
      onClick={handleClick}
      className={`${className} inline-flex items-center justify-center cursor-pointer`}
      target={isExternal && isHttpLink ? '_blank' : undefined}
      rel={isExternal && isHttpLink ? 'noreferrer' : undefined}
    >
      {children}
    </a>
  )
}

const PublicLandingPage: React.FC = () => {
  const { user } = useAuth()
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const [appName, setAppName] = React.useState(DEFAULT_APP_BASELINE.appName)
  const [appSubtitle, setAppSubtitle] = React.useState(DEFAULT_APP_BASELINE.appSubtitle)
  const [appDescription, setAppDescription] = React.useState(DEFAULT_APP_BASELINE.appDescription)
  const [logoPath, setLogoPath] = React.useState<string | null>(null)
  const [faviconPath, setFaviconPath] = React.useState<string | null>(null)
  const [contactEmail, setContactEmail] = React.useState<string | null>(DEFAULT_APP_BASELINE.contactEmail)
  const [landingPage, setLandingPage] = React.useState<PublicLandingContent>(clonePublicLandingContent())

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
        setContactEmail(data.contactEmail || DEFAULT_APP_BASELINE.contactEmail)
        setLandingPage(normalizePublicLandingContent(data.landingPage))
      } catch {
        if (!isCurrent) return
        setAppName(DEFAULT_APP_BASELINE.appName)
        setAppSubtitle(DEFAULT_APP_BASELINE.appSubtitle)
        setAppDescription(DEFAULT_APP_BASELINE.appDescription)
        setLogoPath(null)
        setFaviconPath(null)
        setContactEmail(DEFAULT_APP_BASELINE.contactEmail)
        setLandingPage(clonePublicLandingContent())
      }
    })()
    return () => {
      isCurrent = false
    }
  }, [slug])

  useEffect(() => {
    document.title = formatDocumentTitle(appName)
    const targetFavicon = faviconPath || '/favicon.svg'
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

  const features: FeatureProps[] = landingPage.featureSection.items.map((feature) => ({
    icon: getFeatureIcon(feature.icon),
    title: feature.title,
    description: feature.description,
  }))

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
      {landingPage.announcement.enabled && landingPage.announcement.text && (
        <section
          className="border-b"
          style={{
            backgroundColor: landingPage.announcement.backgroundColor,
            color: landingPage.announcement.textColor,
            borderColor: `${landingPage.announcement.textColor}22`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <p
              className="text-sm font-medium text-center"
              style={{ color: landingPage.announcement.textColor }}
            >
              {landingPage.announcement.text}
            </p>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-100/50 via-transparent to-indigo-100/50 dark:from-blue-900/20 dark:via-transparent dark:to-indigo-900/20"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-40">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center max-w-4xl mx-auto"
          >
            {landingPage.hero.badge && (
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium mb-8">
                <SparklesIcon className="w-4 h-4" />
                <span>{landingPage.hero.badge}</span>
              </motion.div>
            )}
            
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6"
            >
              {landingPage.hero.title}{' '}
              {landingPage.hero.highlight ? (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                  {landingPage.hero.highlight}
                </span>
              ) : null}
            </motion.h1>
            
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              {landingPage.hero.description || appDescription}
            </motion.p>
            
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <LandingActionLink
                href={landingPage.hero.primaryCtaUrl}
                basePath={basePath}
                className="group w-full sm:w-auto px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-700/25 hover:shadow-blue-700/40"
              >
                {landingPage.hero.primaryCtaLabel}
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </LandingActionLink>
              {landingPage.hero.secondaryCtaLabel && landingPage.hero.secondaryCtaUrl && (
                <LandingActionLink
                  href={landingPage.hero.secondaryCtaUrl}
                  basePath={basePath}
                  className="w-full sm:w-auto px-8 py-4 bg-white/90 dark:bg-gray-900/80 text-gray-900 dark:text-white font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                >
                  {landingPage.hero.secondaryCtaLabel}
                </LandingActionLink>
              )}
            </motion.div>

            {landingPage.hero.invitationNote && (
              <motion.p
                variants={itemVariants}
                className="mt-6 text-sm text-gray-500 dark:text-gray-500"
              >
                {renderInlineLinkedText(landingPage.hero.invitationNote, basePath)}
              </motion.p>
            )}
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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/4 left-10 w-72 h-72 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1/4 right-10 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl"
        />
      </section>

      {/* Features Section */}
      {landingPage.featureSection.enabled && (
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
              {landingPage.featureSection.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {landingPage.featureSection.subtitle}
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
      )}

      {/* CTA Section */}
      {landingPage.ctaSection.enabled && (
      <section className="py-24 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {landingPage.ctaSection.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              {landingPage.ctaSection.description}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <LandingActionLink
                href={landingPage.ctaSection.primaryCtaUrl}
                basePath={basePath}
                className="w-full sm:w-auto px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-700/25"
              >
                {landingPage.ctaSection.primaryCtaLabel}
              </LandingActionLink>
              {landingPage.ctaSection.secondaryCtaLabel && landingPage.ctaSection.secondaryCtaUrl && (
                <LandingActionLink
                  href={landingPage.ctaSection.secondaryCtaUrl}
                  basePath={basePath}
                  className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold rounded-xl border border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-950"
                >
                  {landingPage.ctaSection.secondaryCtaLabel}
                </LandingActionLink>
              )}
            </div>
          </motion.div>
        </div>
      </section>
      )}
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
          {(landingPage.footer.tagline || contactEmail) && (
            <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4 flex flex-col md:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center md:text-left">
                {landingPage.footer.tagline}
              </p>
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  {contactEmail}
                </a>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}

export default PublicLandingPage
