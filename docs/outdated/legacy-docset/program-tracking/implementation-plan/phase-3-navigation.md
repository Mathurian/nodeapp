# 📄 PHASE 3: NAVIGATION & UX OVERHAUL
**Duration:** Days 15-28 (2 weeks)
**Focus:** Replace traditional navigation with command palette-first UX
**Risk Level:** MEDIUM - Major UX changes
**Dependencies:** Phases 1-2 completed

---

## 🎯 PHASE OBJECTIVES

1. ✅ Enhance command palette with 100+ commands
2. ✅ Remove traditional sidebar/navbar navigation
3. ✅ Implement keyboard shortcuts throughout app
4. ✅ Add context-aware commands
5. ✅ Theme integration for command palette
6. ✅ Create intuitive onboarding for non-technical users
7. ✅ Add quick actions panel
8. ✅ Implement command history and favorites

---

## 📋 DAYS 15-17: ENHANCED COMMAND PALETTE

### Task 3.1: Command System Architecture (8 hours)

#### Create Command Registry

**File:** `frontend/src/lib/commands/CommandRegistry.ts`

```typescript
import { ReactNode } from 'react';

export interface Command {
  id: string;
  name: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void | Promise<void>;
  keywords: string[];
  category: 'navigation' | 'action' | 'recent' | 'quick' | 'admin';
  roles?: string[];
  shortcut?: string;
  group?: string;
  priority?: number; // Higher = shown first
  context?: string[]; // Which pages/contexts this appears in
}

export interface CommandGroup {
  id: string;
  name: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}

class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private groups: Map<string, CommandGroup> = new Map();
  private recentCommands: string[] = [];
  private favoriteCommands: Set<string> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  // Register a command
  register(command: Command): void {
    this.commands.set(command.id, command);
  }

  // Register multiple commands
  registerMany(commands: Command[]): void {
    commands.forEach(cmd => this.register(cmd));
  }

  // Register a group
  registerGroup(group: CommandGroup): void {
    this.groups.set(group.id, group);
  }

  // Get all commands
  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  // Get commands filtered by role
  getByRole(role: string): Command[] {
    return this.getAll().filter(cmd =>
      !cmd.roles || cmd.roles.includes(role)
    );
  }

  // Get commands filtered by context
  getByContext(context: string): Command[] {
    return this.getAll().filter(cmd =>
      !cmd.context || cmd.context.includes(context)
    );
  }

  // Search commands
  search(query: string, role?: string, context?: string): Command[] {
    const lowerQuery = query.toLowerCase();
    let commands = this.getAll();

    // Filter by role
    if (role) {
      commands = commands.filter(cmd => !cmd.roles || cmd.roles.includes(role));
    }

    // Filter by context
    if (context) {
      commands = commands.filter(cmd => !cmd.context || cmd.context.includes(context));
    }

    // Filter by query
    if (!query) return commands;

    return commands
      .filter(cmd =>
        cmd.name.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery) ||
        cmd.keywords.some(k => k.toLowerCase().includes(lowerQuery)) ||
        cmd.group?.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => {
        // Prioritize exact name matches
        const aNameMatch = a.name.toLowerCase().startsWith(lowerQuery);
        const bNameMatch = b.name.toLowerCase().startsWith(lowerQuery);
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;

        // Then by priority
        const aPriority = a.priority || 0;
        const bPriority = b.priority || 0;
        return bPriority - aPriority;
      });
  }

  // Recent commands
  addToRecent(commandId: string): void {
    this.recentCommands = [
      commandId,
      ...this.recentCommands.filter(id => id !== commandId)
    ].slice(0, 10);
    this.saveToStorage();
  }

  getRecent(): Command[] {
    return this.recentCommands
      .map(id => this.commands.get(id))
      .filter((cmd): cmd is Command => cmd !== undefined);
  }

  // Favorite commands
  toggleFavorite(commandId: string): void {
    if (this.favoriteCommands.has(commandId)) {
      this.favoriteCommands.delete(commandId);
    } else {
      this.favoriteCommands.add(commandId);
    }
    this.saveToStorage();
  }

  isFavorite(commandId: string): boolean {
    return this.favoriteCommands.has(commandId);
  }

  getFavorites(): Command[] {
    return Array.from(this.favoriteCommands)
      .map(id => this.commands.get(id))
      .filter((cmd): cmd is Command => cmd !== undefined);
  }

  // Persistence
  private saveToStorage(): void {
    localStorage.setItem('commandHistory', JSON.stringify(this.recentCommands));
    localStorage.setItem('commandFavorites', JSON.stringify(Array.from(this.favoriteCommands)));
  }

  private loadFromStorage(): void {
    try {
      const recent = localStorage.getItem('commandHistory');
      if (recent) this.recentCommands = JSON.parse(recent);

      const favorites = localStorage.getItem('commandFavorites');
      if (favorites) this.favoriteCommands = new Set(JSON.parse(favorites));
    } catch (error) {
      console.error('Failed to load command history:', error);
    }
  }
}

export const commandRegistry = new CommandRegistry();
```

