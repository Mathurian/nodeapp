import React from 'react'

export interface SkeletonProps {
  /** Additional CSS classes */
  className?: string
  /** Shape variant of the skeleton */
  variant?: 'text' | 'circular' | 'rectangular'
  /** Width of the skeleton (CSS value or number for pixels) */
  width?: string | number
  /** Height of the skeleton (CSS value or number for pixels) */
  height?: string | number
  /** Number of skeleton lines to render (for text variant) */
  count?: number
  /** Whether to animate the skeleton */
  animation?: boolean
}

/**
 * Skeleton component for loading placeholder content.
 * Provides animated shimmer effect with support for different variants.
 *
 * @example
 * // Single text skeleton
 * <Skeleton variant="text" width="60%" />
 *
 * // Multiple text lines
 * <Skeleton variant="text" count={3} />
 *
 * // Circular avatar placeholder
 * <Skeleton variant="circular" width={40} height={40} />
 *
 * // Rectangular image placeholder
 * <Skeleton variant="rectangular" height={200} />
 */
const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  count = 1,
  animation = true,
}) => {
  const getWidth = (): string => {
    if (width === undefined) {
      return variant === 'text' ? '100%' : 'auto'
    }
    return typeof width === 'number' ? `${width}px` : width
  }

  const getHeight = (): string => {
    if (height === undefined) {
      switch (variant) {
        case 'text':
          return '1em'
        case 'circular':
          return typeof width === 'number' ? `${width}px` : width || '40px'
        case 'rectangular':
          return '100px'
        default:
          return '1em'
      }
    }
    return typeof height === 'number' ? `${height}px` : height
  }

  const baseClasses = [
    'bg-gray-200 dark:bg-gray-700',
    animation && 'animate-pulse',
    variant === 'circular' && 'rounded-full',
    variant === 'rectangular' && 'rounded-md',
    variant === 'text' && 'rounded',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const style: React.CSSProperties = {
    width: getWidth(),
    height: getHeight(),
  }

  // For text variant with count > 1, render multiple skeletons
  if (variant === 'text' && count > 1) {
    return (
      <div className="space-y-2" role="status" aria-label="Loading content">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={baseClasses}
            style={{
              ...style,
              // Make the last line shorter for a more natural look
              width: index === count - 1 ? '75%' : getWidth(),
            }}
          />
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  return (
    <div
      className={baseClasses}
      style={style}
      role="status"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export default Skeleton
