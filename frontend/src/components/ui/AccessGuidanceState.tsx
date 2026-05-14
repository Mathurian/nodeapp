import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import Card from './Card'
import Button from './Button'
import { buildTenantAwareAppPath } from '../../utils/authRedirect'

export interface AccessGuidanceAction {
  label: string
  to?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
}

export interface AccessGuidanceStateProps {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
  description: string
  guidance?: string
  actions?: AccessGuidanceAction[]
  helpText?: string
  helpLabel?: string
  hideHelpLink?: boolean
  tone?: 'danger' | 'warning' | 'neutral'
  fullScreen?: boolean
  className?: string
}

const linkVariantClasses: Record<NonNullable<AccessGuidanceAction['variant']>, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600',
  secondary:
    'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
  outline:
    'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800',
}

const toneClasses = {
  danger: {
    card: 'border-red-200 dark:border-red-800',
    iconWrap: 'bg-red-50 dark:bg-red-900/30',
    icon: 'text-red-500 dark:text-red-300',
  },
  warning: {
    card: 'border-yellow-200 dark:border-yellow-800',
    iconWrap: 'bg-yellow-50 dark:bg-yellow-900/30',
    icon: 'text-yellow-600 dark:text-yellow-300',
  },
  neutral: {
    card: 'border-gray-200 dark:border-gray-700',
    iconWrap: 'bg-gray-100 dark:bg-gray-800',
    icon: 'text-gray-500 dark:text-gray-300',
  },
}

const AccessGuidanceState: React.FC<AccessGuidanceStateProps> = ({
  icon: Icon = ExclamationTriangleIcon,
  title,
  description,
  guidance,
  actions = [],
  helpText = 'If you expected to use this page, review the Help Center or contact an organizer or administrator.',
  helpLabel = 'Open Help Center',
  hideHelpLink = false,
  tone = 'neutral',
  fullScreen = false,
  className = '',
}) => {
  const location = useLocation()
  const helpPath = buildTenantAwareAppPath('/help', undefined, location.pathname)
  const colors = toneClasses[tone]

  const content = (
    <Card className={clsx('rounded-lg p-8 text-center', colors.card, className)}>
      <div className={clsx('mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full', colors.iconWrap)}>
        <Icon className={clsx('h-8 w-8', colors.icon)} aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300">{description}</p>
      {guidance ? (
        <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{guidance}</p>
      ) : null}
      {actions.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actions.map((action) =>
            action.to ? (
              <Link
                key={action.label}
                to={buildTenantAwareAppPath(action.to, undefined, location.pathname)}
                className={clsx(
                  'btn inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                  linkVariantClasses[action.variant || 'primary']
                )}
              >
                {action.label}
              </Link>
            ) : (
              <Button
                key={action.label}
                variant={action.variant || 'primary'}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            )
          )}
        </div>
      ) : null}
      {!hideHelpLink ? (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          {helpText}{' '}
          <Link
            to={helpPath}
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {helpLabel}
          </Link>
        </p>
      ) : null}
    </Card>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="w-full max-w-3xl">{content}</div>
        </div>
      </div>
    )
  }

  return content
}

export default AccessGuidanceState
