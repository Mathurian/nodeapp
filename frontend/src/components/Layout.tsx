import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import AccordionNav from './AccordionNav'
import {
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  CogIcon,
} from '@heroicons/react/24/outline'

interface LayoutProps {
  children: React.ReactNode
  onOpenCommandPalette?: () => void
}

const Layout: React.FC<LayoutProps> = ({ children, onOpenCommandPalette }) => {
  const [navOpen, setNavOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const { isConnected } = useSocket()

  const getRoleColor = (role: string) => {
    const colors = {
      ORGANIZER: 'role-organizer',
      JUDGE: 'role-judge',
      CONTESTANT: 'role-contestant',
      EMCEE: 'role-emcee',
      TALLY_MASTER: 'role-tally-master',
      AUDITOR: 'role-auditor',
      BOARD: 'role-board',
    }
    return colors[role as keyof typeof colors] || 'role-board'
  }

  const getRoleDisplayName = (role: string) => {
    const names = {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header with logo and command palette */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo and Navigation Toggle */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-indigo-600">Event Manager</h1>
            <button
              onClick={() => setNavOpen(!navOpen)}
              className="btn btn-ghost btn-sm"
              title="Toggle Navigation"
            >
              {navOpen ? (
                <XMarkIcon className="h-5 w-5" />
              ) : (
                <Bars3Icon className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Right side: Command Palette, Notifications, Profile */}
          <div className="flex items-center space-x-4">
            {/* Command Palette Trigger */}
            <button
              onClick={onOpenCommandPalette}
              className="hidden md:flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
              title="Search (Cmd+K or Ctrl+K)"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              <span className="text-xs">Search...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-xs font-mono bg-white border border-gray-300 rounded">
                ⌘K
              </kbd>
            </button>

            {/* Notifications */}
            <Link to="/notifications" className="btn btn-ghost btn-sm relative">
              <BellIcon className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
            </Link>

            {/* Connection Status */}
            <div className="hidden md:flex items-center space-x-2 text-xs text-gray-600">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>

            {/* Profile menu */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-2 btn btn-ghost"
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium">{user?.preferredName || user?.name}</div>
                  <div className={`text-xs ${getRoleColor(user?.role || '')}`}>
                    {getRoleDisplayName(user?.role || '')}
                  </div>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="dropdown-menu absolute right-0 mt-2 w-48">
                  <Link
                    to="/profile"
                    className="dropdown-menu-item"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="dropdown-menu-item"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <CogIcon className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      logout()
                      setProfileMenuOpen(false)
                    }}
                    className="dropdown-menu-item w-full text-left"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accordion Navigation - Collapsible */}
        {navOpen && (
          <div className="border-t border-gray-200 max-h-96 overflow-y-auto">
            <AccordionNav />
          </div>
        )}
      </div>

      {/* Main content - No sidebar, full width */}
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}

export default Layout
