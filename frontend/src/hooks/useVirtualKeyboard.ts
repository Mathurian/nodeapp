import { useEffect, useState, useCallback } from 'react'

/**
 * Custom hook for handling virtual keyboard on mobile devices
 *
 * Uses the Visual Viewport API to detect when the virtual keyboard appears
 * and provides keyboard height and visibility state.
 *
 * @returns {Object} Keyboard state
 * @returns {number} keyboardHeight - Height of the virtual keyboard in pixels
 * @returns {boolean} isKeyboardVisible - Whether the keyboard is currently visible
 * @returns {Function} scrollIntoView - Helper to scroll an element into view when keyboard appears
 */
export const useVirtualKeyboard = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  useEffect(() => {
    // Visual Viewport API is not available in all browsers
    if (!window.visualViewport) {
      console.warn('Visual Viewport API not supported in this browser')
      return
    }

    const handleResize = () => {
      const viewport = window.visualViewport!
      const windowHeight = window.innerHeight
      const viewportHeight = viewport.height

      // Calculate keyboard height
      const keyboardHeight = windowHeight - viewportHeight

      setKeyboardHeight(keyboardHeight)

      // Consider keyboard visible if it takes up more than 100px
      // (to avoid false positives from browser chrome changes)
      setIsKeyboardVisible(keyboardHeight > 100)
    }

    const handleScroll = () => {
      // Handle viewport scroll (can occur when keyboard appears)
      const viewport = window.visualViewport!

      // Prevent layout shift by adjusting scroll position
      if (viewport.offsetTop > 0) {
        window.scrollTo(0, viewport.offsetTop)
      }
    }

    // Initial check
    handleResize()

    // Listen for resize events (keyboard show/hide)
    window.visualViewport.addEventListener('resize', handleResize)
    window.visualViewport.addEventListener('scroll', handleScroll)

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('scroll', handleScroll)
    }
  }, [])

  /**
   * Scrolls an element into view, accounting for the virtual keyboard
   *
   * @param element - The element to scroll into view
   * @param options - Scroll options
   */
  const scrollIntoView = useCallback((
    element: HTMLElement | null,
    options?: ScrollIntoViewOptions
  ) => {
    if (!element) return

    const defaultOptions: ScrollIntoViewOptions = {
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
      ...options
    }

    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      element.scrollIntoView(defaultOptions)
    })
  }, [])

  /**
   * Focus an input and scroll it into view
   *
   * @param element - The input element to focus
   */
  const focusAndScroll = useCallback((element: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (!element) return

    element.focus()

    // Wait for keyboard to appear before scrolling
    setTimeout(() => {
      scrollIntoView(element, { block: 'center' })
    }, 300)
  }, [scrollIntoView])

  return {
    keyboardHeight,
    isKeyboardVisible,
    scrollIntoView,
    focusAndScroll,
  }
}

/**
 * Hook for auto-scrolling focused inputs when keyboard appears
 *
 * Automatically handles scrolling for all input and textarea elements
 * within a container when they receive focus.
 *
 * @param containerRef - Ref to the container element
 */
export const useAutoScroll = (containerRef: React.RefObject<HTMLElement>) => {
  const { scrollIntoView, isKeyboardVisible } = useVirtualKeyboard()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement

      // Only handle input and textarea elements
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Wait for keyboard to appear
        setTimeout(() => {
          scrollIntoView(target, { block: 'center' })
        }, 300)
      }
    }

    container.addEventListener('focusin', handleFocus)

    return () => {
      container.removeEventListener('focusin', handleFocus)
    }
  }, [containerRef, scrollIntoView])

  return { isKeyboardVisible }
}
