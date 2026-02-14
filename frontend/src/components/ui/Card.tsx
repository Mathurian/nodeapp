import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = false,
  padding = 'md',
  onClick,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const content = (
    <div
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700',
        paddingClasses[padding],
        hover && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )

  if (!hover) {
    return <div className="shadow-sm rounded-2xl">{content}</div>
  }

  return (
    <motion.div
      initial={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
      whileHover={{
        y: -4,
        boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      className="rounded-2xl"
    >
      {content}
    </motion.div>
  )
}

export type { CardProps }
export default Card
