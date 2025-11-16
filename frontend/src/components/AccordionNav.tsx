import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
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
}

const AccordionNav: React.FC<AccordionNavProps> = ({ className = '' }) => {
  const { user } = useAuth()
  const location = useLocation()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Navigation']))

  const navigationSections: NavSection[] = [
    {
      name: 'Navigation',
      icon: HomeIcon,
      roles: ['ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'],
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: HomeIcon,
          roles: ['ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'],
        },
        {
          name: 'Notifications',
          href: '/notifications',
          icon: HomeIcon,
          roles: ['ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'],
        },
      ],
    },
    {
      name: 'Events',
      icon: CalendarIcon,
      roles: ['ORGANIZER', 'BOARD'],
      items: [
        {
          name: 'All Events',
          href: '/events',
          icon: CalendarIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Templates',
          href: '/templates',
          icon: DocumentTextIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Event Templates',
          href: '/event-templates',
          icon: DocumentDuplicateIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Archive',
          href: '/archive',
          icon: ArchiveBoxIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Category Types',
          href: '/category-types',
          icon: DocumentTextIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
      ],
    },
    {
      name: 'Scoring',
      icon: TrophyIcon,
      roles: ['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'ORGANIZER', 'BOARD'],
      items: [
        {
          name: 'Judge Scoring',
          href: '/scoring',
          icon: TrophyIcon,
          roles: ['JUDGE'],
        },
        {
          name: 'Tally Master',
          href: '/tally-master',
          icon: CalculatorIcon,
          roles: ['TALLY_MASTER'],
        },
        {
          name: 'Auditor',
          href: '/auditor',
          icon: ClipboardDocumentCheckIcon,
          roles: ['AUDITOR'],
        },
        {
          name: 'Certifications',
          href: '/certifications',
          icon: ShieldCheckIcon,
          roles: ['TALLY_MASTER', 'AUDITOR', 'ORGANIZER', 'BOARD'],
        },
        {
          name: 'Deductions',
          href: '/deductions',
          icon: DocumentTextIcon,
          roles: ['JUDGE', 'ORGANIZER', 'BOARD'],
        },
      ],
    },
    {
      name: 'Results',
      icon: ChartBarIcon,
      roles: ['ORGANIZER', 'JUDGE', 'CONTESTANT', 'TALLY_MASTER', 'AUDITOR', 'BOARD'],
      items: [
        {
          name: 'View Results',
          href: '/results',
          icon: ChartBarIcon,
          roles: ['ORGANIZER', 'JUDGE', 'CONTESTANT', 'TALLY_MASTER', 'AUDITOR', 'BOARD'],
        },
        {
          name: 'Reports',
          href: '/reports',
          icon: DocumentTextIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
      ],
    },
    {
      name: 'User Management',
      icon: UsersIcon,
      roles: ['ORGANIZER', 'BOARD'],
      items: [
        {
          name: 'All Users',
          href: '/users',
          icon: UsersIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Bulk Operations',
          href: '/bulk-operations',
          icon: DocumentTextIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
      ],
    },
    {
      name: 'Administration',
      icon: CogIcon,
      roles: ['ORGANIZER', 'BOARD'],
      items: [
        {
          name: 'Admin Dashboard',
          href: '/admin',
          icon: CogIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Settings',
          href: '/settings',
          icon: CogIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Security',
          href: '/admin/security',
          icon: ShieldCheckIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Database Browser',
          href: '/database',
          icon: ServerIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Cache Management',
          href: '/cache',
          icon: ServerIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Log Viewer',
          href: '/logs',
          icon: DocumentTextIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Performance',
          href: '/performance',
          icon: ChartBarIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Backups',
          href: '/backups',
          icon: CloudArrowDownIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Disaster Recovery',
          href: '/disaster-recovery',
          icon: CloudArrowDownIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Data Wipe',
          href: '/data-wipe',
          icon: DocumentTextIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
      ],
    },
    {
      name: 'Communication',
      icon: EnvelopeIcon,
      roles: ['ORGANIZER', 'BOARD', 'EMCEE'],
      items: [
        {
          name: 'Email Templates',
          href: '/email-templates',
          icon: EnvelopeIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Emcee Dashboard',
          href: '/emcee',
          icon: MicrophoneIcon,
          roles: ['EMCEE'],
        },
        {
          name: 'Commentary',
          href: '/commentary',
          icon: MicrophoneIcon,
          roles: ['EMCEE', 'ORGANIZER', 'BOARD'],
        },
      ],
    },
    {
      name: 'System',
      icon: ServerIcon,
      roles: ['ORGANIZER', 'BOARD'],
      items: [
        {
          name: 'Workflows',
          href: '/workflows',
          icon: DocumentTextIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Custom Fields',
          href: '/custom-fields',
          icon: DocumentTextIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'File Management',
          href: '/files',
          icon: DocumentTextIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Multi-Factor Auth',
          href: '/mfa',
          icon: ShieldCheckIcon,
          roles: ['ORGANIZER', 'BOARD'],
        },
        {
          name: 'Tenants',
          href: '/tenants',
          icon: ServerIcon,
          roles: ['ORGANIZER', 'BOARD'],
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
    <div className={`accordion-nav ${className}`}>
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
            <div key={section.name} className="border-b border-gray-200">
              <button
                onClick={() => toggleSection(section.name)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <section.icon className="h-5 w-5 text-gray-500" />
                  <span className="font-medium text-gray-900">{section.name}</span>
                </div>
                {isExpanded ? (
                  <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="bg-gray-50">
                  {filteredItems.map((item) => {
                    const isActive = isActiveLink(item.href)
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`flex items-center space-x-3 px-4 py-2 pl-12 text-sm transition-colors ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600'
                            : 'text-gray-700 hover:bg-gray-100 border-l-4 border-transparent'
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
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
    </div>
  )
}

export default AccordionNav
