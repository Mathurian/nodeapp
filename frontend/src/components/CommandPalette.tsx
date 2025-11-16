import React, { useState, useEffect, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Dialog, Transition } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import {
  HomeIcon,
  CalendarIcon,
  TrophyIcon,
  UsersIcon,
  CogIcon,
  UserIcon,
  MicrophoneIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArchiveBoxIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  CalculatorIcon,
  EnvelopeIcon,
  BellIcon,
} from '@heroicons/react/24/outline'

interface CommandItem {
  id: string
  name: string
  description?: string
  icon: typeof HomeIcon
  href: string
  category: string
  roles: string[]
  keywords?: string[]
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  const allCommands: CommandItem[] = [
    // Dashboard
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Go to dashboard',
      icon: HomeIcon,
      href: '/dashboard',
      category: 'Navigation',
      roles: ['ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'],
      keywords: ['home', 'overview']
    },

    // Events
    {
      id: 'events',
      name: 'Events',
      description: 'Manage events',
      icon: CalendarIcon,
      href: '/events',
      category: 'Events',
      roles: ['ORGANIZER', 'BOARD'],
      keywords: ['competitions', 'contests']
    },
    {
      id: 'events-create',
      name: 'Create Event',
      description: 'Create a new event',
      icon: CalendarIcon,
      href: '/events/new',
      category: 'Events',
      roles: ['ORGANIZER', 'BOARD'],
      keywords: ['add', 'new']
    },

    // Scoring
    {
      id: 'scoring',
      name: 'Scoring',
      description: 'Judge scoring interface',
      icon: TrophyIcon,
      href: '/scoring',
      category: 'Scoring',
      roles: ['JUDGE'],
      keywords: ['judge', 'scores', 'rating']
    },
    {
      id: 'tally',
      name: 'Tally Master',
      description: 'Tally master dashboard',
      icon: CalculatorIcon,
      href: '/tally-master',
      category: 'Scoring',
      roles: ['TALLY_MASTER'],
      keywords: ['calculate', 'totals', 'certification']
    },
    {
      id: 'auditor',
      name: 'Auditor',
      description: 'Auditor dashboard',
      icon: ClipboardDocumentCheckIcon,
      href: '/auditor',
      category: 'Scoring',
      roles: ['AUDITOR'],
      keywords: ['review', 'verify', 'audit']
    },

    // Results
    {
      id: 'results',
      name: 'Results',
      description: 'View competition results',
      icon: ChartBarIcon,
      href: '/results',
      category: 'Results',
      roles: ['ORGANIZER', 'JUDGE', 'CONTESTANT', 'TALLY_MASTER', 'AUDITOR', 'BOARD'],
      keywords: ['scores', 'winners', 'standings']
    },

    // Users
    {
      id: 'users',
      name: 'Users',
      description: 'Manage users',
      icon: UsersIcon,
      href: '/users',
      category: 'Admin',
      roles: ['ORGANIZER', 'BOARD'],
      keywords: ['people', 'accounts', 'judges', 'contestants']
    },
    {
      id: 'users-create',
      name: 'Create User',
      description: 'Add a new user',
      icon: UserIcon,
      href: '/users/new',
      category: 'Admin',
      roles: ['ORGANIZER', 'BOARD'],
      keywords: ['add', 'new', 'person']
    },

    // Admin
    {
      id: 'admin',
      name: 'Admin',
      description: 'System administration',
      icon: CogIcon,
      href: '/admin',
      category: 'Admin',
      roles: ['ORGANIZER', 'BOARD'],
      keywords: ['settings', 'configuration', 'system']
    },
    {
      id: 'admin-settings',
      name: 'Settings',
      description: 'System settings',
      icon: CogIcon,
      href: '/admin/settings',
      category: 'Admin',
      roles: ['ORGANIZER', 'BOARD'],
      keywords: ['configuration', 'preferences']
    },
    {
      id: 'admin-security',
      name: 'Security Settings',
      description: 'Configure security',
      icon: ShieldCheckIcon,
      href: '/admin/security',
      category: 'Admin',
      roles: ['ORGANIZER', 'BOARD'],
      keywords: ['password', 'authentication', 'access']
    },

    // Emcee
    {
      id: 'emcee',
      name: 'Emcee',
      description: 'Emcee dashboard',
      icon: MicrophoneIcon,
      href: '/emcee',
      category: 'Events',
      roles: ['EMCEE'],
      keywords: ['scripts', 'announcements', 'host']
    },

    // Templates
    {
      id: 'templates',
      name: 'Templates',
      description: 'Event templates',
      icon: DocumentTextIcon,
      href: '/templates',
      category: 'Events',
      roles: ['ORGANIZER', 'BOARD'],
      keywords: ['event', 'category', 'preset']
    },

