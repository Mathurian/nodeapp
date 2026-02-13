import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTenant } from '../contexts/TenantContext'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { NAV_SECTIONS } from '../config/navigationConfig'

interface AccordionNavProps {
  className?: string
  onNavigate?: () => void
}

const AccordionNav: React.FC<AccordionNavProps> = ({ className = '', onNavigate }) => {
  const { user } = useAuth()
  const { buildPath } = useTenant()
  const location = useLocation()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Navigation']))

  const navigationSections = NAV_SECTIONS

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
