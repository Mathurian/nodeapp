import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import api from '../services/api'

interface SystemSettings {
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
  const [settings, setSettings] = useState<SystemSettings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch theme settings from public endpoint (no auth required)
      const response = await api.get('/settings/theme')

      if (response.data && response.data.settings) {
        setSettings(response.data.settings)
        applyThemeSettings(response.data.settings)
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
  }, [])

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