    // Reports
    {
      id: 'reports',
      name: 'Reports',
      description: 'Generate reports',
      icon: ChartBarIcon,
      href: '/reports',
      category: 'Reports',
      roles: ['ORGANIZER', 'BOARD'],
      keywords: ['analytics', 'export', 'pdf']
    },

    // Archive
    {
      id: 'archive',
      name: 'Archive',
      description: 'Archived events',
      icon: ArchiveBoxIcon,
      href: '/archive',
      category: 'Events',
      roles: ['ORGANIZER', 'BOARD'],
      keywords: ['old', 'past', 'history']
    },

    // Notifications
    {
      id: 'notifications',
      name: 'Notifications',
      description: 'View notifications',
      icon: BellIcon,
      href: '/notifications',
      category: 'Navigation',
      roles: ['ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'],
      keywords: ['alerts', 'messages']
    },

    // Email
    {
      id: 'email',
      name: 'Email',
      description: 'Email management',
      icon: EnvelopeIcon,
      href: '/email',
      category: 'Communication',
      roles: ['ORGANIZER', 'BOARD'],
      keywords: ['messages', 'templates', 'campaigns']
    },

    // Profile
    {
      id: 'profile',
      name: 'My Profile',
      description: 'View and edit your profile',
      icon: UserIcon,
      href: '/profile',
      category: 'Account',
      roles: ['ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'],
      keywords: ['account', 'settings', 'personal']
    },
  ]

  // Filter commands based on user role and search query
  const filteredCommands = allCommands.filter(command => {
    // Filter by role
    if (!user || !command.roles.includes(user.role)) {
      return false
    }

    // Filter by search query
    if (!query) {
      return true
    }

    const searchTerm = query.toLowerCase()
    return (
      command.name.toLowerCase().includes(searchTerm) ||
      command.description?.toLowerCase().includes(searchTerm) ||
      command.category.toLowerCase().includes(searchTerm) ||
      command.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm))
    )
  })

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, command) => {
    const category = command.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(command)
    return acc
  }, {} as Record<string, CommandItem[]>)

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          handleSelect(filteredCommands[selectedIndex])
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands])

  const handleSelect = (command: CommandItem) => {
    navigate(command.href)
    onClose()
    setQuery('')
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-2xl transform divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
              {/* Search Input */}
              <div className="relative">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  type="text"
                  className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                  placeholder="Search pages... (Cmd+K or Ctrl+K)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {/* Results */}
              {filteredCommands.length > 0 && (
                <div className="max-h-96 overflow-y-auto py-2">
                  {Object.entries(groupedCommands).map(([category, commands]) => (
                    <div key={category}>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {category}
                      </div>
                      {commands.map((command, index) => {
                        const globalIndex = filteredCommands.indexOf(command)
                        const isSelected = globalIndex === selectedIndex

                        return (
                          <button
                            key={command.id}
                            onClick={() => handleSelect(command)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full flex items-center px-4 py-3 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            <command.icon
                              className={`h-5 w-5 mr-3 flex-shrink-0 ${
                                isSelected ? 'text-white' : 'text-gray-400'
                              }`}
                              aria-hidden="true"
                            />
                            <div className="flex-1 text-left">
                              <div className={`text-sm font-medium ${
                                isSelected ? 'text-white' : 'text-gray-900'
                              }`}>
                                {command.name}
                              </div>
                              {command.description && (
                                <div className={`text-xs ${
                                  isSelected ? 'text-indigo-200' : 'text-gray-500'
                                }`}>
                                  {command.description}
                                </div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* No Results */}
              {query && filteredCommands.length === 0 && (
                <div className="py-14 px-6 text-center text-sm sm:px-14">
                  <p className="text-gray-900 font-semibold">No results found</p>
                  <p className="mt-2 text-gray-500">
                    Try searching for something else
                  </p>
                </div>
              )}

              {/* Help Text */}
              <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 bg-gray-50">
                <div className="flex items-center space-x-4">
                  <span>
                    <kbd className="inline-flex items-center rounded border border-gray-200 px-1.5 py-0.5 font-mono text-xs">
                      ↑↓
                    </kbd> Navigate
                  </span>
                  <span>
                    <kbd className="inline-flex items-center rounded border border-gray-200 px-1.5 py-0.5 font-mono text-xs">
                      Enter
                    </kbd> Select
                  </span>
                  <span>
                    <kbd className="inline-flex items-center rounded border border-gray-200 px-1.5 py-0.5 font-mono text-xs">
                      Esc
                    </kbd> Close
                  </span>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

export default CommandPalette
