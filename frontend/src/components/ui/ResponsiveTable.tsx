import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'

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
  /** Render stacked cards on mobile derived from table headers/cells */
  enableCardView?: boolean
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
  enableCardView = true,
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

  const tableElement = React.isValidElement(children) ? children : null
  const tableChildren = tableElement ? React.Children.toArray((tableElement.props as any).children) : []
  const theadElement = tableChildren.find((child: any) => React.isValidElement(child) && child.type === 'thead') as React.ReactElement | undefined
  const tbodyElement = tableChildren.find((child: any) => React.isValidElement(child) && child.type === 'tbody') as React.ReactElement | undefined

  const headerLabels = useMemo(() => {
    if (!theadElement) return [] as string[]
    const headerRows = React.Children.toArray((theadElement.props as any).children)
    const firstRow = headerRows.find((row: any) => React.isValidElement(row) && row.type === 'tr') as React.ReactElement | undefined
    if (!firstRow) return [] as string[]
    return React.Children.toArray((firstRow.props as any).children)
      .filter((cell: any) => React.isValidElement(cell))
      .map((cell: any) => {
        const raw = React.Children.toArray((cell.props as any).children).map((node: any) => {
          if (typeof node === 'string' || typeof node === 'number') return String(node)
          return ''
        }).join(' ').trim()
        return raw || 'Value'
      })
  }, [theadElement])

  const bodyRows = useMemo(() => {
    if (!tbodyElement) return [] as Array<{ key: string; cells: React.ReactNode[] }>
    const rows = React.Children.toArray((tbodyElement.props as any).children)
      .filter((row: any) => React.isValidElement(row) && row.type === 'tr') as React.ReactElement[]
    return rows.map((row, index) => {
      const cells = React.Children.toArray((row.props as any).children)
        .filter((cell: any) => React.isValidElement(cell) && (cell.type === 'td' || cell.type === 'th'))
        .map((cell: any) => (cell.props as any).children)
      return { key: String((row as any).key || index), cells }
    })
  }, [tbodyElement])

  const canRenderCards = enableCardView && headerLabels.length > 0 && bodyRows.length > 0

  return (
    <div className={`relative ${className}`}>
      {/* Accessible caption */}
      {caption && (
        <div className={captionVisible ? 'mb-2 text-sm text-gray-600 dark:text-gray-400' : 'sr-only'}>
          {caption}
        </div>
      )}

      {canRenderCards ? (
        <div className="space-y-3 md:space-y-4">
          {bodyRows.map((row) => (
            <div key={`card-${row.key}`} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 md:p-4 bg-white dark:bg-gray-800">
              <div className="space-y-2 md:space-y-2.5">
                {row.cells.map((cell, cellIndex) => (
                  <div key={`cell-${row.key}-${cellIndex}`} className="grid grid-cols-[120px_1fr] md:grid-cols-[180px_1fr] gap-2 md:gap-3 items-start">
                    <div className="text-[11px] md:text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {headerLabels[cellIndex] || `Field ${cellIndex + 1}`}
                    </div>
                    <div className="text-sm md:text-[15px] text-gray-900 dark:text-white break-words">{cell}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
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
        </>
      )}

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
