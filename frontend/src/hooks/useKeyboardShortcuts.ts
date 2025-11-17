/**
 * Keyboard Shortcuts Hook
 * Provides global keyboard shortcut handling with platform detection
 */
import { useEffect, useCallback } from 'react'

export interface ShortcutConfig {
  key: string
  ctrl?: boolean
  meta?: boolean  // Cmd on Mac, Win on Windows
  shift?: boolean
  alt?: boolean
  preventDefault?: boolean
  callback: (event: KeyboardEvent) => void
  description?: string
}

/**
 * Normalize shortcut string like "Cmd+K" or "Ctrl+Shift+P" to config
 */
export const parseShortcut = (shortcut: string): Partial<ShortcutConfig> => {
  const parts = shortcut.toLowerCase().split('+').map(p => p.trim())
  const config: Partial<ShortcutConfig> = {
    ctrl: false,
    meta: false,
    shift: false,
    alt: false,
    preventDefault: true
  }

  parts.forEach(part => {
    if (part === 'ctrl' || part === 'control') {
      config.ctrl = true
    } else if (part === 'cmd' || part === 'command' || part === 'meta') {
      config.meta = true
    } else if (part === 'shift') {
      config.shift = true
    } else if (part === 'alt' || part === 'option') {
      config.alt = true
    } else {
      config.key = part.toUpperCase()
    }
  })

  return config
}

/**
 * Check if keyboard event matches shortcut config
 */
export const matchesShortcut = (event: KeyboardEvent, config: Partial<ShortcutConfig>): boolean => {
  if (!config.key) return false

  const key = event.key.toUpperCase()
  const configKey = config.key.toUpperCase()

  // Check key match
  if (key !== configKey) return false

  // Check modifiers
  if (config.ctrl && !event.ctrlKey) return false
  if (!config.ctrl && event.ctrlKey) return false

  if (config.meta && !event.metaKey) return false
  if (!config.meta && event.metaKey) return false

  if (config.shift && !event.shiftKey) return false
  if (!config.shift && event.shiftKey) return false

  if (config.alt && !event.altKey) return false
  if (!config.alt && event.altKey) return false

  return true
}

/**
 * Hook for registering global keyboard shortcuts
 */
export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[], deps: React.DependencyList = []) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when user is typing in inputs
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Exception: Allow Cmd+K/Ctrl+K even in inputs to open command palette
      const isCommandPaletteShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      if (!isCommandPaletteShortcut) {
        return
      }
    }

    for (const shortcut of shortcuts) {
      if (matchesShortcut(event, shortcut)) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
          event.stopPropagation()
        }
        shortcut.callback(event)
        break
      }
    }
  }, [shortcuts, ...deps])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Hook for registering shortcuts from command strings
 */
export const useShortcutStrings = (
  shortcuts: Array<{ shortcut: string; callback: () => void; description?: string }>,
  deps: React.DependencyList = []
) => {
  const configs: ShortcutConfig[] = shortcuts.map(s => ({
    ...parseShortcut(s.shortcut),
    callback: () => s.callback(),
    description: s.description
  })) as ShortcutConfig[]

  useKeyboardShortcuts(configs, deps)
}

/**
 * Get platform-specific modifier key name
 */
export const getModifierKeySymbol = (): string => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)
  return isMac ? '⌘' : 'Ctrl'
}

/**
 * Format shortcut string for display with platform-specific symbols
 */
export const formatShortcut = (shortcut: string): string => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)

  return shortcut
    .replace(/Cmd\+/gi, isMac ? '⌘' : 'Ctrl+')
    .replace(/Command\+/gi, isMac ? '⌘' : 'Ctrl+')
    .replace(/Ctrl\+/gi, isMac ? 'Ctrl+' : 'Ctrl+')
    .replace(/Shift\+/gi, isMac ? '⇧' : 'Shift+')
    .replace(/Alt\+/gi, isMac ? '⌥' : 'Alt+')
    .replace(/Option\+/gi, isMac ? '⌥' : 'Alt+')
}

/**
 * Common keyboard shortcuts used across the application
 */
export const COMMON_SHORTCUTS = {
  COMMAND_PALETTE: 'Cmd+K',
  SEARCH: 'Cmd+/',
  HELP: 'F1',
  SAVE: 'Cmd+S',
  CLOSE: 'Escape',
  REFRESH: 'Cmd+R',
  NEW: 'Cmd+N',
  PRINT: 'Cmd+P',
  SETTINGS: 'Cmd+,',
  DASHBOARD: 'Cmd+H',
  EVENTS: 'Cmd+E',
  CONTESTS: 'Cmd+C',
  PROFILE: 'Cmd+Shift+P',
  LOGOUT: 'Cmd+Shift+Q',
  THEME_TOGGLE: 'Cmd+Shift+D',
  CREATE_EVENT: 'Cmd+Shift+E',
  CREATE_CONTEST: 'Cmd+Shift+C',
  CREATE_USER: 'Cmd+Shift+U',
  NOTIFICATIONS: 'Cmd+Shift+N'
} as const

export default useKeyboardShortcuts
