import React from 'react'

interface MobileScrollOptions {
  offset?: number
  delayMs?: number
  behavior?: ScrollBehavior
}

const MOBILE_VIEWPORT_QUERY = '(max-width: 1023px)'
const DEFAULT_OFFSET = 88

const scrollToElementWithOffset = (
  element: HTMLElement,
  {
    offset = DEFAULT_OFFSET,
    behavior = 'smooth',
  }: Omit<MobileScrollOptions, 'delayMs'> = {},
) => {
  const elementTop = element.getBoundingClientRect().top + window.scrollY
  const nextTop = Math.max(0, elementTop - offset)
  window.scrollTo({ top: nextTop, behavior })
}

export const useMobileWorkflowNavigation = () => {
  const isMobileViewport = React.useCallback(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
  }, [])

  const scrollToRef = React.useCallback(
    (
      ref: React.RefObject<HTMLElement | null>,
      {
        delayMs = 0,
        ...options
      }: MobileScrollOptions = {},
    ) => {
      if (!isMobileViewport()) return

      const target = ref.current
      if (!target) return

      const performScroll = () => {
        scrollToElementWithOffset(target, options)
      }

      if (delayMs > 0) {
        window.setTimeout(() => {
          window.requestAnimationFrame(performScroll)
        }, delayMs)
        return
      }

      window.requestAnimationFrame(performScroll)
    },
    [isMobileViewport],
  )

  const scrollToTop = React.useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (!isMobileViewport()) return
      window.scrollTo({ top: 0, behavior })
    },
    [isMobileViewport],
  )

  return {
    isMobileViewport,
    scrollToRef,
    scrollToTop,
  }
}

export default useMobileWorkflowNavigation