#### Define All Commands

**File:** `frontend/src/lib/commands/definitions/navigationCommands.ts`

```typescript
import { Command } from '../CommandRegistry';
import {
  HomeIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  TrophyIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

export const navigationCommands: Command[] = [
  {
    id: 'nav-dashboard',
    name: 'Go to Dashboard',
    description: 'View overview and statistics',
    icon: HomeIcon,
    action: () => window.location.href = '/dashboard',
    keywords: ['dashboard', 'home', 'overview', 'start'],
    category: 'navigation',
    shortcut: 'G then D',
    group: 'Navigation',
    priority: 100,
  },
  {
    id: 'nav-events',
    name: 'View Events',
    description: 'Browse and manage all events',
    icon: CalendarIcon,
    action: () => window.location.href = '/events',
    keywords: ['events', 'competitions', 'shows'],
    category: 'navigation',
    roles: ['ADMIN', 'ORGANIZER', 'JUDGE'],
    shortcut: 'G then E',
    group: 'Navigation',
    priority: 90,
  },
  {
    id: 'nav-users',
    name: 'Manage Users',
    description: 'View and edit users, judges, contestants',
    icon: UserGroupIcon,
    action: () => window.location.href = '/users',
    keywords: ['users', 'people', 'judges', 'contestants', 'staff'],
    category: 'navigation',
    roles: ['ADMIN', 'ORGANIZER'],
    shortcut: 'G then U',
    group: 'Navigation',
    priority: 85,
  },
  {
    id: 'nav-scoring',
    name: 'Open Scoring',
    description: 'Score contestants and view categories',
    icon: ClipboardDocumentListIcon,
    action: () => window.location.href = '/scoring',
    keywords: ['scoring', 'judging', 'scores', 'rate'],
    category: 'navigation',
    roles: ['JUDGE', 'ADMIN'],
    shortcut: 'G then S',
    group: 'Navigation',
    priority: 95,
    context: ['judge', 'scoring'],
  },
  {
    id: 'nav-results',
    name: 'View Results',
    description: 'See competition results and rankings',
    icon: TrophyIcon,
    action: () => window.location.href = '/results',
    keywords: ['results', 'winners', 'rankings', 'scores', 'placement'],
    category: 'navigation',
    shortcut: 'G then R',
    group: 'Navigation',
    priority: 80,
  },
  {
    id: 'nav-reports',
    name: 'Generate Reports',
    description: 'Create PDF and Excel reports',
    icon: DocumentTextIcon,
    action: () => window.location.href = '/reports',
    keywords: ['reports', 'export', 'pdf', 'excel', 'print'],
    category: 'navigation',
    roles: ['ADMIN', 'ORGANIZER'],
    shortcut: 'G then P',
    group: 'Navigation',
    priority: 70,
  },
  {
    id: 'nav-settings',
    name: 'Open Settings',
    description: 'Configure system and preferences',
    icon: Cog6ToothIcon,
    action: () => window.location.href = '/settings',
    keywords: ['settings', 'config', 'preferences', 'options'],
    category: 'navigation',
    shortcut: 'G then ,',
    group: 'Navigation',
    priority: 60,
  },
];
```

