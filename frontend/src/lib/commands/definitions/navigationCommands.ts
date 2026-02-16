/**
 * Navigation Commands
 * Commands for navigating to pages in the application.
 * Generated from shared navigation config to keep menu and command palette aligned.
 */

import { NAV_SECTIONS } from '../../../config/navigationConfig'
import { Command } from '../CommandRegistry'

const normalizeKeywords = (name: string, extra: string[] = []): string[] => {
  const base = name.toLowerCase().split(/\s+/).filter(Boolean)
  return Array.from(new Set([...base, ...extra.map((k) => k.toLowerCase())]))
}

export const createNavigationCommands = (navigate: (path: string) => void): Command[] => {
  const commands: Command[] = []

  NAV_SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      commands.push({
        id: `nav-${item.id}`,
        name: item.name,
        description: item.description || `Go to ${item.name}`,
        icon: item.icon,
        href: item.href,
        action: () => navigate(item.href),
        keywords: normalizeKeywords(item.name, item.keywords || [section.name, item.href.replace('/', '')]),
        category: 'navigation',
        group: section.name,
        priority: item.priority ?? 0,
        shortcut: item.shortcut,
        roles: item.roles
      })
    })
  })

  return commands
}
