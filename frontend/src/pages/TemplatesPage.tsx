import React, { useEffect, useState } from 'react'
import api from '../services/api'
import {
  DocumentDuplicateIcon,
  DocumentTextIcon,
  BoltIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

interface TemplateCard {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  link: string
  color: 'blue' | 'green' | 'amber'
  count: number | null
}

const getColorClasses = (color: TemplateCard['color']) => {
  if (color === 'green') return 'bg-green-100 text-green-700'
  if (color === 'amber') return 'bg-amber-100 text-amber-700'
  return 'bg-blue-100 text-blue-700'
}

const TemplatesPage: React.FC = () => {
  const [cards, setCards] = useState<TemplateCard[]>([
    {
      id: 'event-templates',
      title: 'Event Templates',
      description: 'Reusable event, contest, and category structures.',
      icon: DocumentDuplicateIcon,
      link: '/event-templates',
      color: 'blue',
      count: null,
    },
    {
      id: 'email-templates',
      title: 'Email Templates',
      description: 'Notification and reporting templates with variables.',
      icon: DocumentTextIcon,
      link: '/email-templates',
      color: 'green',
      count: null,
    },
    {
      id: 'workflow-templates',
      title: 'Workflow Templates',
      description: 'Step-based approval and process automation templates.',
      icon: BoltIcon,
      link: '/workflows',
      color: 'amber',
      count: null,
    },
  ])

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [eventRes, emailRes, workflowRes] = await Promise.all([
          api.get('/event-templates'),
          api.get('/email-templates'),
          api.get('/workflows/templates'),
        ])

        const eventCount = Array.isArray(eventRes.data?.data || eventRes.data) ? (eventRes.data?.data || eventRes.data).length : 0
        const emailCount = Array.isArray(emailRes.data?.data || emailRes.data) ? (emailRes.data?.data || emailRes.data).length : 0
        const workflowCount = Array.isArray(workflowRes.data?.data || workflowRes.data) ? (workflowRes.data?.data || workflowRes.data).length : 0

        setCards((prev) =>
          prev.map((card) => ({
            ...card,
            count:
              card.id === 'event-templates'
                ? eventCount
                : card.id === 'email-templates'
                  ? emailCount
                  : workflowCount,
          }))
        )
      } catch {
        setCards((prev) => prev.map((card) => ({ ...card, count: 0 })))
      }
    }

    loadCounts()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <DocumentDuplicateIcon className="h-8 w-8 mr-3 text-blue-600" />
            Templates
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage reusable assets for event setup, communication, and workflow automation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link
              key={card.id}
              to={card.link}
              className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700"
            >
              <div className={`rounded-full p-3 inline-flex ${getColorClasses(card.color)} mb-4`}>
                <card.icon className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{card.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{card.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {card.count === null ? 'Loading...' : `${card.count} template${card.count === 1 ? '' : 's'}`}
                </span>
                <span className="text-blue-600 text-sm font-medium inline-flex items-center gap-1">
                  Manage <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TemplatesPage
