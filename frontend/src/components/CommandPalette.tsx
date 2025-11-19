import React, { useState, useEffect, useRef, Fragment } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Dialog, Transition } from '@headlessui/react'
import {
  MagnifyingGlassIcon,
  ClockIcon,
  StarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { CommandRegistry } from '../lib/commands/CommandRegistry'
import { createNavigationCommands } from '../lib/commands/definitions/navigationCommands'
import { createActionCommands } from '../lib/commands/definitions/actionCommands'
import { createQuickActionCommands } from '../lib/commands/definitions/quickActionCommands'
import { createContextCommands } from '../lib/commands/definitions/contextCommands'
import type { Command } from '../lib/commands/CommandRegistry'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [registry] = useState(() => new CommandRegistry())
  const [displayedCommands, setDisplayedCommands] = useState<Command[]>([])
  const [showRecent, setShowRecent] = useState(true)
  const [showFavorites, setShowFavorites] = useState(true)

  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize registry with commands
  useEffect(() => {
    // Create navigation commands
    const navigationCommands = createNavigationCommands((path: string) => {
      navigate(path)
    })

    // Create action commands with handlers
    const actionCommands = createActionCommands({
      logout: async () => {
        await logout()
      },
      toggleTheme: () => {
        // Theme toggle logic - to be implemented with theme context
        const html = document.documentElement
        const currentTheme = html.classList.contains('dark') ? 'dark' : 'light'
        if (currentTheme === 'dark') {
          html.classList.remove('dark')
          localStorage.setItem('theme', 'light')
        } else {
          html.classList.add('dark')
          localStorage.setItem('theme', 'dark')
        }
      },
      refreshPage: () => {
        window.location.reload()
      },
      navigate: (path: string) => {
        navigate(path)
      }
    })

    // Create quick action commands
    const quickActionCommands = createQuickActionCommands({
      navigate: (path: string) => {
        navigate(path)
      }
    })

    // Create context-specific commands based on current page
    const currentPath = location.pathname
    let context = 'general'
    if (currentPath.includes('/events')) context = 'events'
    else if (currentPath.includes('/scoring')) context = 'scoring'
    else if (currentPath.includes('/users')) context = 'users'
    else if (currentPath.includes('/results')) context = 'results'
    else if (currentPath.includes('/admin')) context = 'admin'

    const contextCommands = createContextCommands({
      context,
      navigate: (path: string) => {
        navigate(path)
      }
    })

    // Register all commands
    registry.registerCommands([
      ...navigationCommands,
      ...actionCommands,
      ...quickActionCommands,
      ...contextCommands
    ])
  }, [navigate, logout, registry, location.pathname])

  // Update displayed commands based on query
  useEffect(() => {
    if (!user) {
      setDisplayedCommands([])
      return
    }

    if (query.trim()) {
      // Search mode
      const results = registry.search(query, {
        role: user.role,
        context: location.pathname
      })
      setDisplayedCommands(results)
      setShowRecent(false)
      setShowFavorites(false)
    } else {
      // Default mode: show recent and favorites
      const recentCommands = registry.getRecentCommands()
      const favoriteCommands = registry.getFavoriteCommands()
      const allCommands = registry.search('', {
        role: user.role,
        context: location.pathname
      }).slice(0, 10)

      // Combine unique commands (favorites + recent + popular)
      const commandMap = new Map<string, Command>()

      favoriteCommands.forEach(cmd => commandMap.set(cmd.id, cmd))
      recentCommands.forEach(cmd => commandMap.set(cmd.id, cmd))
      allCommands.slice(0, 5).forEach(cmd => commandMap.set(cmd.id, cmd))

      setDisplayedCommands(Array.from(commandMap.values()))
      setShowRecent(recentCommands.length > 0)
      setShowFavorites(favoriteCommands.length > 0)
    }
  }, [query, user, registry, location.pathname])

  // Reset selected index when displayed commands change
  useEffect(() => {
    setSelectedIndex(0)
  }, [displayedCommands])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
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
        setSelectedIndex(prev => (prev + 1) % displayedCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + displayedCommands.length) % displayedCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (displayedCommands[selectedIndex]) {
          handleSelect(displayedCommands[selectedIndex])
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, displayedCommands])

  const handleSelect = (command: Command) => {
    registry.executeCommand(command.id)
    onClose()
    setQuery('')
  }

  const handleToggleFavorite = (e: React.MouseEvent, commandId: string) => {
    e.stopPropagation()
    const isFavorite = registry.isFavorite(commandId)
    if (isFavorite) {
      registry.removeFavorite(commandId)
    } else {
      registry.addFavorite(commandId)
    }
    // Force re-render
    setDisplayedCommands([...displayedCommands])
  }

  // Group commands by category or by section (recent/favorites/all)
  const groupCommands = () => {
    if (query.trim()) {
      // Search results: group by category
      return displayedCommands.reduce((acc, command) => {
        const group = command.group || command.category || 'Other'
        if (!acc[group]) {
          acc[group] = []
        }
        acc[group].push(command)
        return acc
      }, {} as Record<string, Command[]>)
    } else {
      // Default view: group by section
      const groups: Record<string, Command[]> = {}

      const favoriteCommands = displayedCommands.filter(cmd => registry.isFavorite(cmd.id))
      const recentCommands = registry.getRecentCommands().filter(cmd =>
        !registry.isFavorite(cmd.id) && displayedCommands.some(c => c.id === cmd.id)
      )
      const suggestedCommands = displayedCommands.filter(cmd =>
        !registry.isFavorite(cmd.id) &&
        !recentCommands.some(c => c.id === cmd.id)
      )

      if (favoriteCommands.length > 0) {
        groups['Favorites'] = favoriteCommands
      }
      if (recentCommands.length > 0) {
        groups['Recent'] = recentCommands
      }
      if (suggestedCommands.length > 0) {
        groups['Suggested'] = suggestedCommands
      }

      return groups
    }
  }

  const groupedCommands = groupCommands()

  const getSectionIcon = (sectionName: string) => {
    if (sectionName === 'Favorites') return StarIconSolid
    if (sectionName === 'Recent') return ClockIcon
    return SparklesIcon
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
          <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm transition-opacity" />
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
            <Dialog.Panel className="mx-auto max-w-3xl transform divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all">
              {/* Search Input */}
              <div className="relative">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-400 dark:text-gray-500"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  type="text"
                  className="h-14 w-full border-0 bg-transparent pl-12 pr-4 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-0 text-base"
                  placeholder="Search commands, pages, and actions... (Cmd+K)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {/* Results */}
              {displayedCommands.length > 0 && (
                <div className="max-h-[28rem] overflow-y-auto py-2 scroll-smooth">
                  {Object.entries(groupedCommands).map(([groupName, commands]) => (
                    <div key={groupName} className="mb-1">
                      <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {React.createElement(getSectionIcon(groupName), {
                          className: 'h-3.5 w-3.5'
                        })}
                        <span>{groupName}</span>
                      </div>
                      {commands.map((command) => {
                        const globalIndex = displayedCommands.indexOf(command)
                        const isSelected = globalIndex === selectedIndex
                        const isFavorite = registry.isFavorite(command.id)

                        return (
                          <button
                            key={command.id}
                            onClick={() => handleSelect(command)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            {/* Icon */}
                            {command.icon && (
                              <command.icon
                                className={`h-5 w-5 flex-shrink-0 ${
                                  isSelected ? 'text-white' : 'text-gray-400 dark:text-gray-500'
                                }`}
                                aria-hidden="true"
                              />
                            )}

                            {/* Name & Description */}
                            <div className="flex-1 text-left min-w-0">
                              <div className={`text-sm font-medium truncate ${
                                isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                              }`}>
                                {command.name}
                              </div>
                              {command.description && (
                                <div className={`text-xs truncate ${
                                  isSelected ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                  {command.description}
                                </div>
                              )}
                            </div>

                            {/* Shortcut & Favorite */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {command.shortcut && (
                                <kbd className={`hidden sm:inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-xs ${
                                  isSelected
                                    ? 'border-indigo-400 text-indigo-100'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                                }`}>
                                  {command.shortcut.split('+').map((key, i, arr) => (
                                    <React.Fragment key={i}>
                                      <span>{key}</span>
                                      {i < arr.length - 1 && <span className="text-[10px]">+</span>}
                                    </React.Fragment>
                                  ))}
                                </kbd>
                              )}

                              <button
                                onClick={(e) => handleToggleFavorite(e, command.id)}
                                className={`p-1 rounded hover:bg-white/20 transition-colors ${
                                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                              >
                                {isFavorite ? (
                                  <StarIconSolid className={`h-4 w-4 ${
                                    isSelected ? 'text-yellow-300' : 'text-yellow-500'
                                  }`} />
                                ) : (
                                  <StarIcon className={`h-4 w-4 ${
                                    isSelected ? 'text-white' : 'text-gray-400'
                                  }`} />
                                )}
                              </button>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* No Results */}
              {query && displayedCommands.length === 0 && (
                <div className="py-14 px-6 text-center text-sm sm:px-14">
                  <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <p className="text-gray-900 dark:text-gray-100 font-semibold text-base mb-1">
                    No results found
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try searching for pages, actions, or features
                  </p>
                </div>
              )}

              {/* Empty State */}
              {!query && displayedCommands.length === 0 && (
                <div className="py-14 px-6 text-center text-sm sm:px-14">
                  <SparklesIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <p className="text-gray-900 dark:text-gray-100 font-semibold text-base mb-1">
                    Start typing to search
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    Search for pages, create actions, or system commands
                  </p>
                </div>
              )}

              {/* Help Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-600 px-1.5 py-0.5 font-mono text-[10px]">
                      ↑↓
                    </kbd>
                    <span className="hidden sm:inline">Navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-600 px-1.5 py-0.5 font-mono text-[10px]">
                      Enter
                    </kbd>
                    <span className="hidden sm:inline">Select</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-600 px-1.5 py-0.5 font-mono text-[10px]">
                      Esc
                    </kbd>
                    <span className="hidden sm:inline">Close</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <StarIcon className="h-3 w-3" />
                    <span className="hidden sm:inline">Favorite</span>
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">
                  {displayedCommands.length} command{displayedCommands.length !== 1 ? 's' : ''}
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