**File:** `frontend/src/lib/commands/definitions/actionCommands.ts`

```typescript
import { Command } from '../CommandRegistry';
import {
  PlusIcon,
  UserPlusIcon,
  CalendarDaysIcon,
  DocumentPlusIcon,
} from '@heroicons/react/24/outline';

export const actionCommands: Command[] = [
  {
    id: 'action-create-event',
    name: 'Create New Event',
    description: 'Start a new event with contests and categories',
    icon: CalendarDaysIcon,
    action: () => window.location.href = '/events/new',
    keywords: ['create', 'new', 'event', 'add', 'competition'],
    category: 'action',
    roles: ['ADMIN', 'ORGANIZER'],
    shortcut: 'C then E',
    group: 'Create',
    priority: 100,
  },
  {
    id: 'action-create-user',
    name: 'Add New User',
    description: 'Create judge, contestant, or staff member',
    icon: UserPlusIcon,
    action: () => window.location.href = '/users/new',
    keywords: ['create', 'new', 'user', 'judge', 'contestant', 'add', 'person'],
    category: 'action',
    roles: ['ADMIN', 'ORGANIZER'],
    shortcut: 'C then U',
    group: 'Create',
    priority: 95,
  },
  {
    id: 'action-generate-report',
    name: 'Generate Report',
    description: 'Create a new PDF or Excel report',
    icon: DocumentPlusIcon,
    action: () => window.location.href = '/reports/new',
    keywords: ['create', 'generate', 'report', 'pdf', 'export'],
    category: 'action',
    roles: ['ADMIN', 'ORGANIZER'],
    shortcut: 'C then R',
    group: 'Create',
    priority: 85,
  },
  // Add more action commands...
];
```

**File:** `frontend/src/lib/commands/definitions/quickCommands.ts`

```typescript
import { Command } from '../CommandRegistry';
import {
  MagnifyingGlassIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';

export const createQuickCommands = (
  theme: any,
  auth: any
): Command[] => [
  {
    id: 'quick-search',
    name: 'Search Everything',
    description: 'Search users, events, contestants, and more',
    icon: MagnifyingGlassIcon,
    action: () => window.location.href = '/search',
    keywords: ['search', 'find', 'lookup'],
    category: 'quick',
    shortcut: '/',
    group: 'Quick Actions',
    priority: 100,
  },
  {
    id: 'quick-notifications',
    name: 'View Notifications',
    description: 'See your recent notifications',
    icon: BellIcon,
    action: () => window.location.href = '/notifications',
    keywords: ['notifications', 'alerts', 'updates'],
    category: 'quick',
    shortcut: 'N',
    group: 'Quick Actions',
    priority: 90,
  },
  {
    id: 'quick-toggle-theme',
    name: theme?.mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
    description: 'Toggle between light and dark themes',
    icon: theme?.mode === 'dark' ? SunIcon : MoonIcon,
    action: () => theme?.toggleMode(),
    keywords: ['theme', 'dark', 'light', 'mode', 'appearance'],
    category: 'quick',
    shortcut: 'T',
    group: 'Quick Actions',
    priority: 80,
  },
  {
    id: 'quick-help',
    name: 'Open Help & Documentation',
    description: 'View guides and documentation',
    icon: QuestionMarkCircleIcon,
    action: () => window.location.href = '/help',
    keywords: ['help', 'docs', 'documentation', 'guide', 'support'],
    category: 'quick',
    shortcut: '?',
    group: 'Quick Actions',
    priority: 70,
  },
  {
    id: 'quick-logout',
    name: 'Log Out',
    description: 'Sign out of your account',
    icon: ArrowRightOnRectangleIcon,
    action: async () => await auth?.logout(),
    keywords: ['logout', 'signout', 'exit', 'leave'],
    category: 'quick',
    shortcut: 'Shift+Q',
    group: 'Quick Actions',
    priority: 50,
  },
];
```

