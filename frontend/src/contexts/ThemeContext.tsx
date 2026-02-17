import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'auto'
type ActualTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  actualTheme: ActualTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const THEME_STORAGE_KEY = 'theme'
const MEDIA_QUERY = '(prefers-color-scheme: dark)'

const isTheme = (value: string | null): value is Theme =>
  value === 'light' || value === 'dark' || value === 'auto'

const getSystemTheme = (): ActualTheme => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light'
}

const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'auto'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isTheme(stored) ? stored : 'auto'
}

const resolveTheme = (theme: Theme, systemTheme: ActualTheme): ActualTheme =>
  theme === 'auto' ? systemTheme : theme

const applyThemeClass = (actualTheme: ActualTheme) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', actualTheme === 'dark')
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme())
  const [systemTheme, setSystemTheme] = useState<ActualTheme>(() => getSystemTheme())

  const actualTheme = useMemo(
    () => resolveTheme(theme, systemTheme),
    [theme, systemTheme]
  )

  useEffect(() => {
    applyThemeClass(actualTheme)
  }, [actualTheme])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mediaQuery = window.matchMedia(MEDIA_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return
      const next = isTheme(event.newValue) ? event.newValue : 'auto'
      setThemeState(next)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const currentActual = resolveTheme(currentTheme, systemTheme)
      return currentActual === 'dark' ? 'light' : 'dark'
    })
  }, [systemTheme])

  const value = useMemo(
    () => ({
      theme,
      actualTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, actualTheme, setTheme, toggleTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
