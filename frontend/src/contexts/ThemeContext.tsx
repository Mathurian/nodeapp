import React, { createContext, useContext, useEffect, ReactNode } from 'react'

export type Theme = 'light'

interface ThemeContextType {
  theme: Theme
  actualTheme: 'light'
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
  useEffect(() => {
    // Ensure dark class is removed from document root
    const root = window.document.documentElement
    root.classList.remove('dark')
  }, [])

  const value = {
    theme: 'light' as const,
    actualTheme: 'light' as const
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
