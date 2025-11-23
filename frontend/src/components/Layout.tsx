import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useCommands, getModifierKeySymbol } from '../hooks'
import { settingsAPI } from '../services/api'
import {
  UserIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  CogIcon,
  CommandLineIcon,
  StarIcon,
  ClockIcon,
  LightBulbIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline'

interface LayoutProps {
  children: React.ReactNode
  onOpenCommandPalette?: () => void
}

const Layout: React.FC<LayoutProps> = ({ children, onOpenCommandPalette }) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const { user, logout } = useAuth()
  const { isConnected } = useSocket()
  const { getRecentCommands, getFavoriteCommands } = useCommands({
    enableKeyboardShortcuts: false // Global shortcuts handled elsewhere
  })

  const recentCommands = getRecentCommands().slice(0, 3)
  const favoriteCommands = getFavoriteCommands().slice(0, 3)
  const modifierKey = getModifierKeySymbol()

  // Fetch theme settings for app name and logo (tenant-aware)
  const { data: themeSettings } = useQuery<any>(
    ['theme-settings', user?.tenantId],
    async () => {
      try {
        // Include tenant context if user is authenticated
        const response = await settingsAPI.getThemeSettings(user?.tenantId)
        const unwrapped = response.data.data || response.data
        return unwrapped
      } catch (error) {
        // Return defaults if settings not available
        return { app_name: 'Event Manager', theme_logoPath: null }
      }
    },
    {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: false,
    }
  )

  const appName = themeSettings?.app_name || themeSettings?.appName || 'Event Manager'
  const logoPath = themeSettings?.theme_logoPath || themeSettings?.logoPath

  const getRoleColor = (role: string) => {
    const colors = {
      SUPER_ADMIN: 'text-purple-900 bg-purple-100 dark:text-purple-300 dark:bg-purple-900',
      ADMIN: 'text-purple-600 bg-purple-50',
      ORGANIZER: 'text-blue-600 bg-blue-50',
      JUDGE: 'text-green-600 bg-green-50',
      CONTESTANT: 'text-orange-600 bg-orange-50',
      EMCEE: 'text-pink-600 bg-pink-50',
      TALLY_MASTER: 'text-indigo-600 bg-indigo-50',
      AUDITOR: 'text-red-600 bg-red-50',
      BOARD: 'text-gray-600 bg-gray-50',
    }
    return colors[role as keyof typeof colors] || 'text-gray-600 bg-gray-50'
  }

  const getRoleDisplayName = (role: string) => {
    const names = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN: 'Admin',
      ORGANIZER: 'Organizer',
      JUDGE: 'Judge',
      CONTESTANT: 'Contestant',
      EMCEE: 'Emcee',
      TALLY_MASTER: 'Tally Master',
      AUDITOR: 'Auditor',
      BOARD: 'Board',
    }
    return names[role as keyof typeof names] || role
  }

  const toggleTheme = () => {
    const html = document.documentElement
    const currentTheme = html.classList.contains('dark') ? 'dark' : 'light'
    if (currentTheme === 'dark') {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }

  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Minimal Top Bar - Command Palette First */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between px-4 lg:px-6 py-3">
          {/* Logo - links to dashboard */}
          <Link
            to={user?.tenant?.slug ? `/${user.tenant.slug}/dashboard` : '/dashboard'}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
            title="Go to Dashboard"
          >
            {logoPath ? (
              <img
                src={logoPath}
                alt={appName}
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  e.currentTarget.style.display = 'none'
                  const icon = e.currentTarget.nextElementSibling as HTMLElement
                  if (icon) icon.style.display = 'block'
                }}
              />
            ) : null}
            <CommandLineIcon
              className="h-7 w-7 text-indigo-600 dark:text-indigo-400"
              style={{ display: logoPath ? 'none' : 'block' }}
            />
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              {appName}
            </h1>
          </Link>

          {/* Center: Command Palette Trigger - Prominent */}
          <button
            onClick={onOpenCommandPalette}
            className="hidden md:flex items-center space-x-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 transition-all hover:scale-105 hover:shadow-md"
            title={`Search everything... (${modifierKey}+K)`}
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            <span className="hidden lg:inline text-gray-500 dark:text-gray-400">
              Search pages, actions, commands...
            </span>
            <span className="lg:hidden text-gray-500 dark:text-gray-400">
              Search...
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-xs font-mono bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
              <span>{modifierKey}</span>
              <span className="text-[10px]">+</span>
              <span>K</span>
            </kbd>
          </button>

          {/* Right side: Theme, Notifications, Profile */}
          <div className="flex items-center space-x-2 lg:space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode (${modifierKey}+Shift+D)`}
            >
              {isDarkMode ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>

            {/* Quick Actions Toggle */}
            <button
              onClick={() => setQuickActionsOpen(!quickActionsOpen)}
              className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Quick actions"
            >
              <LightBulbIcon className="h-5 w-5" />
              {(recentCommands.length > 0 || favoriteCommands.length > 0) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full"></span>
              )}
            </button>

            {/* Notifications */}
            <Link
              to="/notifications"
              className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Notifications"
            >
              <BellIcon className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Link>

            {/* Connection Status - Only show if user is logged in */}
            {user && (
              <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {isConnected ? 'Live' : 'Connecting...'}
                </span>
              </div>
            )}

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-2 pl-1 pr-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-md">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden xl:block text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user?.preferredName || user?.name}
                  </div>
                  <div className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(user?.role || '')}`}>
                    {getRoleDisplayName(user?.role || '')}
                  </div>
                </div>
              </button>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {user?.email}
                      </div>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <UserIcon className="h-4 w-4 mr-3 text-gray-400" />
                      My Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <CogIcon className="h-4 w-4 mr-3 text-gray-400" />
                      Settings
                    </Link>
                    <div className="border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => {
                          logout()
                          setProfileMenuOpen(false)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        {quickActionsOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setQuickActionsOpen(false)}
            />
            <div className="absolute right-4 lg:right-6 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
              {/* Favorites Section */}
              {favoriteCommands.length > 0 && (
                <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    <StarIcon className="h-3.5 w-3.5 text-yellow-500" />
                    Favorites
                  </div>
                  {favoriteCommands.map(cmd => (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action?.()
                        setQuickActionsOpen(false)
                      }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      {cmd.icon && <cmd.icon className="h-4 w-4 text-gray-400" />}
                      <span className="truncate">{cmd.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Recent Section */}
              {recentCommands.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    <ClockIcon className="h-3.5 w-3.5" />
                    Recent
                  </div>
                  {recentCommands.map(cmd => (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action?.()
                        setQuickActionsOpen(false)
                      }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      {cmd.icon && <cmd.icon className="h-4 w-4 text-gray-400" />}
                      <span className="truncate">{cmd.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {favoriteCommands.length === 0 && recentCommands.length === 0 && (
                <div className="p-6 text-center">
                  <LightBulbIcon className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your recent and favorite commands will appear here
                  </p>
                  <button
                    onClick={() => {
                      onOpenCommandPalette?.()
                      setQuickActionsOpen(false)
                    }}
                    className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Open Command Palette
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Content - Full Width, No Sidebar */}
      <main className="p-4 lg:p-6 max-w-[1920px] mx-auto">
        {children}
      </main>

      {/* Floating Command Palette Hint - Mobile */}
      <button
        onClick={onOpenCommandPalette}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all z-40 flex items-center justify-center"
        title="Open Command Palette"
      >
        <MagnifyingGlassIcon className="h-6 w-6" />
      </button>
    </div>
  )
}

export default Layout
