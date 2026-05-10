import React from 'react'
import Button from './Button'

type MobileWorkflowAction = {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  disabled?: boolean
}

export interface MobileWorkflowNavProps {
  title?: string
  actions: MobileWorkflowAction[]
  className?: string
}

const MobileWorkflowNav: React.FC<MobileWorkflowNavProps> = ({
  title = 'Quick jumps',
  actions,
  className = '',
}) => {
  if (actions.length === 0) return null

  return (
    <div className={`lg:hidden rounded-lg border border-gray-200 bg-white/95 p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/95 ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {actions.map((action) => (
          <Button
            key={action.label}
            type="button"
            size="sm"
            variant={action.variant || 'outline'}
            onClick={action.onClick}
            disabled={action.disabled}
            className="shrink-0 whitespace-nowrap"
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

export default MobileWorkflowNav
