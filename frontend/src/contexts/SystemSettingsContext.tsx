import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { DEFAULT_APP_BASELINE } from '../config/appBaseline'
import { settingsAPI } from '../services/api'
import { formatDocumentTitle } from '../utils/documentTitle'
import { extractTenantSlugFromPath } from '../utils/routeSegments'

interface SystemSettings {
  // App settings
  app_name?: string
  app_subtitle?: string

  // Theme settings
  theme_primaryColor?: string
  theme_secondaryColor?: string
  theme_accentColor?: string
  theme_successColor?: string
  theme_warningColor?: string
  theme_dangerColor?: string
  theme_infoColor?: string
  theme_lightBackground?: string
  theme_darkBackground?: string
  theme_fontFamily?: string
  theme_fontSize?: string
  theme_logoPath?: string
  theme_faviconPath?: string
  theme_customCSS?: string

  // Header/Footer colors
  theme_headerBackgroundLight?: string
  theme_headerBackgroundDark?: string
  theme_footerBackgroundLight?: string
  theme_footerBackgroundDark?: string

  // Card colors
  theme_cardBackgroundLight?: string
  theme_cardBackgroundDark?: string

  // Other UI elements
  theme_accordionBackgroundLight?: string
  theme_accordionBackgroundDark?: string
  theme_accordionBorderLight?: string
  theme_accordionBorderDark?: string

  [key: string]: string | undefined
}

interface SystemSettingsContextType {
  settings: SystemSettings
  isLoading: boolean
  error: string | null
  refreshSettings: () => Promise<void>
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined)
const DYNAMIC_PRIMARY_STYLE_ID = 'dynamic-primary-theme'
const CUSTOM_THEME_STYLE_ID = 'custom-theme-css'
const DEFAULT_THEME_COLOR = '#6366f1'
const DEFAULT_MANIFEST_PATH = '/api/v1/settings/pwa-manifest'
const THEME_SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000
const THEME_VARIABLES = [
  '--color-primary',
  '--color-secondary',
  '--color-accent',
  '--color-success',
  '--color-warning',
  '--color-danger',
  '--color-info',
  '--bg-light',
  '--bg-dark',
  '--font-family',
  '--font-size-base',
] as const

interface ThemeSettingsCacheEntry {
  data: SystemSettings
  expiresAt: number
}

const themeSettingsCache = new Map<string, ThemeSettingsCacheEntry>()
const themeSettingsInFlight = new Map<string, Promise<SystemSettings>>()

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext)
  if (context === undefined) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider')
  }
  return context
}

interface SystemSettingsProviderProps {
  children: ReactNode
}

