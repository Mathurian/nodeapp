import type { ComponentType } from 'react'
import {
  ArchiveBoxIcon,
  CalendarIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CloudArrowDownIcon,
  CogIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  HomeIcon,
  MapPinIcon,
  MicrophoneIcon,
  ServerIcon,
  ShieldCheckIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline'

export type NavIcon = ComponentType<{ className?: string }>

export interface AppNavItem {
  id: string
  name: string
  href: string
  icon: NavIcon
  roles: string[]
  description?: string
  keywords?: string[]
  shortcut?: string
  priority?: number
}

export interface AppNavSection {
  id: string
  name: string
  icon: NavIcon
  roles: string[]
  items: AppNavItem[]
}

export const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']
export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']
export const ADMIN_ONLY_ROLES = ['SUPER_ADMIN', 'ADMIN']

const NAV_SECTIONS_UNSORTED: AppNavSection[] = [
  {
    id: 'navigation',
    name: 'Navigation',
    icon: HomeIcon,
    roles: ALL_ROLES,
    items: [
      { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ALL_ROLES, description: 'Go to dashboard home', keywords: ['home', 'main', 'overview'], shortcut: 'Cmd+H', priority: 100 },
      { id: 'profile', name: 'My Profile', href: '/profile', icon: UserIcon, roles: ALL_ROLES, description: 'View and edit your profile', keywords: ['profile', 'account', 'me'], shortcut: 'Cmd+P', priority: 90 },
      { id: 'notifications', name: 'Notifications', href: '/notifications', icon: HomeIcon, roles: ALL_ROLES, description: 'View notifications', keywords: ['alerts', 'messages'], shortcut: 'Cmd+N', priority: 85 },
      { id: 'bios', name: 'Bios', href: '/bios', icon: UserIcon, roles: ALL_ROLES, description: 'View contestant and judge bios', keywords: ['bio', 'profiles'], priority: 75 },
    ],
  },
  {
    id: 'events',
    name: 'Events',
    icon: CalendarIcon,
    roles: ADMIN_ROLES,
    items: [
      { id: 'events', name: 'All Events', href: '/events', icon: CalendarIcon, roles: ADMIN_ROLES, description: 'Manage events', keywords: ['event', 'calendar'], priority: 95 },
      { id: 'contests', name: 'Contests', href: '/contests', icon: TrophyIcon, roles: ADMIN_ROLES, description: 'Manage contests', keywords: ['competition', 'tournament'], priority: 90 },
      { id: 'categories', name: 'Categories', href: '/categories', icon: DocumentTextIcon, roles: ADMIN_ROLES, description: 'Manage categories', keywords: ['division', 'class'], priority: 85 },
      { id: 'event-templates', name: 'Event Templates', href: '/event-templates', icon: DocumentDuplicateIcon, roles: ADMIN_ROLES },
      { id: 'archive', name: 'Archive', href: '/archive', icon: ArchiveBoxIcon, roles: ADMIN_ROLES },
      { id: 'category-types', name: 'Category Types', href: '/category-types', icon: DocumentTextIcon, roles: ADMIN_ROLES },
    ],
  },
  {
    id: 'scoring',
    name: 'Scoring',
    icon: TrophyIcon,
    roles: ['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'ORGANIZER', 'BOARD'],
    items: [
      { id: 'scoring', name: 'Judge Scoring', href: '/scoring', icon: TrophyIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'BOARD', 'TALLY_MASTER', 'AUDITOR'], description: 'Enter and manage scores', keywords: ['score', 'judge', 'points'], priority: 80 },
      { id: 'tally-master', name: 'Tally Dashboard', href: '/tally-master', icon: CalculatorIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER'] },
      { id: 'auditor', name: 'Auditor', href: '/auditor', icon: ClipboardDocumentCheckIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'] },
      { id: 'certifications', name: 'Certifications', href: '/certifications', icon: ShieldCheckIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER', 'AUDITOR', 'ORGANIZER', 'BOARD'] },
      { id: 'score-governance', name: 'Score Governance', href: '/score-governance', icon: ClipboardDocumentCheckIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE'] },
      { id: 'deductions', name: 'Deductions', href: '/deductions', icon: DocumentTextIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR'] },
    ],
  },
  {
    id: 'results',
    name: 'Results',
    icon: ChartBarIcon,
    roles: ALL_ROLES,
    items: [
      { id: 'results', name: 'View Results', href: '/results', icon: ChartBarIcon, roles: ALL_ROLES, description: 'View contest results', keywords: ['winner', 'standings'], priority: 75 },
      { id: 'winners', name: 'Winners', href: '/winners', icon: TrophyIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR'] },
      { id: 'reports', name: 'Reports', href: '/reports', icon: DocumentTextIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER', 'ORGANIZER', 'BOARD'] },
    ],
  },
  {
    id: 'user-management',
    name: 'User Management',
    icon: UsersIcon,
    roles: ADMIN_ROLES,
    items: [
      { id: 'users', name: 'All Users', href: '/users', icon: UsersIcon, roles: ADMIN_ROLES, description: 'Manage users', keywords: ['people', 'accounts'], priority: 70 },
      { id: 'assignments', name: 'Assignments', href: '/assignments', icon: UsersIcon, roles: ADMIN_ROLES, description: 'Manage role assignments', keywords: ['judge', 'contestant', 'tally', 'auditor'], priority: 68 },
      { id: 'bulk-operations', name: 'Bulk Operations', href: '/bulk-operations', icon: DocumentTextIcon, roles: ADMIN_ROLES },
    ],
  },
  {
    id: 'administration',
    name: 'Administration',
    icon: CogIcon,
    roles: ADMIN_ROLES,
    items: [
      { id: 'admin', name: 'Admin Dashboard', href: '/admin', icon: CogIcon, roles: ADMIN_ONLY_ROLES },
      { id: 'settings', name: 'Settings', href: '/settings', icon: CogIcon, roles: ADMIN_ROLES, shortcut: 'Cmd+,', priority: 55 },
      { id: 'templates', name: 'Templates', href: '/templates', icon: DocumentDuplicateIcon, roles: ADMIN_ROLES },
      { id: 'permissions', name: 'Permissions', href: '/permissions', icon: ShieldCheckIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'] },
      { id: 'tenants', name: 'Tenants', href: '/tenants', icon: ServerIcon, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { id: 'database', name: 'Database Browser', href: '/database', icon: ServerIcon, roles: ADMIN_ONLY_ROLES },
      { id: 'cache', name: 'Cache Management', href: '/cache', icon: ServerIcon, roles: ADMIN_ONLY_ROLES },
      { id: 'logs', name: 'Log Viewer', href: '/logs', icon: DocumentTextIcon, roles: ADMIN_ONLY_ROLES },
      { id: 'activity', name: 'Activity Log', href: '/activity', icon: ClockIcon, roles: ADMIN_ONLY_ROLES },
      { id: 'rate-limit-configs', name: 'Rate Limit Configs', href: '/rate-limit-configs', icon: ShieldCheckIcon, roles: ADMIN_ONLY_ROLES },
      { id: 'login-locations', name: 'Login Locations', href: '/login-locations', icon: MapPinIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'] },
      { id: 'performance', name: 'Performance', href: '/performance', icon: ChartBarIcon, roles: ADMIN_ONLY_ROLES },
      { id: 'backups', name: 'Backups', href: '/backups', icon: CloudArrowDownIcon, roles: ADMIN_ROLES },
      { id: 'disaster-recovery', name: 'Disaster Recovery', href: '/disaster-recovery', icon: CloudArrowDownIcon, roles: ADMIN_ONLY_ROLES },
      { id: 'data-wipe', name: 'Data Wipe', href: '/data-wipe', icon: DocumentTextIcon, roles: ADMIN_ONLY_ROLES },
    ],
  },
  {
    id: 'communication',
    name: 'Communication',
    icon: EnvelopeIcon,
    roles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE'],
    items: [
      { id: 'send-email', name: 'Send Email', href: '/send-email', icon: EnvelopeIcon, roles: ADMIN_ROLES },
      { id: 'email-templates', name: 'Email Templates', href: '/email-templates', icon: EnvelopeIcon, roles: ADMIN_ROLES },
      { id: 'emcee', name: 'Emcee Dashboard', href: '/emcee', icon: MicrophoneIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'EMCEE', 'BOARD', 'ORGANIZER'] },
    ],
  },
  {
    id: 'system',
    name: 'System',
    icon: ServerIcon,
    roles: ADMIN_ROLES,
    items: [
      { id: 'workflows', name: 'Workflows', href: '/workflows', icon: DocumentTextIcon, roles: ADMIN_ROLES },
      { id: 'custom-fields', name: 'Custom Fields', href: '/custom-fields', icon: DocumentTextIcon, roles: ADMIN_ROLES },
      { id: 'files', name: 'File Management', href: '/files', icon: DocumentTextIcon, roles: ADMIN_ROLES },
      { id: 'mfa', name: 'Multi-Factor Auth', href: '/mfa', icon: ShieldCheckIcon, roles: ADMIN_ROLES },
    ],
  },
]

const PRIMARY_DASHBOARD_ITEM_ID = 'dashboard'

const sortItemsByName = (items: AppNavItem[]): AppNavItem[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name))

const sortNavigationSectionItems = (section: AppNavSection): AppNavItem[] => {
  const sortedItems = sortItemsByName(section.items)

  if (section.id !== 'navigation') {
    return sortedItems
  }

  const dashboardItems = sortedItems.filter((item) => item.id === PRIMARY_DASHBOARD_ITEM_ID)
  const nonDashboardItems = sortedItems.filter((item) => item.id !== PRIMARY_DASHBOARD_ITEM_ID)

  return [...dashboardItems, ...nonDashboardItems]
}

export const NAV_SECTIONS: AppNavSection[] = NAV_SECTIONS_UNSORTED.map((section) => ({
  ...section,
  items: sortNavigationSectionItems(section),
}))
