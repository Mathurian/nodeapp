import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  DocumentDuplicateIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

const TemplatesPage: React.FC = () => {
  const { user } = useAuth()

  const templateCategories = [
    {
      title: 'Event Templates',
      description: 'Pre-configured event setups for quick event creation',
      icon: DocumentDuplicateIcon,
      link: '/event-templates',
      color: 'blue',
      count: 0,
    },
    {
      title: 'Email Templates',
      description: 'Customizable email templates for notifications',
      icon: DocumentTextIcon,
      link: '/email-templates',
      color: 'green',
      count: 0,
    },
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600 hover:bg-blue-50',
      green: 'bg-green-100 text-green-600 hover:bg-green-50',
      purple: 'bg-purple-100 text-purple-600 hover:bg-purple-50',
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <DocumentDuplicateIcon className="h-8 w-8 mr-3 text-blue-600" />
            Templates
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
            Manage reusable templates for events and communications
          </p>
        </div>

        {/* Template Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templateCategories.map((category, index) => (
            <Link
              key={index}
              to={category.link}
              className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className={`rounded-full p-3 inline-flex ${getColorClasses(category.color)} mb-4`}>
                <category.icon className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {category.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-4">
                {category.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  {category.count} template{category.count !== 1 ? 's' : ''}
                </span>
                <span className="text-blue-600 text-sm font-medium">
                  Manage →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">About Templates</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <DocumentDuplicateIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Templates allow you to create reusable configurations that save time</span>
            </li>
            <li className="flex items-start">
              <DocumentTextIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Email templates can include dynamic variables for personalization</span>
            </li>
            <li className="flex items-start">
              <PlusIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Create new templates from existing events or start from scratch</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default TemplatesPage