#### Initialize Commands

**File:** `frontend/src/lib/commands/index.ts`

```typescript
import { commandRegistry } from './CommandRegistry';
import { navigationCommands } from './definitions/navigationCommands';
import { actionCommands } from './definitions/actionCommands';

// Register all base commands
export function initializeCommands() {
  commandRegistry.registerMany([
    ...navigationCommands,
    ...actionCommands,
  ]);
}

export { commandRegistry };
export type { Command } from './CommandRegistry';
```

---

### Task 3.2: Enhanced Command Palette Component (10 hours)

**File:** `frontend/src/components/CommandPalette/CommandPalette.tsx`

```typescript
import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Dialog, Combobox, Transition } from '@headlessui/react';
import {
  MagnifyingGlassIcon,
  ClockIcon,
  StarIcon,
  ArrowRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { commandRegistry, Command } from '../../lib/commands';
import { createQuickCommands } from '../../lib/commands/definitions/quickCommands';
import clsx from 'clsx';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const { user } = useAuth();
  const theme = useTheme();
  const auth = useAuth();

  // Initialize quick commands with context
  useEffect(() => {
    const quickCommands = createQuickCommands(theme, auth);
    commandRegistry.registerMany(quickCommands);
  }, [theme?.mode, auth]);

  // Get current page context
  const currentContext = useMemo(() => {
    const path = window.location.pathname;
    if (path.includes('/scoring')) return 'scoring';
    if (path.includes('/events')) return 'events';
    if (path.includes('/users')) return 'users';
    return 'general';
  }, [window.location.pathname]);

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (!user) return [];

    if (!query) {
      // Show recent and favorites when no query
      const recent = commandRegistry.getRecent();
      const favorites = commandRegistry.getFavorites();
      const contextual = commandRegistry.getByContext(currentContext);

      return {
        recent,
        favorites,
        suggested: contextual.slice(0, 5),
      };
    }

    // Search with role and context filtering
    const results = commandRegistry.search(query, user.role, currentContext);
    return {
      results,
      recent: [],
      favorites: [],
      suggested: [],
    };
  }, [query, user?.role, currentContext]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    if (query) {
      // When searching, group by category
      const groups: Record<string, Command[]> = {};
      filteredCommands.results?.forEach((cmd) => {
        const group = cmd.group || cmd.category;
        if (!groups[group]) groups[group] = [];
        groups[group].push(cmd);
      });
      return groups;
    }

    // When not searching, return structured groups
    return {
      Recent: filteredCommands.recent || [],
      Favorites: filteredCommands.favorites || [],
      Suggested: filteredCommands.suggested || [],
    };
  }, [query, filteredCommands]);

  // Handle command execution
  const handleExecute = useCallback(async (command: Command) => {
    try {
      commandRegistry.addToRecent(command.id);
      await command.action();
      onClose();
      setQuery('');
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  }, [onClose]);

  // Toggle favorite
  const handleToggleFavorite = useCallback((command: Command, e: React.MouseEvent) => {
    e.stopPropagation();
    commandRegistry.toggleFavorite(command.id);
    // Force re-render
    setSelectedCommand({ ...command });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Theme colors
  const colors = {
    bg: theme?.mode === 'dark' ? 'bg-gray-900' : 'bg-white',
    bgSecondary: theme?.mode === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    text: theme?.mode === 'dark' ? 'text-gray-100' : 'text-gray-900',
    textSecondary: theme?.mode === 'dark' ? 'text-gray-400' : 'text-gray-600',
    border: theme?.mode === 'dark' ? 'border-gray-700' : 'border-gray-200',
    hover: theme?.mode === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100',
    selected: theme?.mode === 'dark' ? 'bg-gray-800' : 'bg-blue-50',
    accent: theme?.primaryColor || 'blue',
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        {/* Command palette */}
        <div className="fixed inset-0 flex items-start justify-center p-4 pt-[15vh]">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel
              className={clsx(
                'w-full max-w-2xl rounded-2xl shadow-2xl ring-1 ring-black/5',
                colors.bg
              )}
            >
              <Combobox value={selectedCommand} onChange={handleExecute}>
                {/* Search input */}
                <div className={clsx('flex items-center border-b px-4', colors.border)}>
                  <MagnifyingGlassIcon className={clsx('h-5 w-5', colors.textSecondary)} />
                  <Combobox.Input
                    className={clsx(
                      'w-full border-0 bg-transparent py-4 pl-3 pr-4 text-base',
                      'placeholder:text-gray-400 focus:outline-none focus:ring-0',
                      colors.text
                    )}
                    placeholder="Search commands or type to filter..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className={clsx('p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700')}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Results */}
                <Combobox.Options
                  static
                  className="max-h-96 overflow-y-auto py-2 px-2"
                >
                  {Object.entries(groupedCommands).map(([groupName, commands]) => {
                    if (!commands || commands.length === 0) return null;

                    return (
                      <div key={groupName} className="mb-4">
                        {/* Group header */}
                        <div className={clsx('px-3 py-2 text-xs font-semibold uppercase tracking-wider', colors.textSecondary)}>
                          {groupName === 'Recent' && <ClockIcon className="inline h-3 w-3 mr-1" />}
                          {groupName === 'Favorites' && <StarIconSolid className="inline h-3 w-3 mr-1 text-yellow-500" />}
                          {groupName}
                        </div>

                        {/* Commands in group */}
                        {commands.map((command) => (
                          <Combobox.Option
                            key={command.id}
                            value={command}
                            className={({ active }) =>
                              clsx(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer',
                                'transition-colors duration-150',
                                active ? colors.selected : colors.hover
                              )
                            }
                          >
                            {({ active }) => (
                              <>
                                {/* Icon */}
                                <command.icon
                                  className={clsx(
                                    'h-5 w-5 flex-shrink-0',
                                    active ? `text-${colors.accent}-600` : colors.textSecondary
                                  )}
                                />

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className={clsx('text-sm font-medium', colors.text)}>
                                    {command.name}
                                  </div>
                                  {command.description && (
                                    <div className={clsx('text-xs truncate mt-0.5', colors.textSecondary)}>
                                      {command.description}
                                    </div>
                                  )}
                                </div>

                                {/* Favorite button */}
                                <button
                                  onClick={(e) => handleToggleFavorite(command, e)}
                                  className={clsx(
                                    'p-1 rounded opacity-0 group-hover:opacity-100',
                                    'hover:bg-gray-200 dark:hover:bg-gray-700'
                                  )}
                                >
                                  {commandRegistry.isFavorite(command.id) ? (
                                    <StarIconSolid className="h-4 w-4 text-yellow-500" />
                                  ) : (
                                    <StarIcon className="h-4 w-4" />
                                  )}
                                </button>

                                {/* Shortcut */}
                                {command.shortcut && (
                                  <kbd
                                    className={clsx(
                                      'hidden sm:inline-flex items-center gap-1',
                                      'px-2 py-1 text-xs font-mono rounded',
                                      colors.bgSecondary,
                                      colors.textSecondary
                                    )}
                                  >
                                    {command.shortcut}
                                  </kbd>
                                )}

                                {/* Arrow */}
                                <ArrowRightIcon
                                  className={clsx('h-4 w-4', colors.textSecondary)}
                                />
                              </>
                            )}
                          </Combobox.Option>
                        ))}
                      </div>
                    );
                  })}

                  {/* No results */}
                  {Object.values(groupedCommands).every(cmds => !cmds || cmds.length === 0) && (
                    <div className={clsx('px-6 py-14 text-center text-sm', colors.textSecondary)}>
                      No commands found for "{query}"
                    </div>
                  )}
                </Combobox.Options>

                {/* Footer */}
                <div
                  className={clsx(
                    'flex items-center justify-between border-t px-4 py-3 text-xs',
                    colors.border,
                    colors.textSecondary
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className={clsx('px-2 py-1 rounded', colors.bgSecondary)}>↑↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className={clsx('px-2 py-1 rounded', colors.bgSecondary)}>↵</kbd>
                      Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className={clsx('px-2 py-1 rounded', colors.bgSecondary)}>ESC</kbd>
                      Close
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Press</span>
                    <kbd className={clsx('px-2 py-1 rounded', colors.bgSecondary)}>⌘K</kbd>
                    <span>anytime</span>
                  </div>
                </div>
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
```

