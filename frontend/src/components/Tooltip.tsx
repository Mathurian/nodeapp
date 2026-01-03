import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  disabled?: boolean
  className?: string
  touchMode?: 'tap' | 'hold'
}

/**
 * Mobile-optimized Tooltip component
 *
 * Features:
 * - Tap to show on mobile (not hover)
 * - Auto-positioning to stay in viewport
 * - Touch-friendly interaction
 * - Accessible with ARIA attributes
 * - Configurable delay and position
 */
export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  delay = 200,
  disabled = false,
  className = '',
  touchMode = 'tap',
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [computedPosition, setComputedPosition] = useState(position)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const holdTimeoutRef = useRef<NodeJS.Timeout>()

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // Calculate tooltip position
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const margin = 8 // Gap between trigger and tooltip

    let top = 0
    let left = 0
    let finalPosition = position

    // Calculate initial position
    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - margin
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'bottom':
        top = triggerRect.bottom + margin
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.left - tooltipRect.width - margin
        break
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.right + margin
        break
    }

    // Check if tooltip fits in viewport and adjust if needed
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Horizontal overflow
    if (left < margin) {
      left = margin
    } else if (left + tooltipRect.width > viewportWidth - margin) {
      left = viewportWidth - tooltipRect.width - margin
    }

    // Vertical overflow - flip position if needed
    if (top < margin && (position === 'top' || position === 'bottom')) {
      // Flip to opposite vertical position
      if (position === 'top') {
        top = triggerRect.bottom + margin
        finalPosition = 'bottom'
      } else {
        top = triggerRect.top - tooltipRect.height - margin
        finalPosition = 'top'
      }
    } else if (
      top + tooltipRect.height > viewportHeight - margin &&
      (position === 'top' || position === 'bottom')
    ) {
      // Flip to opposite vertical position
      if (position === 'bottom') {
        top = triggerRect.top - tooltipRect.height - margin
        finalPosition = 'top'
      } else {
        top = triggerRect.bottom + margin
        finalPosition = 'bottom'
      }
    }

    setCoords({ top, left })
    setComputedPosition(finalPosition)
  }, [position])

  // Show tooltip
  const show = useCallback(() => {
    if (disabled) return

    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      // Calculate position after render
      requestAnimationFrame(calculatePosition)
    }, isTouchDevice ? 0 : delay)
  }, [disabled, delay, calculatePosition, isTouchDevice])

  // Hide tooltip
  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current)
    clearTimeout(holdTimeoutRef.current)
    setIsVisible(false)
  }, [])

  // Desktop hover handlers
  const handleMouseEnter = () => {
    if (!isTouchDevice) {
      show()
    }
  }

  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      hide()
    }
  }

  // Mobile touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isTouchDevice) return

    if (touchMode === 'hold') {
      // Hold to show
      holdTimeoutRef.current = setTimeout(show, 500)
    } else {
      // Tap to toggle
      if (isVisible) {
        hide()
      } else {
        show()
      }
    }
  }

  const handleTouchEnd = () => {
    if (!isTouchDevice) return

    if (touchMode === 'hold') {
      clearTimeout(holdTimeoutRef.current)
    }
  }

  // Click handler for tap mode
  const handleClick = (e: React.MouseEvent) => {
    if (!isTouchDevice) return

    e.preventDefault()
    e.stopPropagation()

    if (touchMode === 'tap') {
      if (isVisible) {
        hide()
      } else {
        show()
      }
    }
  }

  // Close on outside click (mobile)
  useEffect(() => {
    if (!isVisible || !isTouchDevice) return

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        hide()
      }
    }

    document.addEventListener('click', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)

    return () => {
      document.removeEventListener('click', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [isVisible, hide, isTouchDevice])

  // Recalculate position on scroll/resize
  useEffect(() => {
    if (!isVisible) return

    const handleUpdate = () => {
      calculatePosition()
    }

    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)

    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [isVisible, calculatePosition])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current)
      clearTimeout(holdTimeoutRef.current)
    }
  }, [])

  const positionArrowClasses = {
    top: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-700',
    bottom: 'top-[-6px] left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-700',
    left: 'right-[-6px] top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-700',
    right: 'left-[-6px] top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-700',
  }

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-block touch-highlight"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        aria-describedby={isVisible ? 'tooltip' : undefined}
      >
        {children}
      </div>

      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            id="tooltip"
            role="tooltip"
            className={`
              fixed z-50
              px-3 py-2
              max-w-xs
              text-sm text-white
              bg-gray-900 dark:bg-gray-700
              rounded-lg shadow-lg
              fade-in scale-in
              ${className}
            `}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
          >
            {/* Tooltip content */}
            <div className="relative z-10">{content}</div>

            {/* Arrow */}
            <div
              className={`
                absolute w-0 h-0
                border-[6px] border-transparent
                ${positionArrowClasses[computedPosition]}
              `}
            />
          </div>,
          document.body
        )}
    </>
  )
}

/**
 * Simple text tooltip
 */
export interface TextTooltipProps {
  children: React.ReactNode
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export const TextTooltip: React.FC<TextTooltipProps> = ({
  children,
  text,
  position = 'top',
}) => {
  return (
    <Tooltip content={<span>{text}</span>} position={position}>
      {children}
    </Tooltip>
  )
}
