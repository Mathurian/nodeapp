import React, { useRef, useState, useCallback, useEffect } from 'react'

export interface ResponsiveTableProps {
  /** Table content (should be a <table> element) */
  children: React.ReactNode
  /** Optional caption for accessibility (visually hidden by default) */
  caption?: string
  /** Whether caption should be visible */
  captionVisible?: boolean
  /** Minimum width for the table container before scrolling activates */
  minWidth?: string
  /** Additional CSS classes for the container */
  className?: string
}

/**
 * ResponsiveTable wraps table elements to provide:
 * - Horizontal scrolling on overflow for mobile devices
 * - Visual gradient shadow indicators showing more content is available
 * - Left shadow when scrolled right, right shadow when more content available
 * - Smooth transitions when shadows appear/disappear
 * - Full dark mode support
 * - Accessible caption support for screen readers
 *
 * @example
 * <ResponsiveTable caption="List of users">
 *   <table className="min-w-full">
 *     <thead>...</thead>
 *     <tbody>...</tbody>
 *   </table>
 * </ResponsiveTable>
 */
const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  children,
  caption,
  captionVisible = false,
  minWidth = '640px',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({
    scrollLeft: 0,
    hasOverflow: false,
    canScrollRight: false,
  })

  /**
   * Calculate scroll state based on container dimensions and scroll position
   */
  const calculateScrollState = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    const hasOverflow = scrollWidth > clientWidth
    const canScrollRight = scrollLeft < scrollWidth - clientWidth - 1 // -1 for rounding errors

    setScrollState({
      scrollLeft,
      hasOverflow,
      canScrollRight,
    })
  }, [])

  /**
   * Handle scroll events with throttling for performance
   */
  const handleScroll = useCallback(() => {
    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(calculateScrollState)
  }, [calculateScrollState])

  /**
   * Set up scroll listener and ResizeObserver for responsive behavior
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Initial calculation
    calculateScrollState()

    // Listen for scroll events
    container.addEventListener('scroll', handleScroll, { passive: true })

    // Listen for resize events using ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      calculateScrollState()
    })
    resizeObserver.observe(container)

    // Also observe the first child (the table) for size changes
    const firstChild = container.firstElementChild
    if (firstChild) {
      resizeObserver.observe(firstChild)
    }

    return () => {
      container.removeEventListener('scroll', handleScroll)
      resizeObserver.disconnect()
    }
  }, [calculateScrollState, handleScroll])

  const showLeftShadow = scrollState.scrollLeft > 0
  const showRightShadow = scrollState.hasOverflow && scrollState.canScrollRight

  return (
    <div className={`relative ${className}`}>
      {/* Accessible caption */}
      {caption && (
        <div className={captionVisible ? 'mb-2 text-sm text-gray-600 dark:text-gray-400' : 'sr-only'}>
          {caption}
        </div>
      )}

      {/* Left scroll shadow indicator */}
      <div
        className={`
          absolute left-0 top-0 bottom-0 w-8 z-10
          bg-gradient-to-r from-white dark:from-gray-800 to-transparent
          pointer-events-none
          transition-opacity duration-200 ease-in-out
          ${showLeftShadow ? 'opacity-100' : 'opacity-0'}
        `}
        aria-hidden="true"
      />

      {/* Scrollable table container */}
      <div
        ref={containerRef}
        className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
        style={{ minWidth: '100%' }}
        tabIndex={scrollState.hasOverflow ? 0 : undefined}
        role={scrollState.hasOverflow ? 'region' : undefined}
        aria-label={scrollState.hasOverflow ? 'Scrollable table' : undefined}
      >
        <div style={{ minWidth }}>
          {children}
        </div>
      </div>

      {/* Right scroll shadow indicator */}
      <div
        className={`
          absolute right-0 top-0 bottom-0 w-8 z-10
          bg-gradient-to-l from-white dark:from-gray-800 to-transparent
          pointer-events-none
          transition-opacity duration-200 ease-in-out
          ${showRightShadow ? 'opacity-100' : 'opacity-0'}
        `}
        aria-hidden="true"
      />

      {/* Optional scroll hint for mobile - appears briefly then fades */}
      {scrollState.hasOverflow && (
        <div
          className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400 pointer-events-none md:hidden animate-pulse"
          aria-hidden="true"
        >
          Scroll for more
        </div>
      )}
    </div>
  )
}

export default ResponsiveTable
