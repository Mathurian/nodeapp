/**
 * Commands Hook
 * Integrates CommandRegistry with keyboard shortcuts and command execution
 */
import { useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CommandRegistry } from '../lib/commands/CommandRegistry'
import { createNavigationCommands } from '../lib/commands/definitions/navigationCommands'
import { createActionCommands } from '../lib/commands/definitions/actionCommands'
import { useKeyboardShortcuts, type ShortcutConfig } from './useKeyboardShortcuts'

/**
 * Main hook for command system
 * Provides command registry and sets up global keyboard shortcuts
 */
export const useCommands = (options: {
  enableKeyboardShortcuts?: boolean
  onCommandExecute?: (commandId: string) => void
} = {}) => {
  const { enableKeyboardShortcuts = true, onCommandExecute } = options
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  // Create command registry (memoized)
  const registry = useMemo(() => new CommandRegistry(), [])

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

    // Register all commands
    registry.registerCommands([...navigationCommands, ...actionCommands])
  }, [navigate, logout, registry])

  // Execute command with callback
  const executeCommand = useCallback(async (commandId: string) => {
    try {
      await registry.executeCommand(commandId)
      if (onCommandExecute) {
        onCommandExecute(commandId)
      }
      return true
    } catch (error) {
      console.error('Command execution failed:', error)
      return false
    }
  }, [registry, onCommandExecute])

  // Get shortcuts for all commands
  const shortcuts = useMemo(() => {
    const allCommands = registry.getAllCommands()
    const shortcutConfigs: ShortcutConfig[] = []

    allCommands.forEach(command => {
      if (command.shortcut) {
        // Parse shortcut string like "Cmd+K"
        const parts = command.shortcut.toLowerCase().split('+').map(p => p.trim())
        const config: ShortcutConfig = {
          key: '',
          ctrl: false,
          meta: false,
          shift: false,
          alt: false,
          preventDefault: true,
          callback: () => executeCommand(command.id),
          description: command.description
        }

        parts.forEach(part => {
          if (part === 'ctrl' || part === 'control') {
            config.ctrl = true
          } else if (part === 'cmd' || part === 'command') {
            config.meta = true
          } else if (part === 'shift') {
            config.shift = true
          } else if (part === 'alt' || part === 'option') {
            config.alt = true
          } else {
            config.key = part.toUpperCase()
          }
        })

        // Only add if we have a key
        if (config.key) {
          // Check if user has permission for this command
          if (!command.roles || command.roles.includes(user?.role || '')) {
            shortcutConfigs.push(config)
          }
        }
      }
    })

    return shortcutConfigs
  }, [registry, user?.role, executeCommand])

  // Register keyboard shortcuts
  useKeyboardShortcuts(
    enableKeyboardShortcuts ? shortcuts : [],
    [shortcuts, enableKeyboardShortcuts]
  )

  return {
    registry,
    executeCommand,
    search: (query: string, options?: { role?: string; context?: string }) =>
      registry.search(query, options),
    getRecentCommands: () => registry.getRecentCommands(),
    getFavoriteCommands: () => registry.getFavoriteCommands(),
    getAllCommands: (options?: { role?: string; context?: string; category?: 'navigation' | 'action' | 'admin' | 'quick' | 'search'; limit?: number }) => {
      if (options) {
        const results = registry.search('', {
          role: options.role,
          context: options.context,
          category: options.category
        })
        return options.limit ? results.slice(0, options.limit) : results
      }
      return registry.getAllCommands()
    },
    addFavorite: (commandId: string) => registry.addFavorite(commandId),
    removeFavorite: (commandId: string) => registry.removeFavorite(commandId),
    isFavorite: (commandId: string) => registry.isFavorite(commandId)
  }
}

export default useCommands
