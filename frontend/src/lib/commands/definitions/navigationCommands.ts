/**
 * Navigation Commands
 * Commands for navigating to different pages in the application
 */

import { Command } from '../CommandRegistry';
import {
  HomeIcon,
  CalendarIcon,
  TrophyIcon,
  ListBulletIcon,
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  BellIcon,
  ServerStackIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  CircleStackIcon,
  ClockIcon,
  ArchiveBoxIcon,
  ChartPieIcon,
  TableCellsIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

export const createNavigationCommands = (navigate: (path: string) => void): Command[] => {
  return [
    // Core Navigation
    {
      id: 'nav-dashboard',
      name: 'Dashboard',
      description: 'Go to dashboard home',
      icon: HomeIcon,
      action: () => navigate('/dashboard'),
      keywords: ['home', 'main', 'overview'],
      category: 'navigation',
      group: 'Core',
      priority: 100,
      shortcut: 'Cmd+H'
    },
    {
      id: 'nav-events',
      name: 'Events',
      description: 'Manage events',
      icon: CalendarIcon,
      action: () => navigate('/events'),
      keywords: ['event', 'calendar', 'schedule'],
      category: 'navigation',
      group: 'Core',
      priority: 95,
      shortcut: 'Cmd+E'
    },
    {
      id: 'nav-contests',
      name: 'Contests',
      description: 'Manage contests',
      icon: TrophyIcon,
      action: () => navigate('/contests'),
      keywords: ['contest', 'competition', 'tournament'],
      category: 'navigation',
      group: 'Core',
      priority: 90,
      shortcut: 'Cmd+C'
    },
    {
      id: 'nav-categories',
      name: 'Categories',
      description: 'Manage contest categories',
      icon: ListBulletIcon,
      action: () => navigate('/categories'),
      keywords: ['category', 'division', 'class'],
      category: 'navigation',
      group: 'Core',
      priority: 85
    },
    {
      id: 'nav-scoring',
      name: 'Scoring',
      description: 'Enter and manage scores',
      icon: ChartBarIcon,
      action: () => navigate('/scoring'),
      keywords: ['score', 'judge', 'points', 'rating'],
      category: 'navigation',
      group: 'Core',
      priority: 80,
      roles: ['ADMIN', 'ORGANIZER', 'JUDGE', 'AUDITOR', 'TALLY_MASTER']
    },
    {
      id: 'nav-results',
      name: 'Results',
      description: 'View contest results',
      icon: ChartPieIcon,
      action: () => navigate('/results'),
      keywords: ['result', 'winner', 'standings', 'leaderboard'],
      category: 'navigation',
      group: 'Core',
      priority: 75
    },

    // User Management
    {
      id: 'nav-users',
      name: 'Users',
      description: 'Manage users and permissions',
      icon: UsersIcon,
      action: () => navigate('/users'),
      keywords: ['user', 'people', 'account', 'member'],
      category: 'navigation',
      group: 'Management',
      priority: 70,
      roles: ['ADMIN', 'ORGANIZER']
    },
    {
      id: 'nav-profile',
      name: 'My Profile',
      description: 'View and edit your profile',
      icon: UserCircleIcon,
      action: () => navigate('/profile'),
      keywords: ['profile', 'account', 'me', 'settings'],
      category: 'navigation',
      group: 'User',
      priority: 65,
      shortcut: 'Cmd+P'
    },

    // Administration
    {
      id: 'nav-admin',
      name: 'Admin Panel',
      description: 'System administration',
      icon: Cog6ToothIcon,
      action: () => navigate('/admin'),
      keywords: ['admin', 'system', 'control'],
      category: 'navigation',
      group: 'Admin',
      priority: 60,
      roles: ['ADMIN']
    },
    {
      id: 'nav-settings',
      name: 'Settings',
      description: 'Application settings',
      icon: Cog6ToothIcon,
      action: () => navigate('/settings'),
      keywords: ['settings', 'preferences', 'config', 'configuration'],
      category: 'navigation',
      group: 'Admin',
      priority: 55,
      roles: ['ADMIN', 'ORGANIZER'],
      shortcut: 'Cmd+,'
    },

    // Content & Communication
    {
      id: 'nav-emcee',
      name: 'Emcee Scripts',
      description: 'Manage emcee scripts and announcements',
      icon: MegaphoneIcon,
      action: () => navigate('/emcee'),
      keywords: ['emcee', 'announcements', 'script', 'mc'],
      category: 'navigation',
      group: 'Content',
      priority: 50,
      roles: ['ADMIN', 'ORGANIZER', 'EMCEE']
    },
    {
      id: 'nav-templates',
      name: 'Templates',
      description: 'Manage document templates',
      icon: DocumentTextIcon,
      action: () => navigate('/templates'),
      keywords: ['template', 'document', 'format'],
      category: 'navigation',
      group: 'Content',
      priority: 45,
      roles: ['ADMIN', 'ORGANIZER']
    },
    {
      id: 'nav-reports',
      name: 'Reports',
      description: 'Generate and view reports',
      icon: DocumentTextIcon,
      action: () => navigate('/reports'),
      keywords: ['report', 'export', 'document', 'pdf'],
      category: 'navigation',
      group: 'Content',
      priority: 40
    },
    {
      id: 'nav-commentary',
      name: 'Commentary',
      description: 'Add commentary and notes',
      icon: ChatBubbleLeftRightIcon,
      action: () => navigate('/commentary'),
      keywords: ['commentary', 'notes', 'comments'],
      category: 'navigation',
      group: 'Content',
      priority: 35
    },

    // Tools & Utilities
    {
      id: 'nav-search',
      name: 'Search',
      description: 'Search across all content',
      icon: MagnifyingGlassIcon,
      action: () => navigate('/search'),
      keywords: ['search', 'find', 'lookup'],
      category: 'navigation',
      group: 'Tools',
      priority: 30,
      shortcut: 'Cmd+/'
    },
    {
      id: 'nav-notifications',
      name: 'Notifications',
      description: 'View notifications',
      icon: BellIcon,
      action: () => navigate('/notifications'),
      keywords: ['notifications', 'alerts', 'messages'],
      category: 'navigation',
      group: 'Tools',
      priority: 25,
      shortcut: 'Cmd+N'
    },
    {
      id: 'nav-files',
      name: 'File Management',
      description: 'Manage uploaded files',
      icon: FolderIcon,
      action: () => navigate('/files'),
      keywords: ['files', 'uploads', 'documents', 'media'],
      category: 'navigation',
      group: 'Tools',
      priority: 20,
      roles: ['ADMIN', 'ORGANIZER']
    },

    // Advanced Features
    {
      id: 'nav-email-templates',
      name: 'Email Templates',
      description: 'Manage email templates',
      icon: EnvelopeIcon,
      action: () => navigate('/email-templates'),
      keywords: ['email', 'template', 'mail'],
      category: 'navigation',
      group: 'Advanced',
      priority: 15,
      roles: ['ADMIN', 'ORGANIZER']
    },
    {
      id: 'nav-custom-fields',
      name: 'Custom Fields',
      description: 'Manage custom fields',
      icon: TableCellsIcon,
      action: () => navigate('/custom-fields'),
      keywords: ['custom', 'fields', 'metadata'],
      category: 'navigation',
      group: 'Advanced',
      priority: 10,
      roles: ['ADMIN']
    },
    {
      id: 'nav-workflows',
      name: 'Workflows',
      description: 'Manage automation workflows',
      icon: CircleStackIcon,
      action: () => navigate('/workflows'),
      keywords: ['workflow', 'automation', 'process'],
      category: 'navigation',
      group: 'Advanced',
      priority: 5,
      roles: ['ADMIN', 'ORGANIZER']
    },
    {
      id: 'nav-event-templates',
      name: 'Event Templates',
      description: 'Manage event templates',
      icon: CalendarIcon,
      action: () => navigate('/event-templates'),
      keywords: ['event', 'template', 'preset'],
      category: 'navigation',
      group: 'Advanced',
      priority: 0,
      roles: ['ADMIN', 'ORGANIZER']
    },
    {
      id: 'nav-category-types',
      name: 'Category Types',
      description: 'Manage category types',
      icon: ListBulletIcon,
      action: () => navigate('/category-types'),
      keywords: ['category', 'type', 'template'],
      category: 'navigation',
      group: 'Advanced',
      priority: 0,
      roles: ['ADMIN']
    },

    // System Administration
    {
      id: 'nav-tenants',
      name: 'Tenant Management',
      description: 'Manage multi-tenant organizations',
      icon: BuildingOfficeIcon,
      action: () => navigate('/tenants'),
      keywords: ['tenant', 'organization', 'multi-tenant'],
      category: 'navigation',
      group: 'System',
      priority: 0,
      roles: ['ADMIN']
    },
    {
      id: 'nav-mfa',
      name: 'MFA Settings',
      description: 'Multi-factor authentication settings',
      icon: ShieldCheckIcon,
      action: () => navigate('/mfa'),
      keywords: ['mfa', '2fa', 'security', 'authentication'],
      category: 'navigation',
      group: 'System',
      priority: 0,
      roles: ['ADMIN']
    },
    {
      id: 'nav-database',
      name: 'Database Browser',
      description: 'Browse database content',
      icon: CircleStackIcon,
      action: () => navigate('/database'),
      keywords: ['database', 'db', 'sql', 'data'],
      category: 'navigation',
      group: 'System',
      priority: 0,
      roles: ['ADMIN']
    },
    {
      id: 'nav-cache',
      name: 'Cache Management',
      description: 'Manage application cache',
      icon: ServerStackIcon,
      action: () => navigate('/cache'),
      keywords: ['cache', 'redis', 'memory'],
      category: 'navigation',
      group: 'System',
      priority: 0,
      roles: ['ADMIN']
    },
    {
      id: 'nav-logs',
      name: 'Log Viewer',
      description: 'View system logs',
      icon: DocumentTextIcon,
      action: () => navigate('/logs'),
      keywords: ['logs', 'audit', 'history'],
      category: 'navigation',
      group: 'System',
      priority: 0,
      roles: ['ADMIN']
    },
    {
      id: 'nav-performance',
      name: 'Performance Metrics',
      description: 'View system performance',
      icon: ChartBarIcon,
      action: () => navigate('/performance'),
      keywords: ['performance', 'metrics', 'monitoring'],
      category: 'navigation',
      group: 'System',
      priority: 0,
      roles: ['ADMIN']
    },

    // Data Management
    {
      id: 'nav-archive',
      name: 'Archive',
      description: 'View archived content',
      icon: ArchiveBoxIcon,
      action: () => navigate('/archive'),
      keywords: ['archive', 'old', 'past'],
      category: 'navigation',
      group: 'Data',
      priority: 0,
      roles: ['ADMIN', 'ORGANIZER']
    },
    {
      id: 'nav-backup',
      name: 'Backup Management',
      description: 'Manage system backups',
      icon: ServerStackIcon,
      action: () => navigate('/backups'),
      keywords: ['backup', 'restore', 'snapshot'],
      category: 'navigation',
      group: 'Data',
      priority: 0,
      roles: ['ADMIN']
    },
    {
      id: 'nav-disaster-recovery',
      name: 'Disaster Recovery',
      description: 'Disaster recovery tools',
      icon: ShieldCheckIcon,
      action: () => navigate('/disaster-recovery'),
      keywords: ['disaster', 'recovery', 'restore'],
      category: 'navigation',
      group: 'Data',
      priority: 0,
      roles: ['ADMIN']
    },
    {
      id: 'nav-data-wipe',
      name: 'Data Wipe',
      description: 'Securely wipe data',
      icon: ArchiveBoxIcon,
      action: () => navigate('/data-wipe'),
      keywords: ['wipe', 'delete', 'clear', 'purge'],
      category: 'navigation',
      group: 'Data',
      priority: 0,
      roles: ['ADMIN']
    },
    {
      id: 'nav-bulk-operations',
      name: 'Bulk Operations',
      description: 'Perform bulk operations',
      icon: TableCellsIcon,
      action: () => navigate('/bulk-operations'),
      keywords: ['bulk', 'batch', 'mass', 'multiple'],
      category: 'navigation',
      group: 'Data',
      priority: 0,
      roles: ['ADMIN', 'ORGANIZER']
    },

    // Scoring & Judging
    {
      id: 'nav-deductions',
      name: 'Deductions',
      description: 'Manage score deductions',
      icon: ChartBarIcon,
      action: () => navigate('/deductions'),
      keywords: ['deduction', 'penalty', 'subtract'],
      category: 'navigation',
      group: 'Scoring',
      priority: 0,
      roles: ['ADMIN', 'ORGANIZER', 'JUDGE', 'AUDITOR']
    },
    {
      id: 'nav-certifications',
      name: 'Certifications',
      description: 'View score certifications',
      icon: ShieldCheckIcon,
      action: () => navigate('/certifications'),
      keywords: ['certification', 'certified', 'verified'],
      category: 'navigation',
      group: 'Scoring',
      priority: 0,
      roles: ['ADMIN', 'ORGANIZER', 'AUDITOR', 'TALLY_MASTER', 'BOARD']
    }
  ];
};