export const SystemSettingsProvider: React.FC<SystemSettingsProviderProps> = ({ children }) => {
  const location = useLocation()
  const [settings, setSettings] = useState<SystemSettings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestSequenceRef = useRef(0)
  const tenantSlug = extractTenantSlugFromPath(location.pathname)
  const tenantScopeKey = tenantSlug || (typeof window !== 'undefined' ? window.location.host.toLowerCase() : 'default')

  const updateManifestHref = (tenantSlug?: string | null) => {
    const manifestHref = tenantSlug
      ? `${DEFAULT_MANIFEST_PATH}?tenantSlug=${encodeURIComponent(tenantSlug)}`
      : DEFAULT_MANIFEST_PATH
    const absoluteManifestHref = typeof window !== 'undefined'
      ? new URL(manifestHref, window.location.origin).href
      : manifestHref

    let manifestLink = document.getElementById('tenant-manifest-link') as HTMLLinkElement | null
    if (!manifestLink) {
      manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null
    }
    if (!manifestLink) {
      manifestLink = document.createElement('link')
      manifestLink.rel = 'manifest'
      manifestLink.id = 'tenant-manifest-link'
      document.head.appendChild(manifestLink)
    }
    manifestLink.id = 'tenant-manifest-link'
    if (manifestLink.href !== absoluteManifestHref) {
      manifestLink.href = absoluteManifestHref
    }

    // Keep only one manifest link so install metadata cannot fall back to stale static values.
    const allManifestLinks = Array.from(document.querySelectorAll("link[rel='manifest']"))
    allManifestLinks.forEach((linkNode) => {
      if (linkNode !== manifestLink) {
        linkNode.remove()
      }
    })
  }

  const updateThemeColorMeta = (themeColor?: string | null) => {
    const resolvedColor = themeColor || DEFAULT_THEME_COLOR
    let themeColorMeta = document.querySelector("meta[name='theme-color']") as HTMLMetaElement | null
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta')
      themeColorMeta.name = 'theme-color'
      document.head.appendChild(themeColorMeta)
    }
    themeColorMeta.content = resolvedColor
  }

  const updateFavicon = (faviconPath?: string | null) => {
    const targetHref = faviconPath || '/favicon.svg'
    const faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
    if (faviconLink) {
      faviconLink.href = targetHref
      return
    }
    const newFavicon = document.createElement('link')
    newFavicon.rel = 'icon'
    newFavicon.href = targetHref
    document.head.appendChild(newFavicon)
  }

  const updateAppleTouchIcon = (iconPath?: string | null) => {
    const targetHref = iconPath || '/pwa-192x192.png'
    let appleTouchIconLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null
    if (!appleTouchIconLink) {
      appleTouchIconLink = document.createElement('link')
      appleTouchIconLink.rel = 'apple-touch-icon'
      document.head.appendChild(appleTouchIconLink)
    }
    appleTouchIconLink.href = targetHref
  }

  const clearThemeSettings = () => {
    const root = document.documentElement
    THEME_VARIABLES.forEach((variableName) => root.style.removeProperty(variableName))
    document.getElementById(DYNAMIC_PRIMARY_STYLE_ID)?.remove()
    document.getElementById(CUSTOM_THEME_STYLE_ID)?.remove()
    updateThemeColorMeta(null)
    updateFavicon(null)
    updateAppleTouchIcon(null)
  }

  const commitThemeSettings = (resolvedThemeData: SystemSettings) => {
    setSettings(resolvedThemeData)
    clearThemeSettings()
    applyThemeSettings(resolvedThemeData)
  }

  const fetchSettings = async (options: { force?: boolean } = {}) => {
    const requestSequence = ++requestSequenceRef.current
    try {
      setIsLoading(true)
      setError(null)
      updateManifestHref(tenantSlug)

      const cached = themeSettingsCache.get(tenantScopeKey)
      if (!options.force && cached && cached.expiresAt > Date.now()) {
        if (requestSequence === requestSequenceRef.current) {
          commitThemeSettings(cached.data)
        }
        return
      }

      let settingsRequest = themeSettingsInFlight.get(tenantScopeKey)
      if (!settingsRequest || options.force) {
        settingsRequest = settingsAPI
          .getThemeSettings(undefined, tenantSlug || undefined)
          .then((response) => {
            const themeData = response.data?.data || response.data?.settings || response.data
            return (themeData && typeof themeData === 'object')
              ? (themeData as SystemSettings)
              : {}
          })
          .finally(() => {
            themeSettingsInFlight.delete(tenantScopeKey)
          })

        themeSettingsInFlight.set(tenantScopeKey, settingsRequest)
      }

      const resolvedThemeData = await settingsRequest

      if (requestSequence !== requestSequenceRef.current) {
        return
      }
      themeSettingsCache.set(tenantScopeKey, {
        data: resolvedThemeData,
        expiresAt: Date.now() + THEME_SETTINGS_CACHE_TTL_MS,
      })
      commitThemeSettings(resolvedThemeData)
    } catch (err: any) {
      if (requestSequence !== requestSequenceRef.current) {
        return
      }
      console.error('Failed to load system settings:', err)
      setSettings({})
      clearThemeSettings()
      document.title = formatDocumentTitle(DEFAULT_APP_BASELINE.appName)
      setError(err.message || 'Failed to load settings')
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setIsLoading(false)
      }
    }
  }

  const applyThemeSettings = (themeSettings: SystemSettings) => {
    const root = document.documentElement

    // Set document title
    if (themeSettings.app_name) {
      document.title = formatDocumentTitle(themeSettings.app_name)
    }

    // Apply CSS custom properties
    if (themeSettings.theme_primaryColor) {
      root.style.setProperty('--color-primary', themeSettings.theme_primaryColor)
      const primary = themeSettings.theme_primaryColor
      let dynamicStyle = document.getElementById(DYNAMIC_PRIMARY_STYLE_ID) as HTMLStyleElement | null
      if (!dynamicStyle) {
        dynamicStyle = document.createElement('style')
        dynamicStyle.id = DYNAMIC_PRIMARY_STYLE_ID
        document.head.appendChild(dynamicStyle)
      }
      dynamicStyle.textContent = `
        .bg-blue-600, .bg-blue-500, .bg-indigo-600, .bg-indigo-500,
        .dark .dark\\:bg-blue-500, .dark .dark\\:bg-blue-600, .dark .dark\\:bg-indigo-500, .dark .dark\\:bg-indigo-600 { background-color: ${primary} !important; }
        .hover\\:bg-blue-700:hover, .hover\\:bg-blue-600:hover, .hover\\:bg-indigo-700:hover, .hover\\:bg-indigo-600:hover,
        .dark .dark\\:hover\\:bg-blue-600:hover, .dark .dark\\:hover\\:bg-blue-500:hover, .dark .dark\\:hover\\:bg-indigo-600:hover, .dark .dark\\:hover\\:bg-indigo-500:hover { filter: brightness(0.9); }
        .text-blue-600, .text-blue-500, .text-indigo-600, .text-indigo-500,
        .dark .dark\\:text-blue-400, .dark .dark\\:text-blue-300, .dark .dark\\:text-indigo-400, .dark .dark\\:text-indigo-300 { color: ${primary} !important; }
        .border-blue-600, .border-blue-500, .border-indigo-600, .border-indigo-500,
        .ring-blue-500, .focus\\:ring-blue-500 { border-color: ${primary} !important; --tw-ring-color: ${primary} !important; }
        .from-blue-600, .from-blue-500, .from-indigo-600, .from-indigo-500 { --tw-gradient-from: ${primary} var(--tw-gradient-from-position) !important; }
        .to-blue-600, .to-blue-500, .to-indigo-600, .to-indigo-500 { --tw-gradient-to: ${primary} var(--tw-gradient-to-position) !important; }
      `
    }
    if (themeSettings.theme_secondaryColor) {
      root.style.setProperty('--color-secondary', themeSettings.theme_secondaryColor)
    }
    if (themeSettings.theme_accentColor) {
      root.style.setProperty('--color-accent', themeSettings.theme_accentColor)
    }
    if (themeSettings.theme_successColor) {
      root.style.setProperty('--color-success', themeSettings.theme_successColor)
    }
    if (themeSettings.theme_warningColor) {
      root.style.setProperty('--color-warning', themeSettings.theme_warningColor)
    }
    if (themeSettings.theme_dangerColor) {
      root.style.setProperty('--color-danger', themeSettings.theme_dangerColor)
    }
    if (themeSettings.theme_infoColor) {
      root.style.setProperty('--color-info', themeSettings.theme_infoColor)
    }

    // Apply background colors
    if (themeSettings.theme_lightBackground) {
      root.style.setProperty('--bg-light', themeSettings.theme_lightBackground)
    }
    if (themeSettings.theme_darkBackground) {
      root.style.setProperty('--bg-dark', themeSettings.theme_darkBackground)
    }

    // Apply typography
    if (themeSettings.theme_fontFamily) {
      root.style.setProperty('--font-family', themeSettings.theme_fontFamily)
    }
    if (themeSettings.theme_fontSize) {
      root.style.setProperty('--font-size-base', themeSettings.theme_fontSize)
    }

    // Apply custom CSS if provided
    if (themeSettings.theme_customCSS) {
      let customStyleTag = document.getElementById(CUSTOM_THEME_STYLE_ID)
      if (!customStyleTag) {
        customStyleTag = document.createElement('style')
        customStyleTag.id = CUSTOM_THEME_STYLE_ID
        document.head.appendChild(customStyleTag)
      }
      customStyleTag.textContent = themeSettings.theme_customCSS
    }

    // Always force favicon to the current theme (or reset to default).
    updateFavicon(themeSettings.theme_faviconPath)
    updateAppleTouchIcon(themeSettings.theme_logoPath || themeSettings.theme_faviconPath)
    updateThemeColorMeta(themeSettings.theme_primaryColor)
  }

  useEffect(() => {
    fetchSettings()
  }, [tenantScopeKey]) // Re-fetch only when tenant identity changes

  useEffect(() => {
    updateManifestHref(tenantSlug)
  }, [tenantSlug])

  useEffect(() => {
    const onThemeUpdate = () => {
      void fetchSettings({ force: true })
    }

    window.addEventListener('event-manager:theme-settings-updated', onThemeUpdate)
    return () => {
      window.removeEventListener('event-manager:theme-settings-updated', onThemeUpdate)
    }
  }, [tenantScopeKey])

  const value = {
    settings,
    isLoading,
    error,
    refreshSettings: () => fetchSettings({ force: true })
  }

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  )
}