---

## 📋 DAYS 18-20: REMOVE TRADITIONAL NAVIGATION

### Task 3.3: Remove Sidebar and Navbar (6 hours)

**Current Structure:**
```
Layout.tsx
├── Sidebar (REMOVE)
├── TopNav (REMOVE)
└── Content
```

**New Structure:**
```
Layout.tsx
├── Quick Actions Panel (NEW)
├── Breadcrumb Navigation (NEW)
└── Content
```

#### Update Layout Component

**File:** `frontend/src/components/Layout.tsx`

```typescript
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import QuickActionsPanel from './QuickActionsPanel';
import Breadcrumbs from './Breadcrumbs';
import UserMenu from './UserMenu';

interface LayoutProps {
  children: ReactNode;
  onOpenCommandPalette: () => void;
}

export default function Layout({ children, onOpenCommandPalette }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top bar - minimal */}
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Logo and breadcrumbs */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Event Manager
            </h1>
            <Breadcrumbs />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Command palette trigger */}
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <span>Search</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded">
                ⌘K
              </kbd>
            </button>

            {/* User menu */}
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Quick actions panel - floating */}
      <QuickActionsPanel onOpenCommandPalette={onOpenCommandPalette} />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
```

#### Create Quick Actions Panel

**File:** `frontend/src/components/QuickActionsPanel.tsx`

