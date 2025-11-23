import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import api, { settingsAPI } from '../services/api'

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

  // Extract tenant slug from URL (same logic as TenantContext)
  const getTenantSlug = (): string => {
    const pathParts = location.pathname.split('/').filter(Boolean)
    const firstSegment = pathParts[0]

    // Known routes that are not tenant slugs
    const knownRoutes = new Set([
      'login', 'dashboard', 'events', 'contests', 'categories',
      'scoring', 'results', 'users', 'admin', 'settings', 'profile', 'emcee',
      'templates', 'reports', 'notifications', 'backups', 'disaster-recovery',
      'workflows', 'search', 'files', 'email-templates', 'custom-fields',
      'tenants', 'mfa', 'database', 'cache', 'archive', 'deductions',
      'certifications', 'logs', 'performance', 'data-wipe', 'event-templates',
      'bulk-operations', 'commentary', 'category-types', 'field-visibility',
      'test-event-setup', 'help', 'bios', 'assignments'
    ])

    // If first segment is a known route, use default tenant
    if (!firstSegment || knownRoutes.has(firstSegment)) {
      return 'default'
    }

    return firstSegment
  }

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const slug = getTenantSlug()

      // Fetch theme settings from public endpoint (no auth required)
      // Pass tenant slug to get tenant-specific theme settings
      const response = await settingsAPI.getThemeSettings(undefined, slug)

      // Handle response format: { success: true, data: { theme_primaryColor: '...', app_name: '...' } }
      const themeData = response.data?.data || response.data?.settings || response.data

      if (themeData) {
        setSettings(themeData)
        applyThemeSettings(themeData)
      }
    } catch (err: any) {
      console.error('Failed to load system settings:', err)
      setError(err.message || 'Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const applyThemeSettings = (themeSettings: SystemSettings) => {
    const root = document.documentElement

    // Set document title
    if (themeSettings.app_name) {
      document.title = themeSettings.app_name
    }

    // Apply CSS custom properties
    if (themeSettings.theme_primaryColor) {
      root.style.setProperty('--color-primary', themeSettings.theme_primaryColor)
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
      let customStyleTag = document.getElementById('custom-theme-css')
      if (!customStyleTag) {
        customStyleTag = document.createElement('style')
        customStyleTag.id = 'custom-theme-css'
        document.head.appendChild(customStyleTag)
      }
      customStyleTag.textContent = themeSettings.theme_customCSS
    }

    // Update favicon if provided
    if (themeSettings.theme_faviconPath) {
      const faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement
      if (faviconLink) {
        faviconLink.href = themeSettings.theme_faviconPath
      } else {
        const newFavicon = document.createElement('link')
        newFavicon.rel = 'icon'
        newFavicon.href = themeSettings.theme_faviconPath
        document.head.appendChild(newFavicon)
      }
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [location.pathname]) // Re-fetch settings when URL changes (tenant slug may have changed)

  const value = {
    settings,
    isLoading,
    error,
    refreshSettings: fetchSettings
  }

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  )
}
