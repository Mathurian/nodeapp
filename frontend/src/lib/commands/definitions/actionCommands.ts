/**
 * Action Commands
 * Commands for performing actions (create, edit, export, etc.)
 */

import { Command } from '../CommandRegistry';
import {
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  TrashIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  BellIcon,
  PrinterIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { extractTenantSlugFromPath } from '../../../utils/routeSegments';

const getTenantAwareHelpPath = (): string => {
  if (typeof window === 'undefined') {
    return '/help';
  }

  const tenantSlug = extractTenantSlugFromPath(window.location.pathname);
  return tenantSlug ? `/${tenantSlug}/help` : '/help';
};

export const createActionCommands = (options: {
  logout?: () => void | Promise<void>;
  toggleTheme?: () => void;
  setTheme?: (theme: 'light' | 'dark' | 'auto') => void;
  refreshPage?: () => void;
  navigate?: (path: string) => void;
}): Command[] => {
  const commands: Command[] = [];

  // Quick create actions
  if (options.navigate) {
    commands.push(
      {
        id: 'action-create-event',
        name: 'Create New Event',
        description: 'Create a new event',
        icon: PlusIcon,
        href: '/events?action=create',
        action: () => options.navigate!('/events?action=create'),
        keywords: ['create', 'new', 'add', 'event'],
        category: 'action',
        group: 'Create',
        priority: 50,
        shortcut: 'Cmd+Shift+E',
        roles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']
      },
      {
        id: 'action-create-contest',
        name: 'Create New Contest',
        description: 'Create a new contest',
        icon: PlusIcon,
        href: '/contests?action=create',
        action: () => options.navigate!('/contests?action=create'),
        keywords: ['create', 'new', 'add', 'contest'],
        category: 'action',
        group: 'Create',
        priority: 45,
        shortcut: 'Cmd+Shift+C',
        roles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']
      },
      {
        id: 'action-create-category',
        name: 'Create New Category',
        description: 'Create a new category',
        icon: PlusIcon,
        href: '/categories?action=create',
        action: () => options.navigate!('/categories?action=create'),
        keywords: ['create', 'new', 'add', 'category'],
        category: 'action',
        group: 'Create',
        priority: 40,
        roles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']
      },
      {
        id: 'action-create-user',
        name: 'Create New User',
        description: 'Add a new user',
        icon: PlusIcon,
        href: '/users?action=create',
        action: () => options.navigate!('/users?action=create'),
        keywords: ['create', 'new', 'add', 'user'],
        category: 'action',
        group: 'Create',
        priority: 35,
        shortcut: 'Cmd+Shift+U',
        roles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']
      },
      {
        id: 'action-create-report',
        name: 'Generate Report',
        description: 'Create a new report',
        icon: DocumentDuplicateIcon,
        href: '/reports?action=create',
        action: () => options.navigate!('/reports?action=create'),
        keywords: ['create', 'generate', 'report', 'pdf'],
        category: 'action',
        group: 'Create',
        priority: 30,
        shortcut: 'Cmd+Shift+R',
        roles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']
      }
    );
  }

  // System actions
  if (options.logout) {
    commands.push({
      id: 'action-logout',
      name: 'Log Out',
      description: 'Sign out of your account',
      icon: ArrowRightOnRectangleIcon,
      action: async () => {
        if (confirm('Are you sure you want to log out?')) {
          await options.logout!();
        }
      },
      keywords: ['logout', 'sign out', 'exit', 'quit'],
      category: 'action',
      group: 'Account',
      priority: 25,
      shortcut: 'Cmd+Shift+Q'
    });
  }

  if (options.setTheme) {
    commands.push(
      {
        id: 'action-toggle-theme-dark',
        name: 'Switch to Dark Mode',
        description: 'Use dark mode',
        icon: MoonIcon,
        action: () => options.setTheme!('dark'),
        keywords: ['dark', 'theme', 'mode', 'night'],
        category: 'action',
        group: 'Appearance',
        priority: 20,
        shortcut: 'Cmd+Shift+D'
      },
      {
        id: 'action-toggle-theme-light',
        name: 'Switch to Light Mode',
        description: 'Use light mode',
        icon: SunIcon,
        action: () => options.setTheme!('light'),
        keywords: ['light', 'theme', 'mode', 'day'],
        category: 'action',
        group: 'Appearance',
        priority: 20,
        shortcut: 'Cmd+Shift+L'
      },
      {
        id: 'action-toggle-theme-auto',
        name: 'Use System Theme',
        description: 'Follow your device light/dark mode',
        icon: ComputerDesktopIcon,
        action: () => options.setTheme!('auto'),
        keywords: ['auto', 'system', 'theme', 'appearance'],
        category: 'action',
        group: 'Appearance',
        priority: 20,
        shortcut: 'Cmd+Shift+A'
      }
    );
  } else if (options.toggleTheme) {
    commands.push({
      id: 'action-toggle-theme',
      name: 'Toggle Theme',
      description: 'Toggle between light and dark mode',
      icon: MoonIcon,
      action: () => options.toggleTheme!(),
      keywords: ['toggle', 'theme', 'light', 'dark'],
      category: 'action',
      group: 'Appearance',
      priority: 20,
      shortcut: 'Cmd+Shift+D'
    });
  }

  if (options.refreshPage) {
    commands.push({
      id: 'action-refresh',
      name: 'Refresh Page',
      description: 'Reload current page',
      icon: ArrowPathIcon,
      action: () => options.refreshPage!(),
      keywords: ['refresh', 'reload', 'update'],
      category: 'action',
      group: 'System',
      priority: 15,
      shortcut: 'Cmd+R'
    });
  }

  // Common export actions
  if (options.navigate) {
    commands.push(
      {
        id: 'action-export-results',
        name: 'Export Results',
        description: 'Export results to file',
        icon: ArrowDownTrayIcon,
        action: () => {
          // This would trigger export dialog/modal
          alert('Export results dialog would open here');
        },
        keywords: ['export', 'download', 'results', 'csv', 'pdf'],
        category: 'action',
        group: 'Export',
        priority: 10
      },
      {
        id: 'action-export-scores',
        name: 'Export Scores',
        description: 'Export scoring data',
        icon: ArrowDownTrayIcon,
        action: () => {
          alert('Export scores dialog would open here');
        },
        keywords: ['export', 'download', 'scores', 'csv'],
        category: 'action',
        group: 'Export',
        priority: 10,
        roles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'AUDITOR']
      },
      {
        id: 'action-print-results',
        name: 'Print Results',
        description: 'Print competition results',
        icon: PrinterIcon,
        action: () => window.print(),
        keywords: ['print', 'results', 'paper'],
        category: 'action',
        group: 'Print',
        priority: 5,
        shortcut: 'Cmd+P'
      }
    );
  }

  // Notifications
  commands.push({
    id: 'action-mark-all-read',
    name: 'Mark All Notifications as Read',
    description: 'Clear all notification badges',
    icon: BellIcon,
    action: async () => {
      // This would call API to mark all as read
      alert('All notifications marked as read');
    },
    keywords: ['notifications', 'read', 'clear', 'dismiss'],
    category: 'action',
    group: 'Notifications',
    priority: 5
  });

  // Help & Support
  commands.push(
    {
      id: 'action-help',
      name: 'Open Help Documentation',
      description: 'View help and documentation',
      icon: ShareIcon,
      action: () => {
        window.open(getTenantAwareHelpPath(), '_blank')
      },
      keywords: ['help', 'docs', 'documentation', 'support'],
      category: 'action',
      group: 'Help',
      priority: 0,
      shortcut: 'F1'
    },
    {
      id: 'action-keyboard-shortcuts',
      name: 'View Keyboard Shortcuts',
      description: 'See all available shortcuts',
      icon: ShareIcon,
      action: () => {
        alert('Keyboard shortcuts reference would be displayed here');
      },
      keywords: ['shortcuts', 'keyboard', 'hotkeys', 'commands'],
      category: 'action',
      group: 'Help',
      priority: 0,
      shortcut: 'Cmd+/'
    },
    {
      id: 'action-report-bug',
      name: 'Report a Bug',
      description: 'Report an issue or bug',
      icon: ShareIcon,
      action: () => {
        alert('Bug report form would open here');
      },
      keywords: ['bug', 'issue', 'problem', 'error', 'report'],
      category: 'action',
      group: 'Help',
      priority: 0
    }
  );

  return commands;
};