```typescript
import { useState } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  BellIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';

interface QuickActionsPanelProps {
  onOpenCommandPalette: () => void;
}

export default function QuickActionsPanel({ onOpenCommandPalette }: QuickActionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();

  const quickActions = [
    {
      id: 'search',
      name: 'Search',
      icon: MagnifyingGlassIcon,
      action: onOpenCommandPalette,
      shortcut: '⌘K',
      color: 'blue',
    },
    {
      id: 'create',
      name: 'Create',
      icon: PlusIcon,
      action: onOpenCommandPalette,
      shortcut: 'C',
      color: 'green',
      roles: ['ADMIN', 'ORGANIZER'],
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: BellIcon,
      action: () => window.location.href = '/notifications',
      shortcut: 'N',
      color: 'purple',
    },
    {
      id: 'help',
      name: 'Help',
      icon: QuestionMarkCircleIcon,
      action: () => window.location.href = '/help',
      shortcut: '?',
      color: 'gray',
    },
  ];

  const visibleActions = quickActions.filter(
    action => !action.roles || action.roles.includes(user?.role || '')
  );

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col gap-2">
        {isExpanded && visibleActions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-full shadow-lg',
              'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
              'hover:shadow-xl transition-all duration-200',
              'text-sm font-medium'
            )}
            title={`${action.name} (${action.shortcut})`}
          >
            <action.icon className="h-5 w-5" />
            <span>{action.name}</span>
            <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
              {action.shortcut}
            </kbd>
          </button>
        ))}

        {/* Main trigger button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={clsx(
            'flex items-center justify-center w-14 h-14 rounded-full shadow-lg',
            'bg-blue-600 text-white hover:bg-blue-700',
            'transition-transform duration-200',
            isExpanded && 'rotate-45'
          )}
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
```

---

*This document continues with Days 21-28 covering keyboard shortcuts, onboarding, and theme integration. Due to length, should I continue with the rest of Phase 3, or would you like me to move to Phase 4-6 documents?*
