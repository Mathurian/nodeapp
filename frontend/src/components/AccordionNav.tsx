import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTenant } from '../contexts/TenantContext'
import {
  HomeIcon,
  CalendarIcon,
  TrophyIcon,
  UsersIcon,
  CogIcon,
  MicrophoneIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArchiveBoxIcon,
  EnvelopeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentCheckIcon,
  CalculatorIcon,
  ShieldCheckIcon,
  DocumentDuplicateIcon,
  UserIcon,
  ServerIcon,
  CloudArrowDownIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

interface NavItem {
  name: string
  href: string
  icon: typeof HomeIcon
  roles: string[]
}

interface NavSection {
  name: string
  icon: typeof HomeIcon
  roles: string[]
  items?: NavItem[]
  href?: string
}

interface AccordionNavProps {
  className?: string
  onNavigate?: () => void
}

const AccordionNav: React.FC<AccordionNavProps> = ({ className = '', onNavigate }) => {
  const { user } = useAuth()
  const { buildPath } = useTenant()
  const location = useLocation()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Navigation']))

  // All roles that should have full navigation access
  const allRoles = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']
  const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']

  const navigationSections: NavSection[] = [
    {
      name: 'Navigation',
      icon: HomeIcon,
      roles: allRoles,
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: HomeIcon,
          roles: allRoles,
        },
        {
          name: 'Notifications',
          href: '/notifications',
          icon: HomeIcon,
          roles: allRoles,
        },
        {
          name: 'Bios',
          href: '/bios',
          icon: UserIcon,
          roles: allRoles,
        },
      ],
    },
    {
      name: 'Events',
      icon: CalendarIcon,
      roles: adminRoles,
      items: [
        {
          name: 'All Events',
          href: '/events',
          icon: CalendarIcon,
          roles: adminRoles,
        },
        {
          name: 'Templates',
          href: '/templates',
          icon: DocumentTextIcon,
          roles: adminRoles,
        },
        {
          name: 'Event Templates',
          href: '/event-templates',
          icon: DocumentDuplicateIcon,
          roles: adminRoles,
        },
        {
          name: 'Archive',
          href: '/archive',
          icon: ArchiveBoxIcon,
          roles: adminRoles,
        },
        {
          name: 'Category Types',
          href: '/category-types',
          icon: DocumentTextIcon,
          roles: adminRoles,
        },
      ],
    },
    {
      name: 'Scoring',
      icon: TrophyIcon,
      roles: ['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'ORGANIZER', 'BOARD'],
      items: [
        {
          name: 'Judge Scoring',
          href: '/scoring',
          icon: TrophyIcon,
          roles: ['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'BOARD', 'TALLY_MASTER', 'AUDITOR'],
        },
        {
          name: 'Tally Dashboard',
          href: '/tally-master',
          icon: CalculatorIcon,
          roles: ['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER'],
        },
        {
          name: 'Auditor',
          href: '/auditor',
          icon: ClipboardDocumentCheckIcon,
          roles: ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'],
        },
        {
          name: 'Certifications',
          href: '/certifications',
          icon: ShieldCheckIcon,
          roles: ['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER', 'AUDITOR', 'ORGANIZER', 'BOARD'],
        },
        {
          name: 'Deductions',
          href: '/deductions',
          icon: DocumentTextIcon,
          roles: ['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR'],
        },
      ],
    },
    {
      name: 'Results',
      icon: ChartBarIcon,
      roles: allRoles,
      items: [
        {
          name: 'View Results',
          href: '/results',
          icon: ChartBarIcon,
          roles: allRoles,
        },
        {
          name: 'Winners',
          href: '/winners',
          icon: TrophyIcon,
          roles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR'],
        },
        {
          name: 'Reports',
          href: '/reports',
          icon: DocumentTextIcon,
          roles: adminRoles,
        },
      ],
    },
    {
      name: 'User Management',
      icon: UsersIcon,
      roles: adminRoles,
      items: [
        {
          name: 'All Users',
          href: '/users',
          icon: UsersIcon,
          roles: adminRoles,
        },
        {
          name: 'Bulk Operations',
          href: '/bulk-operations',
          icon: DocumentTextIcon,
          roles: adminRoles,
        },
      ],
    },
    {
      name: 'Administration',
      icon: CogIcon,
      roles: adminRoles,
      items: [
        {
          name: 'Admin Dashboard',
          href: '/admin',
          icon: CogIcon,
          roles: adminRoles,
        },
        {
          name: 'Settings',
          href: '/settings',
          icon: CogIcon,
          roles: adminRoles,
        },
        {
          name: 'Permissions',
          href: '/permissions',
          icon: ShieldCheckIcon,
          roles: adminRoles,
        },
        {
          name: 'Database Browser',
          href: '/database',
          icon: ServerIcon,
          roles: adminRoles,
        },
        {
          name: 'Cache Management',
          href: '/cache',
          icon: ServerIcon,
          roles: adminRoles,
        },
        {
          name: 'Log Viewer',
          href: '/logs',
          icon: DocumentTextIcon,
          roles: adminRoles,
        },
        {
          name: 'Activity Log',
          href: '/activity',
          icon: ClockIcon,
          roles: adminRoles,
        },
        {
          name: 'Performance',
          href: '/performance',
          icon: ChartBarIcon,
          roles: adminRoles,
        },
        {
          name: 'Backups',
          href: '/backups',
          icon: CloudArrowDownIcon,
          roles: adminRoles,
        },
        {
          name: 'Disaster Recovery',
          href: '/disaster-recovery',
          icon: CloudArrowDownIcon,
          roles: adminRoles,
        },
        {
          name: 'Data Wipe',
          href: '/data-wipe',
          icon: DocumentTextIcon,
          roles: adminRoles,
        },
      ],
    },
    {
      name: 'Communication',
      icon: EnvelopeIcon,
      roles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE'],
      items: [
        {
          name: 'Email Templates',
          href: '/email-templates',
          icon: EnvelopeIcon,
          roles: adminRoles,
        },
        {
          name: 'Emcee Dashboard',
          href: '/emcee',
          icon: MicrophoneIcon,
          roles: ['SUPER_ADMIN', 'ADMIN', 'EMCEE', 'BOARD', 'ORGANIZER'],
        },
      ],
    },
    {
      name: 'System',
      icon: ServerIcon,
      roles: adminRoles,
      items: [
        {
          name: 'Workflows',
          href: '/workflows',
          icon: DocumentTextIcon,
          roles: adminRoles,
        },
        {
          name: 'Custom Fields',
          href: '/custom-fields',
          icon: DocumentTextIcon,
          roles: adminRoles,
        },
        {
          name: 'File Management',
          href: '/files',
          icon: DocumentTextIcon,
          roles: adminRoles,
        },
        {
          name: 'Multi-Factor Auth',
          href: '/mfa',
          icon: ShieldCheckIcon,
          roles: adminRoles,
        },
        {
          name: 'Tenants',
          href: '/tenants',
          icon: ServerIcon,
          roles: ['SUPER_ADMIN', 'ADMIN'],
        },
      ],
    },
  ]

  const toggleSection = (sectionName: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName)
      } else {
        newSet.add(sectionName)
      }
      return newSet
    })
  }

  const isActiveLink = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const hasRoleAccess = (roles: string[]) => {
    return user && roles.includes(user.role)
  }

  const filteredSections = navigationSections.filter((section) =>
    hasRoleAccess(section.roles)
  )

  return (
    <nav className={`accordion-nav ${className}`} aria-label="Main navigation">
      <div className="space-y-1">
        {filteredSections.map((section) => {
          const isExpanded = expandedSections.has(section.name)
          const hasItems = section.items && section.items.length > 0
          const filteredItems = section.items?.filter((item) =>
            hasRoleAccess(item.roles)
          )

          if (!hasItems || !filteredItems || filteredItems.length === 0) {
            return null
          }

          return (
            <div key={section.name} className="border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => toggleSection(section.name)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                aria-expanded={isExpanded}
                aria-controls={`nav-section-${section.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center space-x-3">
                  <section.icon className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">{section.name}</span>
                </div>
                {isExpanded ? (
                  <ChevronUpIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                )}
              </button>

              {isExpanded && (
                <div
                  id={`nav-section-${section.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="bg-gray-50 dark:bg-gray-900/50"
                  role="group"
                  aria-label={`${section.name} navigation items`}
                >
                  {filteredItems.map((item) => {
                    const fullPath = buildPath(item.href)
                    const isActive = isActiveLink(fullPath)
                    return (
                      <Link
                        key={item.href}
                        to={fullPath}
                        onClick={onNavigate}
                        className={`flex items-center space-x-3 px-4 py-2 pl-12 text-sm transition-colors ${
                          isActive
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-600 dark:border-indigo-500'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-l-4 border-transparent'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <item.icon className="h-4 w-4" aria-hidden="true" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}

export default AccordionNav
